import { NextRequest, NextResponse } from "next/server";
import { createFaceSwap, fetchFaceSwap } from "../../lib/faceswap";
import pLimit from "p-limit";

// Limit concurrent face swap requests to 3 (PiAPI allows ~3 qps per key)
const limiter = pLimit(3);

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    // Server-side authorization check - only allow internal requests
    const authHeader = request.headers.get("Authorization");
    
    if (authHeader !== "internal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const sourceImage = formData.get("sourceImage") as File;
    const targetImage = formData.get("targetImage") as File;
    
    if (!sourceImage || !targetImage) {
      return NextResponse.json(
        { error: "Missing source or target image" },
        { status: 400 }
      );
    }
    
    // Convert images to base64
    const sourceBuffer = Buffer.from(await sourceImage.arrayBuffer()); // Face to swap in
    const targetBuffer = Buffer.from(await targetImage.arrayBuffer()); // Frame to swap onto
    
    const sourceBase64 = sourceBuffer.toString("base64");
    const targetBase64 = targetBuffer.toString("base64");

    // Create face swap task with rate limiting
    const taskId = await limiter(async () => {
      try {
        return await createFaceSwap(targetBase64, sourceBase64);
      } catch (error: any) {
        // Handle rate limiting (429) with retry
        if (error.message.includes("429")) {
          console.log("Rate limited by PiAPI. Retrying after 10s delay...");
          await delay(10000);
          return await createFaceSwap(targetBase64, sourceBase64);
        }
        throw error;
      }
    });
    
    // Poll for face swap result
    const maxAttempts = 15;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Wait 3 seconds between polls
        await delay(3000);
        
        const result = await fetchFaceSwap(taskId);
        
        // If completed, return the result
        if (result.status === "COMPLETED" && result.url) {
          // Fetch the image from URL to get base64 (optional, PiAPI already gives URL)
          const response = await fetch(result.url);
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;
          
          return NextResponse.json({
            tempDir: null, // No local temp dir needed anymore
            swappedImagePath: result.url,
            base64
          });
        }
        
        // If failed, throw error
        if (result.status === "FAILED") {
          throw new Error("Face swap failed");
        }
        
        // PiAPI only returns QUEUED/RUNNING/FAILED/COMPLETED status codes
        
        // Otherwise continue polling
        console.log(`Face swap status: ${result.status}, attempt ${attempts}/${maxAttempts}`);
        
      } catch (error) {
        console.error("Error polling face swap:", error);
        
        // If we get a 429, wait longer but don't count as an attempt
        if (error instanceof Error && error.message.includes("429")) {
          console.log("Rate limited during polling. Waiting 10s...");
          await delay(10000);
          attempts--;
          continue;
        }
        
        // For other errors, just continue polling
        console.log(`Error on attempt ${attempts}/${maxAttempts}, continuing...`);
      }
    }
    
    // If we've reached max attempts without success
    throw new Error("Face swap timed out after multiple attempts");
  } catch (error: any) {
    console.error("Error in faceswap route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}