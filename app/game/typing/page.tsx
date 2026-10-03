"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// ===== ธีมของเกม (โทนเดียวกับการ์ดกิจกรรม) =====
const BG = "#F4D35E";
const FG = "#4A3B00";
const RED = "#C4262E";

// ===== คลังคำ: ชุด english (200 คำที่ใช้บ่อย) แบบเดียวกับ Monkeytype =====
// หมายเหตุ: ถ้าอยากได้ไฟล์ตรงตัว ให้ก๊อปจาก monkeytype repo (frontend/static/languages/english.json) มาแทนอาร์เรย์นี้
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

function makeWords(n: number): string[] {
  const out: string[] = [];
  while (out.length < n) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (w !== out[out.length - 1]) out.push(w); // ไม่ให้คำซ้ำติดกัน
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

// ตัวเลขนับขึ้นจาก 0 ถึงค่าจริง (ใช้ตอนโชว์ผล)
function useCountUp(target: number, active: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 800);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return v;
}

// ===== หนึ่งคำบนเทป: ตัวอักษร + ช่องว่างท้ายคำ =====
const WordView = memo(function WordView({ w, t, active, past, targetRef }: { w: string; t: string; active: boolean; past: boolean; targetRef: RefObject<HTMLSpanElement | null> }) {
  const bad = past && t !== w;
  const extra = t.length > w.length ? t.slice(w.length) : "";
  const tgt = active ? Math.min(t.length, w.length) : -1; // ตำแหน่งที่แคเรตอยู่ (= w.length หมายถึงช่องว่าง)
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

  const inputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const startRef = useRef(0);
  const snapRef = useRef(true); // true = เลื่อนไปตำแหน่งใหม่ทันทีโดยไม่ใช้แอนิเมชัน (ตอนเริ่ม/รีเซ็ต)

  const reset = useCallback((d: number) => {
    snapRef.current = true;
    setWords(makeWords(BATCH));
    setPhase("idle");
    setWordIdx(0);
    setTyped("");
    setHistory([]);
    setKeys(0);
    setWrong(0);
    setTimeLeft(d);
    setNewRecord(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const close = useCallback(() => router.push("/#games"), [router]);

  // เริ่มต้น: สุ่มคำฝั่งไคลเอนต์ (กัน hydration mismatch) + โหลดสถิติที่ดีที่สุด
  useEffect(() => {
    reset(60);
    try {
      const v = Number(localStorage.getItem(BEST_KEY));
      if (v > 0) setBest(v);
    } catch {}
  }, [reset]);

  // ล็อกการเลื่อนหน้าหลัง + Esc ปิดเกม + กดปุ่มตัวอักษรตอนยังไม่โฟกัส ให้เริ่มพิมพ์ได้เลย
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

  // จับเวลา (เริ่มเมื่อพิมพ์ตัวอักษรแรก)
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const left = Math.max(0, duration - (performance.now() - startRef.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) setPhase("done");
    }, 100);
    return () => clearInterval(t);
  }, [phase, duration]);

  // เลื่อนเทปให้ตัวอักษรที่กำลังจะพิมพ์อยู่ตรงแคเรตเสมอ (CSS transition ทำให้ไหลลื่น)
  useIsoLayoutEffect(() => {
    const tr = trackRef.current;
    const el = targetRef.current;
    if (!tr || !el) return;
    const x = el.offsetLeft;
    if (snapRef.current) {
      tr.style.transition = "none";
      tr.style.transform = `translate3d(${-x}px,0,0)`;
      void tr.offsetWidth; // บังคับให้เบราว์เซอร์คำนวณตำแหน่งก่อนเปิด transition กลับ
      tr.style.transition = "";
      snapRef.current = false;
    } else {
      tr.style.transform = `translate3d(${-x}px,0,0)`;
    }
  }, [typed, wordIdx, words, phase]);

  // ===== คำนวณผล =====
  const current = words[wordIdx] ?? "";
  let prefix = 0;
  while (prefix < typed.length && typed[prefix] === current[prefix]) prefix++;
  const correctChars = history.reduce((sum, t, i) => sum + (t === words[i] ? words[i].length + 1 : 0), 0) + prefix;
  const elapsed = phase === "done" ? duration : duration - timeLeft;
  const wpm = elapsed >= 1 ? Math.round(correctChars / 5 / (elapsed / 60)) : 0;
  const accuracy = keys > 0 ? Math.round(((keys - wrong) / keys) * 100) : 100;
  const shownWpm = useCountUp(wpm, phase === "done");

  // จบเกม: เก็บสถิติที่ดีที่สุด
  useEffect(() => {
    if (phase !== "done" || wpm <= best) return;
    setBest(wpm);
    setNewRecord(true);
    // TODO: ส่งคะแนนไปบันทึกกับบัญชีผู้ใช้จริงทีหลัง (ตอนนี้เก็บในเบราว์เซอร์)
    try {
      localStorage.setItem(BEST_KEY, String(wpm));
    } catch {}
  }, [phase, wpm, best]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase === "done") return;
    const v = e.target.value;
    if (phase === "idle") {
      if (!v.trim()) return;
      startRef.current = performance.now();
      setPhase("running");
    }
    // เว้นวรรค = ส่งคำนี้แล้วไปคำถัดไป
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
    // Tab = เริ่มใหม่ (เหมือน Monkeytype)
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

  // ขอบซ้าย/ขวา: เบลอและจางเป็นสีเดียวกับพื้นหลัง
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
      className="fixed inset-0 z-[60] overflow-y-auto font-sans"
    >
      <style>{`
        @keyframes sheet-in { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes caret-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .tape { transition: none !important; }
        }
      `}</style>

      <div className="flex min-h-full flex-col">
        {/* ===== ส่วนบน: ชื่อเกม + ปุ่มปิด + ตัวเลข ===== */}
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

        {/* ===== กลางจอ: เทปคำศัพท์ / ผลลัพธ์ ===== */}
        <div className="flex flex-1 flex-col justify-center py-10" onClick={() => inputRef.current?.focus()}>
          {phase === "done" ? (
            <div className="mx-auto w-full max-w-3xl px-6">
              <div style={{ animation: "rise 400ms cubic-bezier(.2,.8,.2,1)" }} className="rounded-[2rem] bg-white p-8 text-zinc-900 md:p-12">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">หมดเวลา</h2>
                  {newRecord && <span style={{ backgroundColor: BG }} className="inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold">สถิติใหม่</span>}
                </div>
                <p className="mt-6 text-8xl font-semibold leading-none tracking-tight tabular-nums">
                  {shownWpm}
                  <span className="ml-3 text-2xl font-medium text-zinc-500">WPM</span>
                </p>
                <p className="mt-4 text-base text-zinc-600">{rating(wpm)}</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["ความแม่นยำ", `${accuracy}%`],
                    ["ตัวอักษรที่ถูก", String(correctChars)],
                    ["พิมพ์พลาด", `${wrong} ครั้ง`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-3xl bg-zinc-50 p-5">
                      <p className="text-sm text-zinc-500">{label}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => reset(duration)} className="inline-flex h-12 items-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
                    เล่นอีกครั้ง
                  </button>
                  <Link href="/#ranking" className="inline-flex h-12 items-center rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04]">
                    ดูอันดับ
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* แถบเวลา: ลดลงเรื่อยๆ แบบต่อเนื่อง */}
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

              {/* เทปคำศัพท์แถวเดียว ไหลผ่านแคเรตที่อยู่ตำแหน่งคงที่ */}
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
                      <WordView
                        key={i}
                        w={w}
                        t={i === wordIdx ? typed : history[i] ?? ""}
                        active={i === wordIdx}
                        past={i < wordIdx}
                        targetRef={targetRef}
                      />
                    ))}
                  </div>
                  <span
                    aria-hidden
                    className="absolute left-[38%] top-1/2 -ml-0.5 h-[1.2em] w-1 -translate-y-1/2 rounded-full bg-zinc-900"
                    style={{ animation: phase === "idle" ? "caret-blink 1s step-end infinite" : undefined }}
                  />
                </div>

                {/* ขอบซ้าย/ขวามัวๆ กลืนไปกับสีพื้นหลัง */}
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[24%]" style={edge("left")} />
                <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[24%]" style={edge("right")} />

                {/* คำแนะนำตอนยังไม่โฟกัส */}
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
                {phase === "idle" ? "พิมพ์ตัวอักษรแรกเพื่อเริ่มจับเวลา" : "เว้นวรรคเพื่อไปคำถัดไป"}
              </p>
            </>
          )}
        </div>

        {/* ===== ส่วนล่าง: เลือกเวลา + เริ่มใหม่ ===== */}
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
    </div>
  );
}