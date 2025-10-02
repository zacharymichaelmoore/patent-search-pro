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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemPrompt = `You are an expert patent attorney specializing in provisional patent applications. 
Your task is to transform a brief invention description into a comprehensive, professionally-written provisional patent description.

The description should include:
1. **Title**: A clear, descriptive title for the invention
2. **Background**: Context about the problem this invention solves
3. **Summary**: A concise overview of the invention
4. **Detailed Description**: A thorough explanation of how the invention works, its components, and its operation
5. **Advantages**: Key benefits and improvements over existing solutions

Write in formal, technical language appropriate for a patent application. Be specific and detailed.
User's invention description: ${prompt}

Generate a complete provisional patent description:`;

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
