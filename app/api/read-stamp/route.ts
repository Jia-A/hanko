import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType = "image/png" } = await req.json();

    if (!imageBase64) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: `This is a stamp, seal, or signature extracted from a document. 
Please analyze it and tell me:
1. Any text or characters you can read (including kanji, latin, or any script)
2. What the text means if it's not English
3. What type of stamp this appears to be (personal hanko, company seal, signature, wax seal, etc.)
Keep the response concise and structured.`,
      },
    ]);

    return Response.json({ reading: result.response.text() });
  } catch (error) {
    console.error("Gemini error:", error);
    return Response.json({ error: "Failed to read stamp" }, { status: 500 });
  }
}