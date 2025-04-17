# Internal AI-UGC Generator

A tool for generating ad-ready reels from TikTok videos with face-swapping and AI-generated content.

## Project Overview

Input: TikTok URL + face image + creative prompt → Output: 10s ad-ready reel with swapped face & accurate motion, delivered in < 5 min, no user accounts.

## Features

- TikTok video extraction
- Face-swapping using FaceFusion
- AI video generation with Kling 2.0
- Video concatenation using ffmpeg

## Tech Stack

- **Runtime/SSR**: Next.js 14 (App Router, TypeScript)
- **UI**: React Flow + shadcn/ui (Tailwind)
- **State**: Zustand
- **Video I/O**: ffmpeg-static, fluent-ffmpeg
- **TikTok DL**: @prevter/tiktok-scraper
- **Face-swap**: FaceFusion CLI (Python microservice with FastAPI)
- **Gen-AI video**: Kling 2.0 Master via open-api.klingai.com
- **Temp storage**: OS /tmp + tmp-promise
- **Auth**: .env-gated bearer token

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- NVIDIA GPU (for optimal face-swapping performance)

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in the required environment variables:
   - `KLING_AK`: Your Kling API access key
   - `KLING_SK`: Your Kling API secret key
   - `ADMIN_TOKEN`: A secret token for API route protection

### Development

#### With Docker (recommended)

```bash
# Build and run the services
docker-compose up --build
```

#### Without Docker

1. Start the Next.js app:
   ```bash
   npm install
   npm run dev
   ```

2. Start the FaceFusion service (requires Python 3.10+):
   ```bash
   cd faceswap
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Usage

1. Enter a TikTok URL
2. Select frames for face-swapping
3. Upload a face image
4. Enter a creative prompt
5. Generate videos with AI
6. Select the best generated videos
7. Download the final video

## Project Structure

```
/src
 ├─ app/
 │   ├─ page.tsx               // wizard + ReactFlow canvas
 │   ├─ api/
 │   │   ├─ extract/route.ts   // TikTok → PNGs
 │   │   ├─ faceswap/route.ts  // proxy to Python svc
 │   │   ├─ kling/route.ts     // create & poll two jobs
 │   │   └─ stitch/route.ts    // ffmpeg concat
 │   └─ lib/
 │       ├─ ffmpeg.ts
 │       ├─ tiktok.ts
 │       ├─ kling.ts
 │       └─ jwt.ts
 └─ faceswap/ (Docker)          // Python micro-service
```

## License

Internal use only.