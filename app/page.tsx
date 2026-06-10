"use client";

import { useEffect, useState } from "react";
import UploadZone from "./components/UploadZone";
import { saveStamp, getStamps, deleteStamp } from "@/lib/stampStorage";
import StampCreator from "./components/StampCreator";

function downloadSVG(dataUrl: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image href="${dataUrl}" />
</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stamp.svg";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stamps, setStamps] = useState<{ id: string; data: string }[]>([]);

  useEffect(() => {
    setStamps(getStamps());
  }, []);

  const [readings, setReadings] = useState<Record<string, string>>({});
  const [readingLoading, setReadingLoading] = useState<string | null>(null);

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function handleExtract() {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });

    const blob = await res.blob();
    setResultUrl(URL.createObjectURL(blob));
    const base64 = await blobToBase64(blob);
    saveStamp(base64);
    setStamps(getStamps());
    setLoading(false);
  }

  async function handleReadStamp(stamp: { id: string; data: string }) {
    setReadingLoading(stamp.id);
    try {
      // Strip the data URI prefix — Gemini wants raw base64
      const base64 = stamp.data.split(",")[1];
      const res = await fetch("/api/read-stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const { reading } = await res.json();
      setReadings((prev) => ({ ...prev, [stamp.id]: reading }));
    } catch {
      setReadings((prev) => ({ ...prev, [stamp.id]: "Failed to read stamp." }));
    } finally {
      setReadingLoading(null);
    }
  }

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Hanko</h1>
      <p className="text-center text-gray-500 mb-8">
        Extract stamps and seals from any image
      </p>

      <UploadZone onImageSelected={setFile} />

      {file && (
        <button
          onClick={handleExtract}
          disabled={loading}
          className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract Stamp"}
        </button>
      )}

      {resultUrl && (
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-3">Extracted stamp:</p>
          <img
            src={resultUrl}
            alt="extracted stamp"
            className="max-h-64 mx-auto"
            style={{
              background:
                "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px",
            }}
          />
          <a
            href={resultUrl}
            download="stamp.png"
            className="mt-4 inline-block bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900"
          >
            Download PNG
          </a>
          <button
            onClick={async () => {
              if (!resultUrl) return;
              const res = await fetch(resultUrl);
              const blob = await res.blob();
              const base64 = await blobToBase64(blob);
              downloadSVG(base64);
            }}
            className="mt-2 inline-block bg-white border border-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Download SVG
          </button>
        </div>
      )}

      {stamps.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Stamp Gallery</h2>
          <div className="grid grid-cols-3 gap-4">
            {stamps.map((stamp) => (
              <div
                key={stamp.id}
                className="relative group border rounded-xl p-2 flex flex-col gap-2"
                style={{
                  background:
                    "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 16px 16px",
                }}
              >
                <img
                  src={stamp.data}
                  alt="stamp"
                  className="w-full h-24 object-contain"
                />
                <button
                  onClick={() => handleReadStamp(stamp)}
                  disabled={readingLoading === stamp.id}
                  className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1 rounded-lg disabled:opacity-50"
                >
                  {readingLoading === stamp.id ? "Reading..." : "Read Stamp"}
                </button>
                {readings[stamp.id] && (
                  // In the JSX where you render readings[stamp.id]
                  <p
                    className="text-xs text-gray-700 bg-white rounded p-2 mt-1"
                    dangerouslySetInnerHTML={{
                      __html: readings[stamp.id]
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\n/g, "<br/>"),
                    }}
                  />
                )}
                <button
                  onClick={() => {
                    deleteStamp(stamp.id);
                    setStamps(getStamps());
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 items-center justify-center hidden group-hover:flex"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <StampCreator />
    </main>
  );
}
