"use client";

import { useState, useCallback } from "react";
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[280px]">
    <h3 className="text-lg font-semibold mb-2">TikTok URL</h3>
    <input
      type="url"
      value={data.tikTokUrl}
      onChange={(e) => data.setTikTokUrl(e.target.value)}
      placeholder="https://www.tiktok.com/@username/video/1234567890"
      className="w-full px-3 py-2 border rounded-md mb-2"
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[320px]">
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
        <div className="col-span-3 bg-muted p-4 text-center text-sm">
          No frames extracted yet
        </div>
      )}
    </div>
  </div>
);

const FaceUploadNode = ({ data }: { data: any }) => (
  <div className="p-4 border rounded-lg bg-white shadow-md w-[280px]">
    <h3 className="text-lg font-semibold mb-2">Face Upload</h3>
    <input
      type="file"
      accept="image/*"
      onChange={data.onFaceUpload}
      className="w-full px-3 py-2 border rounded-md mb-2"
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[280px]">
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[280px]">
    <h3 className="text-lg font-semibold mb-2">Creative Prompt</h3>
    <textarea
      value={data.prompt}
      onChange={(e) => data.setPrompt(e.target.value)}
      placeholder="Describe your video scene, style, and mood..."
      className="w-full px-3 py-2 border rounded-md h-24 mb-2"
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[320px]">
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
            <div className="w-full aspect-[9/16] bg-muted flex items-center justify-center">
              <p className="text-xs">{video.status}</p>
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
  <div className="p-4 border rounded-lg bg-white shadow-md w-[280px]">
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
      <div className="w-full aspect-[9/16] bg-muted flex items-center justify-center">
        <p className="text-sm">No final video yet</p>
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
          if (!store.tikTokUrl) {
            store.setError("Please enter a TikTok URL");
            return;
          }
          
          store.setIsLoading(true);
          store.setError(null);
          
          try {
            // Placeholder for API call - will implement full functionality
            console.log("Extracting frames from:", store.tikTokUrl);
            // Simulate API delay for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, create mock frames data
            store.setExtractedData({
              tempDir: '/tmp/demo',
              videoPath: '/tmp/demo/video.mp4',
              frames: {
                start: {
                  path: '/tmp/demo/start.png',
                  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
                },
                middle: {
                  path: '/tmp/demo/middle.png',
                  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
                },
                end: {
                  path: '/tmp/demo/end.png',
                  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
                }
              }
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
      position: { x: 100, y: 250 },
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
      position: { x: 100, y: 500 },
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
            // Placeholder for API call - will implement full functionality
            console.log("Swapping faces on:", store.selectedFrames);
            // Simulate API delay for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, create mock swapped frames
            for (const key of store.selectedFrames) {
              store.setSwappedFrame(key, {
                path: `/tmp/demo/swapped_${key}.png`,
                base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
              });
            }
          } catch (error: any) {
            store.setError(error.message || "Failed to swap faces");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 400, y: 100 },
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
            // Placeholder for API call - will implement full functionality
            console.log("Generating videos with prompt:", store.prompt);
            // Simulate API delay for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, create mock generated videos
            store.setGeneratedVideo('clip1', {
              jobId: 'job1',
              status: 'completed',
              videos: ['https://example.com/video1.mp4']
            });
            
            store.setGeneratedVideo('clip2', {
              jobId: 'job2',
              status: 'completed',
              videos: ['https://example.com/video2.mp4']
            });
          } catch (error: any) {
            store.setError(error.message || "Failed to generate videos");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 400, y: 300 },
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
            // Placeholder for API call - will implement full functionality
            console.log("Stitching videos:", store.selectedVideos);
            // Simulate API delay for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, set a mock final video URL
            store.setFinalVideoUrl('https://example.com/final.mp4');
          } catch (error: any) {
            store.setError(error.message || "Failed to stitch videos");
          } finally {
            store.setIsLoading(false);
          }
        }
      },
      position: { x: 700, y: 100 },
    },
    {
      id: '7',
      type: 'finalVideoNode',
      data: { 
        finalVideoUrl: store.finalVideoUrl
      },
      position: { x: 700, y: 400 },
    },
  ]);
  
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
    { id: 'e5-6', source: '5', target: '6' },
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
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}