// frontend/lib/api.ts
export type AssistantReply = { text: string; audioUrl?: string };

const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function submitTranscript(text: string): Promise<AssistantReply> {
  const res = await fetch(`${base}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${msg}`);
  }

  const data = await res.json();
  return data;
}

export async function uploadAudio(blob: Blob): Promise<{ text: string }> {
  const fd = new FormData();
  fd.append("file", blob, "clip.webm");
  fd.append("language", "en");

  const res = await fetch(`${base}/transcribe`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`ASR error: ${res.status} ${msg}`);
  }
  console.log("API base =", base);
  return res.json();
}
export async function getReply(text: string): Promise<AssistantReply> {
  const res = await fetch(`${base}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to get reply");
  return res.json();
}
