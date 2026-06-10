"use client";

import { useState, useRef, useEffect } from "react";

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
    <div>
      <h1>PDF Stamp Tool</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setStampFile(e.target.files?.[0] ?? null)}
      />

      <div
  ref={containerRef}
  style={{ position: "relative", display: "inline-block", overflow: "hidden" }}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
>
        <canvas ref={canvasRef} style={{ border: "1px solid black", display: "block" }} />

        {stampSrc && (
          <img
            ref={stampRef}
            src={stampSrc}
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              left: stampPos.x,
              top: stampPos.y,
              width: 100,
              height: 100,
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          />
        )}
      </div>
      {pdfFile && stampFile && (
  <button onClick={handleDownload}>
    Download Stamped PDF
  </button>
)}
    </div>
  );
}