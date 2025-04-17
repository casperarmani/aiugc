import { NextRequest, NextResponse } from "next/server";
import { createKlingJob, pollKlingJob } from "../../lib/kling";
import pLimit from "p-limit";

// Limit concurrent Kling jobs to 2
const limit = pLimit(2);

export async function POST(request: NextRequest) {
  try {
    // Check admin token
    const authHeader = request.headers.get("Authorization");
    const adminToken = process.env.ADMIN_TOKEN;
    
    if (!authHeader || !adminToken || !authHeader.includes(adminToken)) {
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
    const job = await limit(() => createKlingJob({
      prompt,
      imageUrl,
      tailImageUrl,
      duration,
      aspectRatio,
      numSamples,
      mode: "pro",
      cfgScale: 0.5
    }));
    
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
    // Check admin token
    const authHeader = request.headers.get("Authorization");
    const adminToken = process.env.ADMIN_TOKEN;
    
    if (!authHeader || !adminToken || !authHeader.includes(adminToken)) {
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