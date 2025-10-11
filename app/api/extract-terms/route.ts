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
      documentText = null;
      return Response.json({
        deviceTerms: [],
        technologyTerms: [],
        subjectTerms: [],
      });
    }

    const VM_URL = process.env.PATENT_SEARCH_VM_URL || "http://localhost:8080";
    const VM_AUTH_SECRET = process.env.VM_AUTH_SECRET;

    if (!VM_AUTH_SECRET) {
      throw new Error("VM_AUTH_SECRET not configured");
    }

    console.log(
      `Processing document of length: ${documentText.length} characters`
    );

    // Call VM API
    const response = await fetch(`${VM_URL}/api/extract-terms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-auth-token": VM_AUTH_SECRET,
      },
      body: JSON.stringify({ documentText }),
    });

    // Clear sensitive data immediately after sending to VM
    documentText = null;

    if (!response.ok) {
      throw new Error(`VM API error: ${response.status}`);
    }

    const terms = await response.json();

    console.log(
      `Successfully extracted ${
        terms.deviceTerms.length +
        terms.technologyTerms.length +
        terms.subjectTerms.length
      } terms`
    );

    return Response.json(terms);
  } catch (error) {
    console.error(
      "Error extracting terms:",
      error instanceof Error ? error.message : error
    );
    return Response.json({ error: "Failed to extract terms" }, { status: 500 });
  } finally {
    documentText = null;
  }
}