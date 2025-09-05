# Voice Assistant (Monorepo)

## Structure
- `frontend/` — Next.js 14 + Tailwind + Framer Motion (one-page UI)
- `backend/`  — FastAPI + faster-whisper (Whisper tiny.en)

## Setup
1) Backend
```
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Or Docker:
```
docker build -t voice-backend .
docker run --rm -p 8000:8000 --env-file .env voice-backend
```

2) Frontend
```
cd frontend
cp .env.example .env   # set NEXT_PUBLIC_API_BASE
pnpm i  # or npm i / yarn
pnpm dev
```

Open http://localhost:3000
