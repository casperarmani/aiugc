import { klingJWT } from "./jwt";

export interface KlingGenerationParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  mode?: string;
  numSamples?: number;
  cfgScale?: number;
  imageUrl: string;
  tailImageUrl: string;
}

export interface KlingJob {
  id: string;
  status: string;
  videos?: string[];
}

const KLING_API_URL = "https://open-api.klingai.com/api/v2/video/generation";

export async function createKlingJob(params: KlingGenerationParams): Promise<KlingJob> {
  try {
    const token = klingJWT();
    
    const response = await fetch(KLING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: "kling",
        task_type: "video_generation",
        input: {
          prompt: params.prompt,
          duration: params.duration || 5,
          aspect_ratio: params.aspectRatio || "9:16",
          mode: params.mode || "pro",
          num_samples: params.numSamples || 2,
          cfg_scale: params.cfgScale || 0.5,
          image_url: params.imageUrl,
          tail_image_url: params.tailImageUrl
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Kling job: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return {
      id: data.id,
      status: "pending"
    };
  } catch (error) {
    console.error("Error creating Kling job:", error);
    throw error;
  }
}

export async function pollKlingJob(jobId: string): Promise<KlingJob> {
  try {
    const token = klingJWT();
    
    const response = await fetch(`${KLING_API_URL}/${jobId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      // Check if unauthorized and refresh token if needed
      if (response.status === 401) {
        // Retry with new token
        return pollKlingJob(jobId);
      }
      
      const errorText = await response.text();
      throw new Error(`Failed to poll Kling job: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      id: jobId,
      status: data.status,
      videos: data.status === "completed" ? data.output.videos : undefined
    };
  } catch (error) {
    console.error("Error polling Kling job:", error);
    throw error;
  }
}