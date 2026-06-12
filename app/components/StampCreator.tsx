"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "./Button";

const STYLES = {
  Mincho: "'Noto Serif JP', serif",
  Gothic: "'Noto Sans JP', sans-serif",
  Tensho: "'Noto Serif JP', serif", // bold weight for Tensho
};

type StyleKey = keyof typeof STYLES;

export default function StampCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<StyleKey>("Mincho");

  const [converting, setConverting] = useState(false);
  const [lastConverted, setLastConverted] = useState("");

async function handleNameBlur() {
  if (!name || name === lastConverted) return;
  if (/[\u3040-\u9fff]/.test(name)) return;

  setConverting(true);
  try {
    const res = await fetch("/api/convert-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const { converted } = await res.json();
    if (converted) {
      setName(converted);
      setLastConverted(converted);
    }
  } catch {
    // silently fail
  } finally {
    setConverting(false);
  }
}

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 85;

    // Clear
    ctx.clearRect(0, 0, size, size);

    if (!name) return;

    // Pull the seal color from the active theme's accent token
    const seal =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#c6442b";

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = seal;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
    ctx.strokeStyle = seal;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    const fontSize = name.length > 4 ? 28 : 36;
    ctx.font = `${fontSize}px ${STYLES[style]}`;
    ctx.fillStyle = seal;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, cx, cy);

    const fontWeight = style === "Tensho" ? "bold" : "normal";
    ctx.font = `${fontWeight} ${fontSize}px ${STYLES[style]}`;
  }, [name, style]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `hanko-${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleSaveToGallery() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const { saveStamp } = require("@/lib/stampStorage");
    saveStamp(dataUrl);
    alert("Saved to gallery!");
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mono mb-2 block text-xs text-muted">name</label>
          <input
            type="text"
            placeholder="Tanaka · Jiya"
            value={converting ? "Converting…" : name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            disabled={converting}
            className="w-full rounded-none border border-border bg-surface px-4 py-2.5 text-sm text-foreground transition-shadow placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
          />
          <p className="mono mt-1.5 text-[11px] text-muted">
            Latin names are auto-converted to kanji on blur.
          </p>
        </div>

        <div>
          <label className="mono mb-2 block text-xs text-muted">style</label>
          <div className="flex gap-2">
            {(Object.keys(STYLES) as StyleKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`eyebrow flex-1 border py-2.5 transition-colors ${
                  style === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {name && (
          <div className="flex gap-2 pt-1">
            <Button onClick={handleDownload} variant="secondary" className="flex-1">
              Download PNG
            </Button>
            <Button onClick={handleSaveToGallery} variant="primary" className="flex-1">
              Save to Gallery
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center rounded-none border border-border bg-surface p-6">
        <canvas ref={canvasRef} className="checker rounded-none" />
      </div>
    </div>
  );
}
