"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "./Button";

interface PdfRegionPickerProps {
  file: File;
  onRegionSelected: (region: Blob | null) => void;
}

type Rect = { x: number; y: number; w: number; h: number };

// Ignore accidental clicks / tiny drags (in CSS pixels)
const MIN_SELECTION = 8;

export default function PdfRegionPicker({ file, onRegionSelected }: PdfRegionPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [selection, setSelection] = useState<Rect | null>(null);

  // Load the document
  useEffect(() => {
    let cancelled = false;
    let destroyTask: (() => void) | null = null;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = await file.arrayBuffer();
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
  }, [file]);

  // Render the current page at 2x so the cropped stamp stays sharp
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let cancelRender: (() => void) | null = null;

    (async () => {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;

      const viewport = page.getViewport({ scale: 2 });
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

  function goToPage(n: number) {
    setPageNum(n);
    setSelection(null);
    onRegionSelected(null);
  }

  function pointFromEvent(e: React.PointerEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    dragStart.current = p;
    setSelection({ ...p, w: 0, h: 0 });
    onRegionSelected(null);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = dragStart.current;
    if (!start) return;
    const p = pointFromEvent(e);
    setSelection({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }

  function handlePointerUp() {
    dragStart.current = null;
    if (!selection || selection.w < MIN_SELECTION || selection.h < MIN_SELECTION) {
      setSelection(null);
      return;
    }
    cropSelection(selection);
  }

  function cropSelection(sel: Rect) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // The canvas is scaled down by CSS — map the selection back to canvas pixels
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const out = document.createElement("canvas");
    out.width = Math.round(sel.w * scale);
    out.height = Math.round(sel.h * scale);
    out
      .getContext("2d")
      ?.drawImage(
        canvas,
        sel.x * scale,
        sel.y * scale,
        sel.w * scale,
        sel.h * scale,
        0,
        0,
        out.width,
        out.height,
      );
    out.toBlob((blob) => onRegionSelected(blob), "image/png");
  }

  if (error) {
    return <p className="mt-5 text-sm text-accent">{error}</p>;
  }

  return (
    <div className="mt-5 rounded-none border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="eyebrow text-muted">[ drag a box around the stamp ]</p>
        {pdf && pdf.numPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goToPage(pageNum - 1)}
              disabled={pageNum <= 1}
              aria-label="Previous page"
            >
              ←
            </Button>
            <span className="mono text-xs text-muted">
              {pageNum} / {pdf.numPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goToPage(pageNum + 1)}
              disabled={pageNum >= pdf.numPages}
              aria-label="Next page"
            >
              →
            </Button>
          </div>
        )}
      </div>

      <div
        className="relative inline-block max-w-full cursor-crosshair touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} className="block max-w-full border border-border" />
        {selection && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-accent bg-accent/10"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
            }}
          />
        )}
      </div>
    </div>
  );
}
