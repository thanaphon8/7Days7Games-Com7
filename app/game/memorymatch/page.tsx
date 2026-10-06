"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";

/* =========================================================
   จับคู่ความจำ — เปิดการ์ดหาคู่ ผ่านด่านให้ไกลที่สุดก่อนหมดเวลา
   ========================================================= */

// ===== ตั้งค่าเกม (ปรับสมดุลได้ที่นี่) =====
const GAME_ID = "memorymatch"; // key ที่ใช้บวกแต้มเข้า gameScores
const DURATION = 60; // เวลาเริ่มต้น (วินาที)
const PAIR_POINTS = 20; // แต้มต่อคู่ (คูณคอมโบ)
const MAX_MULT = 5; // คอมโบสูงสุด
const FIRE_COMBO = 3; // จับคู่ติดกันกี่ครั้งถึง "ติดไฟ"
const CLEAR_BONUS = 50; // โบนัสผ่านด่าน (× เลขด่าน)
const PERFECT_BONUS = 50; // โบนัสผ่านด่านโดยไม่พลาดเลย
const CLEAR_TIME = 6; // ผ่านด่านได้เวลาเพิ่ม (วินาที)
const MISS_TIME = 2; // พลาดเสียเวลา (วินาที)
const STAGE_PAIRS = [4, 6, 8, 10, 12]; // จำนวนคู่ในแต่ละด่าน (ด่านหลังจากนี้ใช้ขนาดสุดท้าย)
const PEEK_MS = [2200, 2800, 3400, 4000, 4600]; // เวลาให้จำก่อนคว่ำการ์ด
const STAR_AT = [150, 400, 800]; // คะแนนที่ต้องทำให้ได้ 1 / 2 / 3 ดาว
const RANKS = ["ซ้อมต่ออีกนิด", "ความจำดี", "ความจำเยี่ยม", "ความจำเหนือมนุษย์"];
const PALETTE = ["#A8B5E8", "#F4A58A", "#9CC593", "#F4D35E", "#B7CBB0"];
const TOP_PAD = 132; // เว้นที่ให้ HUD ด้านบน
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ===== ลวดลายการ์ด (SVG เพื่อให้หน้าตาเหมือนกันทุกอุปกรณ์) =====
const SHAPES: { color: string; draw: () => ReactNode }[] = [
  { color: "#F4A58A", draw: () => (<><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" /><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" /></>) },
  { color: "#9CC593", draw: () => <path d="M3 12c2-5.5 4-5.5 6 0s4 5.5 6 0 4-5.5 6 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /> },
  { color: "#A8B5E8", draw: () => (<><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2.2" /><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" stroke="currentColor" strokeWidth="1.6" /></>) },
  { color: "#F4D35E", draw: () => <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#F2B27A", draw: () => <path d="M12 4l8.5 15.5h-17z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /> },
  { color: "#D7B8F0", draw: () => <circle cx="12" cy="12" r="7.5" fill="currentColor" /> },
  { color: "#7FC8A9", draw: () => <path d="M12 2.5L21.5 12 12 21.5 2.5 12z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#F4806A", draw: () => <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#B7CBB0", draw: () => <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#F29BB5", draw: () => <path d="M12 20.5s-8-4.9-8-11A4.6 4.6 0 0 1 12 6.6 4.6 4.6 0 0 1 20 9.5c0 6.1-8 11-8 11z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#8FB8E8", draw: () => <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /> },
  { color: "#E8C07D", draw: () => (<><circle cx="12" cy="12" r="4.5" fill="currentColor" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>) },
];

function Glyph({ i }: { i: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" aria-hidden>
      {SHAPES[i].draw()}
    </svg>
  );
}

// ===== เสียง (สังเคราะห์ด้วย WebAudio ไม่ต้องใช้ไฟล์) =====
let actx: AudioContext | null = null;
let muted = false;
function audio() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (C) actx = new C();
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, to?: number, delay = 0) {
  const a = audio();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn);
  gn.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function noise(dur: number, vol: number, f0: number, f1: number) {
  const a = audio();
  if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(f0, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur);
  f.Q.value = 0.9;
  const gn = a.createGain();
  gn.gain.value = vol;
  src.connect(f);
  f.connect(gn);
  gn.connect(a.destination);
  src.start();
}
const NOTES = [523, 587, 659, 740, 880];
const sfx = {
  flip: () => tone(460, 0.07, "triangle", 0.12, 640),
  match: (combo: number) => {
    const n = NOTES[clamp(combo - 1, 0, NOTES.length - 1)];
    tone(n, 0.14, "triangle", 0.18);
    tone(n * 1.5, 0.2, "triangle", 0.14, undefined, 0.08);
  },
  miss: () => tone(210, 0.28, "sawtooth", 0.12, 110),
  clear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.17, undefined, i * 0.09)),
  whoosh: () => noise(0.5, 0.35, 400, 2400),
  tick: () => tone(880, 0.06, "sine", 0.12),
  buzzer: () => tone(190, 0.8, "sawtooth", 0.22),
};

// ===== ชนิดข้อมูล =====
type Phase = "intro" | "peek" | "playing" | "clear" | "over";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";
type Fx = { id: number; kind: "text" | "burst" | "screen"; x: number; y: number; text?: string; title?: string; color: string; big?: boolean };
type G = {
  round: number; dealId: number; phase: Phase; stage: number;
  deck: number[]; flipped: number[]; matched: boolean[]; wrong: number[];
  score: number; combo: number; best: number; timeLeft: number; lastSec: number;
  pairsDone: number; misses: number; stageMisses: number; perfects: number; peekMs: number;
  fx: Fx[]; fxId: number;
};

function shuffle<T>(a: T[]) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
function buildDeck(stage: number) {
  const pairs = STAGE_PAIRS[Math.min(stage, STAGE_PAIRS.length) - 1];
  const ids = shuffle(SHAPES.map((_, i) => i)).slice(0, pairs);
  return shuffle(ids.flatMap((i) => [i, i]));
}
// เริ่มต้นด้วยลำดับตายตัว (ไม่สุ่ม) เพื่อไม่ให้ hydration ไม่ตรงกัน แล้วค่อยสับไพ่จริงตอนเริ่มด่าน
function newG(round: number): G {
  const deck = Array.from({ length: 8 }, (_, i) => i >> 1);
  return {
    round, dealId: 0, phase: "intro", stage: 1, deck, flipped: [], matched: deck.map(() => false), wrong: [],
    score: 0, combo: 0, best: 0, timeLeft: DURATION, lastSec: DURATION,
    pairsDone: 0, misses: 0, stageMisses: 0, perfects: 0, peekMs: PEEK_MS[0], fx: [], fxId: 0,
  };
}

// เลือกจำนวนคอลัมน์ที่ทำให้การ์ดใหญ่ที่สุดและแถวเต็มพอดี
function layout(n: number, w: number, h: number) {
  const gap = w < 480 ? 8 : 12;
  const bottom = w >= 640 ? 134 : 120;
  const availW = Math.min(w - 24, 920);
  const availH = h - TOP_PAD - bottom;
  let best = { cols: 4, rows: Math.max(1, Math.ceil(n / 4)), size: -1 };
  for (let cols = 2; cols <= 8; cols++) {
    if (n % cols) continue;
    const rows = n / cols;
    const size = Math.floor(Math.min((availW - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows));
    if (size > best.size) best = { cols, rows, size };
  }
  return { ...best, size: clamp(best.size, 36, 132), gap, bottom };
}

/* =========================================================
   ส่วนช่วยของหน้า UI
   ========================================================= */
function useCountUp(target: number, run: boolean, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = clamp((now - t0) / ms, 0, 1);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function Star({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14 sm:h-16 sm:w-16" style={{ animation: `mm-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#F4D35E" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}

function FireText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span aria-hidden className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-xl ${size}`} style={{ animation: "mm-glow .5s ease-in-out infinite alternate" }}>
        {text}
      </span>
      <span className={`relative block bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`}>
        {text}
      </span>
    </div>
  );
}

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";
const BTN_ROUND = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm ring-1 ring-black/5 backdrop-blur transition-transform active:scale-95";
const POP_SHADOW = "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 0 14px rgba(255,255,255,.9)";

/* Component แสดงพรีวิววิดีโอตัวอย่างเกม */
function GameVideoPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/5 shadow-inner">
      <video
        src="/video/memorymatch/memorymatch.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* =========================================================
   หน้าเกม
   ========================================================= */
export default function MemoryMatchPage() {
  const gRef = useRef<G>(null as unknown as G);
  if (!gRef.current) gRef.current = newG(0);
  const g = gRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);

  const timers = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);
  const peekTimer = useRef<number | null>(null);
  const roundRef = useRef(0);
  const recordRef = useRef(0);
  const layoutRef = useRef({ cols: 4, rows: 2, size: 80, gap: 8 });

  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [intro, setIntro] = useState<"ready" | "go" | null>("ready");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [record, setRecord] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // โหลดค่าที่จำไว้
  useEffect(() => {
    try {
      recordRef.current = Number(localStorage.getItem("memorymatchBest")) || 0;
      setRecord(recordRef.current);
      if (localStorage.getItem("memorymatchMuted") === "1") {
        muted = true;
        setIsMuted(true);
      }
    } catch {}
  }, []);

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try { localStorage.setItem("memorymatchMuted", muted ? "1" : "0"); } catch {}
  }

  // ===== บันทึกคะแนนรอบนี้ (API ใช้ $inc จึงส่งเฉพาะแต้มของรอบนี้) =====
  async function saveScore(score: number) {
    if (score <= 0) return;
    let userId: string | null = null;
    try {
      const raw = localStorage.getItem("profile");
      if (raw) {
        const p = JSON.parse(raw);
        userId = p.userId || p.id || p._id || null;
      }
    } catch {}
    if (!userId) { setSaveState("guest"); return; }
    setSaveState("saving");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gameKey: GAME_ID, score }),
      });
      const result = await res.json().catch(() => null);
      setSaveState(res.ok && result?.success ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  // ===== เอฟเฟกต์ลอย =====
  function cardCenter(i: number) {
    const L = layoutRef.current;
    return { x: (i % L.cols) * (L.size + L.gap) + L.size / 2, y: Math.floor(i / L.cols) * (L.size + L.gap) + L.size / 2 };
  }
  function addFx(fx: Omit<Fx, "id">, ms = 1000) {
    const cur = gRef.current;
    const id = ++cur.fxId;
    cur.fx.push({ ...fx, id });
    later(() => {
      cur.fx = cur.fx.filter((f) => f.id !== id);
      force();
    }, ms);
  }
  const screenPop = (y: number, text: string, color: string, title = "", big = false, ms = 1200) =>
    addFx({ kind: "screen", x: 0, y, text, title, color, big }, ms);

  // ===== ลำดับเกม =====
  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    let last = performance.now();
    tickRef.current = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const cur = gRef.current;
      if (cur.phase !== "playing") return;
      cur.timeLeft -= dt;
      const sec = Math.max(0, Math.ceil(cur.timeLeft));
      if (sec !== cur.lastSec) {
        cur.lastSec = sec;
        if (sec > 0 && sec <= 5) sfx.tick();
        force();
      }
      if (cur.timeLeft <= 0) endGame();
    }, 100);
  }

  function startStage(n: number) {
    const cur = gRef.current;
    cur.stage = n;
    cur.dealId += 1;
    cur.deck = buildDeck(n);
    cur.matched = cur.deck.map(() => false);
    cur.flipped = [];
    cur.wrong = [];
    cur.stageMisses = 0;
    cur.peekMs = PEEK_MS[Math.min(n, PEEK_MS.length) - 1];
    cur.phase = "peek";
    force();
    peekTimer.current = later(endPeek, cur.peekMs);
  }

  function endPeek() {
    const cur = gRef.current;
    if (cur.phase !== "peek") return;
    cur.phase = "playing";
    force();
  }

  function skipPeek() {
    if (gRef.current.phase !== "peek") return;
    if (peekTimer.current) clearTimeout(peekTimer.current);
    endPeek();
  }

  function beginRound() {
    clearTimers();
    audio();
    roundRef.current += 1;
    gRef.current = newG(roundRef.current);
    setSaveState("idle");
    setNewRecord(false);
    setIntro("ready");
    force();
    startTick();
    later(() => {
      setIntro("go");
      sfx.whoosh();
      startStage(1);
    }, 1300);
    later(() => setIntro(null), 2200);
  }

  function endGame() {
    const cur = gRef.current;
    if (cur.phase === "over") return;
    cur.phase = "over";
    cur.timeLeft = Math.max(0, cur.timeLeft);
    cur.lastSec = Math.ceil(cur.timeLeft);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    clearTimers();
    sfx.buzzer();
    const isNew = cur.score > recordRef.current && cur.score > 0;
    if (isNew) {
      recordRef.current = cur.score;
      try { localStorage.setItem("memorymatchBest", String(cur.score)); } catch {}
    }
    setRecord(recordRef.current);
    setNewRecord(isNew);
    saveScore(cur.score);
    force();
  }

  function stageClear(cur: G) {
    cur.phase = "clear";
    const perfect = cur.stageMisses === 0;
    const bonus = CLEAR_BONUS * cur.stage + (perfect ? PERFECT_BONUS : 0);
    cur.score += bonus;
    cur.timeLeft += CLEAR_TIME;
    cur.lastSec = Math.ceil(cur.timeLeft);
    if (perfect) cur.perfects += 1;
    sfx.clear();
    screenPop(0.3, `ด่าน ${cur.stage} สำเร็จ!`, "#1F2A5C", perfect ? "PERFECT!" : "", true, 1400);
    screenPop(0.42, `+${bonus}`, "#27272A", "", false, 1400);
    screenPop(0.5, `+${CLEAR_TIME} วินาที`, "#4D7C3A", "", false, 1400);
    later(() => {
      if (gRef.current !== cur || cur.phase !== "clear") return;
      startStage(cur.stage + 1);
    }, 1400);
  }

  // ตัดสินคู่ทันทีที่เปิดใบที่สอง และไม่ล็อกกระดาน ผู้เล่นเปิดใบถัดไปได้ต่อเนื่องระหว่างที่เอฟเฟกต์ยังเล่นอยู่
  function resolveMatch(cur: G, a: number, b: number) {
    cur.matched[a] = true;
    cur.matched[b] = true;
    cur.combo += 1;
    cur.best = Math.max(cur.best, cur.combo);
    cur.pairsDone += 1;
    const mult = Math.min(MAX_MULT, cur.combo);
    const pts = PAIR_POINTS * mult;
    cur.score += pts;
    const A = cardCenter(a), B = cardCenter(b);
    const color = SHAPES[cur.deck[a]].color;
    const hot = cur.combo >= FIRE_COMBO;
    // เลื่อนเฉพาะ "ภาพเอฟเฟกต์" ไปอีกนิดให้เห็นหน้าการ์ดที่เพิ่งพลิกก่อน ตัวเกมไม่รอ
    later(() => {
      if (gRef.current !== cur) return;
      addFx({ kind: "burst", x: A.x, y: A.y, color });
      addFx({ kind: "burst", x: B.x, y: B.y, color });
      addFx({ kind: "text", x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, text: `+${pts}${mult > 1 ? ` ×${mult}` : ""}`, color: hot ? "#E8643C" : "#27272A" });
    }, 180);
    sfx.match(cur.combo);
    if (cur.combo === FIRE_COMBO) {
      screenPop(0.2, "🔥 ON FIRE!", "#E8643C", "", true, 1200);
      sfx.whoosh();
    }
    if (cur.matched.every(Boolean)) stageClear(cur);
  }

  function resolveMiss(cur: G, a: number, b: number) {
    const had = cur.combo;
    cur.wrong.push(a, b); // ค้างหงายไว้สั้นๆ ให้เห็นว่าผิด แล้วคว่ำกลับเอง (ใบอื่นกดได้ตามปกติ)
    cur.misses += 1;
    cur.stageMisses += 1;
    cur.combo = 0;
    cur.timeLeft = Math.max(0, cur.timeLeft - MISS_TIME);
    cur.lastSec = Math.ceil(cur.timeLeft);
    sfx.miss();
    const A = cardCenter(a), B = cardCenter(b);
    addFx({ kind: "text", x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, text: `−${MISS_TIME} วิ`, color: "#E8643C" });
    if (had >= 2) screenPop(0.2, "คอมโบหลุด", "#71717A", "", false, 900);
    if (cur.timeLeft <= 0) { endGame(); return; }
    later(() => {
      if (gRef.current !== cur || cur.phase === "over") return;
      cur.wrong = cur.wrong.filter((i) => i !== a && i !== b);
      force();
    }, 700);
  }

  function flip(i: number) {
    const cur = gRef.current;
    if (cur.phase !== "playing") return;
    if (cur.flipped.includes(i) || cur.matched[i] || cur.wrong.includes(i)) return;
    audio();
    sfx.flip();
    if (cur.flipped.length === 0) {
      cur.flipped = [i];
    } else {
      const a = cur.flipped[0];
      cur.flipped = [];
      if (cur.deck[a] === cur.deck[i]) resolveMatch(cur, a, i);
      else resolveMiss(cur, a, i);
    }
    force();
  }

  // ===== ผูกกับหน้าเว็บ =====
  useEffect(() => {
    const calc = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setDims({ w: Math.floor(window.innerWidth), h: Math.floor(vh) });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // คีย์ลัดบนคอม: Space/Enter = เล่นอีกครั้ง, M = เสียง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") toggleMute();
      if ((e.code === "Space" || e.code === "Enter") && gRef.current.phase === "over") {
        if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
        e.preventDefault();
        beginRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เข้าหน้าแล้วเริ่ม READY → GO!!! อัตโนมัติ
  useEffect(() => {
    beginRound();
    return () => {
      clearTimers();
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== ค่าที่ใช้แสดงผล =====
  const lay = layout(g.deck.length, dims.w, dims.h);
  layoutRef.current = lay;
  const boardW = lay.cols * lay.size + (lay.cols - 1) * lay.gap;
  const boardH = lay.rows * lay.size + (lay.rows - 1) * lay.gap;
  const over = g.phase === "over";
  const peek = g.phase === "peek";
  const nextMult = Math.min(MAX_MULT, g.combo + 1);
  const onFire = g.combo >= FIRE_COMBO && g.phase === "playing";
  const timeLow = g.lastSec <= 10 && (g.phase === "playing" || g.phase === "clear");
  const pairsLeft = (g.deck.length - g.matched.filter(Boolean).length) / 2;
  const shownScore = useCountUp(g.score, over);
  const stars = STAR_AT.filter((s) => g.score >= s).length;
  const attempts = g.pairsDone + g.misses;
  const accuracy = attempts > 0 ? Math.round((g.pairsDone / attempts) * 100) : 0;
  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${g.score} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };

  return (
    <div className="mm-anim fixed inset-0 z-50 overflow-hidden overscroll-none bg-gradient-to-b from-[#DDE3F8] via-[#F3F1FB] to-white font-sans text-zinc-900" style={{ touchAction: "manipulation" }}>
      <style>{`
        @keyframes mm-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes mm-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes mm-bump { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
        @keyframes mm-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes mm-rise-fire { 0% { transform: translateY(14px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(-16px) scale(1.1); opacity: 0 } }
        @keyframes mm-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes mm-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes mm-cardin { 0% { transform: scale(.55) translateY(14px); opacity: 0 } 100% { transform: none; opacity: 1 } }
        @keyframes mm-shake { 0%,100% { transform: translateX(0) } 18% { transform: translateX(-7px) rotate(-2deg) } 36% { transform: translateX(7px) rotate(2deg) } 54% { transform: translateX(-5px) } 72% { transform: translateX(5px) } }
        @keyframes mm-pop { 0% { transform: scale(1) } 35% { transform: scale(1.35) rotate(-8deg) } 70% { transform: scale(.92) rotate(4deg) } 100% { transform: scale(1) } }
        @keyframes mm-float { 0% { transform: translate(-50%,-50%) scale(.6); opacity: 0 } 20% { transform: translate(-50%,-80%) scale(1.1); opacity: 1 } 100% { transform: translate(-50%,-190%) scale(1); opacity: 0 } }
        @keyframes mm-burst { 0% { transform: translate(-50%,-50%) scale(1); opacity: 1 } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.3) rotate(160deg); opacity: 0 } }
        @keyframes mm-peek { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @keyframes mm-screen { 0% { transform: translateY(14px) scale(.7); opacity: 0 } 18% { transform: translateY(0) scale(1.08); opacity: 1 } 30% { transform: scale(1) } 80% { opacity: 1 } 100% { transform: translateY(-14px) scale(1); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .mm-anim, .mm-anim * { animation: none !important } }
      `}</style>

      {/* ===== กระดานการ์ด ===== */}
      <main className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: TOP_PAD, paddingBottom: lay.bottom, opacity: g.phase === "intro" ? 0 : 1 }}>
        <div className="relative" style={{ width: boardW, height: boardH }}>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${lay.cols}, ${lay.size}px)`, gap: lay.gap }}>
            {g.deck.map((sym, i) => {
              const s = SHAPES[sym];
              const done = g.matched[i];
              const wrong = g.wrong.includes(i);
              const up = peek || g.flipped.includes(i) || wrong || done;
              const radius = lay.size * 0.24;
              return (
                <div key={`${g.round}-${g.dealId}-${i}`} style={{ width: lay.size, height: lay.size, animation: `mm-cardin .45s ${i * 35}ms cubic-bezier(.2,1.2,.4,1) both` }}>
                  <button
                    type="button"
                    onClick={() => flip(i)}
                    disabled={g.phase !== "playing" || done || wrong}
                    aria-label={up ? `การ์ดใบที่ ${i + 1} เปิดอยู่` : `การ์ดใบที่ ${i + 1} คว่ำอยู่`}
                    className="block h-full w-full outline-none focus-visible:ring-4 focus-visible:ring-blue-400 enabled:hover:-translate-y-0.5"
                    style={{
                      perspective: 700,
                      borderRadius: radius,
                      opacity: done ? 0.38 : 1,
                      transition: "opacity .4s ease .5s, transform .2s ease",
                      animation: wrong ? "mm-shake .42s .2s ease-in-out" : undefined,
                    }}
                  >
                    <span
                      className="relative block h-full w-full transition-transform duration-[420ms] motion-reduce:transition-none"
                      style={{ transformStyle: "preserve-3d", transform: up ? "rotateY(180deg)" : "rotateY(0deg)" }}
                    >
                      <span
                        className="absolute inset-0 flex items-center justify-center bg-zinc-900 font-light text-white/25 shadow-sm"
                        style={{ borderRadius: radius, fontSize: lay.size * 0.42, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                      >
                        <span className="absolute inset-[9%] ring-1 ring-white/10" style={{ borderRadius: radius * 0.75 }} />
                        ?
                      </span>
                      <span
                        className="absolute inset-0 flex items-center justify-center text-zinc-900 shadow-sm"
                        style={{ backgroundColor: s.color, borderRadius: radius, transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                      >
                        <span className="block" style={{ width: "52%", height: "52%", animation: done ? "mm-pop .55s ease-out" : undefined }}>
                          <Glyph i={sym} />
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* เอฟเฟกต์บนกระดาน */}
          <div className="pointer-events-none absolute inset-0">
            {g.fx.map((f) => {
              if (f.kind === "text") {
                return (
                  <span key={f.id} className="absolute whitespace-nowrap text-2xl font-black sm:text-3xl" style={{ left: f.x, top: f.y, color: f.color, textShadow: POP_SHADOW, animation: "mm-float 1s ease-out forwards" }}>
                    {f.text}
                  </span>
                );
              }
              if (f.kind === "burst") {
                return Array.from({ length: 10 }, (_, n) => {
                  const a = (n / 10) * Math.PI * 2 + f.id;
                  const d = 36 + (n % 3) * 16;
                  return (
                    <span
                      key={`${f.id}-${n}`}
                      className="absolute h-2.5 w-2.5 rounded-sm"
                      style={{
                        left: f.x, top: f.y, backgroundColor: n % 2 ? f.color : PALETTE[n % 5],
                        animation: "mm-burst .75s ease-out forwards",
                        ["--dx" as string]: `${Math.cos(a) * d}px`, ["--dy" as string]: `${Math.sin(a) * d}px`,
                      }}
                    />
                  );
                });
              }
              return null;
            })}
          </div>
        </div>
      </main>

      {/* ===== HUD (ซ้อนบนจอ ไม่กินพื้นที่) ===== */}
      {!over && (
        <div className="pointer-events-none absolute inset-0" style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}>
          <div className="relative h-full w-full">
            {/* หลอดเวลา มุมบนซ้าย */}
            <div className="absolute left-3 top-3 w-36 sm:left-4 sm:top-4 sm:w-48">
              <div className="rounded-2xl bg-white/90 px-3 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-zinc-500">เวลา</span>
                  <span className={`text-lg font-semibold leading-none tabular-nums ${timeLow ? "text-[#E8643C]" : "text-zinc-900"}`}>{g.lastSec}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${timeLow ? "animate-pulse bg-[#F4806A]" : "bg-[#7FC8A9]"}`}
                    style={{ width: `${clamp(g.lastSec / DURATION, 0, 1) * 100}%`, transition: "width 1s linear, background-color .3s" }}
                  />
                </div>
              </div>
            </div>

            {/* ป้ายคะแนน มุมบนขวา */}
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1 sm:right-4 sm:top-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F4D35E] px-4 py-2 shadow-sm sm:px-5 sm:py-2.5">
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="#4A3700" aria-hidden>
                  <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" strokeLinejoin="round" />
                </svg>
                <span key={g.score} className="text-2xl font-bold leading-none tabular-nums tracking-tight text-[#2E2300] sm:text-3xl" style={{ animation: "mm-bump .35s ease-out" }}>
                  {g.score.toLocaleString("en-US")}
                </span>
              </div>
              <span className="pr-2 text-xs font-semibold text-zinc-600" style={{ textShadow: "0 1px 0 rgba(255,255,255,.9)" }}>
                ด่าน {g.stage}
              </span>
            </div>

            {/* สถานะกลางจอ: ช่วงจำ / เหลืออีกกี่คู่ */}
            <div className="absolute inset-x-0 flex justify-center" style={{ top: 84 }}>
              {peek ? (
                <div className="pointer-events-auto relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-white/90 py-1.5 pl-4 pr-1.5 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <span className="text-sm font-semibold">ด่าน {g.stage} · จำให้ดี!</span>
                  <button type="button" onClick={skipPeek} className="h-8 rounded-full bg-zinc-900 px-4 text-xs font-medium text-white transition-opacity hover:opacity-85">
                    พร้อมแล้ว
                  </button>
                  <span key={`${g.round}-${g.dealId}`} className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#F4D35E]" style={{ animation: `mm-peek ${g.peekMs}ms linear forwards` }} />
                </div>
              ) : g.phase === "playing" || g.phase === "clear" ? (
                <div className="inline-flex items-center rounded-full bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5 backdrop-blur">
                  เหลืออีก {pairsLeft} คู่
                </div>
              ) : null}
            </div>

            {/* ตัวคูณคอมโบ มุมล่างขวา ติดไฟเมื่อ onFire */}
            <div className="absolute bottom-3 right-3 select-none text-right sm:bottom-5 sm:right-5">
              <div className="relative inline-block px-4 pt-7">
                {onFire && (
                  <>
                    <span aria-hidden className="absolute bottom-0 right-4 text-6xl font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-md sm:text-7xl" style={{ animation: "mm-glow .5s ease-in-out infinite alternate" }}>
                      ×{nextMult}
                    </span>
                    <span className="absolute left-4 top-3 text-2xl" style={{ animation: "mm-rise-fire 1s ease-out infinite" }} aria-hidden>🔥</span>
                    <span className="absolute left-1/2 top-1 text-3xl" style={{ animation: "mm-rise-fire .85s .25s ease-out infinite" }} aria-hidden>🔥</span>
                    <span className="absolute right-5 top-3 text-2xl" style={{ animation: "mm-rise-fire 1.1s .5s ease-out infinite" }} aria-hidden>🔥</span>
                  </>
                )}
                <p
                  key={nextMult}
                  className={`relative px-3 py-1 text-6xl font-black italic leading-[1.05] tabular-nums tracking-tighter sm:text-7xl ${onFire ? "bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text text-transparent" : "text-zinc-900"}`}
                  style={{ animation: "mm-bump .3s ease-out", ...(onFire ? {} : { textShadow: "0 2px 0 rgba(255,255,255,.9), 0 0 12px rgba(255,255,255,.9)" }) }}
                >
                  ×{nextMult}
                </p>
              </div>
              <p className={`-mt-1 pr-4 text-sm font-semibold ${onFire ? "text-[#E8884A]" : "text-zinc-500"}`}>
                {onFire ? "ติดไฟ!" : `ติดกัน ${g.combo}`}
              </p>
            </div>

            {/* ปุ่มกลับ/เสียง มุมล่างซ้าย (กด M เพื่อเปิด/ปิดเสียงบนคอมได้) */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ" className={BTN_ROUND}>←</Link>
              <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง (M)" className={BTN_ROUND}>
                {isMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ข้อความกลางจอ (ผ่านด่าน / ติดไฟ / คอมโบหลุด) */}
      {g.fx.filter((f) => f.kind === "screen").map((f) => (
        <div key={f.id} className="pointer-events-none absolute inset-x-0 flex flex-col items-center" style={{ top: `${f.y * 100}%`, animation: "mm-screen 1.2s ease-out both" }}>
          {f.title && (
            <span className="text-2xl font-black italic sm:text-3xl" style={{ color: "#E8643C", textShadow: POP_SHADOW }}>
              {f.title}
            </span>
          )}
          <span className={`font-black ${f.big ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`} style={{ color: f.color, textShadow: POP_SHADOW }}>
            {f.text}
          </span>
        </div>
      ))}

      {/* READY → GO!!! */}
      <div className={`pointer-events-none absolute inset-0 bg-[#190C28]/45 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`} />
      {intro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div key={intro} style={{ animation: intro === "ready" ? "mm-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "mm-go .9s ease-out both" }}>
            <FireText text={intro === "ready" ? "READY" : "GO!!!"} size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"} />
          </div>
        </div>
      )}

      {/* ===== หน้าสรุปคะแนน / พรีวิวรายละเอียดตัวอย่างเกม ===== */}
      {over && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7E9A8] via-white to-white">
          <div style={{ width: 340, transform: `scale(${Math.min((dims.h * 0.94) / 590, (dims.w * 0.94) / 340, 1.35)})` }} className="shrink-0">
            <div className="text-center" style={{ animation: "mm-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
              <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#F4D35E]" : "bg-zinc-100 text-zinc-600"}`}>
                {newRecord ? "🏆 สถิติใหม่!" : "หมดเวลา!"}
              </span>

              {/* ส่วนพรีวิววิดีโอแสดงผลตัวอย่างการเล่น */}
              <div className="mt-3 px-4">
                <GameVideoPreview />
              </div>

              <div className="mt-4 flex items-end justify-center gap-1">
                {STAR_AT.map((_, i) => (
                  <div key={i} className={i === 1 ? "-translate-y-2" : ""}>
                    <Star on={i < stars} delay={0.3 + i * 0.22} />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-500">{RANKS[stars]}</p>

              <div className="mt-4 rounded-3xl bg-[#F4D35E] px-4 py-5">
                <p className="text-xs text-zinc-700">คะแนนรอบนี้</p>
                <p className="text-7xl font-semibold leading-none tabular-nums tracking-tight">{shownScore}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-[#B7CBB0]/60 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.pairsDone}</p>
                  <p className="text-xs text-zinc-600">คู่ที่จับได้</p>
                </div>
                <div className="rounded-2xl bg-[#A8B5E8]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{accuracy}%</p>
                  <p className="text-xs text-zinc-600">แม่นยำ</p>
                </div>
                <div className="rounded-2xl bg-[#F4A58A]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.stage}</p>
                  <p className="text-xs text-zinc-600">ด่านสูงสุด</p>
                </div>
                <div className="rounded-2xl bg-[#F2994A]/40 py-3">
                  <p className="text-xl font-semibold tabular-nums">×{Math.min(MAX_MULT, g.best)}</p>
                  <p className="text-xs text-zinc-600">คอมโบสูงสุด</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">สถิติสูงสุด {record}</p>
              <p className="h-4 text-xs text-zinc-500" role="status">{saveText[saveState]}</p>

              <button onClick={beginRound} className={`${BTN_MAIN} mt-4`}>เล่นอีกครั้ง</button>
              <Link href="/rank" className={`${BTN_SUB} mt-3`}>ดูอันดับ</Link>
              <Link href="/#games" className="mt-3 inline-block text-xs text-zinc-400 transition-colors hover:text-zinc-600">กลับหน้าหลัก</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}