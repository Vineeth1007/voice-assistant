# Voice Assistant - Frontend

A Next.js 14 single-page app that records the visitor's voice, shows a live audio visualizer and transcript, and displays an AI-generated reply from the FastAPI backend.

![Next.js](https://img.shields.io/badge/Next.js-14.2.5-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)

> Part of [Voice Assistant](../README.md) - the service this UI talks to lives in [../backend](../backend/README.md).
> Status: app - Type: web app (Next.js App Router)

## Overview

The page ("Project Voice - Classy Edition", tagline "Speak it. See it come alive.") has one interactive demo and several static marketing sections:

1. **Start speaking** requests microphone access, starts a `MediaRecorder` (`audio/webm`) and drives a 32-bar waveform from a Web Audio `AnalyserNode`.
2. Pressing the button again stops the recording and uploads it to `/api/transcribe`; the returned text is appended to an editable transcript box (typing a message also works).
3. **Get reply** posts the transcript to `/api/reply`, shows the assistant's answer and, when the backend returns an `audioUrl`, shows play/pause and mute buttons for the spoken reply. As committed, the audio player is never given the URL, so no audio plays (see Limitations).
4. **Reset** clears the transcript, reply and errors.

Below the demo are Features, Presets, Use Cases, Pricing and FAQ sections. These are static placeholder content (no billing, and the presets do not change behavior).

The two API routes under `app/api/` are thin proxies: they forward the request body to the FastAPI backend at `FASTAPI_URL` and return the response unchanged.

## Configuration

| Variable | Purpose |
|---|---|
| `FASTAPI_URL` | Base URL of the backend, for example `http://localhost:8000`. Read by `app/api/transcribe/route.ts` and `app/api/reply/route.ts` on the server; there is no default, so the API calls fail if it is unset. |

```bash
cp .env.example .env.local     # contains FASTAPI_URL=http://localhost:8000
```

`.env.local` is git-ignored; `.env.example` is committed with the variable name and a local default only.

## How to run

Requires Node.js 18.17 or newer and a running backend (see [../backend/README.md](../backend/README.md)).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build (completed successfully in a clean install on Node 22 when this README was written) |
| `npm start` | Serves the production build |

There is no lint or test script. For a deployment (for example on Vercel) set the project root directory to `frontend` and define `FASTAPI_URL`; note that the backend currently returns a hardcoded `http://localhost:8000/audio/...` URL, so even once the player is wired up, spoken replies would only play when the backend is reachable at that address from the browser.

## Project structure

```text
frontend/
├── README.md              # This file
├── .env.example           # FASTAPI_URL
├── package.json           # Scripts and dependencies (next 14.2.5, react 18.3.1, framer-motion, lucide-react, tailwindcss)
├── package-lock.json
├── next.config.js         # reactStrictMode only
├── next-env.d.ts
├── postcss.config.mjs     # tailwindcss + autoprefixer
├── tailwind.config.ts     # content globs for app/ and src/
├── tsconfig.json          # "@/*" path alias -> src/*
├── public/
│   └── favicon.ico        # Empty (0 bytes) placeholder
├── app/                   # Next.js App Router
│   ├── layout.tsx         # Root layout and page metadata
│   ├── page.tsx           # Renders the Stage3Page component
│   ├── globals.css        # Tailwind layers and dark base styles
│   └── api/
│       ├── reply/route.ts       # POST /api/reply      -> FASTAPI_URL/reply
│       └── transcribe/route.ts  # POST /api/transcribe -> FASTAPI_URL/transcribe
└── src/
    ├── components/
    │   └── Stage3Page.tsx # The whole UI (recorder, visualizer, transcript, reply player, landing sections)
    └── lib/
        └── api.ts         # uploadAudio() and getReply() helpers that call the /api routes
```

Imports use the `@/*` alias (for example `@/components/Stage3Page`), which maps to `src/*`; Tailwind scans `app/` and `src/`. Keep UI files inside those folders so their classes are picked up.

## Limitations and known issues

- The UI depends on the backend: without a reachable `FASTAPI_URL` the transcription and reply calls return errors.
- Microphone capture needs a secure context (HTTPS or `localhost`) and the browser's permission.
- `Stage3Page.tsx` splits the transcript with `/\\s+/` (a literal backslash followed by `s`), so the styled preview shows the whole transcript as one word instead of styling each word.
- The spoken reply does not play: `handleSubmit` in `Stage3Page.tsx` sets `audioRef.current.src` right after `setReply(resp)`, before the `<audio>` element has been rendered, so `audioRef.current` is still `null` and the player never gets a source. In a jsdom render with a mocked `/api/reply` response the `<audio>` element had no `src`; this was not tested in a real browser.
- A browser `SpeechRecognition` fallback exists but is switched off (`USE_SERVER_ASR = true`); recordings are always sent to the backend.
- `tailwind.config.ts` lists the `./app/**` glob twice and a `./components/**` glob for a folder that does not exist.
- `public/favicon.ico` is empty, and the page has no tests or lint configuration.

## Credits

[Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) and [lucide-react](https://lucide.dev/).

## License

No license file - all rights reserved by the respective authors.
