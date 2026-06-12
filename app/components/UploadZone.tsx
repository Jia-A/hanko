"use client";

import { useState, useRef } from "react";

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
}

export default function UploadZone({ onImageSelected }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    onImageSelected(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`group cursor-pointer rounded-none border border-dashed p-10 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent/5"
          : "border-border bg-surface hover:border-accent/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="mx-auto max-h-64 rounded-none"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-border bg-surface-2 text-muted transition-colors group-hover:text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
          </div>
          <p className="text-sm text-foreground">
            Drop a stamp image, or{" "}
            <span className="text-accent underline underline-offset-2">browse</span>
          </p>
          <p className="mono text-xs text-muted">PNG · JPG · any image</p>
        </div>
      )}
    </div>
  );
}
