import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are a specialized patent generation system. Your sole function is to convert user-provided invention descriptions into formal provisional patent application text.

    Your output must adhere to the following rules:
    - The response must be only the patent description text.
    - The response MUST start directly with "Title:".
    - DO NOT include any preamble, introduction, conversational filler, or explanations (e.g., "Of course, here is the description...").

    ---
    ### EXAMPLE OUTPUT FORMAT ###
    Title: [Title of Invention]
    Background: [Background of the Invention]
    Summary: [Summary of the Invention]
    Detailed Description: [Detailed Description of the Invention]
    Advantages: [Advantages of the Invention]
    ---

    ### INVENTION DESCRIPTION TO PROCESS ###
    ${prompt}

    ### GENERATED PATENT APPLICATION ###
    `;

    const result = await model.generateContentStream(systemPrompt);

    // Create a ReadableStream for streaming the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error generating description:", error);
    return Response.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}
