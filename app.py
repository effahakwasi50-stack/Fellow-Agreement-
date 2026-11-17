import base64
import csv
import io
import os
import re
import sqlite3
import zipfile
from datetime import datetime
from typing import List, Optional, Tuple
from urllib.parse import quote

import numpy as np
import pandas as pd
import streamlit as st
from fpdf import FPDF
from PIL import Image
from streamlit_drawable_canvas import st_canvas

# ==============================================================================
# Configuration Constants
# ==============================================================================
HALL_TUTOR_WHATSAPP = "233506759271"
ADMIN_PIN = "1234"
DB_PATH = "republic_hall_records.db"
LOGO_CANDIDATES = [
    "public/assets/aistudio/logo.jpg_982440ba.png",
    "logo.png",
]

FELLOWS_SEED: List[str] = [
    "Dr. Yaw Nsiah-Peprah",
    "Prof. Yaw Adubofour Tuffour",
    "Prof. J. B. Hayfron-Acquah",
    "Prof. Emmanuel Acheampong",
    "Prof. William G. Akanwariwiak",
    "Mr. Joseph Appiah Nkrumah",
    "Rev. Emmanuel Offei Akrofi",
    "Prof. Prince Yaw Andoh",
    "Prof. Aboagye Menyeh",
    "Prof. Francis Boakye",
    "Prof. Kari’kacha Seid’ ou",
    "Prof. Kweku Bedu-Addo",
    "Prof. Matthew Glover Addo",
    "Prof. Eric K. K. Abavare",
    "Mr. M. Agyemang-Yeboah",
    "Mr. Owusu Ansah Debrah Esq.",
    "Prof. Francis Kofi Ampong",
    "Rev Stephen Akyeampong",
    "Prof. Ebenezer J. D. Belford",
    "Mr. Thomas Adjei-Gyapong",
    "Dr. Akua A Badu Sampene",
    "Mr. Mark Owusu Yeboah",
    "Prof. Victor Owusu",
    "Mr. Felix Annor Anim",
    "Mr. Kwame Opoku Bonsu",
    "Mr. Michael Adashie",
    "Dr. Justice Owusu-Ansah",
    "Prof. Robert Aidoo",
    "Prof. Vivian Etsiapa Boamah",
    "Prof. Divine Kwaku Ahadzie",
    "Mr. Anthony Adjapong",
    "Dr. Michael K. Adjaloo",
    "Mr. Michael Sakyi Boateng Esq",
    "Prof. Ray Bright Voegborlo",
    "Prof. Joseph A. Ackora-Prah",
    "Prof. Akwasi Acheampong",
    "Prof. Akwasi A. Aning",
    "Dr. Divine Odame Appiah",
    "Mr. Charles Agyei Osei",
    "Dr. Emmanuel Kofi Gavu Ing",
    "Mr. Eric Anane-Antwi",
    "Dr. Kwabena Afriyie Poku",
    "Mr. Isaac J. Arthur",
    "Prof. Felix Apiribu",
    "Dr. Philemon Adolwine Amooba",
    "Mr. Joseph Asamoah-Gyawu",
    "Prof. Eric Fosu Oteng-Abayie",
    "Prof. Mercy Badu (Mrs.)",
    "Prof. Eric Boakye-Gyasi",
    "Dr. Linda, A-A Bedu-Addo",
    "Prof. Joseph Kwaku Kidido",
    "Prof. Faustina D. Wireko- Manu",
    "Dr. Felix Obeng Boateng",
    "Prof. Joseph Atawalna",
    "Prof. Otchere Addai-Mensah",
    "Dr. Max E. Annani-Akollor",
    "Prof. Daniel Atuah Obeng",
    "Dr. Paul Okyere",
    "Prof. David Asamoah",
    "Prof. Ahmed Agyapong",
    "Prof. Abdul Samed Muntaka",
    "Miss Akua Afriyie Addae",
    "Dr. Benjamin Afotey",
    "Mrs. Emelia Oteng-Seifah",
    "Prof. Foster Frempong",
    "Dr. S A. M Yegblemenawo",
    "Mr. Christopher Addo",
    "Prof. Twum Frimpong",
    "Dr. Kafui Kwesi Agyeman",
    "Prof. Emmanuel K Nakua",
    "Dr. Mrs. Yaa Asantewaa Osei",
    "Prof. Patrick William Narkwa",
    "Dr. Dorothy A.Y Agyapong",
    "Prof. John Boulard Forkuor",
    "Mr. Collins Abaitey",
    "Mrs. Juliet Op-Asare Ansah",
    "Mr. Godwin Boakye Antwi",
    "Prof. De-Graft Owusu Manu",
    "Dr. Samuel Asante Gyamerah",
    "Mr. Stephen Mondi Awoogo",
    "Dr. Nat Owusu - Prempeh",
    "Dr. Ishmael Takyi",
    "Mr. Kwame Adu-Gyamfi",
    "Dr. Christiana Subaar",
    "Dr. Fredrick Asenso Wireko",
    "Dr. Kofi Boamah Mensah",
    "Dr. Kwame Atta Gyamfi",
    "Dr.. Dorcas Ohui Owusu Mrs.",
    "Dr. Paul Owusu Takyi",
    "Prof. Joseph Attakorah",
    "Mr. Cyril Etornam Adala",
    "Dr. John-Paul Safunu Banchani",
    "Dr. Eric Kwame Simpeh",
    "Dr. Joshua K. K. Asamoah",
    "Dr. Joana ASerwa Ameyaw",
    "Dr. Linda Amoako Banning",
    "Dr. Stephen Adjei",
    "Dr. Lord J. J. Gowans",
    "Prof. Dominic De-Graft Arthur",
    "Prof. Adwoa B BoamaMensah",
    "Dr. Brenda Abena Ampah",
    "Mr. Eric Aboagye Da-costa",
    "Dr. Alexander Boakye Marful",
    "Prof. Linda Batsa Debrah (Mrs",
    "Prof. Nana Kena Frempong",
    "Dr. George Awiakye-Marfo",
    "Dr. Michael Owusu",
    "Dr. Adjo Daiki Apodey Kisser",
    "Mrs. Grace Dari Joronireh",
    "Dr. Daniel Nkansah",
    "Dr. Joseph Appiah-Kubi",
    "Dr. Antoinette Simpah Anim-Jnr",
    "Dr. Theresa Appiah Agana",
    "Dr. Kwame Oteng Gyasi",
    "Prof. Francis Aboagye",
    "Dr. Jubin Kwaku Osei-Mensah",
    "Dr. Prince Odame",
    "Dr. Samuel Boahen",
    "Mr. Albert Buondau",
]


# ==============================================================================
# Database Helpers
# ==============================================================================
def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fellows_directory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL UNIQUE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                staff_id TEXT NOT NULL,
                signature_image BLOB NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        count = conn.execute("SELECT COUNT(*) FROM fellows_directory").fetchone()[0]
        if count == 0:
            conn.executemany(
                "INSERT OR IGNORE INTO fellows_directory (full_name) VALUES (?)",
                [(name,) for name in FELLOWS_SEED],
            )
        conn.commit()


def fetch_fellows() -> List[Tuple[int, str]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, full_name FROM fellows_directory ORDER BY id ASC"
        ).fetchall()
    return [(int(r["id"]), str(r["full_name"])) for r in rows]


def add_fellow(full_name: str) -> bool:
    cleaned = full_name.strip()
    if not cleaned:
        return False
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO fellows_directory (full_name) VALUES (?)",
            (cleaned,),
        )
        conn.commit()
        return cur.rowcount > 0


def remove_fellow(fellow_id: int) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM fellows_directory WHERE id = ?", (fellow_id,))
        conn.commit()


def parse_uploaded_fellows(uploaded_bytes: bytes, filename: str) -> List[str]:
    text = uploaded_bytes.decode("utf-8-sig", errors="replace")
    names: List[str] = []
    if filename.lower().endswith(".csv"):
        reader = csv.reader(io.StringIO(text))
        for idx, row in enumerate(reader):
            if not row:
                continue
            candidate = row[0].strip()
            if idx == 0 and candidate.lower() in {"full_name", "fullname", "name", "fellow", "fellow_name"}:
                continue
            if candidate:
                names.append(candidate)
    else:
        for line in text.splitlines():
            candidate = line.strip()
            if candidate:
                names.append(candidate)
    # Deduplicate while preserving order
    seen = set()
    unique_names: List[str] = []
    for name in names:
        if name not in seen:
            seen.add(name)
            unique_names.append(name)
    return unique_names


def update_fellows_from_list(names: List[str], replace_existing: bool) -> int:
    with get_connection() as conn:
        if replace_existing:
            conn.execute("DELETE FROM fellows_directory")
        inserted = 0
        for name in names:
            cur = conn.execute(
                "INSERT OR IGNORE INTO fellows_directory (full_name) VALUES (?)",
                (name,),
            )
            inserted += cur.rowcount
        conn.commit()
    return inserted


def save_submission(full_name: str, staff_id: str, signature_png: bytes, timestamp: str) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO submissions (full_name, staff_id, signature_image, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (full_name, staff_id, signature_png, timestamp),
        )
        conn.commit()
        return int(cur.lastrowid)


def fetch_submissions() -> List[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, full_name, staff_id, signature_image, timestamp
            FROM submissions
            ORDER BY id DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]


# ==============================================================================
# Signature & PDF Generation Helpers
# ==============================================================================
def sanitize_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", value.strip())
    return cleaned.strip("_") or "Record"


def to_latin1_safe(text: str) -> str:
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def extract_signature_png(canvas_result) -> Optional[bytes]:
    if canvas_result is None or canvas_result.image_data is None:
        return None
    json_objects = []
    if getattr(canvas_result, "json_data", None):
        json_objects = canvas_result.json_data.get("objects", []) or []

    rgba = np.asarray(canvas_result.image_data, dtype=np.uint8)
    # Check if user actually drew strokes (alpha channel > 0 or non-white RGB)
    has_alpha_ink = bool(np.any(rgba[:, :, 3] > 0))
    if not json_objects and not has_alpha_ink:
        return None

    # Composite onto crisp white background for clean PDF and preview rendering
    img = Image.fromarray(rgba, mode="RGBA")
    white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    composited = Image.alpha_composite(white_bg, img).convert("RGB")

    # Confirm canvas is not purely blank white
    arr = np.asarray(composited)
    if np.all(arr >= 250):
        return None

    buf = io.BytesIO()
    composited.save(buf, format="PNG")
    return buf.getvalue()


def generate_official_pdf(
    full_name: str,
    staff_id: str,
    timestamp_str: str,
    signature_png: bytes,
    record_id: int,
) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()

    # Outer Republic Hall Navy Border & Inner Gold Border
    pdf.set_draw_color(11, 31, 58)  # Deep Navy #0B1F3A
    pdf.set_line_width(1.2)
    pdf.rect(10, 10, 190, 277)

    pdf.set_draw_color(197, 155, 39)  # Republic Hall Gold #C59B27
    pdf.set_line_width(0.5)
    pdf.rect(13, 13, 184, 271)

    # Top Navy Header Banner
    pdf.set_fill_color(11, 31, 58)
    pdf.rect(13, 13, 184, 38, style="F")

    logo_path = next((p for p in LOGO_CANDIDATES if os.path.exists(p)), None)
    if logo_path:
        pdf.set_fill_color(255, 255, 255)
        pdf.ellipse(19, 20, 24, 24, style="F")
        pdf.image(logo_path, x=19, y=20, w=24, h=24)

    text_x = 46 if logo_path else 18
    text_w = 146 if logo_path else 174

    pdf.set_text_color(212, 175, 55)  # Gold
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(text_x, 19)
    pdf.cell(text_w, 6, "OFFICIAL FELLOW AGREEMENT RECORD", align="C")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_xy(text_x, 26)
    pdf.cell(text_w, 10, "REPUBLIC HALL", align="C")

    pdf.set_text_color(226, 232, 240)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(text_x, 38)
    pdf.cell(text_w, 6, "Office of the Hall Tutor  |  Fellows Directory & Electronic Attestation", align="C")

    # Gold Accent Rule
    pdf.set_fill_color(197, 155, 39)
    pdf.rect(13, 51, 184, 1.5, style="F")

    # Document Reference Strip
    pdf.set_text_color(82, 96, 113)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(22, 60)
    pdf.cell(80, 6, f"DOCUMENT REF: RH-AGR-{record_id:05d}", align="L")
    pdf.set_xy(108, 60)
    pdf.cell(80, 6, f"ISSUED: {to_latin1_safe(timestamp_str)}", align="R")

    # Introductory Attestation Copy
    pdf.set_text_color(30, 41, 59)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_xy(22, 74)
    pdf.multi_cell(
        166,
        6,
        to_latin1_safe(
            "This official agreement receipt certifies that the Fellow named below has "
            "confirmed their institutional profile and affixed their electronic signature to "
            "the Republic Hall Fellows Agreement."
        ),
    )

    # Details Table Box
    box_top = 96
    pdf.set_fill_color(249, 248, 244)
    pdf.set_draw_color(203, 213, 225)
    pdf.set_line_width(0.4)
    pdf.rect(22, box_top, 166, 56, style="FD")

    rows = [
        ("Fellow Full Name", to_latin1_safe(full_name)),
        ("Staff ID Number", to_latin1_safe(staff_id)),
        ("Date & Time of Signing", to_latin1_safe(timestamp_str)),
        ("Agreement Status", "Confirmed & Electronically Signed"),
    ]
    y = box_top + 6
    for label, value in rows:
        pdf.set_xy(28, y)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(54, 9, label, align="L")

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(11, 31, 58)
        pdf.cell(100, 9, value, align="L")
        y += 12

    # Dedicated Signature Box
    sig_box_top = 166
    pdf.set_text_color(11, 31, 58)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(22, sig_box_top)
    pdf.cell(166, 7, "FELLOW ELECTRONIC SIGNATURE", align="L")

    pdf.set_draw_color(11, 31, 58)
    pdf.set_line_width(0.5)
    pdf.set_fill_color(255, 255, 255)
    pdf.rect(22, sig_box_top + 9, 166, 62, style="FD")

    # Embed signature PNG centered inside the signature box
    sig_stream = io.BytesIO(signature_png)
    with Image.open(sig_stream) as sig_img:
        w_px, h_px = sig_img.size
    max_w_mm = 130.0
    max_h_mm = 46.0
    aspect = w_px / max(h_px, 1)
    draw_w = max_w_mm
    draw_h = draw_w / aspect
    if draw_h > max_h_mm:
        draw_h = max_h_mm
        draw_w = draw_h * aspect
    img_x = 22 + (166 - draw_w) / 2
    img_y = sig_box_top + 14 + (46 - draw_h) / 2

    sig_stream.seek(0)
    pdf.image(sig_stream, x=img_x, y=img_y, w=draw_w, h=draw_h)

    # Signature Baseline Caption
    pdf.set_draw_color(197, 155, 39)
    pdf.line(42, sig_box_top + 63, 168, sig_box_top + 63)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(100, 116, 139)
    pdf.set_xy(22, sig_box_top + 64)
    pdf.cell(166, 5, to_latin1_safe(f"Signed electronically by {full_name} ({staff_id})"), align="C")

    # Footer Handoff Instruction
    pdf.set_xy(22, 252)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(
        166,
        5,
        "Submission Notice: Please submit this signed PDF receipt directly to the Hall Tutor via WhatsApp (+233 50 675 9271) for official filing.",
        align="C",
    )

    pdf.set_xy(22, 270)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(155, 120, 22)
    pdf.cell(166, 5, "REPUBLIC HALL  •  FELLOWS AGREEMENT REGISTRY", align="C")

    raw_out = pdf.output()
    return bytes(raw_out)


def build_whatsapp_url(full_name: str, staff_id: str) -> str:
    message = (
        "Hello Hall Tutor, I have completed my agreement form. "
        "Please find attached my signed PDF document. "
        f"Fellow Name: {full_name} | Staff ID: {staff_id}"
    )
    return f"https://wa.me/{HALL_TUTOR_WHATSAPP}?text={quote(message)}"


def build_backup_zip(records: List[dict]) -> bytes:
    zip_buf = io.BytesIO()
    df_rows = []
    with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for row in records:
            sig_filename = (
                f"signatures/sig_{row['id']:04d}_"
                f"{sanitize_filename_part(row['staff_id'])}_"
                f"{sanitize_filename_part(row['full_name'])}.png"
            )
            zf.writestr(sig_filename, row["signature_image"])
            df_rows.append(
                {
                    "id": row["id"],
                    "full_name": row["full_name"],
                    "staff_id": row["staff_id"],
                    "timestamp": row["timestamp"],
                    "signature_file": sig_filename,
                }
            )
        csv_text = pd.DataFrame(df_rows).to_csv(index=False)
        zf.writestr("submissions.csv", csv_text)
    zip_buf.seek(0)
    return zip_buf.getvalue()


# ==============================================================================
# Streamlit Page Setup & Styling
# ==============================================================================
st.set_page_config(
    page_title="Republic Hall — Fellow Agreement Portal",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_db()

st.markdown(
    """
    <style>
        .stApp {
            background-color: #F9F8F4;
        }
        .rh-banner {
            background: linear-gradient(135deg, #0B1F3A 0%, #132B4C 100%);
            border-bottom: 3px solid #C59B27;
            border-radius: 10px;
            padding: 1.5rem 1.75rem;
            color: #FFFFFF;
            margin-bottom: 1.5rem;
        }
        .rh-kicker {
            color: #E2C05B;
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            margin-bottom: 0.3rem;
        }
        .rh-title {
            font-size: 1.9rem;
            font-weight: 700;
            margin: 0;
            color: #FFFFFF;
        }
        .rh-subtitle {
            color: #CBD5E1;
            font-size: 0.95rem;
            margin-top: 0.35rem;
            margin-bottom: 0;
        }
        .rh-step-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 1rem;
        }
        .rh-completion-box {
            background: #FFFFFF;
            border: 2px solid #C59B27;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1.25rem;
        }
        .whatsapp-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            background-color: #25D366;
            color: #FFFFFF !important;
            font-weight: 700;
            font-size: 1rem;
            padding: 0.75rem 1.25rem;
            border-radius: 8px;
            text-decoration: none !important;
            border: 1px solid #1EBE5D;
            transition: background-color 0.15s ease;
        }
        .whatsapp-btn:hover {
            background-color: #128C7E;
            color: #FFFFFF !important;
        }
        div[data-testid="stDownloadButton"] > button {
            background-color: #0B1F3A;
            color: #FFFFFF;
            border: 1px solid #C59B27;
            font-weight: 700;
            width: 100%;
            padding: 0.65rem 1rem;
        }
        div[data-testid="stDownloadButton"] > button:hover {
            background-color: #132B4C;
            color: #E2C05B;
        }
        div[data-testid="stButton"] > button[kind="primary"] {
            background-color: #0B1F3A;
            border-color: #C59B27;
            color: #FFFFFF;
            font-weight: 700;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

if "canvas_reset_key" not in st.session_state:
    st.session_state.canvas_reset_key = 0
if "last_submission" not in st.session_state:
    st.session_state.last_submission = None
if "sidebar_admin_unlocked" not in st.session_state:
    st.session_state.sidebar_admin_unlocked = False
if "records_admin_unlocked" not in st.session_state:
    st.session_state.records_admin_unlocked = False


# ==============================================================================
# Sidebar: PIN-Protected Admin / Manage Fellows
# ==============================================================================
with st.sidebar:
    st.markdown("### Republic Hall Registry")
    fellows_rows = fetch_fellows()
    st.caption(f"Fellows in directory: **{len(fellows_rows)}**")
    st.divider()

    with st.expander("Admin / Manage Fellows", expanded=st.session_state.sidebar_admin_unlocked):
        if not st.session_state.sidebar_admin_unlocked:
            pin_input = st.text_input("Admin PIN", type="password", key="sidebar_pin_input")
            if st.button("Unlock Fellows Manager", use_container_width=True):
                if pin_input == ADMIN_PIN:
                    st.session_state.sidebar_admin_unlocked = True
                    st.rerun()
                else:
                    st.error("Incorrect PIN.")
        else:
            if st.button("Lock Fellows Manager", use_container_width=True):
                st.session_state.sidebar_admin_unlocked = False
                st.rerun()

            st.markdown("#### Add Fellow")
            new_fellow_name = st.text_input("Full Name", placeholder="e.g. Dr. Kwame Mensah", key="add_fellow_input")
            if st.button("Add Name to Directory", use_container_width=True):
                if add_fellow(new_fellow_name):
                    st.success(f"Added: {new_fellow_name.strip()}")
                    st.rerun()
                else:
                    st.warning("Enter a unique, non-empty Fellow name.")

            st.markdown("#### Remove Fellow")
            if fellows_rows:
                remove_choice = st.selectbox(
                    "Select Fellow to Remove",
                    options=fellows_rows,
                    format_func=lambda item: item[1],
                    index=None,
                    placeholder="Choose Fellow to remove",
                    key="remove_fellow_select",
                )
                if st.button("Remove Selected Fellow", use_container_width=True) and remove_choice:
                    remove_fellow(remove_choice[0])
                    st.success(f"Removed: {remove_choice[1]}")
                    st.rerun()

            st.markdown("#### Upload .csv / .txt List")
            uploaded_file = st.file_uploader(
                "Upload Fellows File",
                type=["csv", "txt"],
                key="fellows_upload",
            )
            replace_mode = st.checkbox("Replace existing directory", value=False)
            if uploaded_file is not None:
                parsed_names = parse_uploaded_fellows(uploaded_file.getvalue(), uploaded_file.name)
                st.caption(f"Detected {len(parsed_names)} name(s) in `{uploaded_file.name}`.")
                if st.button("Apply Uploaded Directory", use_container_width=True):
                    inserted = update_fellows_from_list(parsed_names, replace_existing=replace_mode)
                    st.success(f"Directory updated ({inserted} added).")
                    st.rerun()


# ==============================================================================
# Header Banner
# ==============================================================================
logo_path = next((p for p in LOGO_CANDIDATES if os.path.exists(p)), None)
logo_html = ""
if logo_path:
    with open(logo_path, "rb") as img_file:
        b64_logo = base64.b64encode(img_file.read()).decode("ascii")
    logo_html = (
        f'<img src="data:image/png;base64,{b64_logo}" alt="Republic Hall Logo" '
        'style="width:74px; height:74px; border-radius:50%; background:#ffffff; '
        'padding:3px; border:2px solid #C59B27; object-fit:cover; flex-shrink:0;" />'
    )

st.markdown(
    f"""
    <div class="rh-banner" style="display:flex; align-items:center; gap:1.25rem;">
        {logo_html}
        <div>
            <div class="rh-kicker">Republic Hall • Office of the Hall Tutor</div>
            <h1 class="rh-title">Fellow Agreement & Electronic Signature Portal</h1>
            <p class="rh-subtitle">
                Confirm your Fellow record, affix your electronic signature, download your official PDF agreement, and send it to the Hall Tutor.
            </p>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

tab_verify, tab_admin = st.tabs(["Fellow Agreement", "Admin Records"])


# ==============================================================================
# Tab 1: Step-by-Step Verification Workflow
# ==============================================================================
with tab_verify:
    fellow_names = [name for _, name in fellows_rows]

    st.markdown("#### Step 1: Search & Select Fellow Name")
    selected_fellow = st.selectbox(
        "Fellow Full Name",
        options=fellow_names,
        index=None,
        placeholder="Search Fellow Name",
        label_visibility="collapsed",
    )

    staff_id = ""
    canvas_result = None

    if selected_fellow:
        st.markdown("#### Step 2: Staff ID Number")
        staff_id = st.text_input(
            "Staff ID Number",
            placeholder="Enter your Staff ID Number (e.g. RH-4082)",
            key="staff_id_input",
        )

    if selected_fellow and staff_id.strip():
        st.markdown("#### Step 3: Electronic Signature Pad")
        st.caption("Sign inside the white pad below using touch, mouse, or trackpad.")

        col_canvas, col_actions = st.columns([4, 1])
        with col_canvas:
            canvas_result = st_canvas(
                fill_color="rgba(255, 255, 255, 0)",
                stroke_width=3,
                stroke_color="#0B1F3A",
                background_color="#FFFFFF",
                height=190,
                width=620,
                drawing_mode="freedraw",
                key=f"signature_canvas_{st.session_state.canvas_reset_key}",
            )
        with col_actions:
            if st.button("Clear / Reset Signature", use_container_width=True):
                st.session_state.canvas_reset_key += 1
                st.rerun()

        st.markdown("#### Step 4: Confirm & Generate Document")
        if st.button("Confirm & Generate Signed PDF", type="primary", use_container_width=True):
            sig_png = extract_signature_png(canvas_result)
            if not selected_fellow:
                st.error("Please select a Fellow name in Step 1.")
            elif not staff_id.strip():
                st.error("Please enter your Staff ID Number in Step 2.")
            elif sig_png is None:
                st.error("Please draw your signature on the signature pad before confirming.")
            else:
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                clean_staff_id = staff_id.strip()
                record_id = save_submission(selected_fellow, clean_staff_id, sig_png, now_str)
                pdf_bytes = generate_official_pdf(
                    full_name=selected_fellow,
                    staff_id=clean_staff_id,
                    timestamp_str=now_str,
                    signature_png=sig_png,
                    record_id=record_id,
                )
                pdf_filename = (
                    f"Republic_Hall_{sanitize_filename_part(clean_staff_id)}_"
                    f"{sanitize_filename_part(selected_fellow)}.pdf"
                )
                st.session_state.last_submission = {
                    "record_id": record_id,
                    "full_name": selected_fellow,
                    "staff_id": clean_staff_id,
                    "timestamp": now_str,
                    "pdf_bytes": pdf_bytes,
                    "pdf_filename": pdf_filename,
                    "whatsapp_url": build_whatsapp_url(selected_fellow, clean_staff_id),
                }
                st.success("Agreement recorded and official PDF receipt generated.")

    # Post-Submission 2-Step Completion Box
    if st.session_state.last_submission:
        sub = st.session_state.last_submission
        st.markdown(
            f"""
            <div class="rh-completion-box">
                <h3 style="margin-top:0; color:#0B1F3A;">Agreement Complete — Next Steps</h3>
                <p style="margin-bottom:1rem; color:#334155;">
                    <strong>Fellow:</strong> {sub['full_name']} &nbsp;|&nbsp;
                    <strong>Staff ID:</strong> {sub['staff_id']} &nbsp;|&nbsp;
                    <strong>Signed:</strong> {sub['timestamp']}
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        step_a_col, step_b_col = st.columns(2)
        with step_a_col:
            st.download_button(
                label="1. Download Your Signed PDF",
                data=sub["pdf_bytes"],
                file_name=sub["pdf_filename"],
                mime="application/pdf",
                use_container_width=True,
            )
        with step_b_col:
            st.markdown(
                f"""
                <a class="whatsapp-btn" href="{sub['whatsapp_url']}" target="_blank" rel="noopener noreferrer">
                    2. Send via WhatsApp to Hall Tutor
                </a>
                """,
                unsafe_allow_html=True,
            )
            st.info("Once WhatsApp opens with your pre-filled details, please attach the downloaded PDF document before pressing send.")

        if st.button("Start New Agreement"):
            st.session_state.last_submission = None
            st.session_state.canvas_reset_key += 1
            st.rerun()


# ==============================================================================
# Tab 2: PIN-Protected Admin Records
# ==============================================================================
with tab_admin:
    st.markdown("### Admin Records & Backup Export")
    if not st.session_state.records_admin_unlocked:
        pin_attempt = st.text_input("Enter Admin PIN to view submissions", type="password", key="records_pin_input")
        if st.button("Unlock Admin Records"):
            if pin_attempt == ADMIN_PIN:
                st.session_state.records_admin_unlocked = True
                st.rerun()
            else:
                st.error("Invalid PIN. Please try again.")
    else:
        col_top_a, col_top_b = st.columns([3, 1])
        with col_top_b:
            if st.button("Lock Admin Records", use_container_width=True):
                st.session_state.records_admin_unlocked = False
                st.rerun()

        records = fetch_submissions()
        with col_top_a:
            st.metric("Total Completed Agreements", len(records))

        if not records:
            st.info("No Fellow agreement submissions have been recorded yet.")
        else:
            export_df = pd.DataFrame(
                [
                    {
                        "ID": r["id"],
                        "Full Name": r["full_name"],
                        "Staff ID": r["staff_id"],
                        "Timestamp": r["timestamp"],
                    }
                    for r in records
                ]
            )
            exp_col1, exp_col2 = st.columns(2)
            with exp_col1:
                st.download_button(
                    label="Export Records (CSV)",
                    data=export_df.to_csv(index=False).encode("utf-8"),
                    file_name="republic_hall_submissions.csv",
                    mime="text/csv",
                    use_container_width=True,
                )
            with exp_col2:
                st.download_button(
                    label="Export Full Backup (ZIP with Signatures)",
                    data=build_backup_zip(records),
                    file_name="republic_hall_backup.zip",
                    mime="application/zip",
                    use_container_width=True,
                )

            st.divider()
            for r in records:
                c1, c2 = st.columns([3, 2])
                with c1:
                    st.markdown(f"**{r['full_name']}**")
                    st.caption(f"Staff ID: `{r['staff_id']}`  |  Signed: `{r['timestamp']}`  |  Record #{r['id']}")
                with c2:
                    st.image(r["signature_image"], caption="Electronic Signature", width=240)
                st.divider()
