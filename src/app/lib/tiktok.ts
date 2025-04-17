import { getTikTokVideo } from "@prevter/tiktok-scraper";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { dir } from "tmp-promise";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const execFileAsync = promisify(execFile);

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
    console.log("Calling getTikTokVideo with URL:", url);
    const videoData = await getTikTokVideo(url);
    console.log("TikTok video data received:", videoData.video ? "Video URL available" : "No video URL");
    
    if (!videoData.video) {
      throw new Error("Failed to extract video URL from TikTok");
    }
    
    const videoPath = path.join(tempDir.path, "original.mp4");
    console.log("Downloading video from:", videoData.video);
    console.log("Saving to path:", videoPath);
    
    const response = await fetch(videoData.video);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(videoPath, Buffer.from(buffer));
    console.log("Video downloaded and saved");
    
    // Extract video duration
    console.log("Getting video duration using ffprobe from:", ffprobeStatic.path);
    let duration = 10; // Default duration if we can't get it
    try {
      const { stdout: durationOutput } = await execFileAsync(
        ffprobeStatic.path,
        [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          videoPath,
        ]
      );
      console.log("Raw ffprobe output:", durationOutput);
      duration = parseFloat(durationOutput.trim());
      console.log("Parsed video duration:", duration);
    } catch (err) {
      console.error("FFprobe execution error:", err);
      console.log("Using default duration of 10 seconds");
    }
    
    // Calculate frame timestamps
    const startTime = 0;
    const middleTime = Math.min(5, duration / 2);
    const endTime = Math.min(10, duration);
    
    // Extract frames
    const startFrame = path.join(tempDir.path, "start.png");
    const middleFrame = path.join(tempDir.path, "middle.png");
    const endFrame = path.join(tempDir.path, "end.png");
    
    console.log("Extracting frames using ffmpeg from:", ffmpegStatic);
    console.log("Frame paths:", { startFrame, middleFrame, endFrame });
    
    try {
      console.log("Extracting start frame at time:", startTime);
      await execFileAsync(
        ffmpegStatic as string,
        [
          "-i", videoPath,
          "-ss", `${startTime}`,
          "-vframes", "1",
          startFrame,
        ]
      );
      console.log("Start frame extracted");
      
      console.log("Extracting middle frame at time:", middleTime);
      await execFileAsync(
        ffmpegStatic as string,
        [
          "-i", videoPath,
          "-ss", `${middleTime}`,
          "-vframes", "1",
          middleFrame,
        ]
      );
      console.log("Middle frame extracted");
      
      console.log("Extracting end frame at time:", endTime);
      await execFileAsync(
        ffmpegStatic as string,
        [
          "-i", videoPath,
          "-ss", `${endTime}`,
          "-vframes", "1",
          endFrame,
        ]
      );
      console.log("End frame extracted");
    } catch (err) {
      console.error("FFmpeg frame extraction error:", err);
      throw new Error(`Failed to extract frames: ${err.message}`);
    }
    
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