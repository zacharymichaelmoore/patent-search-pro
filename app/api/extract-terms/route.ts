import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { documentText } = await request.json();

    if (!documentText || typeof documentText !== "string") {
      return Response.json(
        { error: "documentText is required and must be a string" },
        { status: 400 }
      );
    }

    // Don't process very short text
    if (documentText.trim().length < 20) {
      return Response.json({
        deviceTerms: [],
        technologyTerms: [],
        subjectTerms: [],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemPrompt = `You are an expert at analyzing patent documents and extracting relevant search terms for prior art searches.

Analyze the following patent description and extract three types of search terms:

1. **Device Terms**: Physical devices, apparatus, systems, or products mentioned (e.g., "smartphone", "sensor", "battery")
2. **Technology Terms**: Technologies, methods, processes, or technical concepts (e.g., "machine learning", "encryption", "wireless communication")
3. **Subject Terms**: Application domains, use cases, or fields of application (e.g., "healthcare", "automotive", "home automation")

Rules:
- Extract 3-8 terms for each category
- Use specific, searchable terms (not generic words like "invention" or "device")
- Terms should be relevant for patent database searches
- Return ONLY valid JSON, no markdown, no explanations
- Format: {"deviceTerms": ["term1", "term2"], "technologyTerms": ["term1", "term2"], "subjectTerms": ["term1", "term2"]}

Patent Description:
${documentText}

Return the extracted terms as JSON:`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\n?/, "").replace(/```\n?$/, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/, "").replace(/```\n?$/, "");
    }

    // Parse the JSON response
    const terms = JSON.parse(cleanedText);

    // Validate the structure
    if (
      !terms.deviceTerms ||
      !terms.technologyTerms ||
      !terms.subjectTerms ||
      !Array.isArray(terms.deviceTerms) ||
      !Array.isArray(terms.technologyTerms) ||
      !Array.isArray(terms.subjectTerms)
    ) {
      throw new Error("Invalid response structure from AI");
    }

    return Response.json(terms);
  } catch (error) {
    console.error("Error extracting terms:", error);
    return Response.json(
      { error: "Failed to extract terms" },
      { status: 500 }
    );
  }
}
