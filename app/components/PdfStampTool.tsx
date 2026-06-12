"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./Button";

function FilePicker({
  label,
  hint,
  accept,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-2 rounded-none border border-border bg-surface p-4 transition-colors hover:border-accent/60">
      <span className="mono text-xs text-muted">{label}</span>
      <span className="truncate text-sm text-foreground">
        {file ? file.name : <span className="text-muted">{hint}</span>}
      </span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export default function PdfStampTool() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPos, setStampPos] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfFile) return;

    const renderPdf = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

     await (page.render as any)({ canvasContext: ctx, viewport, canvas: canvas }).promise;
    };

    renderPdf();
  }, [pdfFile]);

const handleMouseMove = (e: React.MouseEvent) => {
  if (!isDragging) return;
  e.preventDefault();
  const container = containerRef.current;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  setStampPos({
    x: e.clientX - rect.left - dragOffset.x,
    y: e.clientY - rect.top - dragOffset.y,
  });
};

const handleMouseUp = () => setIsDragging(false);


const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  const container = containerRef.current;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  setIsDragging(true);
  setDragOffset({
    x: e.clientX - rect.left - stampPos.x,
    y: e.clientY - rect.top - stampPos.y,
  });
};

  const stampSrc = stampFile ? URL.createObjectURL(stampFile) : null;

  const handleDownload = async () => {
  if (!pdfFile || !stampFile) return;

  const { PDFDocument } = await import("pdf-lib");

  const pdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const stampBytes = await stampFile.arrayBuffer();
  const mimeType = stampFile.type;

  let stampImage;
  if (mimeType === "image/png") {
    stampImage = await pdfDoc.embedPng(stampBytes);
  } else {
    stampImage = await pdfDoc.embedJpg(stampBytes);
  }

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const canvas = canvasRef.current;
  if (!canvas) return;

  const scaleX = firstPage.getWidth() / canvas.width;
  const scaleY = firstPage.getHeight() / canvas.height;

  const stampWidth = 100 * scaleX;
  const stampHeight = 100 * scaleY;

  // pdf-lib uses bottom-left origin, canvas uses top-left — flip Y
  const pdfX = stampPos.x * scaleX;
  const pdfY = firstPage.getHeight() - (stampPos.y * scaleY) - stampHeight;

  firstPage.drawImage(stampImage, {
    x: pdfX,
    y: pdfY,
    width: stampWidth,
    height: stampHeight,
  });

  const modifiedPdfBytes = await pdfDoc.save();
  const blob = new Blob([modifiedPdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "stamped.pdf";
  a.click();
  URL.revokeObjectURL(url);
};

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20">
      <section className="py-12">
        <p className="eyebrow mb-3 text-accent">[ PDF stamp tool ]</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stamp a PDF
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Load a PDF and a stamp image, drag the seal into place, then export the
          stamped document. Everything runs locally in your browser.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <FilePicker
          label="document"
          hint="Choose a PDF…"
          accept="application/pdf"
          file={pdfFile}
          onPick={setPdfFile}
        />
        <FilePicker
          label="stamp"
          hint="Choose an image…"
          accept="image/*"
          file={stampFile}
          onPick={setStampFile}
        />
      </div>

      {pdfFile && (
        <div className="mt-6 overflow-hidden rounded-none border border-border bg-surface p-4">
          <p className="eyebrow mb-3 text-muted">[ drag the stamp to position it ]</p>
          <div
            ref={containerRef}
            className="relative inline-block max-w-full overflow-hidden rounded-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <canvas ref={canvasRef} className="block max-w-full rounded-none border border-border" />

            {stampSrc && (
              <img
                ref={stampRef}
                src={stampSrc}
                alt="stamp"
                onMouseDown={handleMouseDown}
                className="select-none"
                style={{
                  position: "absolute",
                  left: stampPos.x,
                  top: stampPos.y,
                  width: 100,
                  height: 100,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              />
            )}
          </div>
        </div>
      )}

      {pdfFile && stampFile && (
        <Button
          onClick={handleDownload}
          variant="primary"
          className="mt-5 w-full py-3 sm:w-auto sm:px-8"
        >
          Download stamped PDF
        </Button>
      )}
    </main>
  );
}