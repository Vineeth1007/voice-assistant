from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tempfile import NamedTemporaryFile
from faster_whisper import WhisperModel
from fastapi.responses import FileResponse
from gtts import gTTS
import uuid
import os

app = FastAPI()

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

@app.post("/reply", response_model=AssistantReply)
async def reply(payload: dict):
    user_text = payload.get("text", "")
    if not user_text:
        return {"text": "I didn’t hear anything.", "audioUrl": None}

    # ---- Replace this with LLM logic later ----
    response_text = f"You said: {user_text}"

    # Generate speech
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    tts = gTTS(response_text)
    tts.save(filepath)

    return {
        "text": response_text,
        "audioUrl": f"http://localhost:8000/audio/{filename}"
    }

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found"}
    return FileResponse(filepath, media_type="audio/mpeg")