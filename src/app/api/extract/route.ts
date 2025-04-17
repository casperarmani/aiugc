import { NextRequest, NextResponse } from "next/server";
import { downloadTikTokVideo } from "../../lib/tiktok";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Server-side authorization check - only allow internal requests
    const authHeader = request.headers.get("Authorization");
    
    if (authHeader !== "internal") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: "Missing TikTok URL" },
        { status: 400 }
      );
    }

    // Download TikTok video and extract frames
    const extractedFrames = await downloadTikTokVideo(url);
    
    // Convert frames to base64 for response
    const startFrame = await fs.readFile(extractedFrames.frames.start);
    const middleFrame = await fs.readFile(extractedFrames.frames.middle);
    const endFrame = await fs.readFile(extractedFrames.frames.end);
    
    return NextResponse.json({
      tempDir: extractedFrames.tempDir,
      videoPath: extractedFrames.videoPath,
      frames: {
        start: {
          path: extractedFrames.frames.start,
          base64: `data:image/png;base64,${startFrame.toString("base64")}`
        },
        middle: {
          path: extractedFrames.frames.middle,
          base64: `data:image/png;base64,${middleFrame.toString("base64")}`
        },
        end: {
          path: extractedFrames.frames.end,
          base64: `data:image/png;base64,${endFrame.toString("base64")}`
        }
      }
    });
  } catch (error: any) {
    console.error("Error in extract route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}