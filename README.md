# 印 hanko - Digital Seal Studio

A small web studio for Japanese-style stamps (hanko / seals). Pull a seal out of an image or a PDF, generate one from a name, read it with AI, and stamp it onto a PDF.

**Live:** [hankostudio.vercel.app](https://hankostudio.vercel.app)

## Features

### Extract a stamp
- Upload an **image** (PNG, JPG, …) or a **PDF** by drag-and-drop or file picker
- For PDFs: browse pages, then **drag a box around the stamp** to crop it
- The background is removed on the server, leaving the seal on a transparent background
- Download the result as **PNG** or **SVG**; it's also saved to your gallery automatically

### Stamp gallery
- Every extracted or created stamp is saved locally in your browser (no account, no upload to storage)
- **Read stamp**: Gemini AI reads the characters (kanji, latin or any script), translates them, and identifies the stamp type (personal hanko, company seal, signature, …)
- Delete stamps you no longer need

### AI stamp creator
- Type a name and get a circular, double-ringed hanko rendered live on a canvas
- **Latin names are auto-converted to kanji** (max 3 characters) using Gemini AI; names already in kanji/kana are kept as-is
- Three font styles: **Mincho**, **Gothic** and **Tensho**
- Download as PNG or save to the gallery

### PDF stamp tool (`/pdf-tool`)
- Load a PDF, then upload a stamp image (any format) or **pick one from your gallery**
- Choose the page, drag the stamp into position (mouse or touch) and adjust its size
- Download the stamped PDF. Processing happens entirely in the browser

### Other
- Light / dark theme toggle (follows the system preference by default, no flash on load)
- SEO: generated `sitemap.xml` and Google site verification

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **PDF**:
  - [pdfjs-dist](https://mozilla.github.io/pdf.js/) - rendering PDF pages in the browser
  - [pdf-lib](https://pdf-lib.js.org/) - embedding stamps into PDFs
- **Image processing**: [Sharp](https://sharp.pixelplumbing.com/) - server-side background removal
- **AI**: [Google Generative AI](https://ai.google.dev/) (Gemini API)
- **Deployment**: [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites
- Node.js 20.9+ (required by Next.js 16)
- npm
- A Google Gemini API key (only needed for the AI features: reading stamps and name → kanji conversion)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Jia-A/hanko.git
cd hanko
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. The PDF.js worker is committed at `public/pdf.worker.min.mjs`. If you upgrade `pdfjs-dist`, copy the matching worker again:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts          # Remove the background from a stamp image
│   │   ├── read-stamp/route.ts       # AI reading of a stamp
│   │   └── convert-name/route.ts     # Convert a name to kanji via AI
│   ├── components/
│   │   ├── UploadZone.tsx            # Drag-and-drop upload for images and PDFs
│   │   ├── PdfRegionPicker.tsx       # PDF page viewer + crop box for selecting a stamp
│   │   ├── StampCreator.tsx          # Canvas-based stamp generator
│   │   ├── PdfStampTool.tsx          # Place a stamp on any PDF page and export it
│   │   ├── Navbar.tsx                # Top navigation bar
│   │   ├── Section.tsx               # Numbered layout section
│   │   ├── Button.tsx                # Button / LinkButton components
│   │   ├── Logo.tsx                  # App logo
│   │   └── ThemeToggle.tsx           # Light/dark theme switch
│   ├── pdf-tool/page.tsx             # PDF stamp tool page
│   ├── page.tsx                      # Home: extract, gallery, creator
│   ├── layout.tsx                    # Root layout, fonts, theme script, metadata
│   ├── sitemap.ts                    # Sitemap generation
│   ├── icon.svg                      # Favicon
│   └── globals.css                   # Theme tokens and global styles
├── lib/
│   └── stampStorage.ts               # localStorage helpers for the gallery
└── public/
    └── pdf.worker.min.mjs            # PDF.js worker
```

## How extraction works

1. **Image input** is sent as-is. **PDF input** is rendered in the browser with pdf.js at 2× scale; the area you select is cropped into a PNG.
2. The image is posted to `/api/extract`, where Sharp reads its raw pixels.
3. A flood fill starts from every edge pixel and makes transparent every connected pixel whose color is close to the top-left pixel's color (Euclidean RGB distance < 80).
4. The result is returned as a transparent PNG.

Because the fill only reaches background connected to the edges, enclosed areas (such as paper inside a ring) stay opaque. For best results, crop tightly around the stamp on a plain background.

## API Routes

### `POST /api/extract`
Removes the background from a stamp image.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `image` | File | The image to process |

**Response:** `image/png` with a transparent background, or `400` if no image is provided.

### `POST /api/read-stamp`
Reads and describes a stamp using Gemini (`gemini-2.5-flash`).

**Request:**
```json
{
  "imageBase64": "raw base64 (no data: prefix)",
  "mimeType": "image/png"
}
```
`mimeType` is optional and defaults to `image/png`.

**Response:**
```json
{
  "reading": "Readable text, its meaning, and the stamp type"
}
```
Errors return `{ "error": "..." }` with status `400` or `500`.

### `POST /api/convert-name`
Converts a name to kanji (max 3 characters) suitable for a personal hanko, using Gemini (`gemini-2.0-flash`).

**Request:**
```json
{
  "name": "Tanaka"
}
```

**Response:**
```json
{
  "converted": "田中"
}
```
On failure, `converted` is `null`.

## Local Storage

| Key | Contents |
|-----|----------|
| `hanko_stamps` | Array of saved stamps: `{ "id": "<timestamp>", "data": "<data URL>" }`, newest first |
| `theme` | `"light"` or `"dark"` |

Helpers in `lib/stampStorage.ts`:
- `saveStamp(dataUrl)` - add a stamp to the start of the list
- `getStamps()` - return all saved stamps
- `deleteStamp(id)` - remove a stamp

Stamps are stored in full as data URLs, so browser storage limits (usually about 5 MB) cap how many you can keep.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Generative AI key used by `/api/read-stamp` and `/api/convert-name` | For AI features |

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

## Known Limitations

- The PDF stamp tool places one stamp per export, on one page. To stamp several pages, stamp the downloaded file again.
- Background removal samples a single background color, so noisy or gradient backgrounds may leave artifacts.

## Troubleshooting

### PDF won't render
Make sure `public/pdf.worker.min.mjs` exists and matches the installed `pdfjs-dist` version (see step 4 of Installation).

### "Read stamp" or name conversion does nothing
- Check that `GEMINI_API_KEY` is set in `.env.local` and restart the dev server
- Check your key's quota in [Google AI Studio](https://aistudio.google.com/)
- Server logs show the underlying Gemini error

## License

This project is private. Please contact the maintainer for licensing information.
