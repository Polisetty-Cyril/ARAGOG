# MedPulse AI - Frontend

React + TypeScript frontend for ARAGOG medical QA system.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Runs on `http://localhost:5173`

## Features

- Modern chat interface
- Multi-turn conversations
- Real-time responses from ARAGOG
- Confidence scores and domain display
- Dark/light theme support
- Responsive design

## Tech Stack

- React 19.2.3
- TypeScript 5.8.2
- Vite (build tool)
- Zustand (state management)
- Framer Motion (animations)
- Lucide React (icons)

## API Integration

Connects to FastAPI backend at `http://localhost:8000`

See `src/services/aragog.ts` for API client.
