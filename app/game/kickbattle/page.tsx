"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAvatarSrc } from "../../components/navbar/page";

// ===== Kick Battle · จุดโทษดวลเดือด (เล่นกับบอท ธีมเดียวกับ Up and Up) =====
type Dir = "L" | "C" | "R";
type Player = { id: string; name: string; avatar: string; img?: string };
type Shot = { round: number; shooter: 0 | 1; shot: Dir; keep: Dir; goal: boolean };
// สถานะเกมทั้งหมดอยู่ฝั่ง client: ผู้เล่น = index 0, บอท = index 1
type Game = {
  match: number;
  first: 0 | 1;
  history: Shot[];
  status: "playing" | "finished";
  winner: 0 | 1 | null;
  earned: [number, number];
};
type Anim = { entry: Shot; step: 0 | 1 | 2 };

const TOTAL = 6;
const TB_TARGET = 2;
const TB_SHOTS = 3;
const POINTS_PER_HIT = 1; // ยิงเข้าหรือเซฟได้ +1 แต้ม (ไม่มีโบนัสผู้ชนะ)
const MAX_AWARD = (TOTAL + TB_SHOTS) * POINTS_PER_HIT; // เพดานเดียวกับ API
const HARD_CHANCE = 0.5; // โอกาสที่บอทจะ "อ่านทาง" ในแต่ละลูก (ที่เหลือสุ่มล้วน)
const DIRS: Dir[] = ["L", "C", "R"];
const BOT: Player = { id: "bot", name: "Ronaldo SHUUU!", avatar: "", img: "/img/r7.png" };
const SIDE: Record<Dir, string> = { L: "ซ้าย", C: "กลาง", R: "ขวา" };
// สีผู้เล่น: ส้มทอง / ฟ้าอมม่วง (พาเลตเดียวกับหน้าสรุปของ Up and Up)
const COLORS = ["#FFD66B", "#9DB4F2"];
const CONF = ["#FFD66B", "#FF7A3D", "#6EC6FF", "#FFFFFF"];
const KEEP_X: Record<Dir, number> = { L: 16.7, C: 50, R: 83.3 };
const GOAL_TOP = 17;
const GOAL_H = 45;
const LINE_Y = GOAL_TOP + GOAL_H;
const GRASS = "repeating-linear-gradient(90deg,#8DB885 0 12.5%,#9CC593 12.5% 25%)";
const SKY_BG = "bg-gradient-to-b from-[#BFE6FF] via-[#FFF1D6] to-white";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const coin = (): 0 | 1 => (Math.random() < 0.5 ? 0 : 1);
const rndDir = (): Dir => DIRS[Math.floor(Math.random() * 3)];
const rndOf = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

// ใครได้แต้มจากแต่ละลูก: ยิงเข้า -> ผู้ยิง / เซฟได้ -> ผู้รับ
function tally(history: Shot[]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const h of history) s[h.goal ? h.shooter : 1 - h.shooter]++;
  return s;
}

// ทิศที่ถูกเลือกบ่อยที่สุด (ถ้าเสมอคืนทุกทิศที่เสมอกัน)
function topDirs(dirs: Dir[]): Dir[] {
  if (!dirs.length) return [];
  const n: Record<Dir, number> = { L: 0, C: 0, R: 0 };
  dirs.forEach((d) => n[d]++);
  const max = Math.max(n.L, n.C, n.R);
  return DIRS.filter((d) => n[d] === max);
}

// บอทเลือกทิศ: ลูกง่าย = สุ่มล้วน / ลูกยาก = อ่านทางจากลูกก่อนหน้าของผู้เล่น (ไม่เห็นทิศที่ผู้เล่นเลือกในลูกนี้)
function botPick(history: Shot[], botShoots: boolean): Dir {
  if (Math.random() >= HARD_CHANCE) return rndDir();
  if (botShoots) {
    // บอทยิง: เลี่ยงทิศที่ผู้เล่นเคยรับบ่อยที่สุด
    const keeps = history.filter((h) => h.shooter === 1).map((h) => h.keep);
    const tops = topDirs(keeps);
    if (!tops.length) return rndDir();
    const avoid = rndOf(tops);
    return rndOf(DIRS.filter((d) => d !== avoid));
  }
  // บอทรับ: ดักทิศที่ผู้เล่นเคยยิงบ่อยที่สุด
  const shots = history.filter((h) => h.shooter === 0).map((h) => h.shot);
  const tops = topDirs(shots);
  return tops.length ? rndOf(tops) : rndDir();
}

const CSS = `
@keyframes kb-pop{0%{transform:scale(.2) rotate(-6deg);opacity:0}60%{transform:scale(1.18) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes kb-shake{0%,100%{transform:translate(0,0)}15%{transform:translate(-8px,4px)}30%{transform:translate(7px,-5px)}45%{transform:translate(-6px,-3px)}60%{transform:translate(5px,4px)}80%{transform:translate(-3px,1px)}}
@keyframes kb-net{0%,100%{transform:scale(1)}25%{transform:scale(1.035,1.05)}50%{transform:scale(.99,.985)}75%{transform:scale(1.015,1.02)}}
@keyframes kb-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(120vh) rotate(720deg);opacity:.9}}
@keyframes kb-flash{0%{opacity:.85}100%{opacity:0}}
@keyframes kb-sway{0%,100%{transform:translateX(-10%)}50%{transform:translateX(10%)}}
@keyframes kb-dots{0%,80%,100%{opacity:.25}40%{opacity:1}}
@keyframes kb-rise{0%{transform:translateY(14px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes kb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes kb-coin{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(540deg);opacity:0}}
@keyframes kb-float{0%{transform:translateY(8px) scale(.5);opacity:0}25%{transform:translateY(-8px) scale(1.25);opacity:1}100%{transform:translateY(-46px) scale(1);opacity:0}}
@keyframes kb-score{0%{transform:scale(1)}35%{transform:scale(1.4)}100%{transform:scale(1)}}
@keyframes kb-glow{0%{opacity:.65;transform:scale(1)}100%{opacity:1;transform:scale(1.06)}}
@keyframes kb-go{0%{transform:scale(.4);opacity:0}25%{transform:scale(1.18);opacity:1}65%{transform:scale(1);opacity:1}100%{transform:scale(1.6);opacity:0}}
@keyframes kb-title{0%{transform:translateY(-30px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
.kb-coin{position:absolute;left:50%;top:50%;display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:9999px;background:#FFD66B;border:3px solid #fff;color:#8A5A00;font-size:15px;font-weight:700;box-shadow:0 2px 6px rgba(30,42,74,.3);animation:kb-coin 1100ms cubic-bezier(.2,.8,.3,1) forwards;pointer-events:none}
.kb-gain{animation:kb-float 1500ms ease-out forwards;pointer-events:none}
.kb-score{animation:kb-score 450ms ease-out}
.kb-pop{animation:kb-pop 520ms cubic-bezier(.2,.9,.3,1.2) both}
.kb-shake{animation:kb-shake 520ms ease-in-out}
.kb-net{animation:kb-net 600ms ease-out}
.kb-flash{animation:kb-flash 450ms ease-out forwards}
.kb-sway{animation:kb-sway 1.6s ease-in-out infinite}
.kb-rise{animation:kb-rise 320ms ease-out both}
.kb-bob{animation:kb-bob 1.4s ease-in-out infinite}
.kb-title{animation:kb-title .7s cubic-bezier(.2,1.3,.4,1) both}
.kb-conf{position:absolute;top:-10%;border-radius:2px;animation:kb-fall linear forwards;pointer-events:none}
.kb-dot{animation:kb-dots 1.2s infinite}
@media (prefers-reduced-motion:reduce){.kb-coin,.kb-score,.kb-gain{animation:none}.kb-sway,.kb-bob,.kb-dot{animation:none}.kb-shake,.kb-net,.kb-conf,.kb-title{animation:none}}
`;

// ปุ่ม/ชิ้นส่วน UI สไตล์เดียวกับ Up and Up
const BTN_MAIN = "h-14 w-full rounded-full bg-[#1E2A4A] text-base font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_ORANGE =
  "h-14 w-full rounded-full bg-gradient-to-b from-[#FF8A4C] to-[#FF5A2E] text-lg font-black text-white shadow-lg ring-2 ring-white transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] bg-white/70 text-sm font-medium transition-colors hover:bg-white";
const BTN_ROUND =
  "pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-[#1E3A6B] shadow-sm ring-2 ring-white transition-transform active:scale-95";
const PILL = "rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-[#1E3A6B] shadow-sm ring-2 ring-white";
const POP_SHADOW = "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 0 14px rgba(255,255,255,.9)";
const DIALOG = "rounded-[2rem] bg-gradient-to-b from-[#EAF6FF] via-[#FFF8E6] to-white shadow-2xl ring-4 ring-white";

function StarIcon({ size = 24, color = "#3A2A10" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ display: "block" }}>
      <path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function useMe() {
  const [me, setMe] = useState<Player | null>(null);
  useEffect(() => {
    let id = "";
    let name = "ผู้เล่น";
    let avatar = "p01";
    try {
      const p = JSON.parse(localStorage.getItem("profile") || "null");
      if (p) {
        id = p.userId || p.id || p._id || "";
        name = p.name || name;
        avatar = p.avatar || p.avatarId || avatar;
      }
    } catch {}
    if (!id) {
      // ใช้ sessionStorage เพื่อให้แต่ละแท็บมี id ของตัวเอง (localStorage ใช้ร่วมกันทุกแท็บ ทำให้ id ซ้ำ)
      id = sessionStorage.getItem("kb_guest") || "g" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("kb_guest", id);
    }
    setMe({ id: String(id), name, avatar });
  }, []);
  return me;
}

// บันทึกแต้มเข้า users.gameScores.kickbattle
async function postAward(playerId: string, points: number): Promise<boolean> {
  const r = await fetch("/api/kickbattle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "award", playerId, points: Math.min(points, MAX_AWARD) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `เชื่อมต่อ API ไม่ได้ (HTTP ${r.status})`);
  return !!j.saved;
}

// ใช้ตอนออกกลางเกม/ปิดหน้า: keepalive ให้คำขอไปถึงแม้หน้าถูกปิด
function sendAward(playerId: string, points: number) {
  fetch("/api/kickbattle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "award", playerId, points: Math.min(points, MAX_AWARD) }),
    keepalive: true,
  }).catch(() => {});
}

function Confetti({ n = 30 }: { n?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="kb-conf"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONF[i % CONF.length],
            width: 8 + (i % 3) * 3,
            height: 12 + (i % 4) * 3,
            animationDelay: `${(i % 7) * 60}ms`,
            animationDuration: `${1300 + (i % 5) * 220}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Coins() {
  const pts = [[-150, -90], [-110, -150], [-50, -190], [0, -210], [50, -190], [110, -150], [150, -90], [-80, -40], [80, -40]];
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {pts.map(([dx, dy], i) => (
        <span key={i} className="kb-coin" style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animationDelay: `${i * 40}ms` }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ตัวอักษรส้มไล่สี ขอบขาว (เหมือน PopText ใน Up and Up)
function PopText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF9A5E] blur-xl ${size}`}
        style={{ animation: "kb-glow .6s ease-in-out infinite alternate" }}
      >
        {text}
      </span>
      <span
        className={`relative block bg-gradient-to-t from-[#FF5A2E] via-[#FF9A3D] to-[#FFE08A] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`}
        style={{ filter: "drop-shadow(0 3px 0 rgba(255,255,255,.95))" }}
      >
        {text}
      </span>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const cur = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      setV(cur);
      from.current = cur;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span key={value} className="kb-score inline-block">
      {v}
    </span>
  );
}

function Keeper() {
  return (
    <svg viewBox="0 0 64 72" className="block w-full">
      <path d="M18 30 L5 17" stroke="#FBDCC8" strokeWidth="9" strokeLinecap="round" />
      <path d="M46 30 L59 17" stroke="#FBDCC8" strokeWidth="9" strokeLinecap="round" />
      <rect x="22" y="50" width="8" height="20" rx="4" fill="#2E3A6B" />
      <rect x="34" y="50" width="8" height="20" rx="4" fill="#2E3A6B" />
      <rect x="17" y="24" width="30" height="31" rx="11" fill="#FF6B3D" />
      <circle cx="32" cy="12" r="10" fill="#FBDCC8" />
      <path d="M22 11a10 10 0 0 1 20 0z" fill="#FFD23F" />
      <rect x="22" y="10" width="20" height="2" fill="#FFD23F" />
      <circle cx="28" cy="14" r="1.6" fill="#27272A" />
      <circle cx="36" cy="14" r="1.6" fill="#27272A" />
      <circle cx="5" cy="16" r="7.5" fill="#FFD23F" stroke="#fff" strokeWidth="1.5" />
      <circle cx="59" cy="16" r="7.5" fill="#FFD23F" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

// ท้องฟ้า + ภูเขา + เมฆ ด้านหลังประตู (ลายเดียวกับฉากหน้าผาของ Up and Up)
function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: "-100vw",
        right: "-100vw",
        top: "-100vh",
        bottom: `${100 - LINE_Y}%`,
        background: "linear-gradient(to bottom,#6EC6FF 0%,#BFE6FF 55%,#FFF1D6 100%)",
      }}
    >
      <span className="absolute rounded-full bg-[#FFF8D2] opacity-90 blur-[2px]" style={{ right: "18vw", bottom: "16vh", width: "9vh", height: "9vh", boxShadow: "0 0 60px 20px rgba(255,236,160,.7)" }} />
      {[
        { l: "12vw", b: "20vh", s: 1 },
        { l: "46vw", b: "26vh", s: 0.8 },
        { l: "72vw", b: "15vh", s: 1.15 },
      ].map((c, i) => (
        <span key={i} className="absolute flex" style={{ left: c.l, bottom: c.b, transform: `scale(${c.s})` }}>
          <span className="-mr-3 mt-2 h-5 w-10 rounded-full bg-white/90" />
          <span className="h-8 w-14 rounded-full bg-white/90" />
          <span className="-ml-4 mt-3 h-5 w-12 rounded-full bg-white/90" />
        </span>
      ))}
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[14vh] w-full">
        <path d="M0 100 L0 58 L90 18 L170 52 L260 8 L360 60 L450 28 L560 68 L660 16 L760 56 L860 24 L960 62 L1060 20 L1200 58 L1200 100Z" fill="#B9C9F0" />
        <path d="M0 100 L0 78 L120 46 L210 74 L320 38 L430 76 L540 50 L650 80 L770 44 L880 78 L990 48 L1100 76 L1200 54 L1200 100Z" fill="#8FA2D8" />
      </svg>
    </div>
  );
}

function Pitch({
  anim,
  you,
  sel,
  canPick,
  iShoot,
  inset,
  aspect,
  onSel,
  onFlick,
}: {
  anim: Anim | null;
  you: 0 | 1;
  sel: Dir | null;
  canPick: boolean;
  iShoot: boolean;
  inset: number;
  aspect: string;
  onSel: (d: Dir) => void;
  onFlick: (d: Dir) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<Dir | null>(null);

  const step = anim?.step ?? -1;
  const e = anim?.entry;
  const reveal = step >= 2 && !!e;
  const iScored = !!e && (e.goal ? e.shooter === you : e.shooter !== you);
  const iShot = !!e && e.shooter === you;

  const bx = (d: Dir) => inset + (100 - 2 * inset) * (d === "L" ? 1 / 6 : d === "C" ? 0.5 : 5 / 6);
  const dirAt = (x: number): Dir => {
    const t = (x - inset) / (100 - 2 * inset);
    return t < 1 / 3 ? "L" : t < 2 / 3 ? "C" : "R";
  };

  let ball = { left: 50, bottom: 10, scale: 1, rot: 0, ms: 0 };
  if (e && step === 1) ball = { left: bx(e.shot), bottom: 55, scale: 0.55, rot: 720, ms: 720 };
  if (e && step === 2) {
    if (e.goal) ball = { left: bx(e.shot), bottom: 52, scale: 0.5, rot: 780, ms: 300 };
    else {
      const away = e.shot === "R" ? -1 : e.shot === "L" ? 1 : e.round % 2 ? 1 : -1;
      ball = { left: clamp(bx(e.shot) + away * 24, 6, 94), bottom: 26, scale: 0.85, rot: 1200, ms: 520 };
    }
  }
  const dragging = !!drag && canPick && !anim;
  if (dragging && iShoot) ball = { left: drag!.x, bottom: 100 - drag!.y, scale: 0.85, rot: 0, ms: 0 };

  const showGlove = !iShoot && !anim;
  const hideRest = showGlove && dragging;

  let kx = 50;
  let kTf = "translate(-50%,0)";
  if (e && step >= 1) {
    kx = KEEP_X[e.keep];
    kTf =
      e.keep === "C"
        ? "translate(-50%,-30%) scale(1.15)"
        : `translate(-50%,-12%) rotate(${e.keep === "L" ? -62 : 62}deg)`;
  }

  const sub = !reveal
    ? ""
    : e!.goal
      ? iShot ? "ยิงเข้าเต็มๆ" : "คู่แข่งยิงเข้า"
      : iShot ? "โดนอ่านทางขาด" : "ปัดออกได้ทัน";

  const pct = (ev: React.PointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * 100, y: ((ev.clientY - r.top) / r.height) * 100 };
  };
  const onDown = (ev: React.PointerEvent) => {
    if (!canPick) return;
    start.current = { x: ev.clientX, y: ev.clientY };
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!start.current || !canPick) return;
    if (!drag && Math.hypot(ev.clientX - start.current.x, ev.clientY - start.current.y) < 14) return;
    if (!drag) rootRef.current?.setPointerCapture(ev.pointerId);
    const p = pct(ev);
    setDrag({ x: clamp(p.x, 2, 98), y: clamp(p.y, 6, 98) });
    setHover(dirAt(p.x));
  };
  const onUp = () => {
    if (drag && hover && canPick) onFlick(hover);
    start.current = null;
    setDrag(null);
    setHover(null);
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="relative w-full select-none"
      style={{ aspectRatio: aspect, touchAction: "none" }}
    >
      <div className={`absolute inset-0 ${reveal && (!e!.goal || !iShot) ? "kb-shake" : ""}`}>
        <Backdrop />
        <div className="absolute h-[3px] bg-white/80" style={{ top: `${LINE_Y}%`, left: "-100vw", right: "-100vw" }} />
        <div className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white/90 ring-2 ring-[#FFD66B]" style={{ top: "86%" }} />

        <div
          className={`absolute ${reveal && e!.goal ? "kb-net" : ""}`}
          style={{ left: `${inset}%`, right: `${inset}%`, top: `${GOAL_TOP}%`, height: `${GOAL_H}%`, transformOrigin: "50% 0" }}
        >
          <div
            className="absolute inset-0 rounded-t-md border-x-[6px] border-t-[6px] border-white shadow-[0_4px_14px_rgba(30,42,74,.35)]"
            style={{
              backgroundColor: "rgba(30,42,74,.14)",
              backgroundImage:
                "repeating-linear-gradient(45deg,rgba(255,255,255,.5) 0 1.5px,transparent 1.5px 12px),repeating-linear-gradient(-45deg,rgba(255,255,255,.5) 0 1.5px,transparent 1.5px 12px)",
            }}
          />

          <div className="absolute inset-0 z-10 grid grid-cols-3">
            {(["L", "C", "R"] as Dir[]).map((d) => {
              const active = sel === d || hover === d;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!canPick}
                  onClick={() => onSel(d)}
                  aria-label={`เลือก${SIDE[d]}`}
                  aria-pressed={sel === d}
                  className={`m-1.5 flex items-end justify-center rounded-xl pb-2 text-sm font-bold outline-none transition-all focus-visible:ring-4 focus-visible:ring-[#FF7A3D] ${
                    canPick
                      ? active
                        ? "scale-[1.03] bg-[#FFD66B]/80 text-[#1E2A4A] ring-4 ring-white"
                        : "border-2 border-dashed border-white/80 text-white hover:bg-white/25"
                      : "pointer-events-none border-0 text-transparent"
                  }`}
                  style={canPick && !active ? { textShadow: "0 1px 4px rgba(30,42,74,.6)" } : undefined}
                >
                  {SIDE[d]}
                </button>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${kx}%`,
              bottom: "2%",
              width: inset < 8 ? "15%" : "11%",
              transform: kTf,
              transformOrigin: "50% 100%",
              transition: step >= 1 ? "left 380ms cubic-bezier(.3,.9,.3,1) 120ms, transform 380ms cubic-bezier(.3,.9,.3,1) 120ms" : "none",
            }}
          >
            <div className={step < 1 ? "kb-sway" : ""}>
              <Keeper />
            </div>
          </div>
        </div>

        {dragging && !iShoot && (
          <div
            className="pointer-events-none absolute z-30 leading-none"
            style={{
              left: `${drag!.x}%`,
              top: `${drag!.y}%`,
              transform: "translate(-50%,-50%)",
              fontSize: "clamp(72px,11vw,128px)",
              filter: "drop-shadow(0 6px 4px rgba(0,0,0,.25))",
            }}
          >
            🧤
          </div>
        )}

        <div
          className="pointer-events-none absolute z-20 leading-none"
          style={{
            fontSize: "clamp(56px,9vw,112px)",
            left: `${ball.left}%`,
            bottom: `${ball.bottom}%`,
            opacity: hideRest ? 0 : 1,
            transform: `translateX(-50%) scale(${ball.scale}) rotate(${ball.rot}deg)`,
            transition: ball.ms
              ? `left ${ball.ms}ms cubic-bezier(.2,.7,.3,1), bottom ${ball.ms}ms cubic-bezier(.2,.7,.3,1), transform ${ball.ms}ms cubic-bezier(.2,.7,.3,1)`
              : "none",
            filter: "drop-shadow(0 6px 4px rgba(0,0,0,.25))",
          }}
        >
          <span className={!anim && !dragging ? "kb-bob inline-block" : "inline-block"}>{showGlove ? "🧤" : "⚽"}</span>
        </div>
      </div>

      {reveal && e!.goal && <div className="kb-flash pointer-events-none fixed inset-0 z-20 bg-white" />}

      {reveal && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="kb-pop flex flex-col items-center text-center">
            {iScored ? (
              <PopText text={e!.goal ? "GOAL!" : "SAVE!"} size="text-7xl sm:text-9xl" />
            ) : (
              <span className="rounded-[2rem] bg-[#1E2A4A] px-8 py-4 text-4xl font-black tracking-tight text-white shadow-xl ring-4 ring-white sm:text-6xl">
                {e!.goal ? "เสียประตู" : "โดนเซฟ"}
              </span>
            )}
            <p className="mt-2 rounded-full bg-white/90 px-4 py-1 text-sm font-bold text-[#1E3A6B] shadow-sm ring-2 ring-white">{sub}</p>
            <p
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-1.5 text-2xl font-black tabular-nums shadow-lg ring-2 ring-white sm:text-3xl ${
                iScored ? "bg-gradient-to-r from-[#FF5A2E] to-[#FFB020] text-white" : "bg-[#FFD66B] text-[#1E2A4A]"
              }`}
            >
              {iScored && <StarIcon size={22} color="#FFF3C4" />}
              {iScored ? "+1 แต้ม" : "คู่แข่ง +1"}
            </p>
          </div>
        </div>
      )}
      {reveal && iScored && (
        <div className="pointer-events-none fixed inset-0 z-30">
          <Confetti />
          <Coins />
        </div>
      )}
    </div>
  );
}

function ShotDot({ state, next, hint }: { state: "win" | "lose" | "pending"; next: boolean; hint: string }) {
  const base = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white sm:h-6 sm:w-6 sm:text-xs";
  if (state === "win")
    return (
      <span className={`${base} kb-pop ring-2 ring-white`} style={{ background: "#4ADE80" }} aria-label="ได้แต้ม">
        ✓
      </span>
    );
  if (state === "lose")
    return (
      <span className={`${base} kb-pop ring-2 ring-white`} style={{ background: "#FF4D6D" }} aria-label="ไม่ได้แต้ม">
        ✕
      </span>
    );
  return (
    <span className={`${base} bg-white/60 !text-[10px] ${next ? "ring-2 ring-[#FF7A3D]" : ""}`} title={hint} aria-label={hint}>
      <span className="opacity-70">{hint === "ยิง" ? "⚽" : "🧤"}</span>
    </span>
  );
}

function PlayerPill({ p, score, idx, role, active, gain, isYou, dots }: { p: Player; score: number; idx: 0 | 1; role: "ยิง" | "รับ" | null; active: boolean; gain: string | null; isYou: boolean; dots: React.ReactNode }) {
  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col gap-2 rounded-3xl p-2.5 pr-3.5 text-zinc-900 shadow-md ring-2 ring-white transition-transform ${active ? "scale-[1.03]" : ""}`}
      style={{ background: COLORS[idx] }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.img ?? getAvatarSrc(p.avatar)}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white sm:h-11 sm:w-11"
          onError={(ev) => ((ev.target as HTMLImageElement).src = "/img/p01.png")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {p.name}
            {isYou && " (คุณ)"}
          </p>
          <p className="text-xs font-medium opacity-60">{role ? `${role === "ยิง" ? "⚽" : "🧤"} ${role}` : "—"}</p>
        </div>
        <span className="text-2xl font-black tabular-nums sm:text-3xl">
          <CountUp value={score} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 pl-0.5 sm:gap-1.5" aria-label="ผลแต่ละลูก">
        {dots}
      </div>
      {gain && (
        <span key={gain} className="kb-gain absolute -top-2 right-4 z-20 rounded-full bg-[#1E2A4A] px-3 py-1 text-sm font-black text-[#FFD66B] shadow-lg ring-2 ring-white">
          +1
        </span>
      )}
    </div>
  );
}

export default function KickBattle() {
  const router = useRouter();
  const me = useMe();
  const [game, setGame] = useState<Game | null>(null);
  const [awardSaved, setAwardSaved] = useState<boolean | null>(null); // null = กำลังบันทึก
  const [sel, setSel] = useState<Dir | null>(null);
  const [shown, setShown] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [intro, setIntro] = useState<0 | 1 | 2>(0);
  const [go, setGo] = useState(false);
  const [flip, setFlip] = useState(false);
  const [tbIntro, setTbIntro] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const tbKey = useRef("");
  const matchRef = useRef(0); // นับเกมที่เริ่มในหน้านี้ ใช้เป็น id ของเกม
  const awardedRef = useRef(0); // match ล่าสุดที่ส่งแต้มไปแล้ว กันส่งซ้ำ
  const lockRef = useRef(false); // กันกดเลือกซ้ำระหว่างรอแอนิเมชัน
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const liveRef = useRef<{ game: Game | null; id: string | null }>({ game: null, id: null });
  liveRef.current = { game, id: me?.id ?? null };
  const pickRef = useRef<{ canPick: boolean; sel: Dir | null; confirm: (d?: Dir) => void }>({ canPick: false, sel: null, confirm: () => {} });
  pickRef.current.canPick = false;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // ออกกลางเกม/ปิดหน้า = แพ้ แต้มที่ทำได้แล้วยังเก็บไว้ (ใช้ได้แค่ ref จึงเรียกจาก cleanup ได้)
  function forfeitAward() {
    const { game: g, id } = liveRef.current;
    if (!g || !id || awardedRef.current === g.match) return;
    awardedRef.current = g.match;
    if (g.earned[0] > 0) sendAward(id, g.earned[0]);
  }

  useEffect(() => {
    const h = () => forfeitAward();
    window.addEventListener("pagehide", h);
    return () => {
      window.removeEventListener("pagehide", h);
      h();
    };
  }, []);

  useEffect(() => {
    const f = () => setPortrait(window.innerWidth < window.innerHeight);
    f();
    window.addEventListener("resize", f);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", f);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    lockRef.current = false;
  }, [shown, game?.match]);

  function startGame() {
    if (!me) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    tbKey.current = "";
    lockRef.current = false;
    matchRef.current += 1;
    setGame({ match: matchRef.current, first: coin(), history: [], status: "playing", winner: null, earned: [0, 0] });
    setAwardSaved(null);
    setShown(0);
    setAnim(null);
    setSel(null);
    setTbIntro(false);
    setConfirmExit(false);
    setGo(false);
    setIntro(1);
    later(() => setIntro(2), 1800);
    later(() => {
      setIntro(0);
      setGo(true);
    }, 3700);
    later(() => setGo(false), 4600);
  }

  function leave() {
    forfeitAward();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    tbKey.current = "";
    setTbIntro(false);
    setConfirmExit(false);
    setGame(null);
    setSel(null);
    setShown(0);
    setAnim(null);
    setIntro(0);
    setGo(false);
  }

  function exitGame() {
    leave();
    router.push("/");
  }

  // เล่นแอนิเมชันของแต่ละลูกตามลำดับใน history
  useEffect(() => {
    if (!game || anim || game.history.length <= shown) return;
    const entry = game.history[shown];
    const idx = shown;
    setAnim({ entry, step: 0 });
    later(() => setAnim({ entry, step: 1 }), 60);
    later(() => {
      setAnim({ entry, step: 2 });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(entry.goal ? [60, 40, 120] : 200);
    }, 850);
    later(() => {
      setAnim(null);
      setShown(idx + 1);
      setSel(null);
    }, 3200);
  }, [game, shown, anim]);

  // เสมอหลังครบ 6 ลูก -> แสดงหน้าจอต่อเวลา
  useEffect(() => {
    if (!game || anim || game.status !== "playing") return;
    if (game.history.length !== TOTAL || shown !== TOTAL) return;
    const key = String(game.match);
    if (tbKey.current === key) return;
    tbKey.current = key;
    setTbIntro(true);
    later(() => setTbIntro(false), 3000);
  }, [game, shown, anim]);

  // เกมจบและแอนิเมชันครบแล้ว -> ส่งแต้มเข้าคะแนนรวม (ครั้งเดียวต่อเกม)
  useEffect(() => {
    if (!game || !me || anim || game.status !== "finished" || shown !== game.history.length) return;
    if (awardedRef.current === game.match) return;
    awardedRef.current = game.match;
    const pts = game.earned[0];
    if (pts <= 0) return;
    setAwardSaved(null);
    postAward(me.id, pts)
      .then(setAwardSaved)
      .catch(() => setAwardSaved(false));
  }, [game, shown, anim, me]);

  useEffect(() => {
    if (intro !== 1) return;
    const t = setInterval(() => setFlip((f) => !f), 130);
    return () => clearInterval(t);
  }, [intro]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = pickRef.current;
      if (!p.canPick) return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") setSel("L");
      else if (k === "ArrowDown" || k === "ArrowUp" || k === "s" || k === "S" || k === "w" || k === "W") setSel("C");
      else if (k === "ArrowRight" || k === "d" || k === "D") setSel("R");
      else if ((k === "Enter" || k === " ") && p.sel) {
        if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
        e.preventDefault();
        p.confirm(p.sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ผู้เล่นเลือกทิศ -> บอทเลือกทันที -> ตัดสินผลลูกนี้
  function confirmPick(dir?: Dir) {
    const d = dir ?? sel;
    const g = game;
    if (!g || !d || lockRef.current || !pickRef.current.canPick) return;
    lockRef.current = true;
    setSel(d);

    const shooter = ((g.first + g.history.length) % 2) as 0 | 1;
    const botDir = botPick(g.history, shooter === 1);
    const shot = shooter === 0 ? d : botDir;
    const keep = shooter === 0 ? botDir : d;
    const goal = shot !== keep;
    const history = [...g.history, { round: g.history.length, shooter, shot, keep, goal }];

    const earned: [number, number] = [g.earned[0], g.earned[1]];
    earned[goal ? shooter : 1 - shooter] += POINTS_PER_HIT;

    let winner: 0 | 1 | null = null;
    const n = history.length;
    if (n === TOTAL) {
      const [s0, s1] = tally(history);
      if (s0 !== s1) winner = s0 > s1 ? 0 : 1;
    } else if (n > TOTAL) {
      const [t0, t1] = tally(history.slice(TOTAL));
      if (t0 >= TB_TARGET || t1 >= TB_TARGET) winner = t0 > t1 ? 0 : 1;
    }

    setGame({ ...g, history, earned, winner, status: winner !== null ? "finished" : "playing" });
  }

  const menu = (children: React.ReactNode, hero = false) => (
    <div className={`fixed inset-0 z-50 overflow-y-auto font-sans text-zinc-900 ${hero ? "bg-[#8FD3FF]" : SKY_BG}`}>
      <style>{CSS}</style>

      {hero && (
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <video
            src="/video/kickbattle/kickbattlepreview.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(30,42,74,.5) 0%, rgba(110,198,255,.28) 32%, rgba(255,241,214,.72) 70%, #FFF1D6 100%)",
            }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-white/90 px-4 text-sm font-bold text-[#1E3A6B] shadow-sm ring-2 ring-white transition-colors hover:bg-white"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
        {children}
      </div>
    </div>
  );

  if (!me) return menu(<p className="mt-20 text-center text-sm font-bold text-[#1E3A6B]">กำลังโหลด…</p>);

  // ===== ล็อบบี้ =====
  if (!game) {
    return menu(
      <>
        <div className="kb-title mt-8 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E2A4A]/70 px-3 py-0.5 text-[11px] font-bold tracking-[.25em] text-[#FFE08A] ring-1 ring-white/40">⚽ เกมจุดโทษ ⚽</span>
          <div className="-ml-4 mt-1">
            <PopText text="KICK BATTLE" size="text-6xl md:text-8xl" />
          </div>
          <p className="mt-1 max-w-md text-base font-bold leading-7 text-[#1E3A6B] md:text-lg" style={{ textShadow: POP_SHADOW }}>
            จุดโทษดวลเดือดกับ {BOT.name} ใครยิงใครรับสุ่มกันหน้าสนาม แล้วสลับบทบาทกันทุกลูก
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-6 rounded-[2rem] bg-[#FFD66B] p-7 text-center shadow-lg ring-4 ring-white sm:flex-row sm:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOT.img}
            alt={BOT.name}
            className="h-28 w-28 shrink-0 rounded-full object-cover shadow-lg ring-4 ring-white"
            onError={(ev) => ((ev.target as HTMLImageElement).src = "/img/p01.png")}
          />
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-[#5B4300]">คู่แข่งของคุณ</p>
              <h2 className="text-2xl font-black tracking-tight text-[#1E2A4A]">{BOT.name}</h2>
              <p className="mt-1 text-sm leading-6 text-[#5B4300]">กดเริ่มแล้วเล่นได้เลย ไม่ต้องรอใครเข้าห้อง</p>
            </div>
            <button onClick={startGame} className={BTN_ORANGE}>
              เริ่มเล่น
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[2rem] bg-white/85 p-7 shadow-lg ring-4 ring-white backdrop-blur">
          <h3 className="text-lg font-black tracking-tight text-[#E5502A]">กติกา</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-zinc-600">
            <li className="rounded-2xl bg-[#EAF6FF]/80 px-3 py-2">ผู้ยิงเลือกซ้าย กลาง หรือขวา ผู้รับเลือกทิศเดียวกันได้เหมือนกัน เลือกพร้อมกันและซ่อนกันจนกว่าจะเปิดผล</li>
            <li className="rounded-2xl bg-[#FFF3C4]/80 px-3 py-2">ยิงคนละทิศกับที่ผู้รับเลือก ผู้ยิงได้ 1 แต้ม ถ้าตรงกัน ผู้รับเซฟได้ 1 แต้ม และแต้มที่คุณทำได้บวกเข้าคะแนนรวมเมื่อจบเกม ทั้งชนะและแพ้ได้แต้มตามลูกที่ตัวเองทำได้</li>
            <li className="rounded-2xl bg-[#EAF6FF]/80 px-3 py-2">สลับบทบาทกันทุกลูก เล่น 6 ลูก (ยิงคนละ 3 ลูก) ใครแต้มสูงกว่าชนะ ถ้าเสมอต่อเวลาอีกสูงสุด 3 ลูก ใครได้ 2 แต้มก่อนชนะ ไม่มีโบนัสผู้ชนะ</li>
            <li className="rounded-2xl bg-[#FFF3C4]/80 px-3 py-2">บอทบางลูกเดาสุ่ม บางลูกอ่านทางจากที่คุณเคยเลือก ถ้าคุณออกจากเกมระหว่างเล่น ถือว่าแพ้ แต้มที่ทำได้แล้วยังเก็บไว้</li>
            <li className="rounded-2xl bg-[#EAF6FF]/80 px-3 py-2">วิธีเล่น: ลากลูกบอล (หรือถุงมือ) ไปที่มุมที่ต้องการแล้วปล่อย หรือกดเลือกมุม หรือใช้ปุ่มลูกศร ← ↓ → แล้วกด Enter</li>
          </ul>
        </div>
      </>,
      true
    );
  }

  // ===== ในเกม =====
  const players: [Player, Player] = [me, BOT];
  const you = 0 as const;
  const opp = 1 as const;
  const revealed = shown + (anim && anim.step >= 2 ? 1 : 0);
  const sc = tally(game.history.slice(0, revealed));
  const curShooter = ((game.first + shown) % 2) as 0 | 1;
  const iShoot = curShooter === you;
  const canPick = !confirmExit && intro === 0 && !tbIntro && !anim && shown === game.history.length && game.status === "playing";
  const done = game.status === "finished" && shown === game.history.length && !anim;
  const iWon = game.winner === you;
  const tiebreak = game.history.length > TOTAL || (shown >= TOTAL && game.history.length === TOTAL && game.status === "playing");
  const sudden = tiebreak && shown >= TOTAL;
  const tbSc = tally(game.history.slice(TOTAL, revealed));
  const nextRound = done || game.status === "finished" ? -1 : revealed;
  const dot = (i: 0 | 1, round: number) => {
    const h = round < revealed ? game.history[round] : undefined;
    const state = !h ? "pending" : (h.goal ? h.shooter === i : h.shooter !== i) ? "win" : "lose";
    const hint = (game.first + round) % 2 === i ? "ยิง" : "รับ";
    return <ShotDot key={round} state={state} next={round === nextRound} hint={hint} />;
  };
  const dotsFor = (i: 0 | 1) => [
    ...Array.from({ length: TOTAL }).map((_, k) => dot(i, k)),
    ...(tiebreak ? [<span key="tb" className="mx-0.5 h-5 w-px bg-black/20" />, ...Array.from({ length: TB_SHOTS }).map((_, k) => dot(i, TOTAL + k))] : []),
  ];
  const scorer = anim && anim.step >= 2 ? (anim.entry.goal ? anim.entry.shooter : 1 - anim.entry.shooter) : -1;
  const gainFor = (i: 0 | 1) => (scorer === i && anim ? `${game.match}-${anim.entry.round}` : null);
  const roleOf = (i: 0 | 1) => (done ? null : i === curShooter ? "ยิง" : "รับ");
  const statusText = done
    ? "จบเกม"
    : sudden
      ? `ต่อเวลา · ใครได้ ${TB_TARGET} แต้มก่อนชนะ · คุณ ${tbSc[you]} : ${tbSc[opp]}`
      : `ลูกที่ ${Math.min(shown + 1, TOTAL)} จาก ${TOTAL}`;
  const resolving = !!anim || game.history.length > shown;

  pickRef.current = { canPick, sel, confirm: confirmPick };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden overscroll-none font-sans text-zinc-900" style={{ background: GRASS, touchAction: "none" }}>
      <style>{CSS}</style>

      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: portrait ? "100vw" : "min(100vw, 160vh)" }}>
          <Pitch
            anim={anim}
            you={you}
            sel={sel}
            canPick={canPick}
            iShoot={iShoot}
            inset={portrait ? 4 : 12}
            aspect={portrait ? "100 / 120" : "16 / 10"}
            onSel={setSel}
            onFlick={(d) => {
              setSel(d);
              confirmPick(d);
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30"
        style={{ padding: "calc(env(safe-area-inset-top) + 12px) calc(env(safe-area-inset-right) + 12px) 0 calc(env(safe-area-inset-left) + 12px)" }}
      >
        <div className="mx-auto flex max-w-3xl gap-2 sm:gap-3">
          <PlayerPill p={players[0]} score={sc[0]} idx={0} role={roleOf(0)} active={!done && curShooter === 0} gain={gainFor(0)} isYou dots={dotsFor(0)} />
          <PlayerPill p={players[1]} score={sc[1]} idx={1} role={roleOf(1)} active={!done && curShooter === 1} gain={gainFor(1)} isYou={false} dots={dotsFor(1)} />
        </div>
        <div className="mt-2 flex justify-center">
          <span className={`${PILL} !py-1 text-xs`}>{statusText}</span>
        </div>
      </div>

      {!done && intro === 0 && !tbIntro && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end gap-2"
          style={{ padding: "0 calc(env(safe-area-inset-right) + 12px) calc(env(safe-area-inset-bottom) + 12px) calc(env(safe-area-inset-left) + 12px)" }}
        >
          <button type="button" onClick={() => setConfirmExit(true)} aria-label="ออกจากเกม" title="ออกจากเกม" className={BTN_ROUND}>
            ←
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            {resolving ? (
              <p className={PILL}>ลุ้นกันหน่อย…</p>
            ) : (
              <>
                <p className={PILL}>{iShoot ? "คุณเป็นผู้ยิง · ลากลูกไปมุมที่จะยิงแล้วปล่อย" : "คุณเป็นผู้รับ · ลากถุงมือไปมุมที่จะรับแล้วปล่อย"}</p>
                <button
                  onClick={() => confirmPick()}
                  disabled={!sel || !canPick}
                  className="pointer-events-auto h-12 w-full max-w-xs rounded-full bg-gradient-to-b from-[#FF8A4C] to-[#FF5A2E] text-sm font-black text-white shadow-lg ring-2 ring-white transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                >
                  {sel ? (iShoot ? `ยิง${SIDE[sel]}` : `รับ${SIDE[sel]}`) : iShoot ? "เลือกทิศที่จะยิง" : "เลือกทิศที่จะรับ"}
                </button>
              </>
            )}
          </div>
          <span className="w-11 shrink-0" aria-hidden />
        </div>
      )}

      {intro > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1E2A4A]/55 px-6 text-center text-white backdrop-blur-sm">
          {intro === 1 ? (
            <>
              <p className="text-sm font-bold opacity-80">กำลังสุ่มว่าใครได้ยิงก่อน</p>
              <p className="mt-4 text-7xl" style={{ transform: `rotate(${flip ? -12 : 12}deg) scale(${flip ? 1 : 1.15})`, transition: "transform 130ms" }}>
                {flip ? "⚽" : "🧤"}
              </p>
            </>
          ) : (
            <div className="kb-pop">
              <p className="text-7xl">{game.first === you ? "⚽" : "🧤"}</p>
              <p className="mt-4 text-4xl font-black tracking-tight md:text-5xl">{game.first === you ? "คุณได้ยิงก่อน" : "คุณได้เฝ้าประตู"}</p>
              <p className="mt-2 text-sm opacity-80">ลูกต่อไปสลับบทบาทกัน</p>
            </div>
          )}
        </div>
      )}

      {go && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <div style={{ animation: "kb-go .9s ease-out both" }}>
            <PopText text="GO!!!" size="text-7xl sm:text-9xl" />
          </div>
        </div>
      )}

      {tbIntro && (
        <div className="kb-rise absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1E2A4A]/65 px-6 text-center text-white backdrop-blur-sm">
          <div className="kb-pop">
            <p className="text-7xl">🔥</p>
            <p className="mt-4 text-4xl font-black tracking-tight md:text-5xl">แต้มเสมอ ต่อเวลา!</p>
            <p className="mt-3 text-sm leading-6 opacity-90">ยิงกันต่ออีกสูงสุด {TB_SHOTS} ลูก ใครได้ {TB_TARGET} แต้มก่อนชนะ</p>
          </div>
        </div>
      )}

      {done && (
        <div className={`kb-rise absolute inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4 ${SKY_BG}`}>
          {iWon && <Confetti n={44} />}
          {iWon && <Coins />}
          <div className="my-auto w-full max-w-sm text-center">
            <span className={`inline-block rounded-full px-4 py-1 text-sm font-bold ${iWon ? "bg-[#FFD66B]" : "bg-zinc-100 text-zinc-600"}`}>
              {iWon ? "🏆 ชนะ!" : "จบเกม"}
            </span>
            <p className="kb-pop mt-3 text-7xl">{iWon ? "🏆" : "🥲"}</p>
            <h2 className="mt-2 text-5xl font-black tracking-tight text-[#E5502A]">{iWon ? "คุณชนะ!" : "แพ้ไปนิดเดียว"}</h2>
            {game.history.length > TOTAL && <p className="mt-1 text-sm text-zinc-500">ตัดสินด้วยการต่อเวลา</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[you, opp].map((i, k) => (
                <div key={i} className="rounded-3xl py-5 text-zinc-900 shadow-md ring-2 ring-white" style={{ background: COLORS[i] }}>
                  <p className="truncate px-2 text-xs opacity-70">{k === 0 ? "คุณ" : BOT.name}</p>
                  <p className="text-5xl font-black tabular-nums tracking-tight">{sc[i]}</p>
                </div>
              ))}
            </div>

            {game.earned[you] > 0 &&
              (awardSaved === null ? (
                <p className="mt-3 rounded-2xl bg-white/80 px-4 py-2.5 text-sm font-medium text-zinc-600 ring-2 ring-white">กำลังบันทึกแต้ม…</p>
              ) : awardSaved ? (
                <p className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#E4EEDF] px-4 py-2.5 text-sm font-bold text-[#2F5D2A] ring-2 ring-white">
                  <StarIcon size={16} color="#FFB800" />+{game.earned[you]} แต้มเข้าคะแนนรวมของคุณแล้ว
                </p>
              ) : (
                <p className="mt-3 rounded-2xl bg-[#FFE3D3] px-4 py-2.5 text-sm text-[#8A3B1F] ring-2 ring-white">แต้มรอบนี้ยังไม่ถูกบันทึก ตรวจว่าเข้าสู่ระบบแล้ว</p>
              ))}

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={startGame} className={BTN_ORANGE}>
                เล่นอีกรอบ
              </button>
              <button onClick={leave} className={BTN_SUB}>
                กลับหน้าเริ่มเกม
              </button>
              <Link href="/rank" className={BTN_SUB}>
                🏆 ดูอันดับ
              </Link>
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="kb-rise absolute inset-0 z-[70] flex items-center justify-center bg-[#1E2A4A]/55 p-6 backdrop-blur-sm">
          <div className={`kb-pop w-full max-w-sm p-7 text-center text-zinc-900 ${DIALOG}`}>
            <p className="text-5xl">🚪</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#E5502A]">ออกจากเกมนี้?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">ถ้าออกตอนนี้ จะนับว่าคุณแพ้ แต้มที่คุณทำได้แล้วจะยังถูกเก็บไว้</p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => setConfirmExit(false)} className={BTN_ORANGE}>
                เล่นต่อ
              </button>
              <button
                onClick={exitGame}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#FF4D6D] text-sm font-bold text-white ring-2 ring-white transition-opacity hover:opacity-85"
              >
                ออกและยอมแพ้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}