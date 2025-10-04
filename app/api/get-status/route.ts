import { Storage } from "@google-cloud/storage";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return Response.json({ error: "jobId is required" }, { status: 400 });
    }

    // Get configuration from environment
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

    if (!bucketName) {
      return Response.json(
        { error: "Server configuration incomplete" },
        { status: 500 }
      );
    }

    // Parse credentials if provided as JSON string
    let credentials;
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      } catch (_e) {
        console.error("Failed to parse GOOGLE_CLOUD_CREDENTIALS");
      }
    }

    // Initialize Cloud Storage client
    const storage = new Storage({
      credentials,
    });

    const bucket = storage.bucket(bucketName);
    const fileName = `${jobId}_report.csv`;
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();

    if (!exists) {
      return Response.json({
        status: "pending",
        message: "Patent search is still in progress",
      });
    }

    // File exists, generate signed URL for download
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Get file metadata
    const [metadata] = await file.getMetadata();
    const fileSizeKB = Math.round(Number(metadata.size || 0) / 1024);

    return Response.json({
      status: "completed",
      downloadUrl: signedUrl,
      fileName,
      fileSize: `${fileSizeKB} KB`,
      message: "Patent search completed successfully",
    });
  } catch (error) {
    console.error("Error checking status:", error);
    return Response.json(
      { error: "Failed to check job status" },
      { status: 500 }
    );
  }
}