// src/lib/api.ts
export type AssistantReply = { text: string; audioUrl?: string };

// Always call Next API routes; they proxy to FastAPI
const base = "/api"; // same-origin

export async function uploadAudio(blob: Blob): Promise<{ text: string }> {
  const fd = new FormData();
  fd.append("file", blob, "clip.webm");

  const res = await fetch(`/api/transcribe`, { method: "POST", body: fd });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`ASR error: ${res.status} ${msg}`);
  }
  return res.json();
}

export async function getReply(text: string): Promise<AssistantReply> {
  const res = await fetch(`/api/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Reply error: ${res.status} ${msg}`);
  }
  return res.json();
}
