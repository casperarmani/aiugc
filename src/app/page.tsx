"use client";

import { useState, useCallback, useEffect } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  addEdge, 
  applyEdgeChanges, 
  applyNodeChanges,
  Node,
  Edge,
  NodeTypes,
  Connection
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "./store";

// Custom node components
const TikTokNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[280px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">TikTok URL</h3>
    <input
      type="text"
      value={data.tikTokUrl}
      onChange={(e) => {
        console.log("Input changed to:", e.target.value);
        data.setTikTokUrl(e.target.value);
      }}
      placeholder="https://www.tiktok.com/@username/video/1234567890"
      className="w-full px-3 py-2 border rounded-md mb-2 bg-white text-gray-900"
    />
    <button 
      onClick={data.onExtract}
      className="px-4 py-2 bg-primary text-primary-foreground rounded w-full"
      disabled={data.isLoading}
    >
      {data.isLoading ? "Processing..." : "Extract Frames"}
    </button>
  </div>
);

const FramesNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[320px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Extracted Frames</h3>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {data.frames ? (
        <>
          <div 
            className={`border rounded p-1 ${data.selectedFrames.includes('start') ? 'border-primary border-2' : ''}`}
            onClick={() => data.onSelectFrame('start')}
          >
            <img 
              src={data.frames.start.base64} 
              alt="Start frame" 
              className="w-full aspect-[9/16] object-cover"
            />
            <p className="text-xs text-center mt-1">Start</p>
          </div>
          <div 
            className={`border rounded p-1 ${data.selectedFrames.includes('middle') ? 'border-primary border-2' : ''}`}
            onClick={() => data.onSelectFrame('middle')}
          >
            <img 
              src={data.frames.middle.base64} 
              alt="Middle frame" 
              className="w-full aspect-[9/16] object-cover"
            />
            <p className="text-xs text-center mt-1">Middle</p>
          </div>
          <div 
            className={`border rounded p-1 ${data.selectedFrames.includes('end') ? 'border-primary border-2' : ''}`}
            onClick={() => data.onSelectFrame('end')}
          >
            <img 
              src={data.frames.end.base64} 
              alt="End frame" 
              className="w-full aspect-[9/16] object-cover"
            />
            <p className="text-xs text-center mt-1">End</p>
          </div>
        </>
      ) : (
        <div className="col-span-3 bg-gray-200 p-4 text-center text-sm text-gray-700">
          No frames extracted yet
        </div>
      )}
    </div>
  </div>
);

const FaceUploadNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[280px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Face Upload</h3>
    <input
      type="file"
      accept="image/*"
      onChange={data.onFaceUpload}
      className="w-full px-3 py-2 border rounded-md mb-2 bg-white text-gray-900"
    />
    {data.faceImage && (
      <div className="mb-2">
        <img 
          src={URL.createObjectURL(data.faceImage)} 
          alt="Uploaded face" 
          className="w-full max-h-[150px] object-contain rounded"
        />
      </div>
    )}
  </div>
);

const FaceSwapNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[280px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Face Swap</h3>
    <button 
      onClick={data.onFaceSwap}
      className="px-4 py-2 bg-primary text-primary-foreground rounded w-full mb-2"
      disabled={data.isLoading || !data.canSwap}
    >
      {data.isLoading ? "Processing..." : "Swap Faces"}
    </button>
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(data.swappedFrames).map(([key, frame]: [string, any]) => (
        <div key={key} className="border rounded p-1">
          <img 
            src={frame.base64} 
            alt={`Swapped ${key} frame`} 
            className="w-full aspect-[9/16] object-cover"
          />
          <p className="text-xs text-center mt-1">{key}</p>
        </div>
      ))}
    </div>
  </div>
);

const CreativePromptNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[280px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Creative Prompt</h3>
    <textarea
      value={data.prompt}
      onChange={(e) => data.setPrompt(e.target.value)}
      placeholder="Describe your video scene, style, and mood..."
      className="w-full px-3 py-2 border rounded-md h-24 mb-2 bg-white text-gray-900"
    />
    <button 
      onClick={data.onGenerate}
      className="px-4 py-2 bg-primary text-primary-foreground rounded w-full"
      disabled={data.isLoading || !data.canGenerate}
    >
      {data.isLoading ? "Processing..." : "Generate Videos"}
    </button>
  </div>
);

const VideoResultsNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[320px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Generated Videos</h3>
    <div className="grid grid-cols-2 gap-2 mb-3">
      {Object.entries(data.generatedVideos).map(([key, video]: [string, any]) => (
        <div 
          key={key} 
          className={`border rounded p-1 ${data.selectedVideos.includes(key) ? 'border-primary border-2' : ''}`}
          onClick={() => data.onSelectVideo(key)}
        >
          {video.status === 'completed' && video.videos ? (
            <video 
              src={video.videos[0]} 
              controls 
              className="w-full aspect-[9/16] object-cover"
            />
          ) : (
            <div className="w-full aspect-[9/16] bg-gray-200 flex items-center justify-center">
              <p className="text-xs text-gray-700">{video.status}</p>
            </div>
          )}
          <p className="text-xs text-center mt-1">{key}</p>
        </div>
      ))}
    </div>
    <button 
      onClick={data.onStitch}
      className="px-4 py-2 bg-primary text-primary-foreground rounded w-full"
      disabled={data.isLoading || !data.canStitch}
    >
      {data.isLoading ? "Processing..." : "Stitch Selected Videos"}
    </button>
  </div>
);

const FinalVideoNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-gray-100 shadow-md w-[280px] text-gray-900">
    <h3 className="text-lg font-semibold mb-2">Final Video</h3>
    {data.finalVideoUrl ? (
      <div className="space-y-3">
        <video 
          src={data.finalVideoUrl} 
          controls 
          className="w-full aspect-[9/16] object-cover mb-2"
        />
        <a 
          href={data.finalVideoUrl} 
          download="final.mp4"
          className="px-4 py-2 bg-primary text-primary-foreground rounded block text-center"
        >
          Download Video
        </a>
      </div>
    ) : (
      <div className="w-full aspect-[9/16] bg-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-700">No final video yet</p>
      </div>
    )}
  </div>
);

// Define node types mapping
const nodeTypes: NodeTypes = {
  tiktokNode: TikTokNode,
  framesNode: FramesNode,
  faceUploadNode: FaceUploadNode,
  faceSwapNode: FaceSwapNode,
  promptNode: CreativePromptNode,
  videoResultsNode: VideoResultsNode,
  finalVideoNode: FinalVideoNode
};

export default function Home() {
  const store = useStore();
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      type: 'tiktokNode',
      data: { 
        tikTokUrl: store.tikTokUrl, 
        setTikTokUrl: store.setTikTokUrl,
        isLoading: store.isLoading,
        onExtract: async () => {
          // For debugging
          console.log("Extract button clicked, tikTokUrl:", store.tikTokUrl);
          
          if (!store.tikTokUrl || store.tikTokUrl.trim() === '') {
            store.setError("Please enter a TikTok URL");
            return;
          }
          
          store.setIsLoading(true);
          store.setError(null);
          
          try {
            // Call the extract API endpoint
            const response = await fetch('/api/extract', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'internal'
              },
              body: JSON.stringify({ url: store.tikTokUrl })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to extract frames');
            }
            
            // Parse the response
            const data = await response.json();
            
            // Update the store with extracted data
            store.setExtractedData({
              tempDir: data.tempDir,
              videoPath: data.videoPath,
              frames: data.frames
            });
          } catch (error: any) {
            store.setError(error.message || "Failed to extract frames");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 100, y: 100 },
    },
    {
      id: '2',
      type: 'framesNode',
      data: { 
        frames: store.frames,
        selectedFrames: store.selectedFrames,
        onSelectFrame: (key: string) => {
          if (store.selectedFrames.includes(key)) {
            store.unselectFrame(key);
          } else {
            store.selectFrame(key);
          }
        }
      },
      position: { x: 100, y: 300 },
    },
    {
      id: '3',
      type: 'faceUploadNode',
      data: { 
        faceImage: store.faceImage,
        onFaceUpload: (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            store.setFaceImage(files[0]);
          }
        }
      },
      position: { x: 450, y: 100 },
    },
    {
      id: '4',
      type: 'faceSwapNode',
      data: { 
        isLoading: store.isLoading,
        canSwap: store.faceImage !== null && store.selectedFrames.length > 0,
        swappedFrames: store.swappedFrames,
        onFaceSwap: async () => {
          if (!store.faceImage || store.selectedFrames.length === 0) {
            store.setError("Please upload a face image and select frames");
            return;
          }
          
          store.setIsLoading(true);
          store.setError(null);
          
          try {
            // Process each selected frame concurrently
            const swapPromises = store.selectedFrames.map(async (key) => {
              // Create FormData for the API request
              const formData = new FormData();
              formData.append('sourceImage', store.faceImage as File);
              
              // Get the target frame
              const targetImagePath = store.frames![key].path;
              
              // Fetch the image from the path and convert to a file object
              const targetImageResponse = await fetch(store.frames![key].base64);
              const targetImageBlob = await targetImageResponse.blob();
              const targetFile = new File([targetImageBlob], `target_${key}.png`, { type: 'image/png' });
              formData.append('targetImage', targetFile);
              
              // Call faceswap API
              const response = await fetch('/api/faceswap', {
                method: 'POST',
                headers: {
                  'Authorization': 'internal'
                },
                body: formData
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to swap face for ${key} frame`);
              }
              
              // Parse the response
              const data = await response.json();
              
              // Update the store with the swapped frame
              store.setSwappedFrame(key, {
                path: data.swappedImagePath,
                base64: data.base64
              });
              
              return key;
            });
            
            // Wait for all swaps to complete
            await Promise.all(swapPromises);
            
          } catch (error: any) {
            store.setError(error.message || "Failed to swap faces");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 450, y: 300 },
    },
    {
      id: '5',
      type: 'promptNode',
      data: { 
        prompt: store.prompt,
        setPrompt: store.setPrompt,
        isLoading: store.isLoading,
        canGenerate: Object.keys(store.swappedFrames).length > 0 && store.prompt.length > 0,
        onGenerate: async () => {
          if (Object.keys(store.swappedFrames).length === 0 || !store.prompt) {
            store.setError("Please swap faces and enter a creative prompt");
            return;
          }
          
          store.setIsLoading(true);
          store.setError(null);
          
          try {
            // We'll need to upload the swapped frames to get public URLs for Kling
            // For this local MVP, we'll use the tempHost service
            
            // Upload the swapped frames to the temporary file host
            // This would ideally be done server-side, but for the MVP we'll upload from client
            // using the base64 data we already have in the store
            const startFrame = store.swappedFrames['start'];
            const middleFrame = store.swappedFrames['middle'];
            const endFrame = store.swappedFrames['end'];
            
            if (!startFrame || !middleFrame || !endFrame) {
              throw new Error("Missing one or more swapped frames. Please swap all three frames.");
            }
            
            // Create temporary image files from base64 data
            const uploadFrame = async (base64Data: string, name: string) => {
              // Convert base64 to blob
              const response = await fetch(base64Data);
              const blob = await response.blob();
              
              // Create form data
              const formData = new FormData();
              formData.append('file', blob, `${name}.png`);
              
              // Upload to temporary host service (file.io)
              const uploadResponse = await fetch('https://file.io', {
                method: 'POST',
                body: formData
              });
              
              if (!uploadResponse.ok) {
                throw new Error(`Failed to upload ${name} frame`);
              }
              
              const result = await uploadResponse.json();
              return result.link;
            };
            
            // Upload all three frames
            const startFrameUrl = await uploadFrame(startFrame.base64, 'start');
            const middleFrameUrl = await uploadFrame(middleFrame.base64, 'middle');
            const endFrameUrl = await uploadFrame(endFrame.base64, 'end');
            
            // Create two Kling jobs: start->middle and middle->end
            // Clip 1: start -> middle
            const clip1Response = await fetch('/api/kling', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'internal'
              },
              body: JSON.stringify({
                prompt: store.prompt,
                imageUrl: startFrameUrl,
                tailImageUrl: middleFrameUrl,
                duration: 5,
                aspectRatio: '9:16',
                numSamples: 2
              })
            });
            
            if (!clip1Response.ok) {
              const errorData = await clip1Response.json();
              throw new Error(errorData.error || 'Failed to create first clip job');
            }
            
            const clip1Data = await clip1Response.json();
            const jobId1 = clip1Data.jobId;
            
            // Clip 2: middle -> end
            const clip2Response = await fetch('/api/kling', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'internal'
              },
              body: JSON.stringify({
                prompt: store.prompt,
                imageUrl: middleFrameUrl,
                tailImageUrl: endFrameUrl,
                duration: 5,
                aspectRatio: '9:16',
                numSamples: 2
              })
            });
            
            if (!clip2Response.ok) {
              const errorData = await clip2Response.json();
              throw new Error(errorData.error || 'Failed to create second clip job');
            }
            
            const clip2Data = await clip2Response.json();
            const jobId2 = clip2Data.jobId;
            
            // Update store with job IDs and pending status
            store.setGeneratedVideo('clip1', {
              jobId: jobId1,
              status: 'pending'
            });
            
            store.setGeneratedVideo('clip2', {
              jobId: jobId2,
              status: 'pending'
            });
            
            // Start polling for job status
            const poll = async (clipKey: string, jobId: string) => {
              const maxAttempts = 30; // Maximum polling attempts (30 * 5s = 150s = 2.5 minutes)
              let attempts = 0;
              
              const pollInterval = setInterval(async () => {
                try {
                  attempts++;
                  
                  // Poll the job status
                  const pollResponse = await fetch(`/api/kling?jobId=${jobId}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': 'internal'
                    }
                  });
                  
                  if (!pollResponse.ok) {
                    clearInterval(pollInterval);
                    const errorData = await pollResponse.json();
                    throw new Error(errorData.error || `Failed to poll ${clipKey} job status`);
                  }
                  
                  const jobData = await pollResponse.json();
                  
                  // Update store with current status
                  store.setGeneratedVideo(clipKey, {
                    jobId,
                    status: jobData.status,
                    videos: jobData.videos
                  });
                  
                  // If job is completed or failed, or we've reached max attempts, stop polling
                  if (jobData.status === 'completed' || jobData.status === 'failed' || attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    if (attempts >= maxAttempts && jobData.status !== 'completed') {
                      store.setError(`${clipKey} job timed out`);
                    }
                  }
                } catch (error: any) {
                  clearInterval(pollInterval);
                  console.error(`Error polling ${clipKey} job:`, error);
                  store.setError(error.message || `Failed to poll ${clipKey} job`);
                }
              }, 5000); // Poll every 5 seconds
            };
            
            // Start polling for both jobs
            poll('clip1', jobId1);
            poll('clip2', jobId2);
            
          } catch (error: any) {
            store.setError(error.message || "Failed to generate videos");
            store.setIsLoading(false);
          }
          // Note: We don't set isLoading to false here because the polling will continue
          // Each component should check its own loading state based on job status
        }
      },
      position: { x: 800, y: 100 },
    },
    {
      id: '6',
      type: 'videoResultsNode',
      data: { 
        generatedVideos: store.generatedVideos,
        selectedVideos: store.selectedVideos,
        isLoading: store.isLoading,
        canStitch: store.selectedVideos.length > 0,
        onSelectVideo: (key: string) => {
          if (store.selectedVideos.includes(key)) {
            store.unselectVideo(key);
          } else {
            store.selectVideo(key);
          }
        },
        onStitch: async () => {
          if (store.selectedVideos.length === 0) {
            store.setError("Please select videos to stitch");
            return;
          }
          
          store.setIsLoading(true);
          store.setError(null);
          
          try {
            // Get URLs of selected generated videos
            const clipUrls = store.selectedVideos.map(key => {
              const video = store.generatedVideos[key];
              if (!video || !video.videos || video.videos.length === 0) {
                throw new Error(`No video URL available for ${key}`);
              }
              // Use the first video from each clip (index 0)
              return video.videos[0];
            });
            
            // Call the stitch API
            const response = await fetch('/api/stitch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'internal'
              },
              body: JSON.stringify({ clips: clipUrls })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to stitch videos');
            }
            
            // Get the final video URL from the response
            const data = await response.json();
            store.setFinalVideoUrl(data.finalVideoUrl);
            
          } catch (error: any) {
            store.setError(error.message || "Failed to stitch videos");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 800, y: 300 },
    },
    {
      id: '7',
      type: 'finalVideoNode',
      data: { 
        finalVideoUrl: store.finalVideoUrl
      },
      position: { x: 1150, y: 200 },
    },
  ]);
  
  const [edges, setEdges] = useState<Edge[]>([
    // TikTok URL → Frames
    { id: 'e1-2', source: '1', target: '2' },
    // Frames → Face Swap
    { id: 'e2-4', source: '2', target: '4' },
    // Face Upload → Face Swap
    { id: 'e3-4', source: '3', target: '4' },
    // Face Swap → Creative Prompt
    { id: 'e4-5', source: '4', target: '5' },
    // Creative Prompt → Video Results
    { id: 'e5-6', source: '5', target: '6' },
    // Video Results → Final Video
    { id: 'e6-7', source: '6', target: '7' },
  ]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );
  
  // Update nodes when store values change
  useEffect(() => {
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === '1') {
          return {
            ...node,
            data: {
              ...node.data,
              tikTokUrl: store.tikTokUrl,
              setTikTokUrl: store.setTikTokUrl,
              isLoading: store.isLoading,
              onExtract: node.data.onExtract // Preserve the original handler
            }
          };
        }
        // Update other nodes as well
        else if (node.id === '2') {
          return {
            ...node,
            data: {
              ...node.data,
              frames: store.frames,
              selectedFrames: store.selectedFrames,
              onSelectFrame: node.data.onSelectFrame
            }
          };
        }
        else if (node.id === '3') {
          return {
            ...node,
            data: {
              ...node.data,
              faceImage: store.faceImage,
              onFaceUpload: node.data.onFaceUpload
            }
          };
        }
        else if (node.id === '4') {
          return {
            ...node,
            data: {
              ...node.data,
              isLoading: store.isLoading,
              canSwap: store.faceImage !== null && store.selectedFrames.length > 0,
              swappedFrames: store.swappedFrames,
              onFaceSwap: node.data.onFaceSwap
            }
          };
        }
        else if (node.id === '5') {
          return {
            ...node,
            data: {
              ...node.data,
              prompt: store.prompt,
              setPrompt: store.setPrompt,
              isLoading: store.isLoading,
              canGenerate: Object.keys(store.swappedFrames).length > 0 && store.prompt.length > 0,
              onGenerate: node.data.onGenerate
            }
          };
        }
        else if (node.id === '6') {
          return {
            ...node,
            data: {
              ...node.data,
              generatedVideos: store.generatedVideos,
              selectedVideos: store.selectedVideos,
              isLoading: store.isLoading,
              canStitch: store.selectedVideos.length > 0,
              onSelectVideo: node.data.onSelectVideo,
              onStitch: node.data.onStitch
            }
          };
        }
        else if (node.id === '7') {
          return {
            ...node,
            data: {
              ...node.data,
              finalVideoUrl: store.finalVideoUrl
            }
          };
        }
        return node;
      })
    );
  }, [
    store.tikTokUrl, 
    store.frames, 
    store.selectedFrames, 
    store.faceImage, 
    store.swappedFrames, 
    store.isLoading, 
    store.prompt,
    store.generatedVideos,
    store.selectedVideos,
    store.finalVideoUrl
  ]);

  return (
    <div className="h-screen w-full">
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold">Internal AI-UGC Generator</h1>
        <p className="text-muted-foreground">
          TikTok URL + face image + creative prompt → Ad-ready reel with swapped face
        </p>
        {store.error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive text-destructive rounded text-sm">
            {store.error}
          </div>
        )}
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#e5e7eb" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}