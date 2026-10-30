// app/login/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import { useRouter } from "next/navigation";
// departments.ts / branches.ts อยู่ที่ app/components/
import { COMPANIES, DEPARTMENTS, departmentsOf, getCompany } from "../components/departments";
import {
  branchCode,
  branchesOf,
  branchFullLabel,
  branchLabel,
  branchProvince,
  branchRegion,
  getBranch,
} from "../components/branches";

/* ------------------------------------------------------------------ */
/*  ค่าคงที่ / ตัวช่วย                                                   */
/* ------------------------------------------------------------------ */

type Mode = "in" | "up";
type Place = "hq" | "store";
type Item = { id: number; label: string; sub?: string };
type Errors = Record<string, string | undefined>;
type ApiUser = {
  userId?: string; // id ฝั่งหน้าเว็บ = username ตัวพิมพ์เล็ก (ตรงกับที่ /api/user ใช้ค้นหา)
  name: string;
  username: string;
  employeeId?: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatar?: string | null;
  points?: number;
  companyId?: number | null;
  departmentId?: number | null;
  branchId?: number | null;
};

// ลำดับขั้นสมัคร: 0 ชื่อเล่น → 1 บริษัท → 2 ที่ทำงาน → 3 แผนก/สาขา → 4 บัญชี → 5 รูปโปรไฟล์
// ขั้น 2 ข้ามเองถ้าบริษัทนั้นมีแค่แผนกหรือแค่สาขา
const STEP_LABELS = ["ชื่อเล่น", "บริษัท", "ที่ทำงาน", "แผนก", "บัญชี", "รูปโปรไฟล์"] as const;
const LAST_STEP = STEP_LABELS.length - 1; // 5 = ขั้นรูป กดสร้างบัญชีที่ขั้นนี้
const WELCOME = STEP_LABELS.length; // 6

const BRANCH_PREVIEW = 80;
const BRANCH_STEP = 200;

const EMPLOYEE_ID_RE = /^[A-Za-z0-9]{3,20}$/;
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
// รูปสำเร็จรูป /img/p1.png - /img/p25.png
const PRESET_IDS = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);

const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

const fold = (s: string) => s.toLowerCase().replace(/\s+/g, "");
const isSubseq = (q: string, h: string) => {
  let i = 0;
  for (const c of h) if (c === q[i] && ++i === q.length) return true;
  return false;
};
function matchScore(q: string, texts: string[]): number {
  let best = -1;
  for (const raw of texts) {
    const h = fold(raw);
    let s = -1;
    if (h.startsWith(q)) s = 0;
    else if (h.includes(q)) s = 1;
    else if (q.length >= 2 && isSubseq(q, h)) s = 2;
    if (s >= 0 && (best < 0 || s < best)) best = s;
  }
  return best;
}
function searchItems(query: string, list: Item[]): Item[] {
  const q = fold(query);
  if (!q) return list;
  return list
    .map((x) => ({ x, s: matchScore(q, [x.label, x.sub ?? ""]) }))
    .filter((r) => r.s >= 0)
    .sort((a, b) => a.s - b.s || a.x.label.length - b.x.label.length)
    .map((r) => r.x);
}

// step ที่มี error ของฟิลด์นั้น (ไว้เด้งกลับไปแก้เมื่อเซิร์ฟเวอร์ตีกลับ)
const stepOfErrors = (e: Errors): number | null =>
  e.nickname
    ? 0
    : e.companyId
      ? 1
      : e.departmentId || e.branchId
        ? 3
        : e.employeeId || e.username || e.password || e.confirm
          ? 4
          : null;

// เก็บโปรไฟล์ลง localStorage ให้หน้าอื่น (โปรไฟล์/อันดับ/เกม) อ่านต่อได้
// userId ต้องเป็น username ตัวพิมพ์เล็ก เพราะ /api/user ค้นด้วยค่านี้
function saveProfile(u: ApiUser) {
  const avatar = u.avatar || u.avatarUrl || u.avatarPreset || "";
  const userId = (u.userId || u.username || "").trim().toLowerCase();
  localStorage.setItem(
    "profile",
    JSON.stringify({
      userId,
      name: u.name,
      avatar,
      avatarId: avatar,
      employeeId: u.employeeId,
    })
  );
  localStorage.setItem("userId", userId);
  window.dispatchEvent(new Event("storage"));
}

/* ------------------------------------------------------------------ */
/*  คอนเฟตตี (ธีมนีออน)                                                 */
/* ------------------------------------------------------------------ */

type Piece = { id: number; dx: number; dy: number; rot: number; color: string; shape: string; w: number; h: number; delay: number; fall: number; dur: number };
type Burst = { key: number; x: number; y: number; pieces: Piece[] };

const CONFETTI_COLORS = ["#17FFA2", "#ff2a55", "#F4D35E", "#FFFFFF", "#6dffc6"];
const SHAPES: Record<string, React.CSSProperties> = {
  circle: { borderRadius: "50%" },
  rect: { borderRadius: 2 },
  pill: { borderRadius: 999 },
  tri: { clipPath: "polygon(50% 0, 0 100%, 100% 100%)" },
  star: { clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" },
};

function makePieces(n: number, angle: number, spread: number, vmin: number, vmax: number, fall: number): Piece[] {
  const names = Object.keys(SHAPES);
  return Array.from({ length: n }, (_, id) => {
    const a = angle + (Math.random() - 0.5) * spread;
    const speed = vmin + Math.random() * (vmax - vmin);
    const shape = names[Math.floor(Math.random() * names.length)];
    const size = 8 + Math.random() * 8;
    return {
      id,
      dx: Math.cos(a) * speed,
      dy: Math.sin(a) * speed,
      rot: (Math.random() - 0.5) * 900,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape,
      w: size,
      h: shape === "rect" ? size * 0.55 : shape === "pill" ? size * 0.45 : size,
      delay: Math.random() * 120,
      fall,
      dur: 1700 + Math.random() * 700,
    };
  });
}

function ConfettiLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <>
      <style>{`@keyframes confetti-pop {
        0% { transform: translate(0,0) rotate(0) scale(.3); opacity: 1; }
        45% { transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) * .5)) scale(1); opacity: 1; }
        100% { transform: translate(calc(var(--dx) * 1.25), calc(var(--dy) + var(--fall))) rotate(var(--rot)) scale(.9); opacity: 0; }
      }`}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {bursts.map((b) => (
          <div key={b.key} className="absolute" style={{ left: b.x, top: b.y }}>
            {b.pieces.map((p) => (
              <span
                key={p.id}
                className="absolute"
                style={
                  {
                    width: p.w,
                    height: p.h,
                    marginLeft: -p.w / 2,
                    marginTop: -p.h / 2,
                    backgroundColor: p.color,
                    ...SHAPES[p.shape],
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--rot": `${p.rot}deg`,
                    "--fall": `${p.fall}px`,
                    animation: `confetti-pop ${p.dur}ms cubic-bezier(.15,.7,.3,1) ${p.delay}ms forwards`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือวิ่ง                                               */
/* ------------------------------------------------------------------ */

const STACK_WORD = "LOGIN";
const STACK_SOLID = "7 DAYS 7 GAMES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 flex select-none flex-col justify-center overflow-hidden">
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "txt-bg-outline opacity-50" : "txt-bg-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`bg-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
              style={{ animationDuration: `${STACK_SECONDS[kind]}s`, animationDirection: reverse ? "reverse" : "normal" }}
            >
              {[0, 1].map((g) => (
                <div key={g} className="flex shrink-0 gap-[0.45em] pr-[0.45em]">
                  {Array.from({ length: solid ? 3 : 5 }).map((_, j) => (
                    <span key={j}>{text}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STYLES = `
  button, a, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .txt-bg-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }
  @keyframes bg-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .bg-marquee { animation: bg-marquee linear infinite; will-change: transform; }
  .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
  .btn-fx:hover .btn-shine { transform: translateX(120%); }
  @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  .fx-rise { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }
  .scroll-neon { scrollbar-width: thin; scrollbar-color: rgba(23,255,162,.5) transparent; }
  @media (prefers-reduced-motion: reduce) {
    .bg-marquee, .fx-rise { animation: none !important; }
  }
`;

const pageShell =
  "relative isolate min-h-[100dvh] overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white";

const field =
  "h-12 w-full border border-white/15 bg-black/40 px-5 text-base text-white outline-none transition-all placeholder:text-zinc-500 focus:border-[#17FFA2] focus:shadow-[0_0_18px_rgba(23,255,162,0.25)]";

/* ------------------------------------------------------------------ */
/*  ชิ้นส่วนเล็กๆ                                                        */
/* ------------------------------------------------------------------ */

function Btn({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-fx relative inline-flex h-12 items-center justify-center overflow-hidden px-7 text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${styles} ${className}`}
    >
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-flex items-center gap-3">{children}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  hint,
  maxLength,
  autoComplete,
  autoFocus,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  trailing?: ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-white/85">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          style={error ? { borderColor: RED } : undefined}
          className={`${field} ${trailing ? "pr-20" : ""}`}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 text-[13px] text-[#ff7b94]">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className={`mt-1.5 text-xs ${MUTED}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ShowBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-10 px-3 text-xs font-bold uppercase text-[#8fa6a1] transition-colors hover:bg-white/10 hover:text-[#17FFA2]"
    >
      {show ? "ซ่อน" : "แสดง"}
    </button>
  );
}

function Avatar({ name, src, size }: { name: string; src?: string | null; size: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  if (src && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
        className="block shrink-0 rounded-full bg-[#0f1c1a] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-[#0f1c1a] font-bold text-[#17FFA2]"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {(Array.from(name.trim())[0] ?? "?").toUpperCase()}
    </span>
  );
}

// รูปสำเร็จรูป (ถ้าโหลดไม่ได้ จะแสดงรหัสรูปแทน)
function PresetImg({ id }: { id: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span className="flex aspect-square w-full items-center justify-center rounded-full bg-[#0f1c1a] text-xs font-bold text-[#17FFA2]">
        {id.toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/img/${id}.png`} alt="" loading="lazy" onError={() => setErr(true)} className="aspect-square w-full rounded-full object-cover" />
  );
}

// รายการให้เลือก (ใช้ร่วมกัน บริษัท / แผนก / สาขา)
function PickList({
  items,
  selectedId,
  hi,
  onHover,
  onPick,
  listRef,
  limit,
  label,
}: {
  items: Item[];
  selectedId: string;
  hi: number;
  onHover: (i: number) => void;
  onPick: (id: number) => void;
  listRef?: Ref<HTMLDivElement>;
  limit?: number;
  label: string;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      className="scroll-neon relative mt-3 max-h-[min(44dvh,380px)] overflow-y-auto border border-white/15 bg-black/40"
    >
      {shown.length === 0 ? (
        <p className={`px-4 py-5 text-center text-sm ${MUTED}`}>ไม่พบรายการที่ตรงกัน ลองพิมพ์คำอื่น</p>
      ) : (
        shown.map((it, i) => {
          const selected = String(it.id) === selectedId;
          return (
            <button
              key={it.id}
              type="button"
              role="option"
              aria-selected={selected}
              data-hi={i === hi ? "true" : undefined}
              onMouseEnter={() => onHover(i)}
              onClick={() => onPick(it.id)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors ${
                selected ? "bg-[#17FFA2] text-[#04110a]" : i === hi ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{it.label}</span>
                {it.sub && <span className={`block truncate text-xs ${selected ? "text-[#04110a]/70" : MUTED}`}>{it.sub}</span>}
              </span>
              {selected && (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </button>
          );
        })
      )}
      {items.length > shown.length && (
        <p className={`px-4 py-3 text-center text-xs ${MUTED}`}>พิมพ์ค้นหาเพื่อดูอีก {items.length - shown.length} รายการ</p>
      )}
    </div>
  );
}

// ถ่ายรูปโปรไฟล์: เปิดกล้องในกรอบวงกลม กดชัตเตอร์แล้วตัดเป็นสี่เหลี่ยมจัตุรัสกลางภาพ
function CameraCapture({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("เบราว์เซอร์นี้ไม่รองรับกล้อง");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) setErr("เปิดกล้องไม่ได้ ตรวจสอบสิทธิ์กล้องของเบราว์เซอร์ หรือเลือกรูปจากเครื่องแทน");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const size = Math.min(side, 800);
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size);
    c.toBlob(
      (b) => {
        if (!b) return;
        onCapture(new File([b], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="ถ่ายรูปโปรไฟล์" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 px-6 text-white">
      <p className="mb-5 text-center text-[15px] font-semibold text-white/90">จัดหน้าให้อยู่ในวงกลม</p>
      <div className="relative aspect-square w-[min(80vw,360px)] overflow-hidden rounded-full bg-[#0f1c1a] ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)]">
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />
        {!ready && !err && <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">กำลังเปิดกล้อง</span>}
      </div>
      {err && (
        <p role="alert" style={{ borderColor: RED }} className="mt-5 max-w-xs border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
          {err}
        </p>
      )}
      <div className="mt-8 flex w-full max-w-xs items-center justify-between">
        <button type="button" onClick={onClose} className="h-11 min-w-[84px] px-4 text-[15px] font-semibold text-white/80 hover:text-white">
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={snap}
          disabled={!ready || !!err}
          aria-label="ถ่ายรูป"
          className="h-[72px] w-[72px] rounded-full bg-white ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-black transition-transform active:scale-90 disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          className="h-11 min-w-[84px] px-4 text-[15px] font-semibold text-white/80 hover:text-white"
        >
          สลับกล้อง
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LOGIN / REGISTER                                                   */
/* ------------------------------------------------------------------ */

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [step, setStep] = useState(0);

  // login
  const [lgUser, setLgUser] = useState("");
  const [lgPass, setLgPass] = useState("");

  // register
  const [nickname, setNickname] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [workplace, setWorkplace] = useState<Place | "">("");
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deptQuery, setDeptQuery] = useState("");
  const [branchQuery, setBranchQuery] = useState("");
  const [branchLimit, setBranchLimit] = useState(BRANCH_PREVIEW);
  const [hi, setHi] = useState(-1);
  const [username, setUsername] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // รูปโปรไฟล์ (ไม่บังคับ)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState(""); // รูปสำเร็จรูปที่เลือก (ใช้เมื่อไม่ได้อัปโหลดเอง)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [canCam, setCanCam] = useState(false);

  const [user, setUser] = useState<ApiUser | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (window.location.hash === "#signup") setMode("up");
    setCanCam(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );

  useEffect(() => {
    setHi(-1);
  }, [step]);

  // พลุกระดาษหน้า welcome
  useEffect(() => {
    if (step !== WELCOME) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fire = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mk = (x: number, deg: number): Burst => ({
        key: Date.now() + Math.random(),
        x,
        y: h,
        pieces: makePieces(45, (deg * Math.PI) / 180, 0.7, 320, 620, h * 0.9),
      });
      const group = [mk(0, -62), mk(w, -118)];
      setBursts((b) => [...b, ...group]);
      timers.push(setTimeout(() => setBursts((b) => b.filter((x) => !group.includes(x))), 3000));
    };
    timers.push(setTimeout(fire, 250), setTimeout(fire, 800));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  /* ---------- รายการบริษัท / แผนก / สาขา ---------- */

  const companyItems = useMemo<Item[]>(() => COMPANIES.map((c) => ({ id: c.id, label: c.name })), []);
  const deptItems = useMemo<Item[]>(
    () => departmentsOf(Number(companyId)).map((d) => ({ id: d.id, label: d.name })),
    [companyId]
  );
  const branchItems = useMemo<Item[]>(
    () =>
      branchesOf(Number(companyId)).map((b) => ({
        id: b.id,
        label: branchFullLabel(b),
        sub: [branchProvince(b), branchRegion(b)].filter(Boolean).join(" · "),
      })),
    [companyId]
  );

  // ถามสำนักงานใหญ่/หน้าร้าน เฉพาะบริษัทที่มีทั้งแผนกและสาขา
  const askType = deptItems.length > 0 && branchItems.length > 0;
  const place: Place | "" = askType ? workplace : deptItems.length > 0 ? "hq" : branchItems.length > 0 ? "store" : "";
  const flow = askType ? [0, 1, 2, 3, 4, 5] : [0, 1, 3, 4, 5];
  const stepLabel = (id: number) => (id === 3 && place === "store" ? "สาขา" : STEP_LABELS[id]);
  const pos = Math.max(0, flow.indexOf(step));

  const visibleDepts = useMemo(() => searchItems(deptQuery, deptItems), [deptQuery, deptItems]);
  const visibleBranches = useMemo(() => searchItems(branchQuery, branchItems), [branchQuery, branchItems]);
  const branchCap = branchQuery.trim() ? undefined : branchLimit;
  const shownBranches = useMemo(() => visibleBranches.slice(0, branchCap), [visibleBranches, branchCap]);

  const selectedCompany = useMemo(() => getCompany(Number(companyId)), [companyId]);
  const selectedDept = useMemo(() => DEPARTMENTS.find((d) => String(d.id) === departmentId) ?? null, [departmentId]);
  const selectedBranch = useMemo(() => (branchId ? getBranch(Number(branchId)) : null), [branchId]);

  // เลื่อนรายการให้เห็นแถวที่ไฮไลต์
  useEffect(() => {
    if (step !== 3 || hi < 0) return;
    const box = listRef.current;
    const el = box?.querySelector<HTMLElement>('[data-hi="true"]');
    if (!box || !el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
  }, [hi, step]);

  const clearErr = (key: string) => setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
  const edit = (key: string, set: (v: string) => void) => (v: string) => {
    set(v);
    clearErr(key);
  };

  /* ---------- เลือกบริษัท / ที่ทำงาน / แผนก / สาขา ---------- */

  const pickCompany = (id: number) => {
    if (String(id) !== companyId) {
      setCompanyId(String(id));
      setWorkplace("");
      setDepartmentId("");
      setBranchId("");
      setDeptQuery("");
      setBranchQuery("");
      setBranchLimit(BRANCH_PREVIEW);
    }
    clearErr("companyId");
  };

  const pickPlace = (p: Place) => {
    setWorkplace(p);
    if (p === "hq") {
      setBranchId("");
      setBranchQuery("");
      setBranchLimit(BRANCH_PREVIEW);
    } else {
      setDepartmentId("");
      setDeptQuery("");
    }
    clearErr("form");
  };

  const pickDept = (id: number) => {
    setDepartmentId(String(id));
    clearErr("departmentId");
  };
  const pickBranch = (id: number) => {
    setBranchId(String(id));
    clearErr("branchId");
  };

  const onDeptQuery = (v: string) => {
    setDeptQuery(v);
    setHi(v.trim() ? 0 : -1);
    clearErr("departmentId");
  };
  const onBranchQuery = (v: string) => {
    setBranchQuery(v);
    setBranchLimit(BRANCH_PREVIEW);
    setHi(v.trim() ? 0 : -1);
    clearErr("branchId");
  };

  // ลูกศรขึ้น/ลง เลื่อนรายการ, Enter (ตอนมีคำค้น) เลือกแถวที่ไฮไลต์
  const onListKey =
    (list: Item[], query: string, selectedId: string, pick: (id: number) => void) =>
    (e: KeyboardEvent<HTMLDivElement>) => {
      const n = list.length;
      if (n === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((i) => (i + 1) % n);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((i) => (i <= 0 ? n - 1 : i - 1));
      } else if (e.key === "Enter" && query.trim()) {
        const it = list[Math.min(Math.max(hi, 0), n - 1)];
        if (it && String(it.id) !== selectedId) {
          e.preventDefault();
          pick(it.id);
        }
      }
    };

  /* ---------- รูปโปรไฟล์ ---------- */

  const applyAvatar = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, form: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB" }));
      return;
    }
    setAvatarFile(file);
    setAvatarPreset("");
    setAvatarPreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, form: undefined }));
  };

  /* ---------- ตรวจทีละขั้น ---------- */

  const validate = (s: number): Errors => {
    const err: Errors = {};
    if (s === 0) {
      if (!nickname.trim()) err.nickname = "กรอกชื่อเล่น";
    } else if (s === 1) {
      if (!companyId) err.companyId = "เลือกบริษัทของคุณ";
    } else if (s === 2) {
      if (askType && !place) err.form = "เลือกว่าคุณอยู่สำนักงานใหญ่หรือหน้าร้าน";
    } else if (s === 3) {
      if (place === "hq" && !departmentId) err.departmentId = "เลือกแผนกของคุณจากรายการ";
      if (place === "store" && !branchId) err.branchId = "เลือกสาขาของคุณจากรายการ";
    } else if (s === 4) {
      const uname = username.trim();
      if (!uname) err.username = "กรอก username";
      else if (!USERNAME_RE.test(uname)) err.username = "3-20 ตัว ใช้ a-z 0-9 และ _ เท่านั้น";
      const eid = employeeId.trim();
      if (!eid) err.employeeId = "กรอกรหัสพนักงาน";
      else if (!EMPLOYEE_ID_RE.test(eid)) err.employeeId = "3-20 ตัว ใช้ a-z 0-9 เท่านั้น";
      if (!password) err.password = "กรอกรหัสผ่าน";
      else if (password.length < 6) err.password = "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
      if (!err.password && confirm !== password) err.confirm = "รหัสผ่านไม่ตรงกัน";
    }
    return err;
  };

  /* ---------- ส่งฟอร์ม ---------- */

  async function doLogin() {
    const errs: Errors = {};
    if (!lgUser.trim()) errs.username = "กรอก username";
    if (!lgPass) errs.password = "กรอกรหัสผ่าน";
    if (Object.keys(errs).length) return setErrors(errs);

    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: lgUser.trim(), password: lgPass }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: ApiUser;
        errors?: Errors;
        error?: string;
      };
      if (!res.ok || !data.user) {
        if (data.errors) setErrors(data.errors);
        else setErrors({ form: data.error ?? "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง" });
        return;
      }
      saveProfile(data.user);
      router.push("/");
    } catch {
      setErrors({ form: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    if (busy) return;
    // ตรวจทุกขั้นก่อนส่ง (ขั้นรูปไม่บังคับ)
    for (const s of [0, 1, 2, 3, 4]) {
      const err = validate(s);
      if (Object.keys(err).length > 0) {
        setErrors(err);
        setStep(s);
        return;
      }
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("nickname", nickname.trim());
      fd.append("username", username.trim());
      fd.append("employeeId", employeeId.trim());
      fd.append("companyId", companyId);
      // สำนักงานใหญ่ส่งแค่แผนก / หน้าร้านส่งแค่สาขา
      if (place === "hq" && departmentId) fd.append("departmentId", departmentId);
      if (place === "store" && branchId) fd.append("branchId", branchId);
      fd.append("password", password);
      if (avatarFile) fd.append("avatar", avatarFile);
      else if (avatarPreset) fd.append("avatarPreset", avatarPreset);

      const res = await fetch("/api/auth/register", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        user?: ApiUser;
        errors?: Errors;
        error?: string;
      };
      if (!res.ok || !data.user) {
        if (data.errors) {
          setErrors(data.errors);
          const s = stepOfErrors(data.errors);
          if (s !== null) setStep(s);
        } else {
          setErrors({ form: data.error ?? "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
        }
        return;
      }
      setUser(data.user);
      saveProfile(data.user);
      setStep(WELCOME);
    } catch {
      setErrors({ form: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "in") return void doLogin();

    const err = validate(step);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }
    setErrors({});
    if (step < LAST_STEP) {
      let n = step + 1;
      if (n === 2 && !askType) n = 3;
      setStep(n);
    } else void register();
  };

  const back = () => {
    if (busy || step === 0) return;
    setErrors({});
    let p = step - 1;
    if (p === 2 && !askType) p = 1;
    setStep(p);
  };

  const goTo = (i: number) => {
    if (busy || i >= step) return;
    setErrors({});
    setStep(i);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  /* ---------- หัวข้อของแต่ละขั้น ---------- */

  const heading = [
    { t: "ชื่อเล่นของคุณคืออะไร", s: "ชื่อนี้จะแสดงบนอันดับให้คนอื่นเห็น" },
    { t: "คุณอยู่บริษัทไหน", s: "เลือกบริษัทของคุณ" },
    { t: "คุณทำงานที่ไหน", s: "เลือกสำนักงานใหญ่ หรือหน้าร้าน" },
    place === "store"
      ? { t: "คุณประจำสาขาไหน", s: "เลือกจากรายการ หรือพิมพ์ค้นหาเลข ID / ชื่อสาขา / จังหวัด" }
      : {
          t: "คุณอยู่แผนกไหน",
          s: selectedCompany ? `แผนกใน ${selectedCompany.name} เลือกจากรายการ หรือพิมพ์ค้นหา` : "เลือกจากรายการ หรือพิมพ์ค้นหา",
        },
    { t: "ตั้งค่าบัญชี", s: "ใช้ username และรหัสผ่านนี้เข้าสู่ระบบ" },
    { t: "เลือกรูปโปรไฟล์", s: "ถ่ายรูปหรืออัปโหลดรูปของคุณ หรือเลือกรูปที่มีให้ หรือข้ามไปก่อนก็ได้" },
  ][Math.min(step, LAST_STEP)];

  /* ================================================================ */
  /*  หน้า welcome                                                     */
  /* ================================================================ */

  if (step === WELCOME && user) {
    const avatarSrc = avatarPreview ?? (avatarPreset ? `/img/${avatarPreset}.png` : user.avatarUrl || null);
    const branchName = selectedBranch ? branchLabel(selectedBranch) : null;
    const branchInfo = selectedBranch
      ? [branchCode(selectedBranch) ? `ID ${branchCode(selectedBranch)}` : null, branchProvince(selectedBranch)].filter(Boolean).join(" · ")
      : null;
    const mainTitle = selectedDept?.name ?? branchName ?? selectedCompany?.name ?? "";

    return (
      <div className={`${pageShell} flex items-center justify-center p-3 sm:p-4 md:p-6`}>
        <style>{STYLES}</style>
        <BackdropText />
        <ConfettiLayer bursts={bursts} />
        <div
          className="fx-rise relative w-full max-w-xl overflow-hidden border border-[#17FFA2]/40 p-8 sm:p-12"
          style={{ background: "radial-gradient(circle at 100% 0%, rgba(23,255,162,0.28), transparent 55%), linear-gradient(160deg, #0f1c1a, #05080a 85%)" }}
        >
          <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-4 select-none text-[14rem] font-bold leading-none text-black/30">▦</span>
          <div className="relative flex flex-col items-start">
            <div className="rounded-full ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)]">
              <Avatar name={user.name} src={avatarSrc} size={112} />
            </div>
            <span className="mt-8 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="mt-5 break-words text-3xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-4xl">
              ยินดีต้อนรับ {user.name}
            </h1>
            {selectedCompany && <p className="mt-3 text-sm font-semibold text-[#17FFA2]">{selectedCompany.name}</p>}
            {mainTitle && <p className="mt-1 break-words text-lg font-semibold">{mainTitle}</p>}
            {!selectedDept && branchInfo && <p className={`mt-1 text-sm ${MUTED}`}>{branchInfo}</p>}
            <p className={`mt-4 max-w-sm text-base leading-7 ${MUTED}`}>
              บัญชีพร้อมแล้ว ลองเล่นเกมแรกเพื่อเริ่มสะสมแต้ม แล้วดูว่าคุณอยู่อันดับไหน
            </p>
            <Btn onClick={() => router.push("/")} className="mt-8 h-14 w-full sm:w-56">
              เริ่มเล่นเลย
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  ฟอร์ม                                                            */
  /* ================================================================ */

  const noItemsCls = "mt-4 border border-white/15 bg-black/40 px-4 py-5 text-center text-sm text-[#8fa6a1]";

  return (
    <div className={`${pageShell} flex items-center justify-center p-3 sm:p-4 md:p-6`}>
      <style>{STYLES}</style>
      <BackdropText />
      <div className="fx-rise grid w-full max-w-5xl overflow-hidden border border-[#17FFA2]/40 md:h-[min(780px,calc(100dvh-3rem))] md:grid-cols-[5fr_6fr]">
        {/* ===== ฝั่งซ้าย: แบรนด์ ===== */}
        <aside
          className="relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8 md:gap-12 md:p-10"
          style={{ background: "radial-gradient(circle at 100% 0%, rgba(23,255,162,0.28), transparent 55%), linear-gradient(160deg, #0f1c1a, #05080a 85%)" }}
        >
          <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-4 select-none text-[14rem] font-bold leading-none text-black/30">▦</span>

          <Link href="/" aria-label="กลับหน้าแรก" className="relative flex w-fit items-center">
            <Image src="/img/com7logo.png" alt="COM7" width={240} height={72} priority className="h-12 w-auto sm:h-14 md:h-16" />
          </Link>
          <div className="relative">
            <span className="mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-4xl font-bold uppercase leading-[1.05] tracking-tight [text-shadow:0_0_30px_rgba(23,255,162,0.35)] sm:text-5xl md:text-6xl">
              7 Days
              <br />
              7 Games
            </h1>
            <p className={`mt-3 max-w-xs text-sm leading-6 md:mt-5 md:text-base md:leading-7 ${MUTED}`}>
              สมัครครั้งเดียว เล่นได้ทุกเกม แต้มของคุณจะถูกบันทึกและขึ้นอันดับอัตโนมัติ
            </p>
          </div>
          <div className="relative hidden gap-2 md:flex" aria-hidden>
            {["#17FFA2", "#ff2a55", "#F4D35E", "#FFFFFF"].map((c, i) => (
              <span key={i} style={{ backgroundColor: c }} className="h-10 w-10 -skew-x-12" />
            ))}
          </div>
        </aside>

        {/* ===== ฝั่งขวา: ฟอร์ม ===== */}
        <main className="flex min-h-0 flex-col bg-[#0a1014]/95 p-6 backdrop-blur-sm sm:p-8 md:p-10">
          {/* แท็บ */}
          <div role="tablist" className="flex w-fit shrink-0 gap-2">
            {(
              [
                ["in", "เข้าสู่ระบบ"],
                ["up", "สมัครเข้าร่วม"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`btn-fx relative min-h-[44px] overflow-hidden px-5 py-2.5 text-xs font-bold uppercase tracking-wider outline-none transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 ${
                  mode === m
                    ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)]"
                    : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a]"
                }`}
              >
                <span className="btn-shine" aria-hidden="true" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-6 flex min-h-0 flex-1 flex-col">
            {/* ---------------- LOGIN ---------------- */}
            {mode === "in" && (
              <div className="flex flex-1 flex-col justify-center">
                <h2 className="text-3xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)]">ยินดีต้อนรับกลับ</h2>
                <p className={`mt-2 text-sm ${MUTED}`}>เข้าสู่ระบบเพื่อเล่นต่อและดูอันดับของคุณ</p>

                <div className="mt-8 flex flex-col gap-4">
                  <Field
                    label="Username"
                    value={lgUser}
                    onChange={edit("username", setLgUser)}
                    autoComplete="username"
                    placeholder="username ที่ตั้งตอนสมัคร"
                    error={errors.username}
                    autoFocus
                  />
                  <Field
                    label="รหัสผ่าน"
                    value={lgPass}
                    onChange={edit("password", setLgPass)}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="รหัสผ่าน"
                    error={errors.password}
                    trailing={<ShowBtn show={show} onToggle={() => setShow((v) => !v)} />}
                  />
                </div>

                {errors.form && (
                  <p role="alert" style={{ borderColor: RED }} className="mt-4 border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
                    {errors.form}
                  </p>
                )}

                <Btn type="submit" disabled={busy} className="mt-6 h-14 w-full">
                  {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Btn>

                <p className={`mt-6 text-sm ${MUTED}`}>
                  ยังไม่มีบัญชี{" "}
                  <button type="button" onClick={() => switchMode("up")} className="font-bold text-[#17FFA2] underline underline-offset-4 transition-colors hover:text-[#6dffc6]">
                    สมัครเข้าร่วม
                  </button>
                </p>
              </div>
            )}

            {/* ---------------- REGISTER ---------------- */}
            {mode === "up" && (
              <>
                {/* ตัวบอกขั้นตอน (แตะขั้นที่ผ่านแล้วเพื่อย้อนกลับ) */}
                <ol className="flex shrink-0 items-start" aria-label="ขั้นตอนการสมัคร">
                  {flow.map((id, p) => {
                    const label = stepLabel(id);
                    const done = p < pos;
                    const cur = p === pos;
                    const circle = done
                      ? "bg-[#17FFA2] text-[#04110a]"
                      : cur
                        ? "bg-[#17FFA2] text-[#04110a] ring-4 ring-[#17FFA2]/30 shadow-[0_0_18px_rgba(23,255,162,0.5)]"
                        : "border border-white/25 text-white/50";
                    const circleCls = `relative z-10 flex h-9 w-9 items-center justify-center -skew-x-6 text-sm font-bold tabular-nums transition-all duration-300 ${circle}`;
                    const inner = done ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    ) : (
                      p + 1
                    );
                    return (
                      <li key={id} className="relative flex flex-1 flex-col items-center" aria-current={cur ? "step" : undefined}>
                        {p < flow.length - 1 && (
                          <span
                            aria-hidden
                            className={`absolute left-[calc(50%+22px)] top-[17px] h-0.5 w-[calc(100%-44px)] transition-colors duration-300 ${done ? "bg-[#17FFA2]" : "bg-white/15"}`}
                          />
                        )}
                        {done ? (
                          <button
                            type="button"
                            onClick={() => goTo(id)}
                            disabled={busy}
                            aria-label={`ย้อนกลับไปขั้นที่ ${p + 1}: ${label}`}
                            className={`${circleCls} active:scale-90`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <span className={circleCls}>{inner}</span>
                        )}
                        <span className={`mt-1.5 px-0.5 text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${cur ? "text-white" : done ? "text-white/80" : "text-white/40"}`}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {/* เนื้อหาของขั้น: เลื่อนในกรอบนี้ ปุ่มล่างอยู่ในจอเสมอ */}
                <div className="scroll-neon -mx-1 mt-5 min-h-0 flex-1 overflow-y-auto px-1 pb-2">
                  <h2 className="text-2xl font-bold tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-3xl">{heading.t}</h2>
                  <p className={`mt-1 text-sm ${MUTED}`}>{heading.s}</p>

                  {/* ขั้น 0: ชื่อเล่น */}
                  {step === 0 && (
                    <div className="mt-6">
                      <Field
                        label="ชื่อเล่น"
                        value={nickname}
                        onChange={edit("nickname", setNickname)}
                        maxLength={20}
                        autoComplete="nickname"
                        placeholder="เช่น มะนาว"
                        error={errors.nickname}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* ขั้น 1: บริษัท */}
                  {step === 1 && (
                    <div className="mt-2">
                      <PickList label="รายการบริษัท" items={companyItems} selectedId={companyId} hi={-1} onHover={() => {}} onPick={pickCompany} />
                      {errors.companyId && (
                        <p role="alert" className="mt-2 text-[13px] text-[#ff7b94]">
                          {errors.companyId}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ขั้น 2: สำนักงานใหญ่ / หน้าร้าน */}
                  {step === 2 && (
                    <div role="radiogroup" aria-label="ที่ทำงาน" className="mt-6 grid gap-3">
                      {(
                        [
                          ["hq", "สำนักงานใหญ่", "ทำงานที่ออฟฟิศ เลือกแผนกของคุณ"],
                          ["store", "หน้าร้าน", "ประจำที่สาขา เลือกสาขาของคุณ"],
                        ] as const
                      ).map(([k, title, sub]) => {
                        const sel = place === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={sel}
                            onClick={() => pickPlace(k)}
                            className={`flex min-h-[72px] w-full items-center justify-between gap-3 border px-5 py-4 text-left transition-all active:scale-[0.99] ${
                              sel
                                ? "border-[#17FFA2] bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)]"
                                : "border-white/15 bg-black/40 hover:border-[#17FFA2]/60"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-lg font-bold">{title}</span>
                              <span className={`block text-[13px] ${sel ? "text-[#04110a]/70" : MUTED}`}>{sub}</span>
                            </span>
                            {sel && (
                              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M5 12l5 5 9-10" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ขั้น 3: แผนก (สำนักงานใหญ่) */}
                  {step === 3 && place === "hq" && (
                    <div className="mt-4" onKeyDown={onListKey(visibleDepts, deptQuery, departmentId, pickDept)}>
                      <Field
                        label="ค้นหาแผนก"
                        value={deptQuery}
                        onChange={onDeptQuery}
                        placeholder="พิมพ์ชื่อแผนก (ถ้าหาไม่เจอในรายการ)"
                        autoComplete="off"
                        error={errors.departmentId}
                      />
                      <PickList label="รายการแผนก" items={visibleDepts} selectedId={departmentId} hi={hi} onHover={setHi} onPick={pickDept} listRef={listRef} />
                    </div>
                  )}

                  {/* ขั้น 3: สาขา (หน้าร้าน) */}
                  {step === 3 && place === "store" && (
                    <div className="mt-4" onKeyDown={onListKey(shownBranches, branchQuery, branchId, pickBranch)}>
                      <Field
                        label="ค้นหาสาขา"
                        value={branchQuery}
                        onChange={onBranchQuery}
                        placeholder="พิมพ์เลข ID, ชื่อสาขา หรือจังหวัด"
                        autoComplete="off"
                        error={errors.branchId}
                      />
                      <PickList
                        label="รายการสาขา"
                        items={visibleBranches}
                        selectedId={branchId}
                        hi={hi}
                        onHover={setHi}
                        onPick={pickBranch}
                        listRef={listRef}
                        limit={branchCap}
                      />
                      {branchCap !== undefined && visibleBranches.length > branchCap && (
                        <button
                          type="button"
                          onClick={() => setBranchLimit((n) => n + BRANCH_STEP)}
                          className="mt-2 flex h-11 w-full items-center justify-center border border-white/20 text-sm font-semibold text-white/90 transition-colors hover:border-[#17FFA2] hover:text-[#17FFA2] active:scale-95"
                        >
                          ดูเพิ่มอีก {Math.min(BRANCH_STEP, visibleBranches.length - branchCap)} สาขา (เหลือ {visibleBranches.length - branchCap})
                        </button>
                      )}
                    </div>
                  )}

                  {/* ขั้น 3: บริษัทที่ไม่มีทั้งแผนกและสาขา */}
                  {step === 3 && place === "" && <p className={noItemsCls}>บริษัทนี้ยังไม่มีรายการแผนกหรือสาขา กด ถัดไป ได้เลย</p>}

                  {/* ขั้น 4: username / รหัสพนักงาน / รหัสผ่าน */}
                  {step === 4 && (
                    <div className="mt-6 space-y-4">
                      <Field
                        label="Username"
                        value={username}
                        onChange={edit("username", setUsername)}
                        maxLength={20}
                        autoComplete="username"
                        placeholder="เช่น manao_99"
                        error={errors.username}
                        hint="3-20 ตัว ใช้ a-z 0-9 และ _ (ใช้ตอนเข้าสู่ระบบ)"
                        autoFocus
                      />
                      <Field
                        label="รหัสพนักงาน"
                        value={employeeId}
                        onChange={edit("employeeId", setEmployeeId)}
                        maxLength={20}
                        autoComplete="off"
                        placeholder="เช่น A12345"
                        error={errors.employeeId}
                        hint="3-20 ตัว ใช้ a-z 0-9"
                      />
                      <Field
                        label="รหัสผ่าน"
                        value={password}
                        onChange={edit("password", setPassword)}
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        error={errors.password}
                        trailing={<ShowBtn show={show} onToggle={() => setShow((v) => !v)} />}
                      />
                      <Field
                        label="ยืนยันรหัสผ่าน"
                        value={confirm}
                        onChange={edit("confirm", setConfirm)}
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                        error={errors.confirm}
                      />
                    </div>
                  )}

                  {/* ขั้น 5: รูปโปรไฟล์ (ข้ามได้) อัปโหลด/ถ่ายรูปเอง หรือเลือกรูปที่มีให้ */}
                  {step === 5 && (
                    <div className="mt-6 flex flex-col items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          applyAvatar(f);
                          e.target.value = "";
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="เลือกรูปโปรไฟล์"
                        className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#17FFA2]/50 bg-black/40 transition-all hover:border-[#17FFA2] hover:shadow-[0_0_24px_rgba(23,255,162,0.35)] active:scale-95"
                      >
                        {avatarPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarPreview} alt="ตัวอย่างรูปโปรไฟล์" className="h-full w-full object-cover" />
                        ) : avatarPreset ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/img/${avatarPreset}.png`} alt="ตัวอย่างรูปโปรไฟล์" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-[13px] text-[#8fa6a1] group-hover:text-[#17FFA2]">
                            <svg className="mb-1 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>อัปโหลดรูป</span>
                          </div>
                        )}
                      </button>
                      <div className="mt-4 flex items-center gap-3">
                        {canCam && (
                          <Btn onClick={() => setCamOpen(true)} className="h-11 px-5">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                              <circle cx="12" cy="13" r="3.5" />
                            </svg>
                            {avatarFile ? "ถ่ายใหม่" : "ถ่ายรูป"}
                          </Btn>
                        )}
                        <Btn variant="outline" onClick={() => fileInputRef.current?.click()} className="h-11 px-5">
                          {avatarFile ? "เลือกรูปใหม่" : "เลือกรูปจากเครื่อง"}
                        </Btn>
                      </div>
                      <span className={`mt-3 text-xs ${MUTED}`}>ไฟล์ไม่เกิน 5MB</span>

                      <div className="mt-8 w-full">
                        <p className={`mb-3 text-center text-sm ${MUTED}`}>หรือเลือกรูปที่มีให้</p>
                        <div
                          role="radiogroup"
                          aria-label="รูปที่มีให้"
                          className="scroll-neon grid max-h-56 grid-cols-5 gap-3 overflow-y-auto border border-white/15 bg-black/40 p-3 sm:grid-cols-6"
                        >
                          {PRESET_IDS.map((id) => {
                            const on = !avatarFile && avatarPreset === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                aria-label={`รูปโปรไฟล์ ${id}`}
                                onClick={() => {
                                  setAvatarPreset(id);
                                  setAvatarFile(null);
                                  setAvatarPreview(null);
                                  clearErr("form");
                                }}
                                className={`rounded-full outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-[#17FFA2] ${
                                  on
                                    ? "scale-105 ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-[#0a1014] shadow-[0_0_24px_rgba(23,255,162,0.6)]"
                                    : "opacity-70 hover:scale-105 hover:opacity-100"
                                }`}
                              >
                                <PresetImg id={id} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.form && (
                    <p role="alert" style={{ borderColor: RED }} className="mt-4 border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
                      {errors.form}
                    </p>
                  )}
                </div>

                {/* ปุ่มล่าง */}
                <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3">
                    {step > 0 && (
                      <Btn variant="outline" onClick={back} disabled={busy} className="h-14 shrink-0">
                        ย้อนกลับ
                      </Btn>
                    )}
                    <Btn type="submit" disabled={busy} className="h-14 flex-1">
                      {busy ? "กำลังสร้างบัญชี..." : step < LAST_STEP ? "ถัดไป" : avatarFile || avatarPreset ? "สร้างบัญชี" : "ข้ามและสร้างบัญชี"}
                    </Btn>
                  </div>
                  {step === 0 && (
                    <p className={`mt-4 text-center text-sm ${MUTED}`}>
                      มีบัญชีอยู่แล้ว{" "}
                      <button type="button" onClick={() => switchMode("in")} className="font-bold text-[#17FFA2] underline underline-offset-4 transition-colors hover:text-[#6dffc6]">
                        เข้าสู่ระบบ
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </form>
        </main>
      </div>

      {camOpen && (
        <CameraCapture
          onClose={() => setCamOpen(false)}
          onCapture={(f) => {
            applyAvatar(f);
            setCamOpen(false);
          }}
        />
      )}
    </div>
  );
}