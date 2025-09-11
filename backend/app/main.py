from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tempfile import NamedTemporaryFile
from faster_whisper import WhisperModel
from fastapi.responses import FileResponse
from gtts import gTTS
import uuid
import os
import requests

app = FastAPI()
from dotenv import load_dotenv
load_dotenv()  # this will pull in values from .env

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = WhisperModel("base", device="cuda", compute_type="float32")

class TranscribeResponse(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    with NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    segments, _ = model.transcribe(tmp_path, language="en")
    text = "".join(s.text for s in segments).strip()
    return {"text": text or ""}

class AssistantReply(BaseModel):
    text: str
    audioUrl: str | None = None

AUDIO_DIR = "audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

import requests

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

@app.post("/reply", response_model=AssistantReply)
async def reply(payload: dict):
    user_text = payload.get("text", "")
    if not user_text:
        return {"text": "I didn’t hear anything.", "audioUrl": None}
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    gTTS(response_text).save(filepath)

    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
    return {
        "text": response_text,
        "audioUrl": f"{PUBLIC_BASE_URL}/audio/{filename}",
    }
    # 🔥 Call OpenRouter
    r = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "deepseek/deepseek-chat-v3.1:free",   # or any other model you want from OpenRouter
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": user_text},
            ],
        },
    )
    data = r.json()
    response_text = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "Sorry, I couldn’t generate a reply.")
    )

    # 🔊 Convert reply to speech


@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found"}
    return FileResponse(filepath, media_type="audio/mpeg")