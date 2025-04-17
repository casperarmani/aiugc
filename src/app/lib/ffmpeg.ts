import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import path from "path";
import fs from "fs/promises";
import { dir } from "tmp-promise";

// Configure ffmpeg to use static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}
if (ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export interface StitchOptions {
  clips: string[];
  outputDir?: string;
  fileName?: string;
}

export async function stitchVideos({ 
  clips, 
  outputDir, 
  fileName = "final.mp4" 
}: StitchOptions): Promise<string> {
  try {
    // Create temp directory if outputDir not provided
    const tempDirObj = !outputDir ? await dir({ unsafeCleanup: true }) : null;
    const outputPath = outputDir 
      ? path.join(outputDir, fileName) 
      : path.join(tempDirObj!.path, fileName);
    
    // Create concat file
    const concatFilePath = path.join(tempDirObj?.path || outputDir!, "concat.txt");
    const concatContent = clips
      .map(clip => `file '${clip.replace(/'/g, "'\\''")}'`)
      .join("\n");
    
    await fs.writeFile(concatFilePath, concatContent);
    
    // Stitch videos
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy"])
        .output(outputPath)
        .on("end", () => {
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`Error stitching videos: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error("Error stitching videos:", error);
    throw error;
  }
}

export async function compressImage(
  inputPath: string, 
  quality: number = 90
): Promise<string> {
  try {
    const tempDirObj = await dir({ unsafeCleanup: true });
    const outputPath = path.join(tempDirObj.path, "compressed.png");
    
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .outputOptions([`-quality ${quality}`])
        .output(outputPath)
        .on("end", () => {
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`Error compressing image: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}