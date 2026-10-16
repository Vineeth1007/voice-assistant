# Voice Assistant - Backend

A FastAPI service that turns recorded speech into text with faster-whisper, asks an LLM for a reply through OpenRouter, and returns that reply as text plus a spoken MP3.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![faster-whisper](https://img.shields.io/badge/faster--whisper-1.0.3-4B8BBE)

> Part of [Voice Assistant](../README.md) - the Next.js UI that calls this service lives in [../frontend](../frontend/README.md).
> Status: app - Type: REST API

## Overview

The service exposes four endpoints. The browser UI (through its Next.js proxy routes) uploads a recorded clip to `/transcribe`, then posts the transcript to `/reply`, which calls the OpenRouter chat-completions API, converts the answer to speech with gTTS and returns the text together with an audio URL served by `/audio/{filename}`. All of the code is in a single file, `app/main.py`.

## Endpoints

| Method and path | Request | Response |
|---|---|---|
| `GET /health` | none | `{"ok": true}` |
| `POST /transcribe` | multipart form with a `file` field (the UI sends `audio/webm`) | `{"text": "<transcript>"}`; transcription runs with `language="en"` |
| `POST /reply` | JSON `{"text": "<user message>"}` | `{"text": "<reply>", "audioUrl": "http://localhost:8000/audio/<uuid>.mp3"}`; for an empty `text` it returns `"I didn't hear anything."` and `audioUrl: null` |
| `GET /audio/{filename}` | filename from `audioUrl` | the MP3 (`audio/mpeg`), or `{"error": "File not found"}` |

Interactive API docs are available at `http://localhost:8000/docs` while the server is running.

Example:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/reply -H "Content-Type: application/json" -d '{"text": "Hello"}'
```

## Models and services

| Step | Implementation | Settings |
|---|---|---|
| Speech-to-text | `faster_whisper.WhisperModel` (weights `Systran/faster-whisper-base`, downloaded from the Hugging Face Hub on first start) | `"base"`, `device="cuda"`, `compute_type="float32"`, hardcoded in `app/main.py` |
| Reply | OpenRouter `POST https://openrouter.ai/api/v1/chat/completions` | model `deepseek/deepseek-chat-v3.1:free`, system prompt "You are a helpful AI assistant.", 30 s timeout |
| Text-to-speech | `gTTS` (needs internet access) | default language; saved as `audio/<uuid4>.mp3` |

## Configuration

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key for `/reply`; read from the environment or from a `.env` file |

Copy the template and fill in the key: `cp .env.example .env`. `python-dotenv` looks for `.env` starting in `app/` and walking up, so `backend/.env` is found regardless of the directory the server is started from (checked locally). `.env` is git-ignored; `.env.example` holds the variable name only.

## How to run

Requirements: Python 3.11 and an NVIDIA GPU with working CUDA and cuDNN libraries (the model is loaded on `cuda` when the module is imported). In a test, the PyAV dependency of faster-whisper 1.0.3 failed to build from source on Python 3.13, so use 3.11 as the Dockerfile does.

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then set OPENROUTER_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Run `uvicorn` from this `backend/` folder. Reply audio is written to a relative `audio/` directory, so the working directory decides where the files go (`backend/audio/` here, or `backend/app/audio/` if started from `app/`). Both locations are git-ignored.

### Docker

```bash
docker build -t voice-backend .
docker run --rm -p 8000:8000 --env-file .env voice-backend
```

The Dockerfile (`python:3.11-slim` plus ffmpeg, `uvicorn app.main:app` on port 8000) has not been verified and does not match the code. It sets `WHISPER_MODEL_SIZE=tiny.en`, `FASTER_WHISPER_DEVICE=auto`, `FASTER_WHISPER_COMPUTE_TYPE=int8` and `FASTER_WHISPER_THREADS=4`, but `app/main.py` reads none of these, and the slim image has no CUDA libraries while the code requests `device="cuda"`. Expect the model load to fail in the container until the backend is changed to read those settings.

## Tuning ideas (not implemented)

These tips for a 2-3 second response come from the earlier version of this README. They describe faster-whisper options that `app/main.py` does not currently set:

- Use `tiny.en` with `compute_type="int8"` on CPU (or `float16` / `int8_float16` on GPU).
- Record short clips (2-4 s) for low latency.
- Keep `beam_size=1`, `temperature=0.0` and `without_timestamps=True`.

## Project structure

```text
backend/
├── README.md          # This file
├── .env.example       # OPENROUTER_API_KEY (name only)
├── Dockerfile         # python:3.11-slim image (see the note above)
├── requirements.txt   # fastapi, uvicorn, python-multipart, faster-whisper, pydantic, gTTS, requests, python-dotenv
└── app/
    └── main.py        # FastAPI app: /health, /transcribe, /reply, /audio/{filename}
```

`audio/` (generated MP3 replies) is created at runtime and is git-ignored.

## Limitations and known issues

- The model is hardcoded to `base` on CUDA with `float32`, so the service cannot start without a GPU, and the Dockerfile settings are not honored.
- `audioUrl` is hardcoded to `http://localhost:8000/audio/<file>`, so audio links only work when the backend is on `localhost:8000`.
- If the OpenRouter request fails before a response arrives (timeout, DNS or connection error), the handler's error logging reads an unassigned variable and `/reply` returns HTTP 500 (reproduced with a simulated connection error). HTTP error statuses from OpenRouter return the fallback text "Sorry, I couldn't generate a reply." instead.
- CORS allows every origin (`allow_origins=["*"]`); the `origins` list in the code is unused. There is no authentication or rate limiting.
- Generated MP3s and the temporary upload files created by `/transcribe` are never deleted.
- `GET /audio/{filename}` returns HTTP 200 with an error body (instead of 404) when a file is missing.
- Transcription and speech are English only. There are no automated tests.

## Credits

[FastAPI](https://fastapi.tiangolo.com/), [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (SYSTRAN) running OpenAI Whisper weights, [gTTS](https://github.com/pndurette/gTTS), [python-dotenv](https://github.com/theskumar/python-dotenv), [Requests](https://requests.readthedocs.io/), and [OpenRouter](https://openrouter.ai/) with the DeepSeek chat model it routes to.

## License

No license file - all rights reserved by the respective authors.
