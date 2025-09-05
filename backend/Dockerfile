FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends     ffmpeg  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV WHISPER_MODEL_SIZE=tiny.en     FASTER_WHISPER_DEVICE=auto     FASTER_WHISPER_COMPUTE_TYPE=int8     FASTER_WHISPER_THREADS=4

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
