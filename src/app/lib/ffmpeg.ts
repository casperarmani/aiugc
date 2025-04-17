import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs/promises";
import { dir } from "tmp-promise";

// Import ffprobe path from the installed location directly
// Detect OS and architecture
const platform = process.platform;
const arch = process.arch;

// Map platform to folder name
const platformMap: Record<string, string> = {
  'darwin': 'darwin',
  'win32': 'win32',
  'linux': 'linux',
};

// Map architecture to folder name
const archMap: Record<string, string> = {
  'x64': 'x64',
  'arm64': 'arm64',
  'ia32': 'ia32',
};

// Add .exe extension for Windows
const executableExt = platform === 'win32' ? '.exe' : '';
const platformFolder = platformMap[platform] || 'darwin';
const archFolder = archMap[arch] || 'x64';

// Build the path
const ffprobePath = path.join(
  process.cwd(), 
  'node_modules', 
  'ffprobe-static', 
  'bin', 
  platformFolder, 
  archFolder, 
  `ffprobe${executableExt}`
);

// Configure ffmpeg to use static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
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