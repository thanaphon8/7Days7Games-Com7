"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";

/* =========================================================
   Item Jam — จัดของชนิดเดียวกันไว้ช่องเดียวกัน ผ่าน Level ให้ไกลที่สุดก่อนหมดเวลา
   วิธีเล่น: ลากของชิ้นบนสุดไปวางในช่องที่มีที่ว่าง (เมาส์/นิ้ว)
            หรือแตะช่องเพื่อหยิบ แล้วแตะช่องปลายทาง
   ========================================================= */

// ===== ตั้งค่าเกม (ปรับสมดุลได้ที่นี่) =====
const GAME_ID = "itemjam"; // key ที่ใช้บวกแต้มเข้า gameScores
const DURATION = 60; // เวลาเริ่มต้น (วินาที)
const STAGE_POINTS = 3; // คะแนนต่อ Level ที่ผ่าน
const CAP = 4; // จำนวนของที่จุได้ต่อ 1 ช่อง (และจำนวนของต่อ 1 ชนิด)
const MAX_TYPES = 12; // ชนิดของสูงสุดต่อ Level (Level 10 = 12 ชนิด + 1 ช่องว่าง = 13 ช่อง หลังจากนั้นช่องคงที่)
const CHEERS = ["น่ารักสุดๆ!", "เก่งมาก!", "ฟินเลย!", "ปุ๊กปิ๊ก!", "สุดยอด!", "เรียบร้อย!"];
const CONFETTI = ["💖", "✨", "⭐", "🫧", "🎀", "💫", "🌸"];
const STREAK_MS = 7000; // ครบชุดต่อกันภายในเวลานี้ = สตรีค (เอฟเฟกต์และเสียงสูงขึ้น ไม่มีผลกับแต้ม)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const bonusTime = (types: number) => 6 + types * 3; // ผ่าน Level ได้เวลาเพิ่ม (Level ยากได้เยอะกว่า)

// Level 1 = 3 ชนิด, Level 2 = 4, Level 3 = 5, Level 4 = 6, Level 5 = 7 ... เพิ่มทีละ 1 ชนิดทุก Level จนถึง MAX_TYPES
// Level 1-3 มีช่องว่าง 2 ช่อง, Level 4+ เหลือ 1 ช่อง
// จำนวนช่องทั้งหมด = ชนิด + ช่องว่าง (เพิ่มช่องทุก Level จนชนิดถึงสูงสุด)
function stageConfig(stage: number) {
  return { types: Math.min(2 + stage, MAX_TYPES), empty: stage <= 3 ? 2 : 1 };
}

// ===== ดาวและคำชมตอนจบเกม =====
// ถึง Level 2 = 1 ดาว, ถึง Level 3 = 2 ดาว, ถึง Level 4 ขึ้นไป = 3 ดาวพร้อมคำชม
const starsFor = (stage: number) => (stage >= 4 ? 3 : stage === 3 ? 2 : stage === 2 ? 1 : 0);
const RANKS: Record<number, string> = { 0: "ลองใหม่อีกนิด", 1: "มือใหม่หัดจัด", 2: "เริ่มเก่งแล้วนะ", 3: "เจ้าแห่งการจัดเรียง" };
const PRAISES = [
  "สุดยอดไปเลย! มือโปรชัดๆ 🏆",
  "เก่งมากกก! จัดของเป็นระเบียบสุดๆ 🎀",
  "ยอดเยี่ยม! ทุกคนอยู่ที่ของตัวเองหมดเลย 💖",
  "เทพการจัดเรียงตัวจริง! ✨",
  "เก่งจนเพื่อนๆ ปรบมือให้เลย! 👏",
];

// ===== คัตซีนก่อนเริ่มทุก Level =====
// Level 2-4: เพื่อนใหม่ 1 ตัวกระโดดออกจากกล่องของขวัญ (ตัวเรียงตามลำดับ)
// Level 5 ขึ้นไป: เพิ่มช่อง + สุ่มเพื่อนใหม่ 1 ตัวทุก Level จนถึงช่องสูงสุด
//   หลังจากนั้นช่องคงที่ แต่สุ่มสลับตัวเก่าออก ตัวใหม่เข้า 1-2 ตัวทุก Level
const NEW_LINES = ["เก๊บๆ! ขอเข้าร่วมด้วยคนนะ", "สวัสดีทุกคน! ขอเล่นด้วยคน", "หวัดดีจ้า! มาแล้วนะ", "ว้าว! ที่นี่น่าอยู่จัง", "ฮัลโหล! ขอร่วมวงด้วย"];
const REPEAT_TIPS = [
  "ลองเหลือช่องว่างไว้เสมอ จะวางแผนง่ายขึ้นนะ",
  "ย้ายชิ้นที่ขวางทางออกก่อน แล้วค่อยจัดชุดนะ",
  "กดย้อนกลับ ↩ ได้ ถ้าย้ายพลาด",
];

// ===== ของในเกม (ตัวการ์ตูนน่ารัก สีพาสเทล) — มี 20 ตัว สุ่มเข้ามาทีละตัวตามแต่ละ Level =====
const TYPES = [
  { e: "🐶", c: "#FFD66B" },
  { e: "🐱", c: "#FF9F86" },
  { e: "🐰", c: "#D9BDF5" },
  { e: "🐸", c: "#97D58C" },
  { e: "🐼", c: "#9DB4F2" },
  { e: "🐥", c: "#FFB874" },
  { e: "🐷", c: "#FF9EC0" },
  { e: "🦊", c: "#7FD6C0" },
  { e: "🐨", c: "#B8C4D6" },
  { e: "🐵", c: "#E3B98F" },
  { e: "🦄", c: "#F3B5F0" },
  { e: "🐙", c: "#FF8E8E" },
  { e: "🐻", c: "#D8A77C" },
  { e: "🐯", c: "#FFC26B" },
  { e: "🦁", c: "#F5D27A" },
  { e: "🐮", c: "#C9D6E8" },
  { e: "🐹", c: "#F7C8A0" },
  { e: "🦉", c: "#B7A58F" },
  { e: "🐧", c: "#A9D3F5" },
  { e: "🐢", c: "#A5DFA0" },
];

// ===== เสียง ASMR (สังเคราะห์ด้วย WebAudio นุ่มๆ มีเอคโค่เบาๆ ไม่ต้องใช้ไฟล์) =====
let actx: AudioContext | null = null;
let bus: GainNode | null = null;
let send: GainNode | null = null;
let muted = false;
function audio() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (C) {
      actx = new C();
      bus = actx.createGain();
      bus.gain.value = 0.9;
      bus.connect(actx.destination);
      const echo = actx.createDelay(0.5);
      echo.delayTime.value = 0.19;
      const fb = actx.createGain();
      fb.gain.value = 0.38;
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      send = actx.createGain();
      send.gain.value = 0.35;
      send.connect(echo);
      echo.connect(lp);
      lp.connect(fb);
      fb.connect(echo);
      lp.connect(bus);
    }
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, to?: number, delay = 0) {
  const a = audio();
  const out = bus;
  if (!a || !out || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn);
  gn.connect(out);
  if (send) gn.connect(send);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function noise(dur: number, vol: number, f0: number, f1: number) {
  const a = audio();
  const out = bus;
  if (!a || !out || muted) return;
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
  gn.connect(out);
  src.start();
}
const NOTES = [523, 587, 659, 784, 880, 988];
const sfx = {
  pick: () => tone(540, 0.12, "sine", 0.15, 820), // บลู้บนุ่มๆ ตอนหยิบ
  put: (soft: boolean) => {
    tone(320, 0.1, "sine", soft ? 0.1 : 0.2, 170); // ก๊อกเบาๆ เหมือนวางของบนไม้
    if (!soft) noise(0.05, 0.07, 1800, 500);
  },
  ting: (run: number) => tone(NOTES[clamp(run, 0, 5)] * 2, 0.5, "sine", 0.1), // ติ๊งใส ยิ่งเรียงสูงยิ่งแหลม
  nope: () => tone(230, 0.14, "sine", 0.1, 170),
  undo: () => tone(620, 0.14, "sine", 0.1, 400),
  // ระฆังไล่เสียงตอนครบชุด ยิ่งครบติดกันยิ่งสูงขึ้น
  lock: (streak: number) => {
    const k = Math.pow(2, (clamp(streak - 1, 0, 6) * 2) / 12);
    [659, 784, 988, 1319].forEach((f, i) => tone(f * k, 0.5, "sine", 0.12, undefined, i * 0.07));
    tone(330 * k, 0.4, "triangle", 0.08);
  },
  // ประกายระยิบระยับตามหลังระฆัง
  sparkle: () => [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.3, "sine", 0.05, undefined, i * 0.055)),
  clear: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.5, "triangle", 0.12, undefined, i * 0.08)),
  whoosh: () => noise(0.5, 0.3, 400, 2400),
  tick: () => tone(880, 0.06, "sine", 0.1),
  buzzer: () => tone(220, 0.7, "triangle", 0.18, 120),
  // เสียงคัตซีน
  boing: () => tone(420, 0.3, "sine", 0.14, 190),
  rattle: (i: number) => tone(700 + (i % 2) * 120, 0.05, "triangle", 0.08), // กล่องของขวัญสั่นกุกกัก
  pop: () => { noise(0.14, 0.22, 2600, 600); tone(480, 0.2, "sine", 0.16, 1250); },
  jingle: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.45, "sine", 0.11, undefined, i * 0.07)),
  chirp: () => tone(520, 0.1, "sine", 0.14, 800),
};

// ===== ชนิดข้อมูล =====
type Phase = "intro" | "playing" | "clear" | "cutscene" | "over";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";
type Item = { id: number; t: number; land: number };
type Fx = { id: number; kind: "text" | "burst" | "ring" | "screen"; x: number; y: number; text?: string; title?: string; color: string; big?: boolean };
type Drag = { id: number; from: number; x: number; y: number; dy: number; tilt: number; hover: number };
type G = {
  round: number; dealId: number; phase: Phase; stage: number; types: number; cut: number;
  cast: number[]; cutNew: number[]; cutBye: number[]; cutFriends: number[]; // ตัวละครของ Level ปัจจุบัน / คัตซีน
  slots: Item[][]; sel: number | null; nope: number; lastMoved: number; nextId: number;
  drag: Drag | null; history: { from: number; to: number }[];
  score: number; timeLeft: number; lastSec: number;
  moves: number; locks: number; stageLocks: number; streak: number; lastLockAt: number;
  fastest: number; stageStart: number;
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
const isDone = (s: Item[]) => s.length === CAP && s.every((it) => it.t === s[0].t);

// เริ่มต้นไม่มีของ (ไม่สุ่ม) เพื่อไม่ให้ hydration ไม่ตรงกัน แล้วค่อยสุ่มจัดวางตอนเริ่ม Level
function newG(round: number): G {
  return {
    round, dealId: 0, phase: "intro", stage: 1, types: 3, cut: 0,
    cast: [0, 1, 2], cutNew: [], cutBye: [], cutFriends: [],
    slots: [], sel: null, nope: -1, lastMoved: -1, nextId: 0, drag: null, history: [],
    score: 0, timeLeft: DURATION, lastSec: DURATION,
    moves: 0, locks: 0, stageLocks: 0, streak: 0, lastLockAt: -1e9,
    fastest: 0, stageStart: 0, fx: [], fxId: 0,
  };
}

// เลือกตัวละครของ Level ถัดไป
// Level 2-4: เพิ่มตัวใหม่ต่อท้ายตามลำดับ
// Level 5+: ถ้ายังไม่ถึงจำนวนชนิดสูงสุด = เพิ่มช่อง + สุ่มตัวใหม่ (ที่ยังไม่อยู่ใน Level) เข้ามา ตัวเก่าอยู่ครบ
//           ถ้าถึงสูงสุดแล้ว = สุ่มเอาออก 1-2 ตัว แล้วสุ่มตัวใหม่เข้ามาแทน (ช่องเท่าเดิม)
function nextCast(next: number, prev: number[]) {
  const { types } = stageConfig(next);
  if (next <= 4) {
    const cast = Array.from({ length: types }, (_, i) => i);
    return { cast, added: cast.filter((t) => !prev.includes(t)), bye: [] as number[], friends: prev.filter((t) => cast.includes(t)) };
  }
  const pool = shuffle(TYPES.map((_, i) => i).filter((i) => !prev.includes(i)));
  const need = types - prev.length;
  if (need > 0) {
    const ins = pool.slice(0, need);
    return { cast: [...prev, ...ins], added: ins, bye: [] as number[], friends: [...prev] };
  }
  const k = Math.random() < 0.5 ? 1 : 2;
  const outs = shuffle(prev).slice(0, k);
  const friends = prev.filter((t) => !outs.includes(t));
  const ins = pool.slice(0, k);
  return { cast: [...friends, ...ins], added: ins, bye: outs, friends };
}

function cutsceneInfo(stage: number, added: number[], bye: number[], friends: number[]) {
  let tip = "ช่วยจัดทุกคนให้อยู่ช่องเดียวกันกับพวกเดียวกันด้วยนะ";
  if (stage === 4) tip = "Level นี้เหลือช่องว่างแค่ช่องเดียว วางแผนก่อนย้ายนะ";
  else if (stage === 5) tip = "จากนี้ทุก Level จะมีช่องและเพื่อนใหม่เพิ่มขึ้นเรื่อยๆ นะ";
  else if (stage === MAX_TYPES - 2) tip = "ช่องเต็มที่สุดแล้ว! จากนี้เพื่อนๆ จะสลับหน้ากันไปเรื่อยๆ นะ";
  else if (stage > 5) tip = REPEAT_TIPS[stage % REPEAT_TIPS.length];
  return {
    title: `Level ${stage}`,
    sub: bye.length > 0 ? "มีเพื่อนใหม่มาแทน!" : "มีเพื่อนใหม่มาเพิ่ม!",
    line: NEW_LINES[(stage - 2) % NEW_LINES.length],
    tip,
    added,
    bye,
    friends,
  };
}

// เลือกจำนวนแถวที่ทำให้ของใหญ่ที่สุด (รองรับทั้งจอมือถือแนวตั้ง/แนวนอน และจอคอม)
function layout(n: number, w: number, h: number, topPad: number, bottomPad: number) {
  const gap = w < 480 ? 8 : 12;
  const availW = Math.min(w - 24, 1100);
  const availH = h - topPad - bottomPad;
  let best = { rows: 1, cols: n, s: 0 };
  for (let rows = 1; rows <= 3; rows++) {
    const cols = Math.ceil(n / rows);
    const sw = (availW - gap * (cols - 1)) / (cols * 1.24);
    const sh = availH / (rows * (CAP + 0.3) + 0.6 * (rows - 1) + 0.55);
    const s = Math.min(sw, sh);
    if (s > best.s) best = { rows, cols, s };
  }
  const s = clamp(Math.floor(best.s), 24, w >= 900 ? 100 : 76);
  return { rows: best.rows, cols: best.cols, s, gap, slotW: s * 1.24, slotH: s * (CAP + 0.3), rowGap: s * 0.6, lift: s * 0.55 };
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
    <svg viewBox="0 0 24 24" className="h-16 w-16" style={{ animation: `ij-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#FFD66B" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}

function PopText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span aria-hidden className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF8FB5] blur-xl ${size}`} style={{ animation: "ij-glow .6s ease-in-out infinite alternate" }}>
        {text}
      </span>
      <span className={`relative block bg-gradient-to-t from-[#FF6FA3] via-[#FFA36B] to-[#FFE27A] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`} style={{ filter: "drop-shadow(0 3px 0 rgba(255,255,255,.9))" }}>
        {text}
      </span>
    </div>
  );
}

// ของ 1 ชิ้น: บล็อกพาสเทลมีขอบหนาให้ดูเป็น 3 มิติ + เงาสะท้อนแสง + ตัวการ์ตูนตรงกลาง
function Tile({ t, s, done }: { t: number; s: number; done: boolean }) {
  const T = TYPES[t];
  return (
    <span
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        borderRadius: s * 0.28,
        background: `linear-gradient(160deg, rgba(255,255,255,.5), rgba(255,255,255,0) 48%, rgba(0,0,0,.14)), ${T.c}`,
        boxShadow:
          `inset 0 ${s * 0.05}px 0 rgba(255,255,255,.7), inset 0 -${s * 0.09}px 0 rgba(0,0,0,.17), 0 ${s * 0.07}px ${s * 0.12}px rgba(60,60,110,.3)` +
          (done ? `, 0 0 ${s * 0.3}px rgba(255,210,80,.9)` : ""),
        fontSize: s * 0.48,
      }}
    >
      <span aria-hidden className="absolute rounded-full bg-white/60" style={{ left: s * 0.14, top: s * 0.1, width: s * 0.26, height: s * 0.12, transform: "rotate(-28deg)" }} />
      <span className="relative" style={{ lineHeight: 1, filter: "drop-shadow(0 2px 1px rgba(0,0,0,.18))" }}>{T.e}</span>
    </span>
  );
}

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";
const BTN_ROUND = "pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm ring-1 ring-black/5 backdrop-blur transition-transform active:scale-95";
const POP_SHADOW = "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 0 14px rgba(255,255,255,.9)";
const BUBBLES = [
  [6, 14, 70], [82, 10, 46], [14, 62, 38], [88, 58, 80], [48, 84, 52], [70, 32, 28],
];

/* =========================================================
   หน้าเกม
   ========================================================= */
export default function ItemJamPage() {
  const gRef = useRef<G>(null as unknown as G);
  if (!gRef.current) gRef.current = newG(0);
  const g = gRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);

  const timers = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);
  const roundRef = useRef(0);
  const recordRef = useRef(0);
  const layoutRef = useRef<ReturnType<typeof layout> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cutTimers = useRef<number[]>([]);
  const pressRef = useRef<{ pid: number; k: number; sx: number; sy: number; lx: number; touch: boolean } | null>(null);

  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [intro, setIntro] = useState<"ready" | "go" | null>("ready");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [record, setRecord] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [praise, setPraise] = useState("");
  const sumRef = useRef<HTMLDivElement>(null);
  const [natH, setNatH] = useState(620);

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
      recordRef.current = Number(localStorage.getItem("itemjamBest")) || 0;
      setRecord(recordRef.current);
      if (localStorage.getItem("itemjamMuted") === "1") {
        muted = true;
        setIsMuted(true);
      }
    } catch {}
  }, []);

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try { localStorage.setItem("itemjamMuted", muted ? "1" : "0"); } catch {}
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

  // ===== ตำแหน่งช่อง / เอฟเฟกต์ลอย =====
  function slotPos(L: ReturnType<typeof layout>, n: number, k: number) {
    const row = Math.floor(k / L.cols);
    const inRow = Math.min(L.cols, n - row * L.cols);
    const off = ((L.cols - inRow) * (L.slotW + L.gap)) / 2; // แถวสุดท้ายที่ไม่เต็มให้อยู่กึ่งกลาง
    return { x: off + (k % L.cols) * (L.slotW + L.gap), y: L.lift + row * (L.slotH + L.rowGap) };
  }
  function slotCenter(k: number) {
    const L = layoutRef.current;
    const n = gRef.current.slots.length;
    if (!L) return { x: 0, y: 0 };
    const p = slotPos(L, n, k);
    return { x: p.x + L.slotW / 2, y: p.y + L.slotH / 2 };
  }
  function boardCenter() {
    const L = layoutRef.current;
    if (!L) return { x: 0, y: 0 };
    return {
      x: (L.cols * L.slotW + (L.cols - 1) * L.gap) / 2,
      y: (L.lift + L.rows * L.slotH + (L.rows - 1) * L.rowGap) / 2,
    };
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

  // หาช่องที่อยู่ใต้พิกัด (พิกัดอิงจากมุมซ้ายบนของกระดาน) margin = ระยะที่ยอมให้คลาดเคลื่อน
  function slotAt(x: number, y: number, margin: number) {
    const L = layoutRef.current;
    const n = gRef.current.slots.length;
    if (!L) return -1;
    let best = -1;
    let bd = Infinity;
    for (let k = 0; k < n; k++) {
      const p = slotPos(L, n, k);
      if (x >= p.x - margin && x <= p.x + L.slotW + margin && y >= p.y - margin - L.lift * 0.3 && y <= p.y + L.slotH + margin) {
        const d = Math.hypot(x - (p.x + L.slotW / 2), y - (p.y + L.slotH / 2));
        if (d < bd) { bd = d; best = k; }
      }
    }
    return best;
  }

  // ช่องปลายทางของของที่ลากอยู่ (ใช้ทั้งตอนไฮไลต์และตอนปล่อย)
  // ถ้าปล่อยใกล้ช่องที่ว่างแต่ไม่ตรงเป๊ะ จะดูดเข้าช่องที่ใกล้ที่สุดให้เอง เล่นบนมือถือจะได้ไม่พลาดง่าย
  function dropTarget(x: number, y: number, from: number): { t: number; full: boolean } {
    const L = layoutRef.current;
    const cur = gRef.current;
    if (!L) return { t: -1, full: false };
    const direct = slotAt(x, y, L.s * 0.4);
    if (direct === from) return { t: -1, full: false };
    if (direct >= 0) return { t: direct, full: cur.slots[direct].length >= CAP };
    let best = -1;
    let bd = Infinity;
    const n = cur.slots.length;
    for (let k = 0; k < n; k++) {
      if (k === from || cur.slots[k].length >= CAP) continue;
      const p = slotPos(L, n, k);
      const cx = p.x + L.slotW / 2;
      const cy = p.y + L.slotH / 2;
      if (Math.abs(x - cx) > L.slotW * 0.95) continue;
      if (y < p.y - L.s * 1.2 || y > p.y + L.slotH + L.s * 1.2) continue;
      const d = Math.hypot(x - cx, (y - cy) * 0.5);
      if (d < bd) { bd = d; best = k; }
    }
    return { t: best, full: false };
  }

  function toBoard(e: { clientX: number; clientY: number }) {
    const r = boardRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  }

  // ===== ลำดับเกม =====
  function startTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    let last = performance.now();
    tickRef.current = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const cur = gRef.current;
      if (cur.drag && Math.abs(cur.drag.tilt) > 0.5) {
        cur.drag.tilt *= 0.5; // ของที่ลากอยู่ค่อยๆ ตั้งตรงเมื่อหยุดนิ้ว
        force();
      }
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

  // เริ่ม Level: ใช้ตัวละครที่กำหนดไว้ใน cur.cast (Level 1 = 3 ตัวแรก, Level อื่นถูกเลือกไว้ตอนคัตซีน)
  function startStage(n: number) {
    const cur = gRef.current;
    const { empty } = stageConfig(n);
    const cast = cur.cast;
    const types = cast.length;
    let slots: Item[][] = [];
    let tries = 0;
    do {
      const pool = shuffle(cast.flatMap((t) => Array.from({ length: CAP }, () => t)));
      slots = Array.from({ length: types + empty }, (_, s) =>
        s < types ? pool.slice(s * CAP, (s + 1) * CAP).map((t) => ({ id: ++cur.nextId, t, land: 0 })) : []
      );
      tries++;
    } while (tries < 30 && slots.some(isDone)); // ไม่ให้เริ่มมาแล้วมีช่องที่เรียบร้อยอยู่ก่อน
    cur.stage = n;
    cur.types = types;
    cur.dealId += 1;
    cur.slots = slots;
    cur.sel = null;
    cur.drag = null;
    cur.nope = -1;
    cur.history = [];
    cur.stageLocks = 0;
    cur.stageStart = performance.now();
    cur.phase = "playing";
    force();
  }

  function beginRound() {
    clearTimers();
    cutTimers.current.forEach((id) => clearTimeout(id));
    cutTimers.current = [];
    audio();
    pressRef.current = null;
    roundRef.current += 1;
    gRef.current = newG(roundRef.current);
    setSaveState("idle");
    setNewRecord(false);
    setPraise("");
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
    cur.sel = null;
    cur.drag = null;
    pressRef.current = null;
    cur.timeLeft = Math.max(0, cur.timeLeft);
    cur.lastSec = Math.ceil(cur.timeLeft);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    clearTimers();
    sfx.buzzer();
    const isNew = cur.score > recordRef.current && cur.score > 0;
    if (isNew) {
      recordRef.current = cur.score;
      try { localStorage.setItem("itemjamBest", String(cur.score)); } catch {}
    }
    setRecord(recordRef.current);
    setNewRecord(isNew);
    setPraise(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
    saveScore(cur.score);
    force();
  }

  function stageClear(cur: G) {
    cur.phase = "clear";
    cur.score += STAGE_POINTS;
    const bonus = bonusTime(cur.types);
    cur.timeLeft += bonus;
    cur.lastSec = Math.ceil(cur.timeLeft);
    const sec = Math.round((performance.now() - cur.stageStart) / 100) / 10;
    if (cur.fastest === 0 || sec < cur.fastest) cur.fastest = sec;
    sfx.clear();
    const C = boardCenter();
    later(() => {
      if (gRef.current !== cur) return;
      addFx({ kind: "burst", x: C.x, y: C.y, color: "#FF9EC0", big: true }, 1600);
    }, 350);
    screenPop(0.3, `Level ${cur.stage} สำเร็จ!`, "#C2457B", "เรียบร้อยสุดๆ", true, 1400);
    screenPop(0.42, `+${STAGE_POINTS} คะแนน`, "#27272A", "", false, 1400);
    screenPop(0.5, `+${bonus} วินาที`, "#2F8F6A", "", false, 1400);
    // ทุก Level มีคัตซีนก่อนเริ่ม Level ถัดไป
    later(() => {
      if (gRef.current !== cur || cur.phase !== "clear") return;
      beginCutscene(cur, cur.stage + 1);
    }, 1400);
  }

  // คัตซีน: กล่องของขวัญตกลงมา สั่น แล้วเพื่อนใหม่กระโดดออกมาทักทาย
  // เกมหยุดรอจนกว่าผู้เล่นจะกดปุ่ม "เริ่มเลย!" (เวลาเกมไม่เดินระหว่างนี้)
  function beginCutscene(cur: G, next: number) {
    const nc = nextCast(next, cur.cast);
    cur.cast = nc.cast;
    cur.cutNew = nc.added;
    cur.cutBye = nc.bye;
    cur.cutFriends = nc.friends;
    cur.phase = "cutscene";
    cur.cut = next;
    cur.sel = null;
    cur.drag = null;
    pressRef.current = null;
    force();
    const at = (fn: () => void, ms: number) => { cutTimers.current.push(window.setTimeout(fn, ms)); };
    at(() => sfx.boing(), 120);
    for (let i = 0; i < 6; i++) at(() => sfx.rattle(i), 1000 + i * 90);
    at(() => sfx.pop(), 1600);
    at(() => sfx.jingle(), 1680);
    at(() => sfx.chirp(), 2350);
    at(() => sfx.chirp(), 2550);
  }

  function finishCutscene(cur: G) {
    if (gRef.current !== cur || cur.phase !== "cutscene") return;
    cutTimers.current.forEach((id) => clearTimeout(id));
    cutTimers.current = [];
    const next = cur.cut;
    cur.cut = 0;
    sfx.whoosh();
    startStage(next);
  }

  // จัดครบชุด: วงแหวนกระจาย + อีโมจิน่ารักพุ่งกระจาย + ข้อความเชียร์ + ระฆังไล่เสียง + แฟลชพื้นหลัง
  function lockSlot(cur: G, k: number) {
    cur.locks += 1;
    cur.stageLocks += 1;
    cur.history = []; // ช่องที่เรียบร้อยแล้วย้อนกลับไม่ได้
    const now = performance.now();
    cur.streak = now - cur.lastLockAt < STREAK_MS ? cur.streak + 1 : 1;
    cur.lastLockAt = now;
    const streak = cur.streak;
    const C = slotCenter(k);
    const color = TYPES[cur.slots[k][0].t].c;
    const L = layoutRef.current;
    later(() => {
      if (gRef.current !== cur) return;
      addFx({ kind: "ring", x: C.x, y: C.y, color }, 900);
      addFx({ kind: "ring", x: C.x, y: C.y, color: "#FFFFFF", big: true }, 1000);
      addFx({ kind: "burst", x: C.x, y: C.y, color }, 1400);
      addFx({
        kind: "text", x: C.x, y: C.y - (L?.slotH ?? 100) * 0.15,
        text: streak >= 2 ? `ติดกัน ×${streak}!` : CHEERS[Math.floor(Math.random() * CHEERS.length)],
        color: "#C2457B",
      }, 1100);
    }, 240);
    later(() => sfx.lock(streak), 180);
    later(() => sfx.sparkle(), 520);
    if (cur.stageLocks >= cur.types) stageClear(cur);
  }

  function nope(cur: G, k: number) {
    cur.nope = k;
    sfx.nope();
    force();
    later(() => {
      if (cur.nope === k) {
        cur.nope = -1;
        force();
      }
    }, 420);
  }

  // ย้ายของชิ้นบนสุดจากช่อง from ไปช่อง k (ผู้เรียกต้องเช็กว่ามีที่ว่างแล้ว)
  function moveItem(cur: G, from: number, k: number) {
    const slot = cur.slots[k];
    const it = cur.slots[from].pop();
    if (!it) return;
    slot.push(it);
    it.land += 1;
    cur.lastMoved = it.id;
    cur.sel = null;
    cur.moves += 1;
    cur.history.push({ from, to: k });
    let run = 0;
    for (let i = slot.length - 1; i >= 0 && slot[i].t === it.t; i--) run++;
    later(() => sfx.put(false), 240);
    if (run >= 2 && !isDone(slot)) {
      // เรียงชนิดเดียวกันต่อกัน: หัวใจดวงเล็กลอยขึ้นพร้อมเสียงติ๊ง
      const C = slotCenter(k);
      later(() => sfx.ting(run), 360);
      later(() => {
        if (gRef.current !== cur) return;
        addFx({ kind: "text", x: C.x, y: C.y - (layoutRef.current?.slotH ?? 100) * 0.3, text: "💕", color: "#FF7BA9" }, 900);
      }, 330);
    }
    if (isDone(slot)) lockSlot(cur, k);
  }

  // แตะแบบ 2 จังหวะ (หยิบ → วาง) ยังใช้ได้เหมือนเดิม
  function tap(k: number) {
    const cur = gRef.current;
    if (cur.phase !== "playing") return;
    audio();
    const slot = cur.slots[k];
    if (cur.sel === null) {
      if (slot.length === 0 || isDone(slot)) { nope(cur, k); return; }
      cur.sel = k;
      sfx.pick();
      force();
      return;
    }
    const from = cur.sel;
    if (from === k) {
      cur.sel = null;
      sfx.put(true);
      force();
      return;
    }
    if (slot.length >= CAP) {
      // ช่องปลายทางเต็ม: ถ้าเป็นช่องที่ยังไม่เรียบร้อยให้เปลี่ยนไปหยิบช่องนั้นแทน
      if (isDone(slot)) { nope(cur, k); return; }
      cur.sel = k;
      sfx.pick();
      force();
      return;
    }
    moveItem(cur, from, k);
    force();
  }

  function undo() {
    const cur = gRef.current;
    if (cur.phase !== "playing" || cur.drag) return;
    const h = cur.history.pop();
    if (!h) return;
    const it = cur.slots[h.to].pop();
    if (!it) return;
    cur.slots[h.from].push(it);
    it.land += 1;
    cur.lastMoved = it.id;
    cur.sel = null;
    audio();
    sfx.undo();
    force();
  }

  // ===== การลาก (เมาส์/นิ้ว ผ่าน Pointer Events) =====
  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    const cur = gRef.current;
    if (cur.phase !== "playing" || e.button > 0) return;
    audio();
    const pt = toBoard(e);
    const k = slotAt(pt.x, pt.y, e.pointerType === "touch" ? 8 : 4);
    if (k < 0) {
      if (cur.sel !== null) { cur.sel = null; force(); } // แตะที่ว่าง = ยกเลิกการเลือก
      return;
    }
    pressRef.current = { pid: e.pointerId, k, sx: e.clientX, sy: e.clientY, lx: e.clientX, touch: e.pointerType === "touch" };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const pr = pressRef.current;
    const cur = gRef.current;
    const L = layoutRef.current;
    if (!pr || pr.pid !== e.pointerId || cur.phase !== "playing" || !L) return;
    if (!cur.drag) {
      if (Math.hypot(e.clientX - pr.sx, e.clientY - pr.sy) < (pr.touch ? 10 : 6)) return;
      const slot = cur.slots[pr.k];
      const top = slot[slot.length - 1];
      if (!top || isDone(slot)) return; // ลากไม่ได้ (ปล่อยแล้วจะนับเป็นการแตะ)
      cur.sel = null;
      // บนมือถือให้ของลอยอยู่เหนือนิ้วเพื่อไม่ให้นิ้วบัง
      cur.drag = { id: top.id, from: pr.k, x: 0, y: 0, dy: pr.touch ? -L.s * 0.75 : -L.s * 0.15, tilt: 0, hover: -1 };
      sfx.pick();
    }
    const d = cur.drag;
    const pt = toBoard(e);
    d.x = pt.x;
    d.y = pt.y;
    d.tilt = d.tilt * 0.6 + clamp((e.clientX - pr.lx) * 1.4, -16, 16) * 0.4; // เอียงตามทิศที่ลาก
    pr.lx = e.clientX;
    const r = dropTarget(pt.x, pt.y + d.dy, d.from);
    d.hover = r.t >= 0 && !r.full ? r.t : -1;
    force();
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const pr = pressRef.current;
    const cur = gRef.current;
    if (!pr || pr.pid !== e.pointerId) return;
    pressRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const d = cur.drag;
    if (!d) {
      tap(pr.k);
      return;
    }
    cur.drag = null;
    if (cur.phase === "playing") {
      const pt = toBoard(e);
      const r = dropTarget(pt.x, pt.y + d.dy, d.from);
      if (r.t >= 0) {
        if (!r.full) moveItem(cur, d.from, r.t);
        else nope(cur, r.t); // ช่องเต็ม: ของเด้งกลับที่เดิม
      } else {
        sfx.put(true); // วางนอกช่อง: เด้งกลับที่เดิม
      }
    }
    force();
  }

  function onCancel(e: React.PointerEvent<HTMLDivElement>) {
    const pr = pressRef.current;
    if (!pr || pr.pid !== e.pointerId) return;
    pressRef.current = null;
    const cur = gRef.current;
    if (cur.drag) {
      cur.drag = null;
      force();
    }
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

  // คีย์ลัดบนคอม: Space/Enter = เล่นอีกครั้ง (หน้าสรุป) หรือเริ่ม Level (หน้าคัตซีน), M = เสียง, Z = ย้อนกลับ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") toggleMute();
      if (e.code === "KeyZ") undo();
      if (e.code === "Space" || e.code === "Enter") {
        const ph = gRef.current.phase;
        if (ph !== "over" && ph !== "cutscene") return;
        if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
        e.preventDefault();
        if (ph === "over") beginRound();
        else finishCutscene(gRef.current);
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
      cutTimers.current.forEach((id) => clearTimeout(id));
      cutTimers.current = [];
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (g.phase === "over" && sumRef.current) setNatH(sumRef.current.offsetHeight);
  });

  // ===== ค่าที่ใช้แสดงผล =====
  const compact = dims.h < 500; // มือถือแนวนอน
  const wide = dims.w >= 640;
  const topPad = compact ? 84 : wide ? 140 : 124; // เว้นที่ด้านบนให้ตัวเลขเวลาที่ใหญ่ขึ้น
  const bottomPad = compact ? 66 : wide ? 104 : 88;
  const n = g.slots.length || 7;
  const lay = layout(n, dims.w, dims.h, topPad, bottomPad);
  layoutRef.current = lay;
  const s = lay.s;
  const boardW = lay.cols * lay.slotW + (lay.cols - 1) * lay.gap;
  const boardH = lay.lift + lay.rows * lay.slotH + (lay.rows - 1) * lay.rowGap;
  const over = g.phase === "over";
  const playing = g.phase === "playing";
  const drag = g.drag;
  const timeLow = g.lastSec <= 10 && (playing || g.phase === "clear");
  const left = g.types - g.stageLocks;
  const shownScore = useCountUp(g.score, over);
  const stars = starsFor(g.stage);
  const stagesDone = g.score / STAGE_POINTS;
  const canUndo = playing && !drag && g.history.length > 0;
  const cs = g.phase === "cutscene" && g.cut ? cutsceneInfo(g.cut, g.cutNew, g.cutBye, g.cutFriends) : null;
  const friendSize = cs ? clamp(Math.floor(300 / Math.max(1, cs.friends.length)) - 8, 30, 56) : 56;
  const newSize = cs && cs.added.length > 1 ? 92 : 120;
  const cutScale = Math.min(1, dims.h / 640, dims.w / 360);
  const showHint = g.stage === 1 && g.moves < 2 && playing;
  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${g.score} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };

  // รายการของทั้งหมดพร้อมตำแหน่ง (เรียงตาม id เพื่อให้ DOM ไม่ขยับ ทำให้อนิเมชันเลื่อนลื่น)
  const placed: { it: Item; k: number; i: number; top: boolean; done: boolean }[] = [];
  g.slots.forEach((slot, k) => {
    const done = isDone(slot);
    slot.forEach((it, i) => placed.push({ it, k, i, top: i === slot.length - 1, done }));
  });
  placed.sort((a, b) => a.it.id - b.it.id);

  return (
    <div className="ij-anim fixed inset-0 z-50 select-none overflow-hidden overscroll-none bg-gradient-to-b from-[#CDEFE4] via-[#FFF1E2] to-[#FFE3EE] font-sans text-zinc-900" style={{ touchAction: "manipulation" }}>
      <style>{`
        .ij-anim { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
        @keyframes ij-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes ij-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes ij-bump { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
        @keyframes ij-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes ij-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes ij-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes ij-in { 0% { transform: scale(.4) translateY(-24px); opacity: 0 } 100% { transform: none; opacity: 1 } }
        @keyframes ij-land { 0% { transform: scale(1) } 30% { transform: scale(1.2, .78) } 62% { transform: scale(.93, 1.1) } 100% { transform: scale(1) } }
        @keyframes ij-hop { 0% { transform: translateY(0) scale(1) } 25% { transform: translateY(0) scale(1.15, .8) } 55% { transform: translateY(-38%) scale(.92, 1.12) } 80% { transform: translateY(0) scale(1.1, .9) } 100% { transform: translateY(0) scale(1) } }
        @keyframes ij-wave { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-7%) } }
        @keyframes ij-shake { 0%,100% { transform: translateX(0) } 18% { transform: translateX(-6px) rotate(-1.5deg) } 36% { transform: translateX(6px) rotate(1.5deg) } 54% { transform: translateX(-4px) } 72% { transform: translateX(4px) } }
        @keyframes ij-slotpop { 0% { transform: scale(1) } 35% { transform: scale(1.09) } 100% { transform: scale(1) } }
        @keyframes ij-float { 0% { transform: translate(-50%,-50%) scale(.6); opacity: 0 } 20% { transform: translate(-50%,-80%) scale(1.1); opacity: 1 } 100% { transform: translate(-50%,-190%) scale(1); opacity: 0 } }
        @keyframes ij-burst { 0% { transform: translate(-50%,-50%) scale(.3) rotate(0); opacity: 0 } 15% { opacity: 1 } 55% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.25) rotate(var(--rot)); opacity: 1 } 100% { transform: translate(calc(-50% + var(--dx) * 1.2), calc(-50% + var(--dy) + 70px)) scale(.6) rotate(calc(var(--rot) * 1.5)); opacity: 0 } }
        @keyframes ij-ring { 0% { transform: translate(-50%,-50%) scale(.2); opacity: .9 } 100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0 } }
        @keyframes ij-twinkle { 0%, 100% { transform: scale(.4) rotate(0); opacity: .2 } 50% { transform: scale(1.1) rotate(25deg); opacity: 1 } }
        @keyframes ij-flash { 0% { opacity: 0 } 30% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes ij-screen { 0% { transform: translateY(14px) scale(.7); opacity: 0 } 18% { transform: translateY(0) scale(1.08); opacity: 1 } 30% { transform: scale(1) } 80% { opacity: 1 } 100% { transform: translateY(-14px) scale(1); opacity: 0 } }
        @keyframes ij-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ij-giftin { 0% { transform: translateY(-260px) scale(.6); opacity: 0 } 60% { transform: translateY(10px) scale(1.15, .85); opacity: 1 } 100% { transform: none; opacity: 1 } }
        @keyframes ij-giftshake { 0%, 100% { transform: rotate(0) } 20% { transform: rotate(-12deg) scale(1.05) } 40% { transform: rotate(12deg) scale(1.05) } 60% { transform: rotate(-10deg) } 80% { transform: rotate(8deg) } }
        @keyframes ij-giftout { 0% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.7); opacity: 0 } }
        @keyframes ij-jumpout { 0% { transform: scale(0) translateY(40px) } 40% { transform: scale(1.1, .95) translateY(-96px) } 65% { transform: scale(1.2, .8) translateY(0) } 82% { transform: scale(.95, 1.06) translateY(-8px) } 100% { transform: none } }
        @keyframes ij-slidein { from { opacity: 0; transform: translate(var(--sx), 40px) scale(.4) } to { opacity: 1; transform: none } }
        @keyframes ij-cloud { from { transform: translateX(-30vw) } to { transform: translateX(130vw) } }
        @keyframes ij-bubble { 0% { transform: scale(0); opacity: 0 } 70% { transform: scale(1.1); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes ij-btnin { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes ij-pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.07) } }
        @keyframes ij-bob { from { transform: translateY(0) scale(1) } to { transform: translateY(-26px) scale(1.06) } }
        @keyframes ij-badge { 0% { transform: translate(-50%,-50%) scale(0) } 70% { transform: translate(-50%,-50%) scale(1.25) } 100% { transform: translate(-50%,-50%) scale(1) } }
        @keyframes ij-alarm { 0%, 100% { transform: translateX(0) rotate(0) scale(1) } 20% { transform: translateX(-4px) rotate(-3deg) scale(1.05) } 40% { transform: translateX(4px) rotate(3deg) scale(1.05) } 60% { transform: translateX(-3px) rotate(-2deg) scale(1.02) } 80% { transform: translateX(3px) rotate(2deg) scale(1.02) } }
        @keyframes ij-vignette { from { opacity: .3 } to { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ij-anim, .ij-anim * { animation: none !important } .ij-anim .ij-fxonly { display: none } }
      `}</style>

      {/* ลูกโป่งฟองสบู่ลอยเบาๆ เป็นพื้นหลัง */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BUBBLES.map(([x, y, d], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/45 ring-1 ring-white/70"
            style={{ left: `${x}%`, top: `${y}%`, width: d, height: d, animation: `ij-bob ${6 + i}s ease-in-out ${i * 0.7}s infinite alternate` }}
          />
        ))}
      </div>

      {/* แฟลชสีชมพูอ่อนทั้งจอทุกครั้งที่จัดครบชุด */}
      {g.locks > 0 && !over && (
        <div
          key={g.locks}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,214,235,.7), rgba(255,255,255,0) 65%)", animation: "ij-flash .7s .2s ease-out both" }}
        />
      )}

      {/* ===== กระดาน (รับการลาก/แตะทั้งพื้นที่) ===== */}
      <main
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          opacity: g.phase === "intro" ? 0 : 1,
          visibility: over ? "hidden" : "visible", // ซ่อนของทั้งหมดตอนหน้าสรุป ไม่ให้ไอคอนค้าง
          zIndex: 0, // กักของในกระดานไว้ใน stacking context ของ main
          touchAction: "none",
          cursor: drag ? "grabbing" : "grab",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={boardRef} className="relative" style={{ width: boardW, height: boardH }}>
          {/* ช่องเก็บของ (ลักษณะตู้กระจกสามมิติ) */}
          {g.slots.map((slot, k) => {
            const p = slotPos(lay, g.slots.length, k);
            const done = isDone(slot);
            const sel = g.sel === k;
            const hover = drag?.hover === k;
            return (
              <button
                key={`${g.dealId}-${k}`}
                type="button"
                // เมาส์/นิ้วจัดการผ่าน pointer ที่กระดานแล้ว ปุ่มนี้รับเฉพาะคีย์บอร์ด (click ที่ detail = 0)
                onClick={(e) => { if (e.detail === 0) tap(k); }}
                disabled={!playing}
                tabIndex={-1}
                aria-label={`ช่องที่ ${k + 1} มี ${slot.length} ชิ้น${done ? " จัดครบแล้ว" : ""}${sel ? " กำลังเลือกอยู่" : ""}`}
                className="absolute outline-none focus-visible:ring-4 focus-visible:ring-pink-400"
                style={{
                  left: p.x,
                  top: p.y,
                  width: lay.slotW,
                  height: lay.slotH,
                  borderRadius: s * 0.32,
                  border: "2px solid rgba(255,255,255,.95)",
                  background: done
                    ? "linear-gradient(180deg,#FFF6C4,#FFE58F)"
                    : hover
                    ? "linear-gradient(180deg,#F4FFFA,#CFF4E5)"
                    : sel
                    ? "linear-gradient(180deg,#FFFFFF,#FFEAF3)"
                    : "linear-gradient(180deg,rgba(255,255,255,.78),rgba(222,230,250,.85))",
                  boxShadow: `inset 0 ${s * 0.06}px ${s * 0.12}px rgba(90,100,170,.25), 0 ${s * 0.09}px 0 ${done ? "#E3B93C" : hover ? "#6CC9A8" : sel ? "#F28DB2" : "#B9C1EA"}, 0 ${s * 0.2}px ${s * 0.22}px rgba(80,90,150,.2)${sel ? ", 0 0 0 4px rgba(255,143,181,.55)" : ""}${hover ? ", 0 0 0 4px rgba(108,201,168,.7), 0 0 22px rgba(108,201,168,.6)" : ""}`,
                  transform: hover ? "translateY(-3px) scale(1.04)" : undefined,
                  animation: g.nope === k ? "ij-shake .4s ease-in-out" : done ? "ij-slotpop .7s .2s ease-out" : undefined,
                  transition: "background .2s, box-shadow .2s, transform .2s",
                }}
              >
                {done && (
                  <>
                    <span
                      className="absolute left-1/2 top-0 flex items-center justify-center rounded-full bg-[#F4B63C] font-black text-white shadow"
                      style={{ width: s * 0.42, height: s * 0.42, fontSize: s * 0.26, animation: "ij-badge .45s cubic-bezier(.2,1.4,.4,1) both" }}
                    >
                      ✓
                    </span>
                    <span aria-hidden className="absolute text-[#F4B63C]" style={{ left: -s * 0.1, top: s * 0.5, fontSize: s * 0.3, animation: "ij-twinkle 1.6s ease-in-out infinite" }}>✦</span>
                    <span aria-hidden className="absolute text-[#FF8FB5]" style={{ right: -s * 0.08, top: s * 1.6, fontSize: s * 0.26, animation: "ij-twinkle 1.9s .6s ease-in-out infinite" }}>✧</span>
                  </>
                )}
              </button>
            );
          })}

          {/* ของทั้งหมด วางด้วยพิกัดจริง เลื่อนข้ามช่องได้นุ่มๆ */}
          {placed.map(({ it, k, i, top, done }) => {
            const p = slotPos(lay, g.slots.length, k);
            const dragging = !!drag && drag.id === it.id;
            const x = dragging ? drag.x - s / 2 : p.x + (lay.slotW - s) / 2;
            const y = dragging ? drag.y + drag.dy - s / 2 : p.y + s * 0.18 + (CAP - 1 - i) * s;
            const lifted = g.sel === k && top && !dragging;
            const d0 = 0.2 + i * 0.09;
            return (
              <div
                key={it.id}
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: s,
                  height: s,
                  padding: s * 0.06,
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  transition: dragging ? "none" : "transform .45s cubic-bezier(.3,1.35,.5,1)",
                  zIndex: dragging ? 50 : lifted ? 40 : g.lastMoved === it.id ? 30 : 2 + i,
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    transform: dragging
                      ? `scale(1.18) rotate(${drag.tilt}deg)`
                      : lifted
                      ? `translateY(${-lay.lift * 0.9}px) scale(1.1)`
                      : "none",
                    transition: dragging ? "transform .12s ease-out" : "transform .24s cubic-bezier(.3,1.5,.5,1)",
                    filter: dragging || lifted ? "drop-shadow(0 10px 8px rgba(80,60,120,.3))" : undefined,
                  }}
                >
                  <div
                    className="h-full w-full"
                    style={done ? { animation: `ij-hop .65s ${d0}s ease-out both, ij-wave 1.8s ${1.3 + i * 0.12}s ease-in-out infinite` } : undefined}
                  >
                    <span
                      key={it.land}
                      className="block h-full w-full"
                      style={{
                        transformOrigin: "50% 100%",
                        animation: it.land === 0 ? `ij-in .5s ${i * 40 + k * 25}ms cubic-bezier(.2,1.2,.4,1) both` : "ij-land .5s .3s ease-out both",
                      }}
                    >
                      <Tile t={it.t} s={s} done={done} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* เอฟเฟกต์บนกระดาน */}
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 60 }}>
            {g.fx.map((f) => {
              if (f.kind === "text") {
                return (
                  <span key={f.id} className="absolute whitespace-nowrap text-2xl font-black sm:text-3xl" style={{ left: f.x, top: f.y, color: f.color, textShadow: POP_SHADOW, animation: "ij-float 1s ease-out forwards" }}>
                    {f.text}
                  </span>
                );
              }
              if (f.kind === "ring") {
                return (
                  <span
                    key={f.id}
                    className="absolute rounded-full"
                    style={{ left: f.x, top: f.y, width: lay.slotW, height: lay.slotW, border: `${Math.max(3, s * 0.08)}px solid ${f.color}`, animation: `ij-ring .8s ${f.big ? 0.12 : 0}s ease-out both` }}
                  />
                );
              }
              if (f.kind === "burst") {
                const cnt = f.big ? 26 : 14;
                return Array.from({ length: cnt }, (_, i) => {
                  const a = (i / cnt) * Math.PI * 2 + f.id * 0.7;
                  const d = (f.big ? 90 : 50) + ((i * 37) % 5) * (f.big ? 26 : 14);
                  return (
                    <span
                      key={`${f.id}-${i}`}
                      className="absolute leading-none"
                      style={{
                        left: f.x, top: f.y, fontSize: (i % 3 === 0 ? 1.5 : 1.15) * 16,
                        animation: `ij-burst ${f.big ? 1.3 : 1}s ${(i % 4) * 0.03}s ease-out forwards`,
                        ["--dx" as string]: `${Math.cos(a) * d}px`,
                        ["--dy" as string]: `${Math.sin(a) * d - 24}px`,
                        ["--rot" as string]: `${(i % 2 ? 1 : -1) * (30 + (i % 5) * 18)}deg`,
                      }}
                    >
                      {CONFETTI[i % CONFETTI.length]}
                    </span>
                  );
                });
              }
              return null;
            })}
          </div>
        </div>
      </main>

      {/* เวลาใกล้หมด: ขอบจอเรืองสีแดงชมพูเต้นเบาๆ */}
      {timeLow && !over && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 90px 12px rgba(255,92,122,.5)", animation: "ij-vignette .8s ease-in-out infinite alternate" }}
        />
      )}

      {/* ===== HUD (ซ้อนบนจอ ไม่กินพื้นที่) ===== */}
      {!over && (
        <div className="pointer-events-none absolute inset-0" style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}>
          <div className="relative h-full w-full">
            {/* เวลา มุมบนซ้าย: ตัวเลขใหญ่ไล่สีชมพู-ส้ม-เหลือง ไม่มีกรอบขาว ไม่มีไอคอน (≤ 10 วิ: แดงและสั่น) */}
            <div className="absolute left-3 top-2 sm:left-4 sm:top-3">
              <p
                className={`pl-1 text-sm font-bold tracking-wide ${timeLow ? "text-[#FF4D6D]" : "text-[#C2457B]"}`}
                style={{ textShadow: "0 1px 0 rgba(255,255,255,.9)" }}
              >
                เวลา
              </p>
              <div className="-mt-1" style={timeLow ? { animation: "ij-alarm .45s ease-in-out infinite" } : undefined}>
                <p
                  key={g.lastSec}
                  className={`px-1 font-black italic leading-[1.05] tabular-nums tracking-tighter ${compact ? "text-5xl" : "text-7xl sm:text-8xl"} ${
                    timeLow ? "text-[#FF4D6D]" : "bg-gradient-to-t from-[#FF6FA3] via-[#FFA36B] to-[#FFD66B] bg-clip-text text-transparent"
                  }`}
                  style={{
                    animation: timeLow ? "ij-bump .35s ease-out" : undefined,
                    filter: timeLow
                      ? "drop-shadow(0 2px 0 rgba(255,255,255,.95)) drop-shadow(0 0 14px rgba(255,77,109,.55))"
                      : "drop-shadow(0 3px 0 rgba(255,255,255,.95))",
                  }}
                >
                  {g.lastSec}
                </p>
              </div>
              <div className={`mt-1 h-2.5 overflow-hidden rounded-full bg-white/60 ${compact ? "w-24" : "w-28 sm:w-40"}`}>
                <div
                  className={`h-full rounded-full ${timeLow ? "animate-pulse bg-[#FF4D6D]" : "bg-gradient-to-r from-[#7FD6C0] to-[#97D58C]"}`}
                  style={{ width: `${clamp(g.lastSec / DURATION, 0, 1) * 100}%`, transition: "width 1s linear, background-color .3s" }}
                />
              </div>
            </div>

            {/* คำใบ้/จำนวนชุดที่เหลือ: ข้อความล้วนตรงกลาง ไม่มีกรอบขาว */}
            {!compact && (playing || g.phase === "clear") && (
              <div className="absolute inset-x-0 flex justify-center" style={{ top: topPad - 30 }}>
                <span
                  className="max-w-[92vw] text-center text-xs font-bold text-[#C2457B] sm:text-sm"
                  style={{ textShadow: POP_SHADOW }}
                >
                  {showHint ? "ลากของไปวางในช่อง หรือแตะช่องเพื่อหยิบ/วาง" : `เหลืออีก ${Math.max(0, left)} ชุด`}
                </span>
              </div>
            )}

            {/* ป้ายคะแนน + Level มุมบนขวา */}
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1 sm:right-4 sm:top-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD66B] px-3 py-1.5 shadow-sm sm:gap-2 sm:px-5 sm:py-2.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 sm:h-6 sm:w-6" fill="#4A3700" aria-hidden>
                  <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" strokeLinejoin="round" />
                </svg>
                <span key={g.score} className="text-xl font-bold leading-none tabular-nums tracking-tight text-[#2E2300] sm:text-3xl" style={{ animation: "ij-bump .35s ease-out" }}>
                  {g.score.toLocaleString("en-US")}
                </span>
              </div>
              <span
                key={g.stage}
                className="bg-gradient-to-t from-[#FF6FA3] via-[#FFA36B] to-[#FFD66B] bg-clip-text pr-2 text-xl font-black italic leading-none tracking-tighter text-transparent sm:text-3xl"
                style={{ filter: "drop-shadow(0 2px 0 rgba(255,255,255,.95))", animation: "ij-bump .4s ease-out" }}
              >
                Level {g.stage}
              </span>
            </div>

            {/* ปุ่มย้อนกลับ มุมล่างขวา (กด Z บนคอมได้) */}
            <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="ย้อนกลับ (Z)"
                className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white/90 px-5 text-sm font-semibold shadow-sm ring-1 ring-black/5 backdrop-blur transition-all active:scale-95 disabled:opacity-40"
              >
                <span aria-hidden className="text-lg">↩</span>ย้อนกลับ
              </button>
            </div>

            {/* ปุ่มกลับ/เสียง มุมล่างซ้าย (กด M เพื่อเปิด/ปิดเสียงบนคอมได้) */}
            <div className="absolute bottom-3 left-3 flex gap-2 sm:bottom-5 sm:left-5">
              <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ" className={BTN_ROUND}>←</Link>
              <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง (M)" className={BTN_ROUND}>
                {isMuted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ข้อความกลางจอ (ผ่าน Level) */}
      {g.fx.filter((f) => f.kind === "screen").map((f) => (
        <div key={f.id} className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center" style={{ top: `${f.y * 100}%`, animation: "ij-screen 1.2s ease-out both" }}>
          {f.title && (
            <span className="text-2xl font-black italic sm:text-3xl" style={{ color: "#FF7BA9", textShadow: POP_SHADOW }}>
              {f.title}
            </span>
          )}
          <span className={`font-black ${f.big ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl"}`} style={{ color: f.color, textShadow: POP_SHADOW }}>
            {f.text}
          </span>
        </div>
      ))}

      {/* ===== คัตซีน (ก่อนเริ่มทุก Level ตั้งแต่ Level 2) — ผู้เล่นต้องกด "เริ่มเลย!" ก่อน เกมถึงจะเริ่ม ===== */}
      {cs && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(180deg,#FFD3E5 0%,#FFF1D6 55%,#CDEFE4 100%)", animation: "ij-fadein .35s ease-out both" }}
        >
          {/* เมฆลอย + ประกายระยิบ */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {[[10, 0, 16], [32, -7, 22], [62, -3, 19]].map(([y, d, sec], i) => (
              <span key={i} className="absolute left-0 text-5xl opacity-80" style={{ top: `${y}%`, animation: `ij-cloud ${sec}s linear ${d}s infinite` }}>☁️</span>
            ))}
            {[[12, 22], [84, 18], [20, 70], [78, 64], [50, 90], [92, 42]].map(([x, y], i) => (
              <span key={i} className="absolute text-2xl text-[#FFB7D0]" style={{ left: `${x}%`, top: `${y}%`, animation: `ij-twinkle ${1.6 + i * 0.25}s ${i * 0.3}s ease-in-out infinite` }}>✦</span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => finishCutscene(g)}
            className="absolute right-3 top-3 h-10 rounded-full bg-white/85 px-4 text-sm font-semibold text-zinc-600 shadow-sm ring-1 ring-black/5 transition-transform active:scale-95 sm:right-5 sm:top-5"
            style={{ marginTop: "env(safe-area-inset-top)" }}
          >
            ข้าม ›
          </button>

          <div className="relative flex flex-col items-center text-center" style={{ transform: `scale(${cutScale})` }}>
            <div style={{ animation: "ij-intro .55s .1s cubic-bezier(.2,1.3,.4,1) both" }}>
              <PopText text={cs.title} size="text-6xl sm:text-7xl" />
              <p className="-mt-1 text-lg font-bold text-[#C2457B]" style={{ textShadow: POP_SHADOW }}>{cs.sub}</p>
            </div>

            {/* กล่องของขวัญ → เพื่อนใหม่กระโดดออกมา (Level ที่สลับตัวอาจมา 2 ตัว) */}
            <div className="relative mt-10 h-56 w-56">
              <div className="ij-fxonly absolute inset-0 flex items-center justify-center text-[7rem] leading-none" style={{ animation: "ij-giftin .55s .3s cubic-bezier(.2,1.4,.4,1) both, ij-giftshake .6s 1s ease-in-out, ij-giftout .25s 1.6s ease-in forwards" }}>
                🎁
              </div>
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                const d = 90 + (i % 3) * 28;
                return (
                  <span
                    key={i}
                    className="ij-fxonly absolute left-1/2 top-[58%] text-2xl leading-none"
                    style={{
                      animation: `ij-burst 1.3s ${1.6 + (i % 4) * 0.03}s ease-out both`,
                      ["--dx" as string]: `${Math.cos(a) * d}px`,
                      ["--dy" as string]: `${Math.sin(a) * d - 30}px`,
                      ["--rot" as string]: `${(i % 2 ? 1 : -1) * (40 + (i % 4) * 20)}deg`,
                    }}
                  >
                    {CONFETTI[i % CONFETTI.length]}
                  </span>
                );
              })}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2" style={{ animation: "ij-jumpout .9s 1.6s cubic-bezier(.3,1.3,.5,1) both" }}>
                {cs.added.map((t, i) => (
                  <div key={t} style={{ width: newSize, height: newSize, animation: `ij-wave 1.6s ${2.6 + i * 0.15}s ease-in-out infinite` }}>
                    <Tile t={t} s={newSize} done={false} />
                  </div>
                ))}
              </div>
              <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ animation: "ij-bubble .45s 2.5s cubic-bezier(.2,1.4,.4,1) both", transformOrigin: "50% 100%" }}>
                <div className="relative whitespace-nowrap rounded-2xl bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-md">
                  {cs.line}
                  <span aria-hidden className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
                </div>
              </div>
            </div>

            {/* เพื่อนเก่าที่ยังอยู่ โผล่มาต้อนรับ (ขึ้นบรรทัดใหม่ได้เมื่อมีหลายตัว) */}
            <div className="mt-2 flex max-w-[22rem] flex-wrap items-end justify-center" style={{ gap: 6 }}>
              {cs.friends.map((t, i) => (
                <div
                  key={t}
                  style={{
                    width: friendSize,
                    height: friendSize,
                    ["--sx" as string]: `${(i - (cs.friends.length - 1) / 2) * 90}px`,
                    animation: `ij-slidein .6s ${0.6 + i * 0.1}s cubic-bezier(.2,1.3,.4,1) both, ij-wave 1.8s ${1.6 + i * 0.1}s ease-in-out infinite`,
                  }}
                >
                  <Tile t={t} s={friendSize} done={false} />
                </div>
              ))}
            </div>

            {cs.bye.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-[#C2457B]" style={{ animation: "ij-btnin .4s 2.7s both" }}>
                {cs.bye.map((t) => TYPES[t].e).join(" ")} กลับไปพักก่อนนะ 👋
              </p>
            )}
            <p className="mt-2 max-w-[17rem] text-sm font-medium text-zinc-600" style={{ animation: "ij-btnin .4s 2.7s both" }}>{cs.tip}</p>
            <button
              type="button"
              onClick={() => finishCutscene(g)}
              className="mt-3 h-14 rounded-full bg-zinc-900 px-10 text-base font-medium text-white hover:opacity-90"
              style={{ animation: "ij-btnin .4s 2.7s both, ij-pulse 1.2s 3.2s ease-in-out infinite" }}
            >
              เริ่มเลย!
            </button>
          </div>
        </div>
      )}

      {/* READY → GO!!! */}
      <div className={`pointer-events-none absolute inset-0 bg-[#3B1D3F]/35 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`} />
      {intro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div key={intro} style={{ animation: intro === "ready" ? "ij-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "ij-go .9s ease-out both" }}>
            <PopText text={intro === "ready" ? "READY" : "GO!!!"} size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"} />
          </div>
        </div>
      )}

      {/* ===== หน้าสรุปคะแนน ===== */}
      {over && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#FFE0EC] via-white to-white">
          <div style={{ width: 340, height: natH, transform: `scale(${Math.min((dims.h * 0.9) / natH, (dims.w * 0.94) / 340, 1.35)})` }} className="shrink-0">
            <div ref={sumRef} className="text-center" style={{ animation: "ij-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
              <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#FFD66B]" : "bg-zinc-100 text-zinc-600"}`}>
                {newRecord ? "🏆 สถิติใหม่!" : "หมดเวลา!"}
              </span>

              {/* ดาว 3 ดวง: ถึง Level 2 = 1 ดาว, Level 3 = 2 ดาว, Level 4 ขึ้นไป = 3 ดาว */}
              <div className="mt-4 flex items-end justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={i === 1 ? "-translate-y-3" : ""}>
                    <Star on={i < stars} delay={0.3 + i * 0.22} />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-500">{RANKS[stars]}</p>
              <p className="text-xs text-zinc-400">ไปถึง Level {g.stage}</p>
              {stars === 3 && praise && (
                <p className="mx-auto mt-2 max-w-[18rem] rounded-2xl bg-[#FFF3C4] px-3 py-2 text-sm font-semibold text-[#8A5A00]">{praise}</p>
              )}

              <div className="mt-4 rounded-3xl bg-[#FFD66B] px-4 py-5">
                <p className="text-xs text-zinc-700">คะแนนรอบนี้</p>
                <p className="text-7xl font-semibold leading-none tabular-nums tracking-tight">{shownScore}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-[#97D58C]/55 py-3">
                  <p className="text-xl font-semibold tabular-nums">{stagesDone}</p>
                  <p className="text-xs text-zinc-600">Level ที่ผ่าน</p>
                </div>
                <div className="rounded-2xl bg-[#9DB4F2]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.moves}</p>
                  <p className="text-xs text-zinc-600">ย้ายของทั้งหมด (ครั้ง)</p>
                </div>
                <div className="rounded-2xl bg-[#FF9EC0]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.locks}</p>
                  <p className="text-xs text-zinc-600">ชุดที่จัดครบ</p>
                </div>
                <div className="rounded-2xl bg-[#FFB874]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.fastest > 0 ? `${g.fastest} วิ` : "-"}</p>
                  <p className="text-xs text-zinc-600">Level ที่เร็วที่สุด</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">สถิติสูงสุด {record}</p>
              <p className="h-4 text-xs text-zinc-500" role="status">{saveText[saveState]}</p>

              <button onClick={beginRound} className={`${BTN_MAIN} mt-4`}>เล่นอีกครั้ง</button>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href="/rank" className={BTN_SUB}>ดูอันดับ</Link>
                <Link href="/" className={BTN_SUB}>หน้าหลัก</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}