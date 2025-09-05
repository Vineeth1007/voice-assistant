import React, { useRef, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Recorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [text, setText] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data);
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe() {
    if (!chunksRef.current.length) return alert("No audio recorded yet.");
    setTranscribing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("file", blob, "audio.webm");
      const res = await fetch(`${API_URL}/transcribe`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      setText(data.text); // overwrite; change to append if you want
    } catch (e: any) {
      alert(e.message || "Failed to transcribe");
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {!recording ? (
          <button onClick={startRecording} className="px-3 py-2 rounded border">
            ⏺️ Record
          </button>
        ) : (
          <button onClick={stopRecording} className="px-3 py-2 rounded border">
            ⏹️ Stop
          </button>
        )}
        <button
          onClick={transcribe}
          disabled={recording || transcribing}
          className="px-3 py-2 rounded border"
        >
          {transcribing ? "Transcribing…" : "📝 Transcribe"}
        </button>
      </div>

      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Transcribed text will appear here…"
        className="w-full rounded border p-2"
      />
    </div>
  );
}
