"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/* =========================================================
   Typing — เกมพิมพ์ไว 30 วินาที (สไตล์เดียวกับ Basketball)
   READY → GO → คอมโบ → ติดไฟ → เลเวลอัป → สรุปคะแนน
   ========================================================= */

const BG = "#F4D35E";
const FG = "#4A3B00";
const RED = "#C4262E";
const GAME_ID = "typing";
const FONT = 'ui-sans-serif, system-ui, "Noto Sans Thai", sans-serif';
const PALETTE = ["#A8B5E8", "#F4A58A", "#9CC593", "#F4D35E", "#B7CBB0"];

// ===== ตั้งค่าเกม =====
const DURATION = 30; // เวลาเริ่มต้น 30 วินาที
const FIRE_STREAK = 9; // ถึง x9 เริ่มติดไฟสีแดง
const BLUE_STREAK = 30; // ถึง x30 ทั้งหน้าจอเปลี่ยนเป็นไฟสีฟ้า
const BLUE_BG = "#0B1E5B";
const BLUE_FG = "#E0F2FE";
// ลิ้นไฟสีฟ้าที่ขอบล่างจอ (โหมด x30)
const TONGUES = Array.from({ length: 16 }, (_, i) => ({ h: 55 + ((i * 37) % 45), dur: 0.6 + ((i * 13) % 7) / 10, delay: (i % 5) * 0.12 }));
const WORDS_PER_LEVEL = 10; // พิมพ์ถูกทุก 10 คำ เลเวลอัป
const MAX_LEVEL = 5;
const LV_MAXLEN = [4, 5, 6, 8, 99]; // เลเวลสูงขึ้น คำยาวขึ้น

// ===== ตั้งค่าคะแนนที่บันทึก =====
const WPM_PER_POINT = 10; // ทุก 10 WPM = 1 คะแนน
const MAX_POINTS = 15; // คะแนนสูงสุด (= 150 WPM ขึ้นไป)
const MAX_WPM = WPM_PER_POINT * MAX_POINTS;
const STAR_AT = [4, 8, 12]; // คะแนนที่ต้องได้ 1 / 2 / 3 ดาว
const pointsFor = (wpm: number) => Math.min(MAX_POINTS, Math.floor(wpm / WPM_PER_POINT));
const BEST_KEY = "typingBest";
const MUTE_KEY = "typingMuted";

const WORDS = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "I", "with", "as", "not", "on", "she", "at",
  "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more",
  "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take",
  "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find",
  "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just",
  "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "old", "life", "tell", "write",
  "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another",
  "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home",
  "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem",
  "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line",
];

type Phase = "ready" | "idle" | "running" | "done";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";
type PopT = { id: number; text: string; color: string; big?: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: 0 | 1; color: string };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeWords(n: number, level: number): string[] {
  const max = LV_MAXLEN[clamp(level, 1, MAX_LEVEL) - 1];
  const pool = WORDS.filter((w) => w.length <= max);
  const out: string[] = [];
  while (out.length < n) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w !== out[out.length - 1]) out.push(w);
  }
  return out;
}

function rating(wpm: number) {
  if (wpm >= 80) return "เทพแป้นพิมพ์";
  if (wpm >= 60) return "มือโปรเลยทีเดียว";
  if (wpm >= 40) return "เร็วกว่าค่าเฉลี่ย";
  if (wpm >= 20) return "กำลังดี ฝึกอีกนิดจะเร็วขึ้น";
  return "เริ่มต้นได้ดี เล่นซ้ำเพื่อทำเวลาให้ดีขึ้น";
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
const sfx = {
  key: () => tone(rand(480, 560), 0.04, "triangle", 0.05),
  typo: () => tone(150, 0.08, "sawtooth", 0.07, 90),
  word: (fire: boolean) => {
    tone(660, 0.09, "triangle", 0.13);
    tone(880, 0.12, "triangle", 0.13, undefined, 0.06);
    if (fire) tone(1180, 0.14, "triangle", 0.12, undefined, 0.12);
  },
  bad: () => tone(200, 0.22, "sawtooth", 0.14, 90),
  level: () => {
    tone(392, 0.12, "square", 0.1);
    tone(523, 0.12, "square", 0.1, undefined, 0.1);
    tone(784, 0.22, "square", 0.1, undefined, 0.2);
  },
  whoosh: () => noise(0.5, 0.35, 400, 2400),
  buzzer: () => tone(190, 0.8, "sawtooth", 0.22),
  tick: () => tone(880, 0.06, "sine", 0.12),
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// วิ่งจาก 0 → target (ทศนิยม เพื่อให้ตัววิ่งเลื่อนลื่น) หน่วงเริ่มเล็กน้อยให้เห็นหน้าสรุปก่อน
function useRace(target: number, active: boolean, ms = 2400, delay = 400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms, delay]);
  return v;
}

function Star({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" style={{ animation: `tp-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#F4D35E" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}

// ข้อความไล่สีส้ม-เหลืองแบบไฟลุก (READY / GO)
function FireText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-xl ${size}`}
        style={{ animation: "tp-glow .5s ease-in-out infinite alternate" }}
      >
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
const BTN_ROUND = "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-900 shadow-sm ring-1 ring-black/5 backdrop-blur transition-transform active:scale-95";

const WordView = memo(function WordView({ w, t, active, past, targetRef, blue }: { w: string; t: string; active: boolean; past: boolean; targetRef: RefObject<HTMLSpanElement | null>; blue: boolean }) {
  const bad = past && t !== w;
  const extra = t.length > w.length ? t.slice(w.length) : "";
  const tgt = active ? Math.min(t.length, w.length) : -1;
  return (
    <span className="flex shrink-0">
      <span className="flex" style={bad ? { boxShadow: `inset 0 -4px 0 0 ${blue ? "#FF6B6B" : RED}` } : undefined}>
        {w.split("").map((c, j) => {
          let cls = blue ? "text-white/50" : "text-[#4A3B00]/50";
          if (j < t.length) cls = t[j] === c ? (blue ? "text-white" : "text-zinc-900") : blue ? "text-[#FF6B6B]" : "text-[#C4262E]";
          return (
            <span key={j} ref={tgt === j ? targetRef : undefined} className={`${cls} transition-colors duration-100`}>
              {c}
            </span>
          );
        })}
        {extra && <span className={`${blue ? "text-[#FF6B6B]" : "text-[#C4262E]"} opacity-70`}>{extra}</span>}
      </span>
      <span ref={tgt === w.length ? targetRef : undefined} className="w-[1ch] shrink-0" />
    </span>
  );
});

export default function TypingGame() {
  const router = useRouter();
  const [words, setWords] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [intro, setIntro] = useState<"ready" | "go" | null>("ready");
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [keys, setKeys] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [made, setMade] = useState(0); // จำนวนคำที่พิมพ์ถูก
  const [streak, setStreak] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [pops, setPops] = useState<PopT[]>([]);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [focused, setFocused] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [natH, setNatH] = useState(640);

  const inputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tapeBoxRef = useRef<HTMLDivElement>(null);
  const sumRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const snapRef = useRef(true);
  const handledRef = useRef(false); // กันบันทึกคะแนนซ้ำในรอบเดียว
  const lastSecRef = useRef(DURATION);
  const introTimers = useRef<number[]>([]);
  const partsRef = useRef<Particle[]>([]);
  const popId = useRef(0);
  const streakRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  streakRef.current = streak;
  phaseRef.current = phase;

  const total = DURATION;

  // ===== เริ่มรอบใหม่: READY → GO แล้วรอพิมพ์ตัวแรกเพื่อเริ่มจับเวลา =====
  const beginRound = useCallback(() => {
    introTimers.current.forEach((t) => clearTimeout(t));
    introTimers.current = [];
    audio();
    snapRef.current = true;
    handledRef.current = false;
    lastSecRef.current = DURATION;
    partsRef.current = [];
    setWords(makeWords(60, 1));
    setPhase("ready");
    setIntro("ready");
    setWordIdx(0);
    setTyped("");
    setHistory([]);
    setKeys(0);
    setWrong(0);
    setMade(0);
    setStreak(0);
    setBestCombo(0);
    setLevel(1);
    setTimeLeft(DURATION);
    setPops([]);
    setNewRecord(false);
    setSaveState("idle");
    introTimers.current.push(
      window.setTimeout(() => {
        setPhase("idle");
        setIntro("go");
        sfx.whoosh();
        inputRef.current?.focus();
      }, 1300),
      window.setTimeout(() => setIntro(null), 2200)
    );
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => router.push("/#games"), [router]);

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {}
    inputRef.current?.focus();
  }

  useEffect(() => {
    beginRound();
    try {
      const v = Number(localStorage.getItem(BEST_KEY));
      if (v > 0) setBest(v);
      if (localStorage.getItem(MUTE_KEY) === "1") {
        muted = true;
        setIsMuted(true);
      }
    } catch {}
    return () => introTimers.current.forEach((t) => clearTimeout(t));
  }, [beginRound]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && document.activeElement === document.body) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  // ขนาดจอ ใช้ย่อหน้าสรุปผลให้พอดีโดยไม่ต้องเลื่อน
  useEffect(() => {
    const calc = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setDims({ w: Math.floor(window.innerWidth), h: Math.floor(vh) });
    };
    calc();
    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  // ===== นับเวลาถอยหลัง 30 วินาที =====
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const left = Math.max(0, DURATION - (performance.now() - startRef.current) / 1000);
      setTimeLeft(left);
      const sec = Math.ceil(left);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        if (sec > 0 && sec <= 5) sfx.tick();
      }
      if (left <= 0) {
        sfx.buzzer();
        setPhase("done");
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase]);

  useIsoLayoutEffect(() => {
    const tr = trackRef.current;
    const el = targetRef.current;
    if (!tr || !el) return;
    const x = el.offsetLeft;
    if (snapRef.current) {
      tr.style.transition = "none";
      tr.style.transform = `translate3d(${-x}px,0,0)`;
      void tr.offsetWidth;
      tr.style.transition = "";
      snapRef.current = false;
    } else {
      tr.style.transform = `translate3d(${-x}px,0,0)`;
    }
  }, [typed, wordIdx, words, phase]);

  // offsetHeight ไม่ถูกกระทบจาก transform: scale จึงได้ความสูงเต็มของเนื้อหา
  useEffect(() => {
    if (phase === "done" && sumRef.current) setNatH(sumRef.current.offsetHeight);
  });

  // ===== อนุภาค (ระเบิดตอนพิมพ์ถูก + เปลวไฟตอนติดไฟ) =====
  const burst = useCallback((fire: boolean) => {
    const r = tapeBoxRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = r.left + r.width * 0.38;
    const y = r.top + r.height / 2;
    const ps = window.innerHeight / 640;
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(90, 300) * ps;
      partsRef.current.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140 * ps,
        life: rand(0.5, 0.9), max: 0.9, size: rand(5, 10), kind: fire ? 0 : 1, color: PALETTE[i % 5],
      });
    }
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(window.innerWidth * dpr);
      c.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const W = window.innerWidth, H = window.innerHeight, ps = H / 640;
      ctx.clearRect(0, 0, W, H);

      for (const p of partsRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.kind === 1) p.vy += 1400 * ps * dt;
      }
      partsRef.current = partsRef.current.filter((p) => p.life > 0).slice(-300);

      ctx.globalCompositeOperation = "lighter";
      for (const p of partsRef.current) {
        if (p.kind !== 0) continue;
        const t = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = `hsla(${8 + 42 * t}, 100%, ${46 + 16 * t}%, ${t * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.35 + t * 0.65)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      for (const p of partsRef.current) {
        if (p.kind !== 1) continue;
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  // ===== ข้อความลอย =====
  function pop(text: string, color: string, big = false) {
    const id = ++popId.current;
    setPops((p) => [...p.slice(-2), { id, text, color, big }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1150);
  }

  // ===== คำนวณผล =====
  const current = words[wordIdx] ?? "";
  let prefix = 0;
  while (prefix < typed.length && typed[prefix] === current[prefix]) prefix++;
  const correctChars = history.reduce((sum, t, i) => sum + (t === words[i] ? words[i].length + 1 : 0), 0) + prefix;
  const done = phase === "done";
  const elapsed = done ? total : total - timeLeft;
  const wpm = elapsed >= 1 ? Math.round(correctChars / 5 / (elapsed / 60)) : 0;
  const accuracy = keys > 0 ? Math.round(((keys - wrong) / keys) * 100) : 100;

  const points = pointsFor(wpm);
  const stars = STAR_AT.filter((s) => points >= s).length;
  const shownWpm = useRace(wpm, done);
  const shownPoints = pointsFor(shownWpm);
  const arrived = done && shownWpm >= wpm - 0.01;
  const trackPct = Math.min(100, (shownWpm / MAX_WPM) * 100);
  const onFire = streak >= FIRE_STREAK && phase === "running";
  const blue = streak >= BLUE_STREAK && phase === "running";
  const bgNow = blue ? BLUE_BG : BG;
  const timeLow = timeLeft <= 10 && phase === "running";
  const timeShown = Math.ceil(timeLeft);

  // บันทึกคะแนน (API ใช้ $inc จึงส่งเฉพาะคะแนนของรอบนี้)
  const saveScoreToUser = useCallback(async (pts: number) => {
    if (pts <= 0) return;
    let userId = "";
    try {
      const profileStr = localStorage.getItem("profile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        userId = profile.userId || profile.id || profile._id || "";
      }
      if (!userId) userId = localStorage.getItem("userId") || "";
    } catch {}
    if (!userId) {
      setSaveState("guest");
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gameKey: GAME_ID, score: pts }),
      });
      const result = await res.json().catch(() => null);
      setSaveState(res.ok && result?.success ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  useEffect(() => {
    if (phase !== "done" || handledRef.current) return;
    handledRef.current = true;
    inputRef.current?.blur();

    if (wpm > best) {
      setBest(wpm);
      setNewRecord(true);
      try {
        localStorage.setItem(BEST_KEY, String(wpm));
      } catch {}
    }
    saveScoreToUser(points);
  }, [phase, wpm, best, points, saveScoreToUser]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === "ready" || phase === "done") return;
    const v = e.target.value;
    if (phase === "idle") {
      if (!v.trim()) return;
      startRef.current = performance.now();
      lastSecRef.current = DURATION;
      setPhase("running");
    }

    // เว้นวรรค = ส่งคำ
    if (v.endsWith(" ")) {
      const w = v.trim();
      if (!w) return;
      const ok = w === current;
      setHistory((h) => [...h, w]);
      setWordIdx((i) => i + 1);
      setTyped("");

      let regenerated = false;
      if (ok) {
        const ns = streak + 1;
        const nm = made + 1;
        setStreak(ns);
        setBestCombo((b) => Math.max(b, ns));
        setMade(nm);
        if (ns < FIRE_STREAK) burst(false); // ติดไฟแล้วไม่ใช้อนุภาค เพราะจะบังคำ
        sfx.word(ns >= FIRE_STREAK);
        if (ns === FIRE_STREAK) {
          pop("🔥 ON FIRE!", "#E8643C", true);
          sfx.whoosh();
        } else if (ns === BLUE_STREAK) {
          pop("BLUE FLAME!", "#38BDF8", true);
          sfx.whoosh();
        }
        const lv = Math.min(MAX_LEVEL, 1 + Math.floor(nm / WORDS_PER_LEVEL));
        if (lv > level) {
          setLevel(lv);
          pop(`LEVEL ${lv}`, "#1F2A5C", true);
          sfx.level();
          // คำที่ใกล้จะมาถึงยังเป็นของเลเวลเดิม ให้ที่เหลือเปลี่ยนเป็นคำของเลเวลใหม่
          setWords((ws) => [...ws.slice(0, wordIdx + 8), ...makeWords(60, lv)]);
          regenerated = true;
        }
      } else {
        if (streak >= FIRE_STREAK) pop("คอมโบหลุด", "#71717A");
        setStreak(0);
        sfx.bad();
      }
      if (!regenerated && wordIdx > words.length - 25) setWords((ws) => [...ws, ...makeWords(40, level)]);
      return;
    }

    if (v.length > current.length + 6) return;
    if (v.length > typed.length) {
      setKeys((k) => k + 1);
      if (v[v.length - 1] !== current[v.length - 1]) {
        setWrong((x) => x + 1);
        sfx.typo();
      } else sfx.key();
    }
    setTyped(v);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      beginRound();
    }
  }

  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${points} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };

  // ===== เลย์เอาต์หน้าสรุป: จอกว้าง = 2 คอลัมน์, มือถือ = คอลัมน์เดียวย่อให้พอดีจอ =====
  const wide = dims.w >= 900 && dims.h >= 560;
  const sumW = wide ? 900 : 340;
  const sumScale = Math.min((dims.h * 0.92) / natH, (dims.w * 0.94) / sumW, wide ? 1.2 : 1.35);

  const sumHeader = (
    <div>
      <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#F4D35E]" : "bg-zinc-100 text-zinc-600"}`}>
        {newRecord ? "🏆 สถิติใหม่!" : "หมดเวลา!"}
      </span>
      <div className="mt-4 flex items-end justify-center gap-1">
        {STAR_AT.map((_, i) => (
          <div key={i} className={i === 1 ? "-translate-y-2" : ""}>
            <Star on={i < stars} delay={0.3 + i * 0.22} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-500">{rating(wpm)}</p>
    </div>
  );

  const sumScoreCard = (
    <div className="rounded-3xl bg-[#F4D35E] px-4 py-5 text-center">
      <p className="text-xs text-zinc-700">คะแนนที่ได้</p>
      <p className={`font-semibold leading-none tabular-nums tracking-tight ${wide ? "text-8xl" : "text-7xl"}`}>
        <span key={shownPoints} className="inline-block" style={{ animation: shownPoints > 0 ? "tp-bump .3s ease-out" : undefined }}>
          {shownPoints}
        </span>
        <span className="ml-1 text-2xl font-medium text-zinc-700">/{MAX_POINTS}</span>
      </p>
    </div>
  );

  const sumTrack = (
    <div className="rounded-3xl bg-white px-4 pb-4 pt-3 text-left shadow-sm ring-1 ring-black/5">
      <div className="flex items-baseline justify-between text-xs text-zinc-500">
        <span>0</span>
        <span>ทุก {WPM_PER_POINT} WPM = 1 คะแนน</span>
        <span>{MAX_WPM}+ 🏁</span>
      </div>
      <div className="relative mx-3 mt-9 h-3 rounded-full bg-zinc-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#7FC8A9]" style={{ width: `${trackPct}%` }} />
        {Array.from({ length: MAX_POINTS }, (_, k) => {
          const n = k + 1;
          const lit = shownPoints >= n;
          return (
            <span
              key={`${n}-${lit}`}
              aria-hidden
              className="absolute top-1/2 block h-3.5 w-3.5 rounded-full ring-2 ring-white"
              style={{
                left: `${(n / MAX_POINTS) * 100}%`,
                transform: "translate(-50%,-50%)",
                backgroundColor: lit ? "#F4D35E" : "#D4D4D8",
                animation: lit ? "tp-flag .4s ease-out" : undefined,
              }}
            />
          );
        })}
        <div className="absolute bottom-full mb-1.5" style={{ left: `${trackPct}%`, transform: "translateX(-50%)" }}>
          <div className="relative rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
            {Math.round(shownWpm)}
            <span className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-900" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[10px] tabular-nums text-zinc-400">
        {[0, 50, 100, 150].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );

  const sumResult = (
    <div className="h-12 text-center text-sm" style={{ opacity: arrived ? 1 : 0, animation: arrived ? "tp-fade .35s ease-out both" : undefined }}>
      <p className="font-semibold">
        คุณพิมพ์ได้ {wpm} WPM → ได้ {points} คะแนน
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {points >= MAX_POINTS ? "เต็ม 15 คะแนนแล้ว สุดยอด!" : `อีก ${(points + 1) * WPM_PER_POINT - wpm} WPM จะได้ ${points + 1} คะแนน`}
      </p>
    </div>
  );

  const sumStats = (
    <div className="grid grid-cols-2 gap-2 text-center text-sm">
      <div className="rounded-2xl bg-[#B7CBB0]/60 py-3">
        <p className="text-xl font-semibold tabular-nums">{made}</p>
        <p className="text-xs text-zinc-600">คำที่พิมพ์ถูก</p>
      </div>
      <div className="rounded-2xl bg-[#A8B5E8]/50 py-3">
        <p className="text-xl font-semibold tabular-nums">{accuracy}%</p>
        <p className="text-xs text-zinc-600">แม่นยำ</p>
      </div>
      <div className="rounded-2xl bg-[#F2994A]/40 py-3">
        <p className="text-xl font-semibold tabular-nums">{bestCombo}</p>
        <p className="text-xs text-zinc-600">คอมโบสูงสุด</p>
      </div>
      <div className="rounded-2xl bg-[#F4A58A]/50 py-3">
        <p className="text-xl font-semibold tabular-nums">{wrong}</p>
        <p className="text-xs text-zinc-600">พิมพ์พลาด</p>
      </div>
    </div>
  );

  const sumFooter = (
    <div className="text-center">
      <p className="text-xs text-zinc-500">สถิติสูงสุด {best} WPM</p>
      <p className="h-4 text-xs text-zinc-500" role="status">{saveText[saveState]}</p>
      <button onClick={beginRound} className={`${BTN_MAIN} mt-3`}>
        เล่นอีกครั้ง
      </button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/rank" className={BTN_SUB}>
          ดูอันดับ
        </Link>
        <Link href="/" className={BTN_SUB}>
          หน้าหลัก
        </Link>
      </div>
    </div>
  );

  const edge = (side: "left" | "right", bg: string): React.CSSProperties => {
    const to = side === "left" ? "to right" : "to left";
    const m = `linear-gradient(${to}, #000 45%, transparent)`;
    return {
      background: `linear-gradient(${to}, ${bg} 12%, transparent)`,
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      maskImage: m,
      WebkitMaskImage: m,
    };
  };

  const textGlow = "0 2px 0 rgba(255,255,255,.9), 0 0 12px rgba(255,255,255,.9)";
  const blueGlow = "0 0 14px rgba(125,211,252,.9), 0 2px 4px rgba(0,0,40,.5)";
  const hudShadow = blue ? "0 1px 4px rgba(0,0,40,.6)" : "0 1px 0 rgba(255,255,255,.9)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="พิมพ์ไว Typing Test"
      style={{ backgroundColor: bgNow, color: blue ? BLUE_FG : FG, transition: "background-color .8s ease, color .8s ease", animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)", touchAction: "manipulation" }}
      className="tp-anim fixed inset-0 z-[60] overflow-hidden overscroll-none font-sans"
    >
      <style>{`
        @keyframes sheet-in { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes caret-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes tp-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes tp-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes tp-bump { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
        @keyframes tp-flag { 0% { transform: translate(-50%,-50%) scale(1) } 40% { transform: translate(-50%,-50%) scale(1.8) } 100% { transform: translate(-50%,-50%) scale(1) } }
        @keyframes tp-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes tp-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes tp-flame { 0% { transform: translateY(14px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(-16px) scale(1.1); opacity: 0 } }
        @keyframes tp-tongue { 0% { transform: scaleY(.75) scaleX(1) translateX(0) } 100% { transform: scaleY(1.15) scaleX(.9) translateX(6px) } }
        @keyframes tp-flicker {
          0%,100% { transform: scaleY(1); filter: brightness(1) }
          20% { transform: scaleY(.95); filter: brightness(1.2) }
          45% { transform: scaleY(1); filter: brightness(.95) }
          70% { transform: scaleY(.97); filter: brightness(1.25) }
        }
        @keyframes tp-timeshake {
          0%,100% { transform: translate(0,0) rotate(0deg) }
          15% { transform: translate(-4px,2px) rotate(-2deg) }
          30% { transform: translate(4px,-3px) rotate(2deg) }
          45% { transform: translate(-3px,-2px) rotate(-1.5deg) }
          60% { transform: translate(3px,3px) rotate(1.5deg) }
          80% { transform: translate(-2px,1px) rotate(-1deg) }
        }
        @keyframes tp-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes tp-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes tp-pop { 0% { transform: translateY(18px) scale(.5); opacity: 0 } 20% { transform: translateY(0) scale(1.15); opacity: 1 } 70% { transform: translateY(-14px) scale(1); opacity: 1 } 100% { transform: translateY(-36px) scale(1); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) {
          .tape { transition: none !important; }
          .tp-anim, .tp-anim * { animation: none !important; }
        }
      `}</style>

      {/* โหมดติดไฟ: ฉากอุ่นขึ้น มีแสงส้มรอบจุดพิมพ์ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: onFire ? 1 : 0,
          boxShadow: blue ? "inset 0 0 160px 30px rgba(56,189,248,.55)" : undefined,
          background: blue
            ? "radial-gradient(ellipse at 38% 50%, rgba(56,189,248,.35), rgba(11,30,91,0) 70%)"
            : "radial-gradient(ellipse at 38% 50%, rgba(255,122,26,.5), rgba(120,30,0,.28) 70%)",
        }}
      />

      {/* โหมด x30: ลิ้นไฟสีฟ้าลุกจากขอบล่างจอ (อยู่ใต้ตัวหนังสือ ไม่บังคำ) */}
      {blue && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[36%] overflow-hidden" style={{ animation: "tp-fade .6s ease-out both" }}>
          <div className="flex h-full items-end">
            {TONGUES.map((f, i) => (
              <span
                key={i}
                style={{
                  width: `${100 / TONGUES.length + 3}%`,
                  marginLeft: i ? "-1.5%" : 0,
                  height: `${f.h}%`,
                  flexShrink: 0,
                  background: "linear-gradient(to top, rgba(37,99,235,.95), rgba(125,211,252,.8) 55%, rgba(255,255,255,0))",
                  borderRadius: "50% 50% 0 0 / 85% 85% 0 0",
                  filter: "blur(8px)",
                  transformOrigin: "50% 100%",
                  mixBlendMode: "screen",
                  animation: `tp-tongue ${f.dur}s ${f.delay}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== กลางจอ: เทปคำศัพท์ ===== */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={() => inputRef.current?.focus()}>
        <div className="relative w-full">
          {/* ข้อความลอย (ON FIRE / เลเวลอัป) */}
          <div className="pointer-events-none absolute bottom-full left-[38%] z-10 mb-3 flex -translate-x-1/2 flex-col items-center gap-1">
            {pops.map((p) => (
              <div
                key={p.id}
                className="whitespace-nowrap font-black italic leading-none"
                style={{
                  color: p.color,
                  fontSize: p.big ? "clamp(34px,7vw,68px)" : "clamp(22px,4.5vw,40px)",
                  WebkitTextStroke: "7px #fff",
                  paintOrder: "stroke fill",
                  animation: "tp-pop 1.1s ease-out both",
                }}
              >
                {p.text}
              </div>
            ))}
          </div>

          <div
            ref={tapeBoxRef}
            className={`relative h-40 overflow-hidden font-mono text-4xl font-medium transition-[filter,opacity] duration-300 sm:h-48 sm:text-6xl lg:text-7xl ${
              focused || phase === "ready" ? "" : "opacity-60 blur-[3px]"
            }`}
            aria-label="ข้อความที่ต้องพิมพ์"
          >
            <div
              ref={trackRef}
              className="tape absolute left-[38%] top-0 flex h-full w-max items-center whitespace-pre transition-transform duration-150 ease-out will-change-transform"
            >
              {words.map((w, i) => (
                <WordView key={i} w={w} t={i === wordIdx ? typed : history[i] ?? ""} active={i === wordIdx} past={i < wordIdx} targetRef={targetRef} blue={blue} />
              ))}
            </div>
            <span
              aria-hidden
              className="absolute left-[38%] rounded-full"
              style={
                onFire
                  ? {
                      top: 0, height: "100%", width: 6, marginLeft: -4, transformOrigin: "50% 100%",
                      background: blue
                        ? "linear-gradient(to top, #2563EB, #7DD3FC 55%, #FFFFFF)"
                        : "linear-gradient(to top, #C4262E, #FF7A1A 50%, #FFE066)",
                      boxShadow: blue
                        ? "0 0 14px 3px rgba(125,211,252,.85), 0 0 34px 8px rgba(59,130,246,.45)"
                        : "0 0 14px 3px rgba(255,100,20,.8), 0 0 34px 8px rgba(255,60,20,.4)",
                      animation: "tp-flicker .22s ease-in-out infinite",
                    }
                  : {
                      top: "50%", height: "1.2em", width: 4, marginLeft: -2, transform: "translateY(-50%)", background: "#18181B",
                      animation: phase === "idle" ? "caret-blink 1s step-end infinite" : undefined,
                    }
              }
            />
          </div>

          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[24%]" style={edge("left", bgNow)} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[24%]" style={edge("right", bgNow)} />

          <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${focused || words.length === 0 || phase === "ready" ? "opacity-0" : "opacity-100"}`}>
            <span className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white">คลิกที่นี่หรือกดปุ่มใดก็ได้เพื่อเริ่มพิมพ์</span>
          </div>

          <input
            ref={inputRef}
            value={typed}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(e) => e.preventDefault()}
            autoFocus
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="พิมพ์ข้อความที่นี่"
            className="absolute inset-0 h-full w-full cursor-default opacity-0"
          />

          <p className="pointer-events-none mt-8 px-6 text-center text-sm font-semibold opacity-70">
            {phase === "idle" ? "พิมพ์ตัวอักษรแรกเพื่อเริ่มจับเวลา" : phase === "running" ? "เว้นวรรคเพื่อไปคำถัดไป · พิมพ์ถูกติดกันเพื่อสะสมคอมโบ" : "\u00A0"}
          </p>
        </div>
      </div>

      {/* อนุภาค */}
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* ===== HUD: ซ้อนบนจอเกม ไม่กินพื้นที่ (เว้น safe-area) ===== */}
      {phase !== "done" && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
        >
          <div className="relative h-full w-full">
            {/* เวลา มุมบนซ้าย: ใกล้หมดเวลาจะเป็นสีแดงและสั่น */}
            <div className="absolute left-3 top-2 select-none sm:left-4 sm:top-3">
              <p className={`pl-1 text-sm font-bold tracking-wide ${timeLow ? "text-[#E5484D]" : blue ? "text-sky-100" : "text-zinc-700"}`} style={{ textShadow: hudShadow }}>
                เวลา
              </p>
              <div className="-mt-1" style={timeLow ? { animation: "tp-timeshake .35s ease-in-out infinite" } : undefined}>
                <p
                  className={`px-1 text-7xl font-black italic leading-[1.05] tabular-nums tracking-tighter sm:text-8xl ${timeLow ? "text-[#E5484D]" : blue ? "text-white" : "text-zinc-900"}`}
                  style={{ textShadow: timeLow ? "0 2px 0 rgba(255,255,255,.95), 0 0 16px rgba(229,72,77,.55)" : blue ? blueGlow : textGlow }}
                >
                  {timeShown}
                </p>
              </div>
              <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5 sm:w-40">
                <div
                  className={`h-full rounded-full ${timeLow ? "bg-[#E5484D]" : "bg-[#7FC8A9]"}`}
                  style={{ width: `${clamp(timeLeft / total, 0, 1) * 100}%`, transition: "width .15s linear, background-color .3s" }}
                />
              </div>
              <p className={`mt-1.5 pl-1 text-xs font-semibold tabular-nums ${blue ? "text-sky-100" : "text-zinc-700"}`} style={{ textShadow: hudShadow }}>
                แม่นยำ {accuracy}%
              </p>
            </div>

            {/* ป้าย WPM มุมบนขวา ติดไฟตามคอมโบ (คะแนนจะแสดงในหน้าสรุปเท่านั้น) */}
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1 sm:right-4 sm:top-4">
              <div
                className={`inline-flex items-baseline gap-1.5 rounded-full px-4 py-2 shadow-sm transition-colors duration-300 sm:px-5 sm:py-2.5 ${onFire ? "bg-zinc-900" : "bg-white"}`}
                style={onFire ? { boxShadow: blue ? "0 0 18px 2px rgba(125,211,252,.7)" : "0 0 18px 2px rgba(255,110,30,.65)" } : undefined}
              >
                <span
                  className={`text-2xl font-bold leading-none tabular-nums tracking-tight sm:text-3xl ${
                    onFire
                      ? (blue ? "bg-gradient-to-t from-[#3B82F6] via-[#7DD3FC] to-white" : "bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066]") + " bg-clip-text text-transparent"
                      : "text-[#2E2300]"
                  }`}
                >
                  {wpm}
                </span>
                <span className={`text-xs font-semibold ${onFire ? (blue ? "text-[#BAE6FD]" : "text-[#FFB347]") : "text-zinc-500"}`}>WPM</span>
              </div>
              <span key={level} className={`pr-2 text-xs font-semibold ${blue ? "text-sky-100" : "text-zinc-700"}`} style={{ textShadow: hudShadow, animation: "tp-bump .35s ease-out" }}>
                เลเวล {level}
              </span>
            </div>

            {/* คอมโบ มุมล่างขวา ติดไฟเมื่อ onFire */}
            <div className="absolute bottom-3 right-3 select-none text-right sm:bottom-5 sm:right-5">
              <div className="relative inline-block px-4 pt-7">
                {onFire && (
                  <>
                    <span
                      aria-hidden
                      className={`absolute bottom-0 right-4 text-7xl font-black italic leading-[1.05] tracking-tighter blur-md sm:text-8xl ${blue ? "text-[#38BDF8]" : "text-[#FF7A1A]"}`}
                      style={{ animation: "tp-glow .5s ease-in-out infinite alternate" }}
                    >
                      {streak}
                    </span>
                  </>
                )}
                <p
                  key={streak}
                  className={`relative px-3 py-1 text-7xl font-black italic leading-[1.05] tabular-nums tracking-tighter sm:text-8xl ${
                    blue ? "bg-gradient-to-t from-[#3B82F6] via-[#7DD3FC] to-white bg-clip-text text-transparent" : onFire ? "bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text text-transparent" : streak > 0 ? "text-zinc-900" : "text-zinc-900/30"
                  }`}
                  style={{ animation: "tp-bump .3s ease-out", ...(onFire ? {} : { textShadow: textGlow }) }}
                >
                  {streak}
                </p>
              </div>
              <p className={`-mt-1 pr-4 text-sm font-bold tracking-wide ${onFire ? "text-[#FFF1C2]" : "text-zinc-700"}`} style={onFire ? { textShadow: blue ? "0 1px 4px rgba(10,40,120,.8)" : "0 1px 4px rgba(120,30,0,.7)" } : { textShadow: "0 1px 0 rgba(255,255,255,.9)" }}>
                {blue ? "COMBO ไฟสีฟ้า!" : onFire ? "COMBO ติดไฟ!" : "COMBO"}
              </p>
            </div>

            {/* ปุ่มกลับ / เสียง / เริ่มใหม่ มุมล่างซ้าย */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ (Esc)" className={BTN_ROUND}>←</Link>
              <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง" className={BTN_ROUND}>
                {isMuted ? "🔇" : "🔊"}
              </button>
              <button onClick={beginRound} aria-label="เริ่มใหม่" title="เริ่มใหม่ (Tab)" className={BTN_ROUND}>↻</button>
            </div>
          </div>
        </div>
      )}

      {/* READY → GO!!! */}
      <div className={`pointer-events-none absolute inset-0 bg-[#190C28]/45 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`} />
      {intro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div key={intro} style={{ animation: intro === "ready" ? "tp-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "tp-go .9s ease-out both" }}>
            <FireText text={intro === "ready" ? "READY" : "GO!!!"} size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"} />
          </div>
        </div>
      )}

      {/* ===== หน้าสรุปคะแนน ===== */}
      {done && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7E9A8] via-white to-white text-zinc-900">
          <div style={{ width: sumW, height: natH, transform: `scale(${sumScale})` }} className="shrink-0">
            <div ref={sumRef} style={{ animation: "tp-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
              {wide ? (
                <div className="grid grid-cols-2 items-center gap-10 text-center">
                  <div className="flex flex-col gap-4">
                    {sumHeader}
                    {sumScoreCard}
                    {sumResult}
                  </div>
                  <div className="flex flex-col gap-3">
                    {sumTrack}
                    {sumStats}
                    {sumFooter}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 text-center">
                  {sumHeader}
                  {sumScoreCard}
                  {sumTrack}
                  {sumResult}
                  {sumStats}
                  {sumFooter}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}