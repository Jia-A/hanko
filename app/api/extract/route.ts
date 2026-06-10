import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data);
  const visited = new Uint8Array(width * height);

  function getPixel(idx: number) {
    return {
      r: pixels[idx * channels],
      g: pixels[idx * channels + 1],
      b: pixels[idx * channels + 2],
    };
  }

  function colorDiff(
    r1: number, g1: number, b1: number,
    r2: number, g2: number, b2: number
  ) {
    return Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2)
    );
  }

  function makeTransparent(idx: number) {
    pixels[idx * channels + 3] = 0;
  }

  // Flood fill from edges
  const threshold = 80;
  const queue: number[] = [];

  // Seed from all edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(x); // top row
    queue.push((height - 1) * width + x); // bottom row
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width); // left col
    queue.push(y * width + (width - 1)); // right col
  }

  // Sample background color from top-left corner area
  const sampleIdx = 0;
  const { r: bgR, g: bgG, b: bgB } = getPixel(sampleIdx);

  while (queue.length > 0) {
    const idx = queue.pop()!;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const { r, g, b } = getPixel(idx);
    if (colorDiff(r, g, b, bgR, bgG, bgB) < threshold) {
      makeTransparent(idx);

      const x = idx % width;
      const y = Math.floor(idx / width);

      if (x > 0) queue.push(idx - 1);
      if (x < width - 1) queue.push(idx + 1);
      if (y > 0) queue.push(idx - width);
      if (y < height - 1) queue.push(idx + width);
    }
  }

  const result = await sharp(Buffer.from(pixels.buffer as ArrayBuffer), {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();

  return new NextResponse(result.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": "attachment; filename=stamp.png",
    },
  });
}