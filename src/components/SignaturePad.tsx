import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean, dataUrl: string | null) => void;
  resetSignal?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  resetSignal = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState<boolean>(false);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(Math.floor(rect.width), 300);
    const height = Math.max(Math.floor(rect.height), 180);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#0B1F3A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initializeCanvas();
    setHasStroke(false);
    onSignatureChange(false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, initializeCanvas]);

  const getRelativeCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getRelativeCoords(e);
    isDrawingRef.current = true;
    lastPointRef.current = pt;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0B1F3A';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const pt = getRelativeCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
    if (!hasStroke) {
      setHasStroke(true);
    }
  };

  const finalizeStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHasStroke(true);
    onSignatureChange(true, canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    initializeCanvas();
    setHasStroke(false);
    onSignatureChange(false, null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-[#0B1F3A]">
          Electronic Signature Pad
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C59B27]"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Clear / Reset</span>
        </button>
      </div>

      <div
        className="relative rounded-lg border-2 border-dashed border-[#0B1F3A]/30 bg-white overflow-hidden"
        data-has-signature={hasStroke ? 'true' : 'false'}
      >
        <canvas
          ref={canvasRef}
          data-testid="signature-canvas"
          aria-label="Electronic signature drawing pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizeStroke}
          onPointerCancel={finalizeStroke}
          className="w-full h-48 block cursor-crosshair touch-none select-none"
        />

        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
            <span className="text-sm font-medium">Sign here using mouse, trackpad, or touch</span>
            <span className="text-xs mt-1">Deep navy ink on crisp archival white</span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 inset-x-8 border-b border-slate-200"
        />
      </div>

      <p className="text-xs text-slate-500">
        {hasStroke
          ? 'Signature captured. Click Clear / Reset if you wish to sign again.'
          : 'A signature is required before generating your official PDF receipt.'}
      </p>
    </div>
  );
};
