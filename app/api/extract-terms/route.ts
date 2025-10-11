import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let documentText: string | null = null;
  
  try {
    const body = await request.json();
    documentText = body.documentText;

    if (!documentText || typeof documentText !== "string") {
      return Response.json(
        { error: "documentText is required and must be a string" },
        { status: 400 }
      );
    }

    // Don't process very short text
    if (documentText.trim().length < 20) {
      // Clear sensitive data before returning
      documentText = null;
      return Response.json({
        deviceTerms: [],
        technologyTerms: [],
        subjectTerms: [],
      });
    }

    const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
    const documentLength = documentText.length;

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

    console.log(`Processing document of length: ${documentLength} characters`);

    // Call Ollama API
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        prompt: systemPrompt,
        stream: false,
        format: "json", // This tells Ollama to enforce JSON output
      }),
    });

    // Clear sensitive data immediately after sending to Ollama
    documentText = null;

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    let cleanedText = data.response.trim();

    // Clean up the response - remove markdown code blocks if present
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

    console.log(`Successfully extracted ${terms.deviceTerms.length + terms.technologyTerms.length + terms.subjectTerms.length} terms`);

    return Response.json(terms);
  } catch (error) {
    // Log error without exposing sensitive data
    console.error("Error extracting terms:", error instanceof Error ? error.message : error);
    return Response.json(
      { error: "Failed to extract terms" },
      { status: 500 }
    );
  } finally {
    // Ensure documentText is always cleared
    documentText = null;
  }
}
