export interface KlingGenerationParams {
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  quality?: 'standard' | 'pro';
  numSamples?: number;
  imageUrl: string;
  tailImageUrl: string;
}

export interface KlingJob {
  id: string;
  status: string;
  videos?: string[];
}

// Base URLs for different providers
const BASE_URLS = {
  piapi: "https://api.piapi.ai/v1/kling",
  fal: "https://api.fal.ai/fal"
} as const;

// Use environment variable to determine which provider to use
const PROVIDER = (process.env.KLING_PROVIDER || 'piapi') as keyof typeof BASE_URLS;

// Helper to handle 429 rate limit responses with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1, delay = 10000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If rate limited and we have retries left
    if (response.status === 429 && maxRetries > 0) {
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, maxRetries - 1, delay * 2);
    }
    
    return response;
  } catch (error) {
    if (maxRetries > 0) {
      console.error(`Fetch error. Retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, maxRetries - 1, delay * 2);
    }
    throw error;
  }
}

// PiAPI implementation
async function createPiAPIJob(params: KlingGenerationParams): Promise<KlingJob> {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) {
    throw new Error("PIAPI_KEY environment variable is not set");
  }
  
  const response = await fetchWithRetry(`${BASE_URLS.piapi}/task`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_version: "2.0-master",
      prompt: params.prompt,
      duration: params.duration || 5,
      aspect_ratio: params.aspectRatio || "9:16",
      quality: params.quality || "standard", // cheaper than "pro"
      num_samples: params.numSamples || 2,
      image_url: params.imageUrl,
      tail_image_url: params.tailImageUrl
    })
  }, 1, 10000);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PiAPI job: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return {
    id: data.task_id,
    status: mapPiAPIStatus(data.status)
  };
}

async function pollPiAPIJob(jobId: string): Promise<KlingJob> {
  const apiKey = process.env.PIAPI_KEY;
  if (!apiKey) {
    throw new Error("PIAPI_KEY environment variable is not set");
  }
  
  const response = await fetchWithRetry(`${BASE_URLS.piapi}/task/${jobId}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey
    }
  }, 1, 10000);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to poll PiAPI job: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return {
    id: jobId,
    status: mapPiAPIStatus(data.status),
    videos: data.video_url ? [data.video_url] : undefined
  };
}

// Status mapping helper for PiAPI
function mapPiAPIStatus(status: string): string {
  switch (status) {
    case 'QUEUED':
      return 'pending';
    case 'RUNNING':
      return 'processing';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return status.toLowerCase();
  }
}

// Provider-agnostic functions
export async function createKlingJob(params: KlingGenerationParams): Promise<KlingJob> {
  try {
    // Currently only supporting PiAPI
    if (PROVIDER === 'piapi') {
      return await createPiAPIJob(params);
    }
    
    // Fallback option for future implementation
    throw new Error(`Provider ${PROVIDER} not supported`);
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
}

export async function pollKlingJob(jobId: string): Promise<KlingJob> {
  try {
    // Currently only supporting PiAPI
    if (PROVIDER === 'piapi') {
      return await pollPiAPIJob(jobId);
    }
    
    // Fallback option for future implementation
    throw new Error(`Provider ${PROVIDER} not supported`);
  } catch (error) {
    console.error("Error polling job:", error);
    throw error;
  }
}