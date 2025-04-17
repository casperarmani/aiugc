import { NextRequest, NextResponse } from "next/server";
import { stitchVideos } from "../../lib/ffmpeg";
import fs from "fs/promises";
import { dir } from "tmp-promise";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Check admin token
    const authHeader = request.headers.get("Authorization");
    const adminToken = process.env.ADMIN_TOKEN;
    
    if (!authHeader || !adminToken || !authHeader.includes(adminToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse request body
    const { clips } = await request.json();
    
    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json(
        { error: "Missing clips array" },
        { status: 400 }
      );
    }

    // Create temp directory for final video
    const tempDirObj = await dir({ unsafeCleanup: true });
    
    // Download videos to local temp storage if they are URLs
    const localClips = await Promise.all(
      clips.map(async (clip, index) => {
        if (clip.startsWith("http")) {
          const response = await fetch(clip);
          const buffer = await response.arrayBuffer();
          const localPath = path.join(tempDirObj.path, `clip_${index}.mp4`);
          await fs.writeFile(localPath, Buffer.from(buffer));
          return localPath;
        }
        return clip;
      })
    );
    
    // Stitch videos
    const outputPath = await stitchVideos({
      clips: localClips,
      outputDir: tempDirObj.path,
      fileName: "final.mp4"
    });
    
    // Read the final video
    const videoBuffer = await fs.readFile(outputPath);
    
    // Clean up temp files
    // Note: We'll use a cleanup function in production but skip for now
    
    // Return the final video
    return new Response(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "attachment; filename=final.mp4"
      }
    });
  } catch (error: any) {
    console.error("Error in stitch route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}