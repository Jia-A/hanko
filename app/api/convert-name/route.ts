import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return Response.json({ converted: null });

    // const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(
      `Convert this name to Japanese kanji suitable for a personal hanko stamp.
Rules:
- Choose kanji with positive, meaningful readings
- Maximum 3 characters
- If the name is already in kanji/hiragana/katakana, return it as-is
- Return ONLY the kanji characters, nothing else, no explanation
Name: ${name}`,
    );

    const converted = result.response.text().trim();
    return Response.json({ converted });
  } catch (error) {
    console.error("Convert name error:", error);
    return Response.json({ converted: null });
  }
}
