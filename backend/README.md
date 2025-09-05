# Voice Assistant — Backend (FastAPI + faster-whisper)

## Run locally
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

## Run with Docker
docker build -t voice-backend .
docker run --rm -p 8000:8000 --env-file .env voice-backend

## Tips for 2–3s response
- Use `tiny.en`, `compute_type=int8` on CPU (or `float16`/`int8_float16` on GPU).
- Record short clips (2–4s) for low latency.
- Keep `beam_size=1`, `temperature=0.0`, `without_timestamps=True`.
