"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

const BG = "#F4D35E";
const FG = "#4A3B00";
const RED = "#C4262E";
const GAME_ID = "typing";

// ===== ตั้งค่าคะแนน =====
const WPM_PER_POINT = 10; // ทุก 10 WPM = 1 คะแนน
const MAX_POINTS = 15; // คะแนนสูงสุด (= 150 WPM ขึ้นไป)
const MAX_WPM = WPM_PER_POINT * MAX_POINTS; // ปลายสุดของเส้นชัย
const STAR_AT = [4, 8, 12]; // คะแนนที่ต้องได้ 1 / 2 / 3 ดาว
const pointsFor = (wpm: number) => Math.min(MAX_POINTS, Math.floor(wpm / WPM_PER_POINT));

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
const DURATIONS = [30, 60, 120] as const;
const BATCH = 200;
const BEST_KEY = "typingBest";

type Phase = "idle" | "running" | "done";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";

function makeWords(n: number): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
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

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";

const WordView = memo(function WordView({ w, t, active, past, targetRef }: { w: string; t: string; active: boolean; past: boolean; targetRef: RefObject<HTMLSpanElement | null> }) {
  const bad = past && t !== w;
  const extra = t.length > w.length ? t.slice(w.length) : "";
  const tgt = active ? Math.min(t.length, w.length) : -1;
  return (
    <span className="flex shrink-0">
      <span className="flex" style={bad ? { boxShadow: `inset 0 -4px 0 0 ${RED}` } : undefined}>
        {w.split("").map((c, j) => {
          let cls = "text-[#4A3B00]/50";
          if (j < t.length) cls = t[j] === c ? "text-zinc-900" : "text-[#C4262E]";
          return (
            <span key={j} ref={tgt === j ? targetRef : undefined} className={`${cls} transition-colors duration-100`}>
              {c}
            </span>
          );
        })}
        {extra && <span className="text-[#C4262E] opacity-70">{extra}</span>}
      </span>
      <span ref={tgt === w.length ? targetRef : undefined} className="w-[1ch] shrink-0" />
    </span>
  );
});

export default function TypingGame() {
  const router = useRouter();
  const [duration, setDuration] = useState<number>(60);
  const [words, setWords] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [keys, setKeys] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [focused, setFocused] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [natH, setNatH] = useState(640);

  const inputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const sumRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(0);
  const snapRef = useRef(true);
  const handledRef = useRef(false); // กันบันทึกคะแนนซ้ำในรอบเดียว

  const reset = useCallback((d: number) => {
    snapRef.current = true;
    handledRef.current = false;
    setWords(makeWords(BATCH));
    setPhase("idle");
    setWordIdx(0);
    setTyped("");
    setHistory([]);
    setKeys(0);
    setWrong(0);
    setTimeLeft(d);
    setNewRecord(false);
    setSaveState("idle");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => router.push("/#games"), [router]);

  useEffect(() => {
    reset(60);
    try {
      const v = Number(localStorage.getItem(BEST_KEY));
      if (v > 0) setBest(v);
    } catch {}
  }, [reset]);

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

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const left = Math.max(0, duration - (performance.now() - startRef.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) setPhase("done");
    }, 100);
    return () => clearInterval(t);
  }, [phase, duration]);

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

  const current = words[wordIdx] ?? "";
  let prefix = 0;
  while (prefix < typed.length && typed[prefix] === current[prefix]) prefix++;
  const correctChars = history.reduce((sum, t, i) => sum + (t === words[i] ? words[i].length + 1 : 0), 0) + prefix;
  const elapsed = phase === "done" ? duration : duration - timeLeft;
  const wpm = elapsed >= 1 ? Math.round(correctChars / 5 / (elapsed / 60)) : 0;
  const accuracy = keys > 0 ? Math.round(((keys - wrong) / keys) * 100) : 100;

  const done = phase === "done";
  const points = pointsFor(wpm);
  const stars = STAR_AT.filter((s) => points >= s).length;
  const shownWpm = useRace(wpm, done);
  const shownPoints = pointsFor(shownWpm);
  const arrived = done && shownWpm >= wpm - 0.01;
  const trackPct = Math.min(100, (shownWpm / MAX_WPM) * 100);

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
    if (phase === "done") return;
    const v = e.target.value;
    if (phase === "idle") {
      if (!v.trim()) return;
      startRef.current = performance.now();
      setPhase("running");
    }
    if (v.endsWith(" ")) {
      const w = v.trim();
      if (!w) return;
      setHistory((h) => [...h, w]);
      setWordIdx((i) => i + 1);
      setTyped("");
      if (wordIdx > words.length - 40) setWords((ws) => [...ws, ...makeWords(BATCH)]);
      return;
    }
    if (v.length > current.length + 6) return;
    if (v.length > typed.length) {
      setKeys((k) => k + 1);
      if (v[v.length - 1] !== current[v.length - 1]) setWrong((x) => x + 1);
    }
    setTyped(v);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      reset(duration);
    }
  }

  function pickDuration(d: number) {
    setDuration(d);
    reset(d);
  }

  const stats: [string, string][] = [
    ["วินาทีที่เหลือ", String(Math.ceil(timeLeft))],
    ["คำต่อนาที (WPM)", String(wpm)],
    ["ความแม่นยำ", `${accuracy}%`],
    ["สถิติดีที่สุด", String(best)],
  ];

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
    <div className="grid grid-cols-3 gap-2 text-center text-sm">
      <div className="rounded-2xl bg-[#A8B5E8]/50 py-3">
        <p className="text-xl font-semibold tabular-nums">{accuracy}%</p>
        <p className="text-xs text-zinc-600">แม่นยำ</p>
      </div>
      <div className="rounded-2xl bg-[#B7CBB0]/60 py-3">
        <p className="text-xl font-semibold tabular-nums">{correctChars}</p>
        <p className="text-xs text-zinc-600">ตัวอักษรถูก</p>
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
      <button onClick={() => reset(duration)} className={`${BTN_MAIN} mt-3`}>
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

  const edge = (side: "left" | "right"): React.CSSProperties => {
    const to = side === "left" ? "to right" : "to left";
    const m = `linear-gradient(${to}, #000 45%, transparent)`;
    return {
      background: `linear-gradient(${to}, ${BG} 12%, transparent)`,
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      maskImage: m,
      WebkitMaskImage: m,
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="พิมพ์ไว Typing Test"
      style={{ backgroundColor: BG, color: FG, animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }}
      className="tp-anim fixed inset-0 z-[60] overflow-y-auto font-sans"
    >
      <style>{`
        @keyframes sheet-in { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes caret-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes tp-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes tp-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes tp-bump { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
        @keyframes tp-flag { 0% { transform: translate(-50%,-50%) scale(1) } 40% { transform: translate(-50%,-50%) scale(1.8) } 100% { transform: translate(-50%,-50%) scale(1) } }
        @keyframes tp-fade { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) {
          .tape { transition: none !important; }
          .tp-anim, .tp-anim * { animation: none !important; }
        }
      `}</style>

      <div className="flex min-h-full flex-col">
        <div className="mx-auto w-full max-w-5xl px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 items-center rounded-full bg-white/70 px-4 text-xs font-semibold tracking-wide text-zinc-900">NOW</span>
              <span className="text-sm font-medium">พิมพ์ไว Typing Test</span>
            </div>
            <Link
              href="/#games"
              aria-label="ปิด"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-3xl bg-white/70 px-5 py-4">
                <p className="text-sm opacity-60">{label}</p>
                <p className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10" onClick={() => inputRef.current?.focus()}>
          <div className="mx-auto mb-10 w-full max-w-md px-6">
            <div className="h-2 overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: FG,
                  width: phase === "running" ? "0%" : phase === "idle" ? "100%" : "0%",
                  transition: phase === "running" ? `width ${duration}s linear` : "none",
                }}
              />
            </div>
          </div>

          <div className="relative">
            <div
              className={`relative h-40 overflow-hidden font-mono text-4xl font-medium transition-[filter,opacity] duration-300 sm:h-48 sm:text-6xl lg:text-7xl ${focused ? "" : "opacity-60 blur-[3px]"}`}
              aria-label="ข้อความที่ต้องพิมพ์"
            >
              <div
                ref={trackRef}
                className="tape absolute left-[38%] top-0 flex h-full w-max items-center whitespace-pre transition-transform duration-150 ease-out will-change-transform"
              >
                {words.map((w, i) => (
                  <WordView key={i} w={w} t={i === wordIdx ? typed : history[i] ?? ""} active={i === wordIdx} past={i < wordIdx} targetRef={targetRef} />
                ))}
              </div>
              <span
                aria-hidden
                className="absolute left-[38%] top-1/2 -ml-0.5 h-[1.2em] w-1 -translate-y-1/2 rounded-full bg-zinc-900"
                style={{ animation: phase === "idle" ? "caret-blink 1s step-end infinite" : undefined }}
              />
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[24%]" style={edge("left")} />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[24%]" style={edge("right")} />

            <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${focused || words.length === 0 ? "opacity-0" : "opacity-100"}`}>
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
          </div>

          <p className="mt-10 px-6 text-center text-sm opacity-70">
            {phase === "idle" ? `พิมพ์ตัวอักษรแรกเพื่อเริ่มจับเวลา · ทุก ${WPM_PER_POINT} WPM = 1 คะแนน (สูงสุด ${MAX_POINTS})` : "เว้นวรรคเพื่อไปคำถัดไป"}
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => pickDuration(d)}
                disabled={phase === "running"}
                aria-pressed={duration === d}
                className={`h-11 rounded-full px-5 text-sm font-medium text-zinc-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  duration === d ? "bg-zinc-900 !text-white" : "bg-white/70 hover:bg-white"
                }`}
              >
                {d} วินาที
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm opacity-70 sm:inline">Tab เริ่มใหม่ · Esc ปิดเกม</span>
            <button onClick={() => reset(duration)} className="h-11 rounded-full bg-white/70 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white">
              เริ่มใหม่
            </button>
          </div>
        </div>
      </div>

      {/* ===== หน้าสรุปคะแนน (สไตล์เดียวกับ Memory Match) ===== */}
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