"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Check, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

interface Props {
  userId: string;
  profileId: string;
  currentAvatarUrl?: string | null;
  initials: string;
  onUploaded: (url: string) => void;
}

const MAX_OUTPUT_SIZE = 480; // px — square crop output
const CANVAS_DISPLAY  = 280; // px — crop preview size

export default function AvatarUpload({ userId, profileId, currentAvatarUrl, initials, onUploaded }: Props) {
  const fileRef    = useRef<HTMLInputElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);

  const [stage, setStage] = useState<"idle" | "crop" | "uploading">("idle");
  const [imgSrc, setImgSrc]     = useState<string | null>(null);
  const [zoom, setZoom]         = useState(1);
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNat, setImgNat]     = useState({ w: 0, h: 0 });
  const [error, setError]       = useState<string | null>(null);

  // Draw crop preview whenever zoom/offset/image changes
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !imgSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = CANVAS_DISPLAY;
    canvas.height = CANVAS_DISPLAY;

    // Scaled dimensions
    const scale    = zoom;
    const drawW    = imgNat.w * scale * (CANVAS_DISPLAY / Math.max(imgNat.w, imgNat.h));
    const drawH    = imgNat.h * scale * (CANVAS_DISPLAY / Math.max(imgNat.w, imgNat.h));
    const drawX    = (CANVAS_DISPLAY - drawW) / 2 + offset.x;
    const drawY    = (CANVAS_DISPLAY - drawH) / 2 + offset.y;

    // Clear
    ctx.clearRect(0, 0, CANVAS_DISPLAY, CANVAS_DISPLAY);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_DISPLAY / 2, CANVAS_DISPLAY / 2, CANVAS_DISPLAY / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Dim outside circle
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_DISPLAY, CANVAS_DISPLAY);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(CANVAS_DISPLAY / 2, CANVAS_DISPLAY / 2, CANVAS_DISPLAY / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imgSrc, zoom, offset, imgNat]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File too large — max 5MB"); return; }
    setError(null);
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setImgNat({ w: img.naturalWidth, h: img.naturalHeight });
      imgRef.current = img;
      setStage("crop");
    };
    img.src = url;
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  // Drag handlers
  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
  function onPointerUp() { setDragging(false); }

  // Extract final square image from canvas, compress, upload
  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !imgSrc) return;
    setStage("uploading");
    setError(null);

    // Render final square at MAX_OUTPUT_SIZE
    const out    = document.createElement("canvas");
    out.width    = MAX_OUTPUT_SIZE;
    out.height   = MAX_OUTPUT_SIZE;
    const ctx    = out.getContext("2d")!;
    const scale  = zoom;
    const drawW  = imgNat.w * scale * (CANVAS_DISPLAY / Math.max(imgNat.w, imgNat.h));
    const drawH  = imgNat.h * scale * (CANVAS_DISPLAY / Math.max(imgNat.w, imgNat.h));
    const ratio  = MAX_OUTPUT_SIZE / CANVAS_DISPLAY;
    const drawX  = (CANVAS_DISPLAY - drawW) / 2 * ratio + offset.x * ratio;
    const drawY  = (CANVAS_DISPLAY - drawH) / 2 * ratio + offset.y * ratio;

    ctx.beginPath();
    ctx.arc(MAX_OUTPUT_SIZE / 2, MAX_OUTPUT_SIZE / 2, MAX_OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW * ratio, drawH * ratio);

    // Convert to Blob (JPEG, quality 0.85 → well under 500KB for 480px)
    const blob = await new Promise<Blob | null>(res =>
      out.toBlob(res, "image/jpeg", 0.85)
    );
    if (!blob) { setError("Failed to process image"); setStage("crop"); return; }

    try {
      const db   = getSupabase() as any;
      const path = `${userId}.jpg`;

      const { error: upErr } = await db.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = db.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust

      // Update profile
      const { error: profErr } = await db.from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profileId);
      if (profErr) throw profErr;

      URL.revokeObjectURL(imgSrc);
      setImgSrc(null);
      setStage("idle");
      onUploaded(publicUrl);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
      setStage("crop");
    }
  }

  function handleCancel() {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    setImgSrc(null);
    setStage("idle");
    setError(null);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
      >
        <Camera className="w-3.5 h-3.5 text-orange-400" />
        {currentAvatarUrl ? "Change Photo" : "Add Your Photo"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Crop modal */}
      {stage !== "idle" && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">Position your photo</p>
              <button onClick={handleCancel} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas crop area */}
            <div className="flex justify-center mb-4">
              <canvas
                ref={canvasRef}
                width={CANVAS_DISPLAY}
                height={CANVAS_DISPLAY}
                className="rounded-full cursor-grab active:cursor-grabbing touch-none"
                style={{ width: CANVAS_DISPLAY, height: CANVAS_DISPLAY }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
            </div>

            <p className="text-xs text-slate-500 text-center mb-3">Drag to reposition</p>

            {/* Zoom slider */}
            <div className="flex items-center gap-2 mb-4">
              <ZoomOut className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <input
                type="range" min={0.5} max={3} step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </div>

            {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}

            <div className="flex gap-2">
              <button onClick={handleCancel}
                className="flex-1 py-2 border border-slate-600 text-slate-400 text-sm font-semibold rounded-xl hover:border-slate-400 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={stage === "uploading"}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                {stage === "uploading"
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  : <><Check className="w-3.5 h-3.5" /> Save Photo</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
