// app/api/start-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { searchTerms, userDescription } = await request.json();

    if (!userDescription || !searchTerms) {
      return NextResponse.json(
        { error: "searchTerms and userDescription are required" },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const VM_URL = process.env.PATENT_SEARCH_VM_URL;
    const VM_SECRET = process.env.VM_AUTH_SECRET;

    if (!VM_URL || !VM_SECRET) {
      return NextResponse.json(
        { error: "Server configuration incomplete" },
        { status: 500 }
      );
    }

    // This is now a "fire-and-forget" call. We trigger the VM but don't wait for it to finish.
    fetch(`${VM_URL}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth-Token": VM_SECRET,
      },
      body: JSON.stringify({
        userDescription,
        topK: 100,
        jobId, // Pass the jobId to the VM
      }),
    }).catch((err) => {
      // Log the error but don't block the response to the user.
      // The user will see the job as "pending" and the backend can handle the failure.
      console.error(`[${jobId}] Failed to trigger VM search:`, err);
    });

    // Immediately return the jobId to the user so they can go to the status page.
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Error in start-search:", error);
    return NextResponse.json(
      { error: "Failed to initiate search job" },
      { status: 500 }
    );
  }
}
