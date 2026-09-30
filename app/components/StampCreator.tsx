"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "./Button";
import { saveStamp } from "@/lib/stampStorage";

const STYLES = {
  Mincho: "'Noto Serif JP', serif",
  Gothic: "'Noto Sans JP', sans-serif",
  Tensho: "'Noto Serif JP', serif", // bold weight for Tensho
};

type StyleKey = keyof typeof STYLES;

const CONVERT_DELAY_MS = 800;

export default function StampCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<StyleKey>("Mincho");

  const [converting, setConverting] = useState(false);
  const [lastConverted, setLastConverted] = useState("");

  // Bumped on every keystroke so a slow response for an older value is ignored
  const requestIdRef = useRef(0);
  const inFlightRef = useRef<string | null>(null);

  const convertName = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed === lastConverted) return;
      if (/[\u3040-\u9fff]/.test(trimmed)) return;
      if (inFlightRef.current === trimmed) return;

      const id = ++requestIdRef.current;
      inFlightRef.current = trimmed;
      setConverting(true);
      try {
        const res = await fetch("/api/convert-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        const { converted } = await res.json();
        if (id === requestIdRef.current && converted) {
          setName(converted);
          setLastConverted(converted);
        }
      } catch {
        // silently fail
      } finally {
        if (id === requestIdRef.current) {
          inFlightRef.current = null;
          setConverting(false);
        }
      }
    },
    [lastConverted],
  );

  // Convert automatically once the user pauses typing
  useEffect(() => {
    const timer = setTimeout(() => convertName(name), CONVERT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [name, convertName]);

  function handleNameChange(value: string) {
    requestIdRef.current++;
    inFlightRef.current = null;
    setConverting(false);
    setName(value);
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
    const fontWeight = style === "Tensho" ? "bold" : "normal";
    ctx.font = `${fontWeight} ${fontSize}px ${STYLES[style]}`;
    ctx.fillStyle = seal;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, cx, cy);
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
    saveStamp(dataUrl);
    alert("Saved to gallery!");
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mono mb-2 block text-xs text-muted">name</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Tanaka · Jiya"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => convertName(name)}
              onKeyDown={(e) => e.key === "Enter" && convertName(name)}
              className="w-full rounded-none border border-border bg-surface px-4 py-2.5 pr-10 text-sm text-foreground transition-shadow placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
            />
            {converting && (
              <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            )}
          </div>
          <p
            className={`mono mt-1.5 text-[11px] ${converting ? "text-accent" : "text-muted"}`}
            aria-live="polite"
          >
            {converting
              ? `Converting “${name}” to kanji…`
              : "Latin names are auto-converted to kanji as you type."}
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
            <Button onClick={handleDownload} variant="secondary" className="flex-1" disabled={converting}>
              Download PNG
            </Button>
            <Button onClick={handleSaveToGallery} variant="primary" className="flex-1" disabled={converting}>
              Save to Gallery
            </Button>
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-center rounded-none border border-border bg-surface p-6">
        <canvas
          ref={canvasRef}
          className={`checker rounded-none transition-opacity ${converting ? "opacity-20 blur-[2px]" : ""}`}
        />
        {converting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Spinner className="h-8 w-8 text-accent" />
            <span className="mono text-xs text-accent">Converting to kanji…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin motion-reduce:animate-none ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
