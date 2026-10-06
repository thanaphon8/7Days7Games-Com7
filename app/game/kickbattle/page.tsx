"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAvatarSrc } from "../../components/navbar/page";

// ===== Kick Battle · จุดโทษดวลเดือด =====
type Dir = "L" | "C" | "R";
type Player = { id: string; name: string; avatar: string };
type Shot = { round: number; shooter: 0 | 1; shot: Dir; keep: Dir; goal: boolean };
type View = {
  code: string;
  status: "waiting" | "playing" | "finished";
  match: number;
  players: Player[];
  you: 0 | 1;
  first: 0 | 1;
  round: number;
  shooter: 0 | 1;
  scores: [number, number];
  history: Shot[];
  total: number;
  youPicked: boolean;
  oppPicked: boolean;
  winner: 0 | 1 | null;
  earned: [number, number];
  awardSaved: [boolean, boolean];
  youRematch: boolean;
  oppRematch: boolean;
  oppLeft: boolean;
};
type Anim = { entry: Shot; step: 0 | 1 | 2 };
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";

const TOTAL = 6;
const TB_TARGET = 2;
const TB_SHOTS = 3;
const WIN_BONUS = 200;
const SIDE: Record<Dir, string> = { L: "ซ้าย", C: "กลาง", R: "ขวา" };
const COLORS = ["#F4D35E", "#A8B5E8"];
const CONF = ["#F4D35E", "#A8B5E8", "#F4A58A", "#FFFFFF"];
const KEEP_X: Record<Dir, number> = { L: 16.7, C: 50, R: 83.3 };
const GOAL_TOP = 17;
const GOAL_H = 45;
const LINE_Y = GOAL_TOP + GOAL_H;
const GRASS = "repeating-linear-gradient(90deg,#8DB885 0 12.5%,#9CC593 12.5% 25%)";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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
.kb-coin{position:absolute;left:50%;top:50%;display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:9999px;background:#F4D35E;border:3px solid #4A3B00;color:#4A3B00;font-size:15px;font-weight:700;animation:kb-coin 1100ms cubic-bezier(.2,.8,.3,1) forwards;pointer-events:none}
.kb-gain{animation:kb-float 1500ms ease-out forwards;pointer-events:none}
.kb-score{animation:kb-score 450ms ease-out}
.kb-pop{animation:kb-pop 520ms cubic-bezier(.2,.9,.3,1.2) both}
.kb-shake{animation:kb-shake 520ms ease-in-out}
.kb-net{animation:kb-net 600ms ease-out}
.kb-flash{animation:kb-flash 450ms ease-out forwards}
.kb-sway{animation:kb-sway 1.6s ease-in-out infinite}
.kb-rise{animation:kb-rise 320ms ease-out both}
.kb-bob{animation:kb-bob 1.4s ease-in-out infinite}
.kb-conf{position:absolute;top:-10%;border-radius:2px;animation:kb-fall linear forwards;pointer-events:none}
.kb-dot{animation:kb-dots 1.2s infinite}
@media (prefers-reduced-motion:reduce){.kb-coin,.kb-score,.kb-gain{animation:none}.kb-sway,.kb-bob,.kb-dot{animation:none}.kb-shake,.kb-net,.kb-conf{animation:none}}
`;

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] bg-white text-sm font-medium transition-colors hover:bg-black/[.04]";
const BTN_ROUND =
  "pointer-events-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm ring-1 ring-black/5 backdrop-blur transition-transform active:scale-95";
const PILL = "rounded-full bg-white/90 px-4 py-2 text-sm text-zinc-600 shadow-sm ring-1 ring-black/5 backdrop-blur";

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
      id = localStorage.getItem("kb_guest") || "g" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("kb_guest", id);
    }
    setMe({ id: String(id), name, avatar });
  }, []);
  return me;
}

async function api(body: Record<string, unknown>) {
  const r = await fetch("/api/kickbattle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j.error || `เชื่อมต่อ API ไม่ได้ (HTTP ${r.status})`);
  }
  return j;
}

function sendLeave(code: string, playerId: string) {
  fetch("/api/kickbattle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "leave", code, playerId }),
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

function FireText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-xl ${size}`}
        style={{ animation: "kb-glow .5s ease-in-out infinite alternate" }}
      >
        {text}
      </span>
      <span className={`relative block bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`}>
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
      <path d="M18 30 L5 17" stroke="#F4A58A" strokeWidth="9" strokeLinecap="round" />
      <path d="M46 30 L59 17" stroke="#F4A58A" strokeWidth="9" strokeLinecap="round" />
      <rect x="22" y="50" width="8" height="20" rx="4" fill="#3F3F46" />
      <rect x="34" y="50" width="8" height="20" rx="4" fill="#3F3F46" />
      <rect x="17" y="24" width="30" height="31" rx="11" fill="#F4A58A" />
      <circle cx="32" cy="12" r="10" fill="#F2C9A0" />
      <circle cx="28" cy="11" r="1.6" fill="#27272A" />
      <circle cx="36" cy="11" r="1.6" fill="#27272A" />
      <circle cx="5" cy="16" r="7.5" fill="#F4D35E" />
      <circle cx="59" cy="16" r="7.5" fill="#F4D35E" />
    </svg>
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
        <div className="absolute h-[3px] bg-white/70" style={{ top: `${LINE_Y}%`, left: "-100vw", right: "-100vw" }} />
        <div className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white/80" style={{ top: "86%" }} />

        <div
          className={`absolute ${reveal && e!.goal ? "kb-net" : ""}`}
          style={{ left: `${inset}%`, right: `${inset}%`, top: `${GOAL_TOP}%`, height: `${GOAL_H}%`, transformOrigin: "50% 0" }}
        >
          <div
            className="absolute inset-0 rounded-t-md border-x-[6px] border-t-[6px] border-white"
            style={{
              backgroundColor: "rgba(255,255,255,.16)",
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
                  className={`m-1.5 flex items-end justify-center rounded-xl pb-2 text-sm font-semibold outline-none transition-all focus-visible:ring-4 focus-visible:ring-blue-400 ${
                    canPick
                      ? active
                        ? "scale-[1.03] bg-white/60 text-zinc-900 ring-4 ring-white"
                        : "border-2 border-dashed border-white/70 text-white hover:bg-white/25"
                      : "pointer-events-none border-0 text-transparent"
                  }`}
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
              <FireText text={e!.goal ? "GOAL!" : "SAVE!"} size="text-7xl sm:text-9xl" />
            ) : (
              <span className="rounded-[2rem] bg-zinc-900 px-8 py-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {e!.goal ? "เสียประตู" : "โดนเซฟ"}
              </span>
            )}
            <p className="mt-2 rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-zinc-700 shadow-sm">{sub}</p>
            <p
              className="mt-3 inline-block rounded-full px-5 py-1.5 text-2xl font-semibold tabular-nums sm:text-3xl"
              style={{ background: iScored ? "#27272A" : "#F4D35E", color: iScored ? "#F4D35E" : "#27272A" }}
            >
              {iScored ? "+100 แต้ม" : "คู่แข่ง +100"}
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
      <span className={`${base} kb-pop`} style={{ background: "#5FA35A" }} aria-label="ได้แต้ม">
        ✓
      </span>
    );
  if (state === "lose")
    return (
      <span className={`${base} kb-pop`} style={{ background: "#E0483B" }} aria-label="ไม่ได้แต้ม">
        ✕
      </span>
    );
  return (
    <span className={`${base} bg-white/60 !text-[10px] ${next ? "ring-2 ring-zinc-900" : ""}`} title={hint} aria-label={hint}>
      <span className="opacity-70">{hint === "ยิง" ? "⚽" : "🧤"}</span>
    </span>
  );
}

function PlayerPill({ p, score, idx, role, active, gain, isYou, dots }: { p: Player; score: number; idx: 0 | 1; role: "ยิง" | "รับ" | null; active: boolean; gain: string | null; isYou: boolean; dots: React.ReactNode }) {
  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col gap-2 rounded-3xl p-2.5 pr-3.5 text-zinc-900 shadow-sm transition-transform ${active ? "scale-[1.03]" : ""}`}
      style={{ background: COLORS[idx] }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getAvatarSrc(p.avatar)}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/80 sm:h-11 sm:w-11"
          onError={(ev) => ((ev.target as HTMLImageElement).src = "/img/p01.png")}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {p.name}
            {isYou && " (คุณ)"}
          </p>
          <p className="text-xs opacity-60">{role ? `${role === "ยิง" ? "⚽" : "🧤"} ${role}` : "—"}</p>
        </div>
        <span className="text-2xl font-semibold tabular-nums sm:text-3xl">
          <CountUp value={score} />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 pl-0.5 sm:gap-1.5" aria-label="ผลแต่ละลูก">
        {dots}
      </div>
      {gain && (
        <span key={gain} className="kb-gain absolute -top-2 right-4 z-20 rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-[#F4D35E] shadow-lg">
          +100
        </span>
      )}
    </div>
  );
}

export default function KickBattle() {
  const router = useRouter();
  const me = useMe();
  const [code, setCode] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sel, setSel] = useState<Dir | null>(null);
  const [shown, setShown] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [intro, setIntro] = useState<0 | 1 | 2>(0);
  const [go, setGo] = useState(false);
  const [flip, setFlip] = useState(false);
  const [tbIntro, setTbIntro] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [forfeit, setForfeit] = useState<SaveState>("idle");
  const forfeitRef = useRef("");
  const initRef = useRef(false);
  const introKey = useRef("");
  const tbKey = useRef("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const liveRef = useRef<{ code: string | null; id: string | null }>({ code: null, id: null });
  liveRef.current = { code, id: me?.id ?? null };
  const pickRef = useRef<{ canPick: boolean; sel: Dir | null; confirm: (d?: Dir) => void }>({ canPick: false, sel: null, confirm: () => {} });
  pickRef.current.canPick = false;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(
    () => () => {
      const { code: c, id } = liveRef.current;
      if (c && id) {
        sendLeave(c, id);
        try {
          localStorage.removeItem("kb_room");
        } catch {}
      }
    },
    []
  );

  async function claimForfeit(v: View) {
    const key = `kb_forfeit_${v.code}_${v.match}`;
    if (v.awardSaved?.[v.you] || (v.earned?.[v.you] ?? 0) > 0) {
      setForfeit("saved");
      return;
    }
    try {
      if (localStorage.getItem(key)) {
        setForfeit("saved");
        return;
      }
    } catch {}
    let userId: string | null = null;
    try {
      const pr = JSON.parse(localStorage.getItem("profile") || "null");
      userId = pr?.userId || pr?.id || pr?._id || null;
    } catch {}
    if (!userId) {
      setForfeit("guest");
      return;
    }
    setForfeit("saving");
    try {
      const r = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gameKey: "kickbattle", score: v.total * 100 + WIN_BONUS }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.success) {
        try {
          localStorage.setItem(key, "1");
        } catch {}
        setForfeit("saved");
      } else setForfeit("error");
    } catch {
      setForfeit("error");
    }
  }

  useEffect(() => {
    if (!view || !me || view.status !== "playing" || !view.oppLeft) return;
    const key = `${view.code}-${view.match}`;
    if (forfeitRef.current === key) return;
    forfeitRef.current = key;
    claimForfeit(view);
  }, [view, me]);

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

  function leave() {
    if (code && me) sendLeave(code, me.id);
    liveRef.current = { code: null, id: null };
    localStorage.removeItem("kb_room");
    timers.current.forEach(clearTimeout);
    timers.current = [];
    initRef.current = false;
    introKey.current = "";
    tbKey.current = "";
    setTbIntro(false);
    setConfirmExit(false);
    setForfeit("idle");
    setCode(null);
    setView(null);
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

  useEffect(() => {
    if (me) {
      const saved = localStorage.getItem("kb_room");
      if (saved) setCode(saved);
    }
  }, [me]);

  useEffect(() => {
    if (!code || !me) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/kickbattle?code=${code}&playerId=${encodeURIComponent(me.id)}`, { cache: "no-store" });
        if (r.status === 404 || r.status === 403) {
          if (!stop) {
            leave();
            setError("ห้องนี้ปิดไปแล้ว สร้างห้องใหม่หรือใส่รหัสอื่นได้เลย");
          }
          return;
        }
        const v = await r.json();
        if (!stop) setView(v);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [code, me]);

  useEffect(() => {
    if (!view) return;
    if (!initRef.current) {
      initRef.current = true;
      setShown(view.history.length);
      return;
    }
    if (view.history.length < shown) {
      setShown(view.history.length);
      return;
    }
    if (!anim && view.history.length > shown) {
      const entry = view.history[shown];
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
    }
  }, [view, shown, anim]);

  useEffect(() => {
    if (!view || view.status !== "playing" || view.history.length > 0) return;
    const key = `${view.code}-${view.match}`;
    if (introKey.current === key) return;
    introKey.current = key;
    setIntro(1);
    later(() => setIntro(2), 1800);
    later(() => {
      setIntro(0);
      setGo(true);
    }, 3700);
    later(() => setGo(false), 4600);
  }, [view]);

  useEffect(() => {
    if (!view || anim || view.status !== "playing") return;
    if (view.history.length !== view.total || shown !== view.total) return;
    const key = `${view.code}-${view.match}`;
    if (tbKey.current === key) return;
    tbKey.current = key;
    setTbIntro(true);
    later(() => setTbIntro(false), 3000);
  }, [view, shown, anim]);

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

  async function enter(action: "create" | "join") {
    if (!me || busy) return;
    setError("");
    setBusy(true);
    try {
      const targetCode = action === "join" ? joinCode.trim().toUpperCase() : undefined;
      const r = await api({ action, code: targetCode, playerId: me.id, name: me.name, avatar: me.avatar });
      const activeCode = r.code || targetCode;
      if (!activeCode) throw new Error("ไม่พบรหัสห้อง");
      
      // ล้าง State เก่าเพื่อเตรียมพร้อมสำหรับการเข้าห้องใหม่
      initRef.current = false;
      setView(null);
      setShown(0);
      setAnim(null);
      setSel(null);
      
      localStorage.setItem("kb_room", activeCode);
      setCode(activeCode);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPick(dir?: Dir) {
    const d = dir ?? sel;
    if (!me || !code || !d || busy) return;
    setSel(d);
    setBusy(true);
    try {
      const v: View = await api({ action: "pick", code, playerId: me.id, dir: d });
      setView((cur) => (cur && v.history.length > cur.history.length ? { ...cur, youPicked: true } : v));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function rematch() {
    if (!me || !code) return;
    try {
      setView(await api({ action: "rematch", code, playerId: me.id }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const menu = (children: React.ReactNode, hero = false) => (
    <div className={`fixed inset-0 z-50 overflow-y-auto font-sans text-zinc-900 ${hero ? "bg-[#8DB885]" : "bg-white"}`}>
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
                "linear-gradient(to bottom, rgba(0,0,0,.38) 0%, rgba(0,0,0,.12) 30%, rgba(141,184,133,.55) 62%, rgba(141,184,133,.92) 85%, #8DB885 100%)",
            }}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-3xl px-6 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={`inline-flex h-10 items-center rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors ${
              hero ? "bg-white/90 shadow-sm backdrop-blur hover:bg-white" : "hover:bg-black/[.04]"
            }`}
          >
            กลับหน้าหลัก
          </Link>
          {code && view?.status !== "playing" && (
            <button onClick={leave} className="h-10 rounded-full px-4 text-sm text-zinc-500 transition-colors hover:bg-black/[.04]">
              ออกจากห้อง
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );

  if (!me) return menu(<p className="mt-20 text-center text-sm text-zinc-400">กำลังโหลด…</p>);

  // ===== ล็อบบี้ =====
  if (!code) {
    return menu(
      <>
        <h1 className="mt-10 text-5xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.45)] md:text-7xl">Kick Battle</h1>
        <p className="mt-4 max-w-md text-lg leading-8 text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,.45)]">
          จุดโทษดวลเดือดสองคน ใครยิงใครรับสุ่มกันหน้าสนาม แล้วสลับบทบาทกันทุกลูก
        </p>

        {error && <p className="mt-6 rounded-2xl bg-[#F4A58A] px-5 py-3 text-sm">{error}</p>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between gap-8 rounded-[2rem] bg-[#F4D35E] p-7">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">สร้างห้อง</h2>
              <p className="mt-2 text-sm leading-6 opacity-70">รับรหัสห้อง 4 ตัว แล้วส่งให้เพื่อนเข้ามา</p>
            </div>
            <button
              onClick={() => enter("create")}
              disabled={busy}
              className="h-12 rounded-full bg-zinc-900 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              สร้างห้องใหม่
            </button>
          </div>

          <div className="flex flex-col justify-between gap-8 rounded-[2rem] bg-[#A8B5E8] p-7">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">เข้าร่วมห้อง</h2>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && joinCode.length === 4 && enter("join")}
                placeholder="รหัสห้อง"
                aria-label="รหัสห้อง"
                inputMode="text"
                autoCapitalize="characters"
                className="mt-3 h-12 w-full rounded-full bg-white/80 px-5 text-center text-2xl font-semibold uppercase tracking-[.4em] outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-400 focus:bg-white focus:ring-4 focus:ring-white/60"
              />
            </div>
            <button
              onClick={() => enter("join")}
              disabled={busy || joinCode.length !== 4}
              className="h-12 rounded-full bg-[#1F2A5C] text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              เข้าห้อง
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[2rem] bg-white/90 p-7 shadow-sm backdrop-blur">
          <h3 className="text-lg font-semibold tracking-tight">กติกา</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-zinc-600">
            <li>ผู้ยิงเลือกซ้าย กลาง หรือขวา ผู้รับเลือกทิศเดียวกันได้เหมือนกัน เลือกพร้อมกันและซ่อนกันจนกว่าจะเปิดผล</li>
            <li>ยิงคนละทิศกับที่ผู้รับเลือก ผู้ยิงได้ 100 แต้ม ถ้าตรงกัน ผู้รับเซฟได้ 100 แต้ม และแต้มบวกเข้าคะแนนรวมทันที</li>
            <li>สลับบทบาทกันทุกลูก เล่น 6 ลูก (ยิงคนละ 3 ลูก) ใครแต้มสูงกว่าชนะ ถ้าเสมอต่อเวลาอีกสูงสุด 3 ลูก ใครได้ 2 แต้มก่อนชนะ ผู้ชนะรับโบนัสเพิ่ม 200 แต้ม</li>
            <li>ถ้าผู้เล่นคนใดออกจากเกมระหว่างเล่น ห้องจะถูกยกเลิกและเกมจบ ผู้ที่ยังอยู่ชนะโดยปริยาย ได้แต้มเหมือนยิงเข้าทุกลูก (ลูกละ 100 แต้ม ครบ 6 ลูก = 600 แต้ม) บวกโบนัสผู้ชนะ 200 แต้ม รวม 800 แต้ม และบันทึกเข้าคะแนนรวม</li>
            <li>วิธีเล่น: ลากลูกบอล (หรือถุงมือ) ไปที่มุมที่ต้องการแล้วปล่อย หรือกดเลือกมุม หรือใช้ปุ่มลูกศร ← ↓ → แล้วกด Enter</li>
          </ul>
        </div>
      </>,
      true
    );
  }

  // ===== รอเพื่อน (เฉพาะ Host คนสร้างห้อง หรือ Guest ที่เพิ่ง Join แล้วรอ Server เริ่มเกม) =====
  if (!view || view.status === "waiting") {
    const isGuest = view && view.you === 1;
    return menu(
      <div className="mt-16 flex flex-col items-center rounded-[2rem] bg-[#F4D35E] px-6 py-16 text-center">
        {isGuest ? (
          <>
            <p className="text-2xl font-semibold">เข้าร่วมห้อง {code} สำเร็จ!</p>
            <p className="mt-4 text-sm opacity-70">
              กำลังเชื่อมต่อและรอเริ่มเกม
              {[0, 1, 2].map((i) => (
                <span key={i} className="kb-dot" style={{ animationDelay: `${i * 200}ms` }}>
                  .
                </span>
              ))}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm opacity-70">รหัสห้องของคุณ</p>
            <p className="mt-2 text-7xl font-semibold tracking-[.2em] md:text-8xl">{code}</p>
            <button onClick={copyCode} className="mt-6 h-12 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-opacity hover:opacity-85">
              {copied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
            </button>
            <p className="mt-8 text-sm opacity-70">
              รอเพื่อนเข้าห้อง
              {[0, 1, 2].map((i) => (
                <span key={i} className="kb-dot" style={{ animationDelay: `${i * 200}ms` }}>
                  .
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    );
  }

  // ===== ในเกม (เมื่อสถานะเปลี่ยนเป็น playing หรือ finished) =====
  const you = view.you;
  const opp = (1 - you) as 0 | 1;
  const revealed = shown + (anim && anim.step >= 2 ? 1 : 0);
  const sc: [number, number] = [0, 0];
  view.history.slice(0, revealed).forEach((h) => sc[h.goal ? h.shooter : 1 - h.shooter]++);
  const curShooter = ((view.first + shown) % 2) as 0 | 1;
  const iShoot = curShooter === you;
  const cancelled = view.oppLeft && view.status === "playing";
  const canPick = !cancelled && !confirmExit && intro === 0 && !tbIntro && !anim && shown === view.round && view.status === "playing" && !view.youPicked;
  const done = view.status === "finished" && shown === view.history.length && !anim;
  const iWon = view.winner === you;
  const tiebreak = view.history.length > view.total || (shown >= view.total && view.history.length === view.total && view.status === "playing");
  const sudden = tiebreak && shown >= view.total;
  const tbSc: [number, number] = [0, 0];
  view.history.slice(view.total, revealed).forEach((h) => tbSc[h.goal ? h.shooter : 1 - h.shooter]++);
  const nextRound = done || view.status === "finished" ? -1 : revealed;
  const dot = (i: 0 | 1, round: number) => {
    const h = round < revealed ? view.history[round] : undefined;
    const state = !h ? "pending" : (h.goal ? h.shooter === i : h.shooter !== i) ? "win" : "lose";
    const hint = (view.first + round) % 2 === i ? "ยิง" : "รับ";
    return <ShotDot key={round} state={state} next={round === nextRound} hint={hint} />;
  };
  const dotsFor = (i: 0 | 1) => [
    ...Array.from({ length: view.total }).map((_, k) => dot(i, k)),
    ...(tiebreak ? [<span key="tb" className="mx-0.5 h-5 w-px bg-black/20" />, ...Array.from({ length: TB_SHOTS }).map((_, k) => dot(i, view.total + k))] : []),
  ];
  const scorer = anim && anim.step >= 2 ? (anim.entry.goal ? anim.entry.shooter : 1 - anim.entry.shooter) : -1;
  const gainFor = (i: 0 | 1) => (scorer === i && anim ? `${view.match}-${anim.entry.round}` : null);
  const roleOf = (i: 0 | 1) => (done ? null : i === curShooter ? "ยิง" : "รับ");
  const statusText = done
    ? "จบเกม"
    : sudden
      ? `ต่อเวลา · ใครได้ ${TB_TARGET} แต้มก่อนชนะ · คุณ ${tbSc[you]} : ${tbSc[opp]}`
      : `ลูกที่ ${Math.min(shown + 1, view.total)} จาก ${view.total}`;

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
          <PlayerPill p={view.players[0]} score={sc[0] * 100} idx={0} role={roleOf(0)} active={!done && curShooter === 0} gain={gainFor(0)} isYou={you === 0} dots={dotsFor(0)} />
          <PlayerPill p={view.players[1]} score={sc[1] * 100} idx={1} role={roleOf(1)} active={!done && curShooter === 1} gain={gainFor(1)} isYou={you === 1} dots={dotsFor(1)} />
        </div>
        <div className="mt-2 flex justify-center">
          <span className={`${PILL} !py-1 text-xs font-medium`}>{statusText}</span>
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
            {anim ? (
              <p className={PILL}>ลุ้นกันหน่อย…</p>
            ) : view.youPicked ? (
              <p className={PILL}>
                ล็อกแล้ว รอคู่แข่ง
                {[0, 1, 2].map((i) => (
                  <span key={i} className="kb-dot" style={{ animationDelay: `${i * 200}ms` }}>
                    .
                  </span>
                ))}
              </p>
            ) : (
              <>
                <p className={PILL}>
                  {iShoot ? "คุณเป็นผู้ยิง · ลากลูกไปมุมที่จะยิงแล้วปล่อย" : "คุณเป็นผู้รับ · ลากถุงมือไปมุมที่จะรับแล้วปล่อย"}
                  {view.oppPicked && <span className="ml-2 rounded-full bg-zinc-100 px-3 py-0.5 text-xs">คู่แข่งเลือกแล้ว</span>}
                </p>
                <button
                  onClick={() => confirmPick()}
                  disabled={!sel || busy}
                  className="pointer-events-auto h-12 w-full max-w-xs rounded-full bg-zinc-900 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-30"
                >
                  {sel ? (iShoot ? `ยิง${SIDE[sel]}` : `รับ${SIDE[sel]}`) : iShoot ? "เลือกทิศที่จะยิง" : "เลือกทิศที่จะรับ"}
                </button>
              </>
            )}
            {error && <p className="rounded-full bg-white/90 px-3 py-1 text-sm text-[#C2410C]">{error}</p>}
          </div>
          <span className="w-11 shrink-0" aria-hidden />
        </div>
      )}

      {intro > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#190C28]/60 px-6 text-center text-white backdrop-blur-sm">
          {intro === 1 ? (
            <>
              <p className="text-sm opacity-70">กำลังสุ่มว่าใครได้ยิงก่อน</p>
              <p className="mt-4 text-7xl" style={{ transform: `rotate(${flip ? -12 : 12}deg) scale(${flip ? 1 : 1.15})`, transition: "transform 130ms" }}>
                {flip ? "⚽" : "🧤"}
              </p>
            </>
          ) : (
            <div className="kb-pop">
              <p className="text-7xl">{view.first === you ? "⚽" : "🧤"}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{view.first === you ? "คุณได้ยิงก่อน" : "คุณได้เฝ้าประตู"}</p>
              <p className="mt-2 text-sm opacity-70">ลูกต่อไปสลับบทบาทกัน</p>
            </div>
          )}
        </div>
      )}

      {go && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <div style={{ animation: "kb-go .9s ease-out both" }}>
            <FireText text="GO!!!" size="text-7xl sm:text-9xl" />
          </div>
        </div>
      )}

      {tbIntro && (
        <div className="kb-rise absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#190C28]/70 px-6 text-center text-white backdrop-blur-sm">
          <div className="kb-pop">
            <p className="text-7xl">🔥</p>
            <p className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">แต้มเสมอ ต่อเวลา!</p>
            <p className="mt-3 text-sm leading-6 opacity-80">ยิงกันต่ออีกสูงสุด {TB_SHOTS} ลูก ใครได้ {TB_TARGET} แต้มก่อนชนะ</p>
            <p className="mt-1 text-sm opacity-80">ผู้ชนะรับโบนัส +200 แต้ม</p>
          </div>
        </div>
      )}

      {done && (
        <div className="kb-rise absolute inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#F7E9A8] via-white to-white p-4">
          {iWon && <Confetti n={44} />}
          {iWon && <Coins />}
          <div className="my-auto w-full max-w-sm text-center">
            <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${iWon ? "bg-[#F4D35E]" : "bg-zinc-100 text-zinc-600"}`}>
              {iWon ? "🏆 ชนะ!" : "จบเกม"}
            </span>
            <p className="kb-pop mt-3 text-7xl">{iWon ? "🏆" : "🥲"}</p>
            <h2 className="mt-2 text-5xl font-semibold tracking-tight">{iWon ? "คุณชนะ!" : "แพ้ไปนิดเดียว"}</h2>
            {view.history.length > view.total && <p className="mt-1 text-sm text-zinc-500">ตัดสินด้วยการต่อเวลา</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[you, opp].map((i, k) => (
                <div key={i} className="rounded-3xl py-5 text-zinc-900" style={{ background: COLORS[i] }}>
                  <p className="truncate px-2 text-xs opacity-70">{k === 0 ? "คุณ" : view.players[i]?.name || "คู่แข่ง"}</p>
                  <p className="text-5xl font-semibold tabular-nums tracking-tight">{sc[i] * 100}</p>
                </div>
              ))}
            </div>

            {iWon && <p className="kb-pop mt-4 inline-block rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-[#F4D35E]">โบนัสผู้ชนะ +200 แต้ม</p>}
            {view.earned[you] > 0 &&
              (view.awardSaved[you] ? (
                <p className="mt-3 rounded-2xl bg-[#E4EEDF] px-4 py-2.5 text-sm font-medium text-[#2F5D2A]">+{view.earned[you]} แต้มเข้าคะแนนรวมของคุณแล้ว</p>
              ) : (
                <p className="mt-3 rounded-2xl bg-[#FBE3DA] px-4 py-2.5 text-sm text-[#8A3B1F]">แต้มรอบนี้ยังไม่ถูกบันทึก ตรวจว่าเข้าสู่ระบบแล้ว</p>
              ))}

            <p className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: view.oppLeft ? "#E0483B" : "#5FA35A" }} aria-hidden="true" />
              {view.oppLeft ? "คู่แข่งออกจากห้องแล้ว" : "คู่แข่งยังอยู่ในห้อง"}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {view.oppLeft ? (
                <button onClick={leave} className={BTN_MAIN}>
                  จบเกม
                </button>
              ) : (
                <>
                  <button onClick={rematch} disabled={view.youRematch} className={BTN_MAIN}>
                    {view.youRematch ? "รอเพื่อนกดเล่นอีกรอบ…" : view.oppRematch ? "เพื่อนขอเล่นอีกรอบ กดเลย" : "เล่นอีกรอบ"}
                  </button>
                  <button onClick={leave} className={BTN_SUB}>
                    ออกจากห้อง
                  </button>
                </>
              )}
              <Link href="/rank" className={BTN_SUB}>
                ดูอันดับ
              </Link>
            </div>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="kb-rise absolute inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#F7E9A8] via-white to-white p-4">
          <Confetti n={40} />
          <Coins />
          <div className="my-auto w-full max-w-sm text-center">
            <span className="inline-block rounded-full bg-[#F4D35E] px-4 py-1 text-sm font-medium">คู่แข่งออกจากเกมแล้ว</span>
            <p className="kb-pop mt-3 text-7xl">🏆</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">คุณชนะโดยปริยาย!</h2>
            <p className="mt-2 text-sm text-zinc-500">ห้องนี้ถูกยกเลิกและเกมจบลงแล้ว</p>

            <div className="mt-5 rounded-3xl bg-[#F4D35E] py-5 text-zinc-900">
              <p className="text-xs opacity-70">เหมือนชนะแบบยิงเข้าทุกลูก</p>
              <p className="text-6xl font-semibold tabular-nums tracking-tight">+{view.total * 100 + WIN_BONUS}</p>
              <div className="mt-3 flex justify-center gap-2 text-xs">
                <span className="rounded-full bg-white/70 px-3 py-1">ยิงเข้าทุกลูก {view.total * 100}</span>
                <span className="kb-pop rounded-full bg-zinc-900 px-3 py-1 text-[#F4D35E]">โบนัสผู้ชนะ +{WIN_BONUS}</span>
              </div>
            </div>

            {forfeit === "saving" && <p className="mt-3 rounded-2xl bg-zinc-50 px-4 py-2.5 text-sm text-zinc-500">กำลังบันทึกแต้ม…</p>}
            {forfeit === "saved" && (
              <p className="mt-3 rounded-2xl bg-[#E4EEDF] px-4 py-2.5 text-sm font-medium text-[#2F5D2A]">บวก {view.total * 100 + WIN_BONUS} แต้มเข้าคะแนนรวมของคุณแล้ว</p>
            )}
            {forfeit === "guest" && <p className="mt-3 rounded-2xl bg-[#FBE3DA] px-4 py-2.5 text-sm text-[#8A3B1F]">เข้าสู่ระบบเพื่อบันทึกแต้มเข้าอันดับ</p>}
            {forfeit === "error" && (
              <div className="mt-3 rounded-2xl bg-[#FBE3DA] px-4 py-2.5 text-sm text-[#8A3B1F]">
                บันทึกแต้มไม่สำเร็จ
                <button onClick={() => claimForfeit(view)} className="ml-2 font-medium underline">
                  ลองอีกครั้ง
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button onClick={leave} className={BTN_MAIN}>
                สร้าง/เข้าห้องใหม่
              </button>
              <button onClick={exitGame} className={BTN_SUB}>
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmExit && !cancelled && (
        <div className="kb-rise absolute inset-0 z-[70] flex items-center justify-center bg-[#190C28]/60 p-6 backdrop-blur-sm">
          <div className="kb-pop w-full max-w-sm rounded-[2rem] bg-white p-7 text-center text-zinc-900">
            <p className="text-5xl">🚪</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">ออกจากเกมนี้?</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">ถ้าออกตอนนี้ ห้องจะถูกยกเลิกและเกมจะจบ คุณจะไม่ได้แต้มจากรอบนี้ และคู่แข่งจะชนะโดยได้แต้มเต็ม {view.total * 100} บวกโบนัสผู้ชนะ {WIN_BONUS} รวม {view.total * 100 + WIN_BONUS} แต้ม</p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => setConfirmExit(false)} className={BTN_MAIN}>
                เล่นต่อ
              </button>
              <button
                onClick={exitGame}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#E0483B] text-sm font-medium text-white transition-opacity hover:opacity-85"
              >
                ออกและยกเลิกห้อง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}