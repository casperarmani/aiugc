# Internal AI-UGC Generator

A tool for generating ad-ready reels from TikTok videos with face-swapping and AI-generated content.

## Project Overview

Input: TikTok URL + face image + creative prompt → Output: 10s ad-ready reel with swapped face & accurate motion, delivered in < 5 min, no user accounts.

## Features

- TikTok video extraction
- Face-swapping via PiAPI
- AI video generation with Kling 2.0 Master via PiAPI
- Video concatenation using ffmpeg

## Tech Stack

- **Runtime/SSR**: Next.js 14 (App Router, TypeScript)
- **UI**: React Flow + shadcn/ui (Tailwind)
- **State**: Zustand
- **Video I/O**: ffmpeg-static, fluent-ffmpeg
- **TikTok DL**: @prevter/tiktok-scraper
- **Face-swap**: PiAPI face swap endpoint ($0.01 per swap)
- **Gen-AI video**: Kling 2.0 Master via PiAPI (pay-as-you-go at ~$0.16 per 5s clip)
- **Temp storage**: OS /tmp + tmp-promise
- **Auth**: Server-side internal authorization

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (optional)

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in the required environment variables:
   - `PIAPI_KEY`: Your PiAPI key for both face swap and Kling 2.0
   - `ADMIN_TOKEN`: A secret token for middleware route protection

### Development

#### With Docker (optional)

```bash
# Build and run the Next.js app
docker-compose up --build
```

#### Without Docker

```bash
npm install
npm run dev
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
 │   │   ├─ faceswap/route.ts  // PiAPI face swap client
 │   │   ├─ kling/route.ts     // create & poll two jobs
 │   │   └─ stitch/route.ts    // ffmpeg concat
 │   └─ lib/
 │       ├─ ffmpeg.ts
 │       ├─ tiktok.ts
 │       ├─ kling.ts           // PiAPI Kling integration
 │       ├─ faceswap.ts        // PiAPI face swap integration
 │       └─ tempHost.ts        // file.io temporary public hosting
```

## Cost Efficiency

Using PiAPI's pay-as-you-go model:
- Face swap: $0.01 per image
- Kling standard quality: $0.16 per 5-second clip
- Two clips per video: $0.32 total cost
- Full workflow cost: ~$0.35 per complete video
- No minimum spend or bundles required
- Render time: typically 25-40 seconds per clip

## License

Internal use only.