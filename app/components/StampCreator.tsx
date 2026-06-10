"use client";

import { useRef, useEffect, useState } from "react";

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

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#cc0000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    const fontSize = name.length > 4 ? 28 : 36;
    ctx.font = `${fontSize}px ${STYLES[style]}`;
    ctx.fillStyle = "#cc0000";
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
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-4">AI Stamp Creator</h2>
      <div className="flex flex-col gap-4 max-w-sm">
        <input
          type="text"
          placeholder="Enter your name (e.g. Tanaka, Jiya, علي)"
          value={converting ? "Converting..." : name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          disabled={converting}
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
        />
        <div className="flex gap-2">
          {(Object.keys(STYLES) as StyleKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                style === s
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-xl"
            style={{
              background:
                "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px",
            }}
          />
        </div>
        {name && (
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 bg-gray-800 text-white py-2 rounded-xl text-sm hover:bg-gray-900"
            >
              Download PNG
            </button>
            <button
              onClick={handleSaveToGallery}
              className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600"
            >
              Save to Gallery
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
