import { NextRequest, NextResponse } from "next/server";
import { createKlingJob, pollKlingJob } from "../../lib/kling";
import pLimit from "p-limit";

// Limit concurrent Kling jobs to 1 (PiAPI caps at 1 task per key per 3s)
const limit = pLimit(1);

// Add delay between job submissions for rate limit compliance
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    // Server-side authorization check - only allow internal requests
    const authHeader = request.headers.get("Authorization");
    
    if (authHeader !== "internal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const {
      prompt,
      imageUrl,
      tailImageUrl,
      duration = 5,
      aspectRatio = "9:16",
      numSamples = 2
    } = await request.json();
    
    if (!prompt || !imageUrl || !tailImageUrl) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Create Kling job with rate limiting
    const job = await limit(async () => {
      // Add 3s delay before submission to comply with PiAPI rate limits
      await delay(3000);
      
      return await createKlingJob({
        prompt,
        imageUrl,
        tailImageUrl,
        duration,
        aspectRatio,
        numSamples,
        quality: "standard" // Use standard quality ($0.16 per clip) instead of pro
      });
    });
    
    return NextResponse.json({ jobId: job.id });
  } catch (error: any) {
    console.error("Error in kling create route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Server-side authorization check - only allow internal requests
    const authHeader = request.headers.get("Authorization");
    
    if (authHeader !== "internal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get job ID from URL
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 }
      );
    }

    // Poll Kling job
    const job = await pollKlingJob(jobId);
    
    return NextResponse.json(job);
  } catch (error: any) {
    console.error("Error in kling poll route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}