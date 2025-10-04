import { Storage } from "@google-cloud/storage";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

type SearchResult = {
  score: number | string;
  level: string;
  title: string;
  abstract: string;
  filingDate: string;
  reason: string;
};

export async function POST(request: NextRequest) {
  try {
    const { userDescription } = await request.json();

    if (!userDescription) {
      return Response.json(
        { error: "userDescription is required" },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const VM_URL = process.env.PATENT_SEARCH_VM_URL; // e.g., http://YOUR_VM_IP:8080

    if (!VM_URL) {
      return Response.json({ error: "VM URL not configured" }, { status: 500 });
    }

    console.log(`[${jobId}] Calling VM search service...`);

    // Call VM's search API
    const searchResponse = await fetch(`${VM_URL}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userDescription,
        topK: 100,
      }),
      // 5 minute timeout
      signal: AbortSignal.timeout(300000),
    });

    if (!searchResponse.ok) {
      throw new Error(`VM search failed: ${searchResponse.statusText}`);
    }

    const results = await searchResponse.json();
    console.log(
      `[${jobId}] Got ${results.count} results in ${results.durationMs}ms`
    );

    // Convert to CSV
    const csv = resultsToCSV(results.results);

    // Upload to Cloud Storage
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    let credentials;
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    }

    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName!);
    const fileName = `${jobId}_report.csv`;

    await bucket.file(fileName).save(csv, {
      contentType: "text/csv",
      metadata: { cacheControl: "no-cache" },
    });

    console.log(`[${jobId}] Uploaded results`);

    return Response.json({
      success: true,
      jobId,
      message: "Search complete",
      count: results.count,
      durationSeconds: Math.round(results.durationMs / 1000),
    });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Failed to complete search" },
      { status: 500 }
    );
  }
}

function resultsToCSV(results: SearchResult[]) {
  const headers = [
    "Risk Score",
    "Risk Level",
    "Title",
    "Abstract",
    "Filing Date",
    "Reasoning",
  ];

  const rows = results.map((r) =>
    [
      r.score || "N/A",
      r.level || "Unknown",
      r.title || "",
      r.abstract || "",
      r.filingDate || "",
      r.reason || "",
    ]
      .map((f) => `"${String(f).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
