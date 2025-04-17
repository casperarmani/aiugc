import { getTikTokVideo } from "@prevter/tiktok-scraper";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { dir } from "tmp-promise";

const execAsync = promisify(exec);

export interface ExtractedFrames {
  videoPath: string;
  frames: {
    start: string;
    middle: string;
    end: string;
  };
  tempDir: string;
}

export async function downloadTikTokVideo(url: string): Promise<ExtractedFrames> {
  try {
    // Create temp directory
    const tempDir = await dir({ unsafeCleanup: true });
    
    // Download TikTok video
    const videoData = await getTikTokVideo(url);
    if (!videoData.video) {
      throw new Error("Failed to extract video URL from TikTok");
    }
    
    const videoPath = path.join(tempDir.path, "original.mp4");
    const response = await fetch(videoData.video);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(videoPath, Buffer.from(buffer));
    
    // Extract video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    
    // Calculate frame timestamps
    const startTime = 0;
    const middleTime = Math.min(5, duration / 2);
    const endTime = Math.min(10, duration);
    
    // Extract frames
    const startFrame = path.join(tempDir.path, "start.png");
    const middleFrame = path.join(tempDir.path, "middle.png");
    const endFrame = path.join(tempDir.path, "end.png");
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -ss ${startTime} -vframes 1 "${startFrame}"`
    );
    await execAsync(
      `ffmpeg -i "${videoPath}" -ss ${middleTime} -vframes 1 "${middleFrame}"`
    );
    await execAsync(
      `ffmpeg -i "${videoPath}" -ss ${endTime} -vframes 1 "${endFrame}"`
    );
    
    return {
      videoPath,
      frames: {
        start: startFrame,
        middle: middleFrame,
        end: endFrame,
      },
      tempDir: tempDir.path,
    };
  } catch (error) {
    console.error("Error downloading TikTok video:", error);
    throw error;
  }
}