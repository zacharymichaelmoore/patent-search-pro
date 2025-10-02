// app/api/get-related-terms/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Make sure to set your GEMINI_API_KEY in your .env.local file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { term } = await request.json();

    if (!term) {
      return NextResponse.json(
        { error: "Search term is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `
      Given the technical or patent-related search term '${term}', generate a list of 5 to 7 closely related technical synonyms or alternative phrases that could be used in a patent search.
      Return the result as a clean JSON array of strings.
      For example, for the term 'photovoltaic cell', you might return: ["solar cell", "solar panel", "PV module", "photoelectric cell", "solar energy converter"].
      Do not include the original term in the list. Only return the JSON array itself, without any surrounding text or markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up the response to ensure it's valid JSON
    const jsonArrayString = text.replace(/```json|```/g, "").trim();
    const relatedTerms = JSON.parse(jsonArrayString);

    return NextResponse.json(relatedTerms);
  } catch (error) {
    console.error("Error generating related terms:", error);
    return NextResponse.json(
      { error: "Failed to generate related terms" },
      { status: 500 }
    );
  }
}