import base64
import csv
import html
import inspect
import io
import os
import re
import sqlite3
import zipfile
from datetime import datetime
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
import streamlit as st
from PIL import Image, ImageDraw
from streamlit_drawable_canvas import st_canvas

# ==============================================================================
# Configuration Constants
# ==============================================================================
ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")
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


def delete_submission(record_id: int) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM submissions WHERE id = ?", (record_id,))
        conn.commit()


def reset_submissions() -> None:
    """Delete every registration and restart numbering from 1."""
    with get_connection() as conn:
        conn.execute("DELETE FROM submissions")
        conn.execute("DELETE FROM sqlite_sequence WHERE name = 'submissions'")
        conn.commit()


def fetch_registered_list() -> List[dict]:
    """Public list: name + time only (no Staff ID, no signature)."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, full_name, timestamp FROM submissions ORDER BY id ASC"
        ).fetchall()
    return [dict(r) for r in rows]


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
# Signature & Export Helpers
# ==============================================================================
def sanitize_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", value.strip())
    return cleaned.strip("_") or "Record"


def _rasterize_fabric_paths(json_objects: list, width: int = 620, height: int = 190) -> Optional[bytes]:
    if not json_objects:
        return None
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    drew_any = False

    for obj in json_objects:
        if not isinstance(obj, dict):
            continue
        path_cmds = obj.get("path")
        if not isinstance(path_cmds, list):
            continue
        stroke_w = max(int(round(float(obj.get("strokeWidth", 3)))), 2)
        stroke_color = (11, 31, 58)
        cur_x, cur_y = 0.0, 0.0
        points: List[Tuple[float, float]] = []

        for cmd in path_cmds:
            if not isinstance(cmd, (list, tuple)) or not cmd:
                continue
            op = cmd[0]
            if op == "M" and len(cmd) >= 3:
                if len(points) >= 2:
                    draw.line(points, fill=stroke_color, width=stroke_w, joint="curve")
                    drew_any = True
                cur_x, cur_y = float(cmd[1]), float(cmd[2])
                points = [(cur_x, cur_y)]
            elif op == "L" and len(cmd) >= 3:
                cur_x, cur_y = float(cmd[1]), float(cmd[2])
                points.append((cur_x, cur_y))
            elif op == "Q" and len(cmd) >= 5:
                cx, cy, ex, ey = float(cmd[1]), float(cmd[2]), float(cmd[3]), float(cmd[4])
                for step in range(1, 9):
                    t = step / 8.0
                    px = (1 - t) ** 2 * cur_x + 2 * (1 - t) * t * cx + t ** 2 * ex
                    py = (1 - t) ** 2 * cur_y + 2 * (1 - t) * t * cy + t ** 2 * ey
                    points.append((px, py))
                cur_x, cur_y = ex, ey

        if len(points) >= 2:
            draw.line(points, fill=stroke_color, width=stroke_w, joint="curve")
            drew_any = True
        elif len(points) == 1:
            px, py = points[0]
            r = max(stroke_w / 2.0, 1.5)
            draw.ellipse((px - r, py - r, px + r, py + r), fill=stroke_color)
            drew_any = True

    if not drew_any:
        return None
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def extract_signature_png(canvas_result) -> Optional[bytes]:
    if canvas_result is None:
        return None

    json_objects = []
    if getattr(canvas_result, "json_data", None):
        json_objects = canvas_result.json_data.get("objects", []) or []

    image_data = None
    try:
        image_data = canvas_result.image_data
    except Exception:
        image_data = None

    if image_data is not None:
        rgba = np.asarray(image_data, dtype=np.uint8)
        composited = None
        if rgba.ndim == 3 and rgba.shape[2] == 4:
            has_alpha_ink = bool(np.any(rgba[:, :, 3] > 0))
            if not json_objects and not has_alpha_ink:
                return None
            img = Image.fromarray(rgba)
            white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
            composited = Image.alpha_composite(white_bg, img).convert("RGB")
        elif rgba.ndim == 3 and rgba.shape[2] == 3:
            composited = Image.fromarray(rgba)

        if composited is not None:
            arr = np.asarray(composited)
            if not np.all(arr >= 250):
                buf = io.BytesIO()
                composited.save(buf, format="PNG")
                return buf.getvalue()

    try:
        raw_bytes = getattr(canvas_result, "image_bytes", None)
        if raw_bytes:
            with Image.open(io.BytesIO(raw_bytes)) as raw_img:
                rgba_img = raw_img.convert("RGBA")
                white_bg = Image.new("RGBA", rgba_img.size, (255, 255, 255, 255))
                composited = Image.alpha_composite(white_bg, rgba_img).convert("RGB")
                if not np.all(np.asarray(composited) >= 250):
                    buf = io.BytesIO()
                    composited.save(buf, format="PNG")
                    return buf.getvalue()
    except Exception:
        pass

    return _rasterize_fabric_paths(json_objects)


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
    page_title="Republic Hall - Fellow Agreement Portal",
    page_icon="🏛️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

init_db()

st.markdown(
    """
    <style>
        .stApp {
            background-color: #F9F8F4;
        }
        [data-testid="stSidebar"], [data-testid="stSidebarCollapsedControl"], [data-testid="collapsedControl"] {
            display: none !important;
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
        .rh-done-box {
            background: #FFFFFF;
            border: 2px solid #22C55E;
            border-radius: 14px;
            padding: 2.5rem 1.5rem;
            margin: 1.25rem 0;
            text-align: center;
        }
        .rh-tick {
            width: 150px;
            height: 150px;
            line-height: 150px;
            margin: 0 auto 1.25rem auto;
            border-radius: 50%;
            background: #22C55E;
            color: #FFFFFF;
            font-size: 5.5rem;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
        }
        .rh-done-title {
            color: #15803D;
            font-size: 2rem;
            font-weight: 800;
            margin: 0;
        }
        .rh-done-name {
            color: #334155;
            font-size: 1.05rem;
            margin-top: 0.5rem;
            margin-bottom: 0;
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


def start_new_agreement() -> None:
    """Callback: clear the finished screen and the form fields for the next Fellow."""
    st.session_state.last_submission = None
    st.session_state.canvas_reset_key += 1
    st.session_state.pop("fellow_select", None)
    st.session_state.pop("staff_id_input", None)


fellows_rows = fetch_fellows()


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
                Select your name, enter your Staff ID and sign to complete your Fellow agreement.
            </p>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

tab_verify, tab_list = st.tabs(["Fellow Agreement", "See Current List"])


# ==============================================================================
# Tab 1: Step-by-Step Workflow
# ==============================================================================
with tab_verify:
    if st.session_state.last_submission:
        # ---- Completed screen: big green tick only ----
        sub = st.session_state.last_submission
        st.markdown(
            f"""
            <div class="rh-done-box">
                <div class="rh-tick">&#10003;</div>
                <p class="rh-done-title">Completed</p>
                <p class="rh-done-name">{html.escape(sub['full_name'])}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.button("Register Another Fellow", on_click=start_new_agreement)
    else:
        fellow_names = [name for _, name in fellows_rows]

        st.markdown("#### Step 1: Search & Select Fellow Name")
        selected_fellow = st.selectbox(
            "Fellow Full Name",
            options=fellow_names,
            index=None,
            placeholder="Search Fellow Name",
            label_visibility="collapsed",
            key="fellow_select",
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
                canvas_kwargs = {
                    "fill_color": "rgba(255, 255, 255, 0)",
                    "stroke_width": 3,
                    "stroke_color": "#0B1F3A",
                    "background_color": "#FFFFFF",
                    "height": 190,
                    "width": 620,
                    "drawing_mode": "freedraw",
                    "key": f"signature_canvas_{st.session_state.canvas_reset_key}",
                }
                if "return_image_data" in inspect.signature(st_canvas).parameters:
                    canvas_kwargs["return_image_data"] = True
                canvas_result = st_canvas(**canvas_kwargs)
            with col_actions:
                if st.button("Clear / Reset Signature", use_container_width=True):
                    st.session_state.canvas_reset_key += 1
                    st.rerun()

            st.markdown("#### Step 4: Confirm")
            if st.button("Confirm & Submit", type="primary", use_container_width=True):
                sig_png = extract_signature_png(canvas_result)
                if not selected_fellow:
                    st.error("Please select a Fellow name in Step 1.")
                elif not staff_id.strip():
                    st.error("Please enter your Staff ID Number in Step 2.")
                elif sig_png is None:
                    st.error("Please draw your signature on the signature pad before confirming.")
                else:
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    record_id = save_submission(selected_fellow, staff_id.strip(), sig_png, now_str)
                    st.session_state.last_submission = {
                        "record_id": record_id,
                        "full_name": selected_fellow,
                    }
                    st.rerun()


# ==============================================================================
# Tab 2: Public "See Current List" (no PIN)
# ==============================================================================
with tab_list:
    st.markdown("### Current List")
    registered = fetch_registered_list()
    st.metric("Fellows who have completed the agreement", f"{len(registered)} of {len(fellows_rows)}")

    list_df = pd.DataFrame(
        [
            {"No.": i, "Full Name": r["full_name"], "Date & Time Signed": r["timestamp"]}
            for i, r in enumerate(registered, start=1)
        ],
        columns=["No.", "Full Name", "Date & Time Signed"],
    )

    if registered:
        st.dataframe(list_df, hide_index=True)
    else:
        st.info("No one has registered yet.")

    st.download_button(
        label="Download List",
        data=list_df.to_csv(index=False).encode("utf-8"),
        file_name="republic_hall_current_list.csv",
        mime="text/csv",
        use_container_width=True,
    )
