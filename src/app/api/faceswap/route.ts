import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { dir } from "tmp-promise";
import { compressImage } from "../../lib/ffmpeg";

// This will be a proxy to the Python FaceFusion microservice
const FACESWAP_SERVICE_URL = process.env.FACESWAP_SERVICE_URL || "http://faceswap:8000";

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
    
    // Create temp directory for processing
    const tempDirObj = await dir({ unsafeCleanup: true });
    
    // Save files to temp directory
    const sourceImagePath = path.join(tempDirObj.path, "source.png");
    const targetImagePath = path.join(tempDirObj.path, "target.png");
    
    await fs.writeFile(sourceImagePath, Buffer.from(await sourceImage.arrayBuffer()));
    await fs.writeFile(targetImagePath, Buffer.from(await targetImage.arrayBuffer()));
    
    // Check file size and compress if necessary (> 10MB)
    const sourceStats = await fs.stat(sourceImagePath);
    const targetStats = await fs.stat(targetImagePath);
    
    let finalSourcePath = sourceImagePath;
    let finalTargetPath = targetImagePath;
    
    if (sourceStats.size > 10 * 1024 * 1024) {
      finalSourcePath = await compressImage(sourceImagePath);
    }
    
    if (targetStats.size > 10 * 1024 * 1024) {
      finalTargetPath = await compressImage(targetImagePath);
    }
    
    // Prepare request to FaceFusion microservice
    const formDataToSend = new FormData();
    formDataToSend.append("source", new Blob([await fs.readFile(finalSourcePath)]));
    formDataToSend.append("target", new Blob([await fs.readFile(finalTargetPath)]));
    
    // Send request to FaceFusion service
    const response = await fetch(`${FACESWAP_SERVICE_URL}/swap`, {
      method: "POST",
      body: formDataToSend
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FaceFusion service error: ${response.status} ${errorText}`);
    }
    
    // Save the swapped image to temp directory
    const swappedImageData = await response.arrayBuffer();
    const swappedImagePath = path.join(tempDirObj.path, "swapped.png");
    await fs.writeFile(swappedImagePath, Buffer.from(swappedImageData));
    
    // Return the swapped image
    return NextResponse.json({
      tempDir: tempDirObj.path,
      swappedImagePath,
      base64: `data:image/png;base64,${Buffer.from(swappedImageData).toString("base64")}`
    });
  } catch (error: any) {
    console.error("Error in faceswap route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}