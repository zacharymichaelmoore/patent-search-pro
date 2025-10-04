import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// This function will be called for each individual term in the batch.
async function getSynonymsForTerm(model: any, term: string): Promise<string[]> {
  try {
    const prompt = `Generate 5-7 technical synonyms or closely related phrases for the patent search term: "${term}".
    Your response MUST be a single, valid JSON array of strings and nothing else.
    Do not include the original term in the list. Do not include markdown or explanations.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Use a robust regex to find the JSON array within the response,
    // in case the model adds any conversational text.
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      // Successfully parsed the JSON array from the response.
      return JSON.parse(jsonMatch[0]);
    } else {
      console.warn(
        `Could not parse a valid JSON array from Gemini response for term: "${term}". Response was: ${text}`
      );
      return []; // Return an empty array if parsing fails for this term.
    }
  } catch (error) {
    console.error(`Gemini API call failed for term "${term}":`, error);
    // If the API call itself fails, return an empty array for this term.
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // 1. Expect an array of terms in the request body, not a single term.
    const { terms } = await request.json();

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return NextResponse.json(
        { error: "A non-empty array of 'terms' is required" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // Using a valid and current model name.

    const allRelatedTerms: Record<string, string[]> = {};

    // 2. Process the array of terms SEQUENTIALLY on the backend to avoid rate limiting.
    for (const term of terms) {
      const synonyms = await getSynonymsForTerm(model, term);
      allRelatedTerms[term] = synonyms;
    }

    // 3. Return a single JSON object containing all the results.
    // The shape is { "term1": ["syn1", "syn2"], "term2": ["syn3", "syn4"] }
    return NextResponse.json(allRelatedTerms);
  } catch (error) {
    console.error("An unexpected error occurred in get-related-terms:", error);
    return NextResponse.json(
      { error: "Failed to process the batch of related terms" },
      { status: 500 }
    );
  }
}
