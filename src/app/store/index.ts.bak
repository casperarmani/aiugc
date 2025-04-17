import { create } from 'zustand';

interface Frame {
  path: string;
  base64: string;
}

interface Frames {
  start: Frame;
  middle: Frame;
  end: Frame;
}

interface SwappedFrame {
  path: string;
  base64: string;
}

interface GeneratedVideo {
  jobId: string;
  status: string;
  videos?: string[];
}

interface StoreState {
  // TikTok URL and extracted frames
  tikTokUrl: string;
  tempDir: string | null;
  videoPath: string | null;
  frames: Frames | null;
  selectedFrames: string[];
  
  // Face image
  faceImage: File | null;
  
  // Swapped frames
  swappedFrames: Record<string, SwappedFrame>;
  
  // Creative prompt
  prompt: string;
  
  // Generated videos
  generatedVideos: Record<string, GeneratedVideo>;
  selectedVideos: string[];
  
  // Final video
  finalVideoUrl: string | null;
  
  // UI state
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTikTokUrl: (url: string) => void;
  setExtractedData: (data: { tempDir: string; videoPath: string; frames: Frames }) => void;
  setFaceImage: (file: File | null) => void;
  setSwappedFrame: (key: string, data: SwappedFrame) => void;
  setPrompt: (prompt: string) => void;
  setGeneratedVideo: (key: string, data: GeneratedVideo) => void;
  setFinalVideoUrl: (url: string | null) => void;
  setCurrentStep: (step: number) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectFrame: (key: string) => void;
  unselectFrame: (key: string) => void;
  selectVideo: (key: string) => void;
  unselectVideo: (key: string) => void;
  resetState: () => void;
}

const initialState = {
  tikTokUrl: '',
  tempDir: null,
  videoPath: null,
  frames: null,
  selectedFrames: [],
  faceImage: null,
  swappedFrames: {},
  prompt: '',
  generatedVideos: {},
  selectedVideos: [],
  finalVideoUrl: null,
  currentStep: 0,
  isLoading: false,
  error: null,
};

export const useStore = create<StoreState>((set) => ({
  ...initialState,
  
  setTikTokUrl: (url) => set({ tikTokUrl: url }),
  
  setExtractedData: (data) => set({
    tempDir: data.tempDir,
    videoPath: data.videoPath,
    frames: data.frames,
  }),
  
  setFaceImage: (file) => set({ faceImage: file }),
  
  setSwappedFrame: (key, data) => set((state) => ({
    swappedFrames: {
      ...state.swappedFrames,
      [key]: data,
    },
  })),
  
  setPrompt: (prompt) => set({ prompt }),
  
  setGeneratedVideo: (key, data) => set((state) => ({
    generatedVideos: {
      ...state.generatedVideos,
      [key]: data,
    },
  })),
  
  setFinalVideoUrl: (url) => set({ finalVideoUrl: url }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  selectFrame: (key) => set((state) => ({
    selectedFrames: [...state.selectedFrames, key],
  })),
  
  unselectFrame: (key) => set((state) => ({
    selectedFrames: state.selectedFrames.filter((k) => k !== key),
  })),
  
  selectVideo: (key) => set((state) => ({
    selectedVideos: [...state.selectedVideos, key],
  })),
  
  unselectVideo: (key) => set((state) => ({
    selectedVideos: state.selectedVideos.filter((k) => k !== key),
  })),
  
  resetState: () => set(initialState),
}));