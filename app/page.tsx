"use client";

import { useEffect, useState } from "react";
import UploadZone from "./components/UploadZone";
import { saveStamp, getStamps, deleteStamp } from "@/lib/stampStorage";
import StampCreator from "./components/StampCreator";
import PdfRegionPicker from "./components/PdfRegionPicker";
import Section from "./components/Section";
import { Button, LinkButton } from "./components/Button";

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
  // For PDFs, the user-selected crop around the stamp
  const [pdfRegion, setPdfRegion] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stamps, setStamps] = useState<{ id: string; data: string }[]>([]);

useEffect(() => {
  // localStorage is client-only; reading after mount avoids a hydration mismatch.
  // TODO: migrate to useSyncExternalStore.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const isPdf = file?.type === "application/pdf";

  function handleFileSelected(f: File) {
    setFile(f);
    setPdfRegion(null);
    setError(null);
  }

  async function handleExtract() {
    const source = isPdf ? pdfRegion : file;
    if (!source) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", source);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
      const base64 = await blobToBase64(blob);
      saveStamp(base64);
      setStamps(getStamps());
    } catch {
      setError("Extraction failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
      const { reading, error } = await res.json();
      setReadings((prev) => ({ ...prev, [stamp.id]: reading ?? error ?? "Failed to read stamp." }));
    } catch {
      setReadings((prev) => ({ ...prev, [stamp.id]: "Failed to read stamp." }));
    } finally {
      setReadingLoading(null);
    }
  }

  function renderReading(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {line.split("**").map((part, j) =>
        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
      )}
      <br />
    </span>
  ));
}

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20">
      {/* Hero */}
      <section className="py-16 sm:py-20">
        <p className="eyebrow mb-4 text-accent">[ digital seal studio ]</p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Make your mark.
          <br />
          <span className="text-muted">Extract, create &amp; apply seals.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted">
          hanko is a small, focused studio for Japanese-style stamps — pull a seal
          out of any image, generate one from a name, and stamp it onto a PDF.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <LinkButton href="#extract" variant="primary">
            Get started →
          </LinkButton>
          <LinkButton href="/pdf-tool" variant="secondary">
            PDF stamp tool
          </LinkButton>
        </div>
      </section>

      {/* 01 — Extract */}
      <div id="extract" className="scroll-mt-20">
        <Section
          index="01"
          title="Extract a stamp"
          subtitle="Upload an image or PDF — we isolate the seal on a transparent background."
        >
          <UploadZone onFileSelected={handleFileSelected} />

          {file && isPdf && (
            <PdfRegionPicker key={`${file.name}-${file.lastModified}`} file={file} onRegionSelected={setPdfRegion} />
          )}

          {file && (
            <Button
              onClick={handleExtract}
              disabled={loading || (isPdf && !pdfRegion)}
              variant="primary"
              fullWidth
              className="mt-5 py-3"
            >
              {loading
                ? "Extracting…"
                : isPdf && !pdfRegion
                  ? "Select the stamp on the page"
                  : "Extract stamp"}
            </Button>
          )}

          {error && <p className="mt-3 text-sm text-accent">{error}</p>}

          {resultUrl && (
            <div className="mt-8 rounded-none border border-border bg-surface p-6 text-center">
              <p className="eyebrow mb-4 text-muted">[ result ]</p>
              <img
                src={resultUrl}
                alt="extracted stamp"
                className="checker mx-auto max-h-64 rounded-none"
              />
              <div className="mt-5 flex justify-center gap-2">
                <LinkButton
                  href={resultUrl}
                  download="stamp.png"
                  variant="primary"
                  size="sm"
                >
                  Download PNG
                </LinkButton>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!resultUrl) return;
                    const res = await fetch(resultUrl);
                    const blob = await res.blob();
                    const base64 = await blobToBase64(blob);
                    downloadSVG(base64);
                  }}
                >
                  Download SVG
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* 02 — Gallery */}
      {stamps.length > 0 && (
        <Section
          index="02"
          title="Stamp gallery"
          subtitle="Saved locally in your browser. Read a seal to decode its kanji."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {stamps.map((stamp) => (
              <div
                key={stamp.id}
                className="group relative flex flex-col gap-2 rounded-none border border-border bg-surface p-3"
              >
                <div className="checker rounded-none">
                  <img
                    src={stamp.data}
                    alt="stamp"
                    className="h-24 w-full object-contain"
                  />
                </div>
                <Button
                  onClick={() => handleReadStamp(stamp)}
                  disabled={readingLoading === stamp.id}
                  variant="secondary"
                  fullWidth
                  className="rounded-none px-2 py-1.5 text-xs"
                >
                  {readingLoading === stamp.id ? "Reading…" : "Read stamp"}
                </Button>
                {readings[stamp.id] && (
                  <p className="rounded-none bg-surface-2 p-2 text-xs text-foreground">
  {renderReading(readings[stamp.id])}
</p>
                )}
                <button
                  onClick={() => {
                    deleteStamp(stamp.id);
                    setStamps(getStamps());
                  }}
                  aria-label="Delete stamp"
                  className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-accent text-sm text-white group-hover:flex"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Creator */}
      <Section
        index={stamps.length > 0 ? "03" : "02"}
        title="AI stamp creator"
        subtitle="Type a name and we render a circular hanko you can save or download."
      >
        <StampCreator />
      </Section>

      {/* PDF tool */}
      <Section
        index={stamps.length > 0 ? "04" : "03"}
        title="Apply to a PDF"
        subtitle="Take any stamp and drop it onto a document, then export the stamped PDF."
      >
        <div className="flex flex-col items-start gap-4 rounded-none border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Open the PDF stamp tool to position a seal and download a signed copy —
            all processed locally in your browser.
          </p>
          <LinkButton href="/pdf-tool" variant="primary" className="shrink-0">
            Open PDF stamp tool →
          </LinkButton>
        </div>
      </Section>
    </main>
  );
}
