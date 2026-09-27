"use client";

import { useState, useRef, useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "./Button";
import { getStamps } from "@/lib/stampStorage";

function FilePicker({
  label,
  hint,
  accept,
  fileName,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  fileName: string | null;
  onPick: (f: File) => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer flex-col gap-2 rounded-none border border-border bg-surface p-4 transition-colors hover:border-accent/60">
      <span className="mono text-xs text-muted">{label}</span>
      <span className="truncate text-sm text-foreground" title={fileName ?? undefined}>
        {fileName ?? <span className="text-muted">{hint}</span>}
      </span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

type Stamp = { src: string; name: string; isObjectUrl: boolean };

// Stamp position and width are stored as fractions of the page, so the
// on-screen preview and the exported PDF always agree regardless of zoom.
const DEFAULT_WIDTH = 0.17;
const MIN_WIDTH = 0.05;
const MAX_WIDTH = 0.5;

async function imageToPngBytes(img: HTMLImageElement): Promise<ArrayBuffer> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")?.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode stamp");
  return blob.arrayBuffer();
}

export default function PdfStampTool() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [stampPos, setStampPos] = useState({ x: 0.1, y: 0.1 });
  const [stampWidth, setStampWidth] = useState(DEFAULT_WIDTH);
  const [gallery, setGallery] = useState<{ id: string; data: string }[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the document
  useEffect(() => {
    if (!pdfFile) return;
    let cancelled = false;
    let destroyTask: (() => void) | null = null;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = await pdfFile.arrayBuffer();
        if (cancelled) return;
        const task = pdfjsLib.getDocument({ data });
        destroyTask = () => task.destroy();
        const doc = await task.promise;
        if (!cancelled) setPdf(doc);
      } catch {
        if (!cancelled) setError("Couldn't open this PDF.");
      }
    })();

    return () => {
      cancelled = true;
      destroyTask?.();
    };
  }, [pdfFile]);

  // Render the current page
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let cancelRender: (() => void) | null = null;

    (async () => {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;

      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const task = page.render({ canvas, viewport });
      cancelRender = () => task.cancel();
      try {
        await task.promise;
      } catch {
        // Render was cancelled by a page change — nothing to do
      }
    })();

    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [pdf, pageNum]);

  function handlePdfPicked(f: File) {
    setPdfFile(f);
    setPdf(null);
    setPageNum(1);
    setError(null);
  }

  function replaceStamp(next: Stamp) {
    if (stamp?.isObjectUrl) URL.revokeObjectURL(stamp.src);
    setStamp(next);
    setStampPos({ x: 0.1, y: 0.1 });
    setError(null);
  }

  function handleStampPicked(f: File) {
    replaceStamp({ src: URL.createObjectURL(f), name: f.name, isObjectUrl: true });
  }

  function toggleGallery() {
    setGallery((g) => (g ? null : getStamps()));
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const s = e.currentTarget.getBoundingClientRect();
    const maxX = 1 - s.width / box.width;
    const maxY = 1 - s.height / box.height;
    setStampPos({
      x: Math.min(Math.max((e.clientX - box.left - dragOffset.current.x) / box.width, 0), maxX),
      y: Math.min(Math.max((e.clientY - box.top - dragOffset.current.y) / box.height, 0), maxY),
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleDownload = async () => {
    const img = stampRef.current;
    if (!pdfFile || !img) return;
    setDownloading(true);
    setError(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
      const stampImage = await pdfDoc.embedPng(await imageToPngBytes(img));

      const page = pdfDoc.getPage(pageNum - 1);
      const { width, height } = page.getSize();
      const w = stampWidth * width;
      const h = w * (img.naturalHeight / img.naturalWidth);

      // pdf-lib uses a bottom-left origin, the preview uses top-left — flip Y
      page.drawImage(stampImage, {
        x: stampPos.x * width,
        y: height - stampPos.y * height - h,
        width: w,
        height: h,
      });

      const bytes = await pdfDoc.save();
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFile.name.replace(/\.pdf$/i, "") + "-stamped.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't create the stamped PDF. Try a different stamp image.");
    } finally {
      setDownloading(false);
    }
  };

  const numPages = pdf?.numPages ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20">
      <section className="py-12">
        <p className="eyebrow mb-3 text-accent">[ PDF stamp tool ]</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stamp a PDF
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Load a PDF and a stamp, drag the seal into place, then export the
          stamped document. Everything runs locally in your browser.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <FilePicker
          label="01 · document"
          hint="Choose a PDF…"
          accept="application/pdf"
          fileName={pdfFile?.name ?? null}
          onPick={handlePdfPicked}
        />
        <FilePicker
          label="02 · stamp"
          hint="Choose an image…"
          accept="image/*"
          fileName={stamp?.name ?? null}
          onPick={handleStampPicked}
        />
      </div>
      <div className="mt-2 flex sm:justify-end">
        <button
          onClick={toggleGallery}
          className="mono text-xs text-muted underline underline-offset-2 hover:text-accent"
        >
          {gallery ? "hide gallery" : "or pick a stamp from your gallery"}
        </button>
      </div>

      {gallery && (
        <div className="mt-4 rounded-none border border-border bg-surface p-4">
          {gallery.length === 0 ? (
            <p className="text-sm text-muted">
              No saved stamps yet. Extract or create one in the Studio first.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {gallery.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    replaceStamp({ src: s.data, name: `Gallery stamp ${i + 1}`, isObjectUrl: false });
                    setGallery(null);
                  }}
                  className="checker border border-border p-1 transition-colors hover:border-accent"
                  aria-label={`Use gallery stamp ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.data} alt="" className="h-14 w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pdfFile && (
        <div className="mt-6 rounded-none border border-border bg-surface">
          {/* Controls stay visible while scrolling tall pages */}
          <div className="sticky top-[61px] z-40 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-surface p-4">
            {numPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPageNum(pageNum - 1)}
                  disabled={pageNum <= 1}
                  aria-label="Previous page"
                >
                  ←
                </Button>
                <span className="mono text-xs text-muted">
                  page {pageNum} / {numPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPageNum(pageNum + 1)}
                  disabled={pageNum >= numPages}
                  aria-label="Next page"
                >
                  →
                </Button>
              </div>
            )}

            {stamp ? (
              <>
                <label className="mono flex items-center gap-2 text-xs text-muted">
                  size
                  <input
                    type="range"
                    min={MIN_WIDTH}
                    max={MAX_WIDTH}
                    step={0.01}
                    value={stampWidth}
                    onChange={(e) => {
                      const w = Number(e.target.value);
                      setStampWidth(w);
                      setStampPos((p) => ({ ...p, x: Math.min(p.x, 1 - w) }));
                    }}
                    className="w-28 accent-[var(--accent)]"
                  />
                </label>
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  variant="primary"
                  size="sm"
                  className="ml-auto"
                >
                  {downloading ? "Stamping…" : "Download stamped PDF"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-accent">
                Now choose a stamp image above, or pick one from your gallery.
              </p>
            )}
          </div>

          <div className="p-4">
            {stamp && (
              <p className="eyebrow mb-3 text-muted">[ drag the stamp to position it ]</p>
            )}
            {error && <p className="mb-3 text-sm text-accent">{error}</p>}
            <div
              ref={containerRef}
              className="relative inline-block max-w-full overflow-hidden border border-border"
            >
              <canvas ref={canvasRef} className="block max-w-full" />

              {stamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={stampRef}
                  src={stamp.src}
                  alt="stamp"
                  draggable={false}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute touch-none select-none"
                  style={{
                    left: `${stampPos.x * 100}%`,
                    top: `${stampPos.y * 100}%`,
                    width: `${stampWidth * 100}%`,
                    height: "auto",
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
