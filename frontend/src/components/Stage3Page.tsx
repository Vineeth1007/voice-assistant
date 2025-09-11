"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Stars,
  Zap,
  Shield,
  Rocket,
  CheckCircle2,
  Pause,
  VolumeX,
} from "lucide-react";

import { getReply, uploadAudio, type AssistantReply } from "@/lib/api";
// Toggle this to switch to server Whisper ASR (MediaRecorder + /api/transcribe)
const USE_SERVER_ASR = true;

const COLORS = [
  "text-white",
  "text-violet-300",
  "text-violet-400",
  "text-indigo-300",
  "text-fuchsia-300",
  "text-slate-200",
];
const SIZES = ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"];
// export type AssistantReply = { text: string; audioUrl?: string };

export default function Stage3Page() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [energy, setEnergy] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll progress + parallax
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const yParallax = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  // Audio player for optional TTS reply
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      await a.play();
      setIsPlaying(true);
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setIsPlaying(false);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [reply?.audioUrl]);

  // Browser SpeechRecognition (fallback/demo)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (USE_SERVER_ASR) return; // not needed when using server ASR
    const SR =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript + " ";
      }
      if (finalText.trim())
        setTranscript((prev) => (prev + " " + finalText).trim());
    };
    r.onerror = (e: any) => setError(e?.error || "Speech recognition error");
    recognitionRef.current = r;
  }, []);

  // MediaRecorder for server ASR
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunkRef = useRef<Blob[]>([]);

  const startMic = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMic(true);
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        setEnergy(avg);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      if (USE_SERVER_ASR) {
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecRef.current = mr;
        chunkRef.current = [];
        mr.ondataavailable = (e) => {
          if (e.data.size) chunkRef.current.push(e.data);
        };
        mr.onstop = async () => {
          const blob = new Blob(chunkRef.current, { type: "audio/webm" });
          const { text } = await uploadAudio(blob);
          setTranscript((prev) => (prev + " " + text).trim());
        };
        mr.start(); // record until stopMic
      } else {
        recognitionRef.current?.start?.();
      }

      setIsListening(true);
    } catch {
      setHasMic(false);
      setError("Microphone permission denied or not available.");
    }
  }, []);

  const stopMic = useCallback(() => {
    recognitionRef.current?.stop?.();
    if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    analyserRef.current = null;
    streamRef.current = null;
    setIsListening(false);
  }, []);

  const handleToggle = useCallback(() => {
    isListening ? stopMic() : startMic();
  }, [isListening, startMic, stopMic]);
  const handleClear = useCallback(() => {
    setTranscript("");
    setReply(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = transcript.trim();
    if (!text) return;
    setReply(null);
    try {
      const resp = await getReply(text);
      setReply(resp);
      if (resp.audioUrl && audioRef.current) {
        audioRef.current.src = resp.audioUrl;
        setIsPlaying(false);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch reply.");
    }
  }, [transcript]);

  const enhancedWords = useMemo(() => {
    if (!transcript) return null;
    const words = transcript.split(/\\s+/).filter(Boolean);
    return words.map((w, i) => {
      const size = SIZES[i % SIZES.length];
      const color = COLORS[i % COLORS.length];
      const isAccent = i % 7 === 0;
      return (
        <motion.span
          key={`${w}-${i}`}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.8) }}
          className={`${size} ${color} ${
            isAccent ? "font-semibold" : "font-medium"
          } mr-2 inline-block`}
        >
          {w}
        </motion.span>
      );
    });
  }, [transcript]);

  return (
    <main className="relative w-full bg-gradient-to-b from-black via-[#0b0f17] to-black text-white">
      {/* Progress */}
      <motion.div
        style={{ scaleX }}
        aria-hidden
        className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300"
      />
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-700/30 blur-3xl" />
        <div className="absolute top-28 left-24 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <motion.div
          style={{ y: yParallax }}
          className="absolute bottom-12 right-24 h-72 w-72 rounded-full bg-indigo-700/20 blur-3xl"
        />
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-slate-300">
            Project Voice — Classy Edition
          </p>
        </div>
        <nav className="hidden gap-6 md:flex">
          {[
            ["#demo", "Demo"],
            ["#features", "Features"],
            ["#presets", "Presets"],
            ["#usecases", "Use Cases"],
            ["#pricing", "Pricing"],
            ["#faq", "FAQ"],
          ].map(([href, label]) => (
            <a
              key={href as string}
              className="text-sm text-slate-300 hover:text-white"
              href={href as string}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-6 md:grid-cols-2 md:gap-12">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-balance text-5xl font-extrabold leading-tight md:text-6xl"
          >
            Speak it.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              See it come alive.
            </span>
          </motion.h1>
          <p className="mt-4 max-w-prose text-lg text-slate-300">
            Press the mic, talk naturally, and watch your words turn into an
            editorial‑grade, colorful story. Minimal input. Maximum vibe.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggle}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold ring-1 transition focus:outline-none focus:ring-2 focus:ring-violet-400/70 ${
                isListening
                  ? "bg-violet-600 text-white ring-violet-500"
                  : "bg-white/10 text-white ring-white/15 hover:bg-white/15"
              }`}
            >
              <Mic className="h-4 w-4" />{" "}
              {isListening ? "Listening… (click to stop)" : "Start speaking"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-semibold shadow/30 ring-1 ring-white/20 hover:shadow"
            >
              <Play className="h-4 w-4" /> Get reply
            </motion.button>
            <button
              onClick={() => {
                setTranscript("");
                setReply(null);
                setError(null);
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ring-1 ring-white/15 text-slate-300 hover:text-white hover:bg-white/10"
              title="Clear"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          {hasMic === false && (
            <p className="mt-2 text-sm text-amber-300">
              Microphone not available. You can still type a message and click
              Get reply.
            </p>
          )}

          {/* Waveform */}
          <div
            id="demo"
            className="mt-8 h-16 w-full overflow-hidden rounded-2xl bg-white/5 p-2 ring-1 ring-white/10"
          >
            <div className="flex h-full items-end gap-1">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 flex-1 rounded-sm bg-gradient-to-t from-violet-700/60 to-violet-400/70"
                  style={{
                    height: `${Math.max(
                      6,
                      (Math.sin((i + energy * 10) / 2) * 0.5 + 0.5) *
                        100 *
                        (0.3 + energy * 0.7)
                    )}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced transcript / reply */}
        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur">
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs text-slate-200 ring-1 ring-white/10">
            <Volume2 className="h-3.5 w-3.5" /> Live transcript
          </div>

          {/* NEW: editable textarea + visual preview */}
          <div className="space-y-4">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type or dictate your message…"
              className="w-full min-h-[120px] rounded-xl bg-black/30 p-3 text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/70"
            />
            <div className="min-h-[80px]">
              {transcript ? (
                <div className="leading-snug">{enhancedWords}</div>
              ) : (
                <p className="text-slate-400">
                  Press the mic or type above—your styled preview appears here.
                </p>
              )}
            </div>
          </div>
          {reply && (
            <div className="mt-6 space-y-3 rounded-2xl bg-black/40 p-4 ring-1 ring-white/10">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Assistant
              </p>
              <p className="text-lg text-slate-100">{reply.text}</p>
              {reply.audioUrl && (
                <div className="flex items-center gap-2">
                  <audio ref={audioRef} preload="auto" />
                  <button
                    onClick={togglePlay}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isPlaying ? "Pause audio" : "Play audio"}
                  </button>
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.muted = !audioRef.current.muted;
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    <VolumeX className="h-4 w-4" /> Mute
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <RevealSection id="features" title="Designed for goosebumps">
        <FeatureGrid />
      </RevealSection>

      {/* PRESETS */}
      <RevealSection id="presets" title="One mic. Many moods.">
        <PresetShowcase />
      </RevealSection>

      {/* USE CASES */}
      <RevealSection
        id="usecases"
        title="Built for creators, teams, and products"
      >
        <UseCases />
      </RevealSection>

      {/* PRICING */}
      <RevealSection id="pricing" title="Simple pricing for serious vibes">
        <Pricing />
      </RevealSection>

      {/* FAQ */}
      <RevealSection id="faq" title="Answers, fast">
        <FAQ />
      </RevealSection>

      <footer className="mx-auto max-w-6xl px-6 pb-12 pt-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Project Voice. All rights reserved.
      </footer>
    </main>
  );
}

function RevealSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-balance text-3xl font-bold md:text-4xl"
      >
        {title}
      </motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-8"
      >
        {children}
      </motion.div>
    </section>
  );
}

function FeatureGrid() {
  const items = [
    {
      icon: Stars,
      title: "Editorial visuals",
      desc: "Dynamic sizes & color rhythm make your words feel alive—without manual styling.",
    },
    {
      icon: Zap,
      title: "Real‑time energy",
      desc: "Waveform reacts to your voice energy for a cinematic, responsive feel.",
    },
    {
      icon: Shield,
      title: "Privacy‑first",
      desc: "Local mic processing until you submit. Respect for reduced motion & accessibility.",
    },
    {
      icon: Rocket,
      title: "Plug‑and‑play",
      desc: "Drop‑in API slot for your ASR/LLM/TTS pipelines; stream replies easily.",
    },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex items-center gap-3">
            <it.icon className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{it.title}</h3>
          </div>
          <p className="mt-2 text-slate-300">{it.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

function PresetShowcase() {
  const presets = [
    {
      name: "Classic",
      grad: "from-violet-400 via-fuchsia-300 to-indigo-300",
      sample: "Minimal input. Maximum vibe.",
      desc: "Balanced tone for everyday replies—friendly, crisp, reliable.",
    },
    {
      name: "Emerald",
      grad: "from-emerald-300 via-teal-300 to-cyan-300",
      sample: "Crisp. Calm. Confident.",
      desc: "Polished and composed—great for product updates and team notes.",
    },
    {
      name: "Crimson",
      grad: "from-rose-300 via-pink-300 to-orange-300",
      sample: "Bold. Warm. Magnetic.",
      desc: "High-energy presence—perfect for promos, hooks, and shorts.",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {presets.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5"
        >
          <div
            className={`inline-flex rounded-full bg-gradient-to-r ${p.grad} px-3 py-1 text-xs font-semibold text-black`}
          >
            {p.name}
          </div>
          <p className="mt-3 text-slate-200">{p.sample}</p>
          <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
          <div
            className={`mt-4 h-14 w-full rounded-xl bg-gradient-to-r ${p.grad}`}
          />
        </motion.div>
      ))}
    </div>
  );
}

function UseCases() {
  const cases = [
    {
      t: "Creators",
      d: "Narrate videos and shorts with instant, lively captions and TTS overlays.",
    },
    {
      t: "Teams",
      d: "Meeting highlights rendered as punchy, scannable story cards.",
    },
    {
      t: "Products",
      d: "Drop the widget into your app to capture voice + return styled answers.",
    },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {cases.map((c, i) => (
        <motion.div
          key={c.t}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5"
        >
          <h3 className="text-lg font-semibold">{c.t}</h3>
          <p className="mt-2 text-slate-300">{c.d}</p>
        </motion.div>
      ))}
    </div>
  );
}

function Pricing() {
  const [selected, setSelected] = useState<number>(1); // 0: Starter, 1: Pro, 2: Studio

  const tiers = [
    {
      name: "Starter",
      price: "$0",
      bullets: ["Basic mic → text", "Color rhythm", "Community support"],
    },
    {
      name: "Pro",
      price: "$12/mo",
      bullets: ["Custom presets", "Streaming replies", "Export snippets"],
    },
    {
      name: "Studio",
      price: "$39/mo",
      bullets: ["Brand kit", "Embeddable SDK", "Priority support"],
    },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
        {tiers.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setSelected(i)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition
              ${
                selected === i
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white"
              }
            `}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((t, i) => {
          const isActive = selected === i;
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className={`rounded-3xl border border-white/10 p-5 ${
                isActive ? "bg-white text-black" : "bg-white/5 text-white"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">{t.name}</h3>
                {isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                  </span>
                )}
              </div>
              <p className="mt-2 text-3xl font-bold">{t.price}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    •<span>{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelected(i)}
                className={`mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold ring-1 ${
                  isActive
                    ? "ring-black/20 bg-black text-white"
                    : "ring-white/20 bg-white/10 hover:bg-white/15"
                }`}
              >
                Get started
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FAQ() {
  const qas = [
    {
      q: "Does it work without a microphone?",
      a: "Yes, you can type input and still get the enhanced text + AI reply.",
    },
    {
      q: "Can I export the styled text?",
      a: "Copy as rich text or export HTML/JSON (coming soon).",
    },
    {
      q: "Is motion accessible?",
      a: "We respect prefers‑reduced‑motion and keep focus states visible.",
    },
  ];
  return (
    <div className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
      {qas.map((qa) => (
        <details key={qa.q} className="group p-5 open:bg-white/5">
          <summary className="cursor-pointer list-none text-lg font-semibold">
            {qa.q}
          </summary>
          <p className="mt-2 text-slate-300">{qa.a}</p>
        </details>
      ))}
    </div>
  );
}
