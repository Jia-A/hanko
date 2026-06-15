# Hanko - PDF Stamp Tool

A web application for creating, extracting, and analyzing stamps (hanko/seals) from PDF documents using AI-powered recognition and PDF manipulation.

## Features

- **Stamp Creation**: Generate stamps from text input with customizable styling
- **PDF Stamp Insertion**: Add created stamps to PDF documents
- **Stamp Extraction**: Extract stamps and seals from uploaded PDF files
- **AI Analysis**: Use Google's Gemini API to read and analyze stamp content (supports multiple languages including kanji)
- **Stamp Storage**: Save and manage created stamps locally in the browser
- **Image Compression**: Automatic image compression for optimal performance
- **Real-time Preview**: See stamp results immediately with live updates

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19, TypeScript)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **PDF Processing**: 
  - [pdf-lib](https://pdf-lib.js.org/) - PDF creation and manipulation
  - [pdfjs-dist](https://mozilla.github.io/pdf.js/) - PDF viewing and extraction
- **AI**: [Google Generative AI](https://ai.google.dev/) (Gemini API)
- **Image Processing**: 
  - [Sharp](https://sharp.pixelplumbing.com/) - Server-side image optimization
  - [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) - Client-side compression
- **Build Tools**: ESLint, PostCSS
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Google Gemini API key (for stamp analysis features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hanko
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Copy PDF worker file:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The app will auto-reload as you make changes to `app/page.tsx` and other files.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── api/                          # API routes
│   │   ├── extract/route.ts          # Remove background from stamp images
│   │   ├── read-stamp/route.ts       # AI analysis of stamps
│   │   └── convert-name/route.ts     # Convert a name to kanji via AI
│   ├── components/                   # React components
│   │   ├── PdfStampTool.tsx          # Main PDF stamp insertion tool
│   │   ├── StampCreator.tsx          # Stamp creation interface
│   │   ├── UploadZone.tsx            # File upload handler
│   │   ├── ResultPreview.tsx         # Results display
│   │   ├── Navbar.tsx                # Top navigation bar
│   │   ├── Section.tsx               # Layout section wrapper
│   │   ├── Button.tsx                # Reusable button component
│   │   ├── Logo.tsx                  # App logo
│   │   └── ThemeToggle.tsx           # Light/dark theme switch
│   ├── pdf-tool/page.tsx             # PDF stamping tool page
│   ├── page.tsx                      # Home page
│   ├── layout.tsx                    # Root layout
│   ├── sitemap.ts                    # Sitemap generation for SEO
│   ├── icon.svg                      # App icon / favicon
│   └── globals.css                   # Global styles
├── lib/
│   └── stampStorage.ts               # Local storage utilities for stamps
├── public/
│   └── pdf.worker.min.mjs            # PDF.js worker (required for PDF processing)
├── next.config.ts                    # Next.js configuration
├── postcss.config.mjs                # PostCSS / Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── eslint.config.mjs                 # ESLint configuration
```

## API Routes

### `/api/extract` (POST)
Removes the background from an uploaded stamp image using edge-seeded flood-fill color detection (powered by Sharp). Returns the processed image as a transparent PNG.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `image` | File | The image to process |

**Response:** binary `image/png` (transparent background)

### `/api/read-stamp` (POST)
Uses Google's Gemini AI (`gemini-2.5-flash`) to analyze and read stamp content.

**Request:**
```json
{
  "imageBase64": "base64_encoded_image",
  "mimeType": "image/png"
}
```

**Response:**
```json
{
  "reading": "Analysis of stamp content including any readable text"
}
```

### `/api/convert-name` (POST)
Converts a name into Japanese kanji (max 3 characters) suitable for a personal hanko, using Gemini AI (`gemini-2.0-flash`).

**Request:**
```json
{
  "name": "Text to convert"
}
```

**Response:**
```json
{
  "converted": "漢字"
}
```

## Key Components

### StampCreator
Handles stamp creation with customizable text and styling options.

### PdfStampTool
Manages PDF file handling and stamp insertion into documents.

### UploadZone
Drag-and-drop file upload interface for PDFs and images.

### ResultPreview
Displays extracted stamps and AI analysis results.

## Local Storage

Stamps are saved to browser localStorage under the key `hanko_stamps`. Each stamp is stored as:
```json
{
  "id": "unique_id",
  "data": "base64_image_data"
}
```

Use the `stampStorage.ts` utilities:
- `saveStamp(base64)` - Save a new stamp (prepended to the list, with an auto-generated id)
- `getStamps()` - Retrieve all saved stamps
- `deleteStamp(id)` - Remove a stamp by id

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Generative AI API key for stamp analysis | Yes |

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Performance Optimizations

- **Image Compression**: Images are compressed both server-side (Sharp) and client-side
- **PDF Worker**: Serves the PDF.js worker locally from `public/` for efficient PDF processing
- **Next.js Optimization**: Leverages automatic code splitting and per-route optimization

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 15+
- Edge 90+

## Troubleshooting

### PDF Worker Not Found
Make sure `pdf.worker.min.mjs` exists in the `public/` folder. If missing, run:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

### Gemini API Errors
- Verify `GEMINI_API_KEY` is correctly set in `.env.local`
- Check API key permissions and quota limits in Google Cloud Console
- Ensure the API is enabled for your project

### Large File Processing
- Browser compression reduces image size before upload
- Sharp on the server further optimizes during processing
- Consider splitting very large PDFs before uploading

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## License

This project is private. Please contact the maintainer for licensing information.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [Google Generative AI Docs](https://ai.google.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
