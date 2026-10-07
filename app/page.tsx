"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import EventsCarousel, {
  Badge,
  CloseButton,
  EVENTS,
  EventDetail,
  HEART_PATH,
  useOverlay,
} from "./components/events/page";
import FavoritesSheet, { type Game } from "./components/favorites/page";
import Navbar, { getAvatarSrc, type Profile } from "./components/navbar/page";

const GAMES: Game[] = [
  {
    id: "typing", name: "พิมพ์ไว", desc: "พิมพ์ข้อความภาษาอังกฤษให้เร็วและแม่นที่สุดก่อนหมดเวลา", category: "อาร์เคด", status: "NOW", time: "1 นาที", tone: "bg-[#F4D35E]", glyph: "Aa", href: "/game/typing", image: "/img/typing.jpg",
    scoring: "คำต่อนาที (WPM)",
    rules: ["พิมพ์คำที่ขึ้นบนเทปให้ตรงกับตัวอักษร แล้วเว้นวรรคเพื่อไปคำถัดไป", "เลือกเวลาได้ 30, 60 หรือ 120 วินาที เวลาจะเริ่มนับเมื่อพิมพ์ตัวอักษรแรก", "กด Tab เพื่อเริ่มใหม่ได้ทุกเมื่อ", "คะแนนคือ WPM โดยนับเฉพาะคำที่พิมพ์ถูก"],
  },
  {
    id: "thinkfast", name: "ตอบปัญหาเชาว์", desc: "คำถามกวนๆ ปั่นสมอง ฟังเผินๆ ง่าย แต่ตอบเร็วเมื่อไรก็โดนหลอก", category: "ตรรกะ", status: "NOW", time: "3 นาที", tone: "bg-[#F4A58A]", glyph: "∴", href: "/game/thinkfast",
    scoring: "แต้มสะสมจากข้อที่ตอบถูกและเวลาที่เหลือ",
    rules: ["สุ่มคำถามกวนๆ 10 ข้อ แต่ละข้อมี 4 ตัวเลือกและเวลา 20 วินาที", "ตอบถูกได้ 100 แต้ม บวกโบนัส 5 แต้มต่อทุกวินาทีที่เหลือ", "ตอบผิดหรือหมดเวลาไม่ได้แต้ม แต่จะเฉลยให้ทุกข้อ", "แต้มรวมของทั้ง 10 ข้อจะถูกบวกสะสมเข้าคะแนนรวมทุกครั้งที่เล่นจบ"],
  },
  {
    id: "kickbattle", name: "Kick Battle", desc: "ดวลจุดโทษสองคน เลือกมุมยิงหรือมุมรับ อ่านใจคู่แข่งให้ขาด", category: "อาร์เคด", status: "NOW", time: "5 นาที", tone: "bg-[#9CC593]", glyph: "⚽", href: "/game/kickbattle", video: "/video/kickbattle/kickbattlepreview.mp4",
    scoring: "100 แต้มต่อการยิงเข้าหรือเซฟ บวกโบนัสผู้ชนะ 200 แต้ม",
    rules: ["คนแรกสร้างห้องแล้วส่งรหัสห้องให้เพื่อน คนที่สองกดเข้าร่วมด้วยรหัสนั้น", "ระบบสุ่มว่าใครได้ยิงก่อน ใครได้เฝ้าประตู แล้วสลับบทบาทกันทุกลูก", "ผู้ยิงและผู้รับเลือกซ้าย กลาง หรือขวาพร้อมกัน ถ้าตรงกันผู้รับเซฟและได้ 100 แต้ม ถ้าไม่ตรงผู้ยิงได้ 100 แต้ม", "เล่น 6 ลูก (ยิงคนละ 3 ลูก) ใครแต้มสูงกว่าชนะ ถ้าเสมอต่อเวลาอีกสูงสุด 3 ลูก ใครได้ 2 แต้มก่อนชนะ ผู้ชนะรับโบนัสเพิ่ม 200 แต้ม และแต้มทั้งหมดจะถูกบวกสะสมเข้าคะแนนรวม"],
  },
  {
    id: "basketball", name: "Basketball", desc: "ปัดลูกบาสให้เข้าห่วงใน 1 นาที ยิงเข้าติดกันคะแนนคูณ ลูกบาสติดไฟ!", category: "อาร์เคด", status: "NOW", time: "1 นาที", tone: "bg-[#F2B27A]", glyph: "🏀", href: "/game/basketball", video: "/video/basketball/previewbasketball.mp4",
    scoring: "10 แต้มต่อลูก คูณตามจำนวนลูกที่เข้าติดกัน (สูงสุด ×10)",
    rules: ["ลากลูกบาสแล้วปัดขึ้นไปทางห่วง ยิ่งปัดแรงลูกยิ่งลอยสูง", "เวลา 60 วินาที เริ่มนับถอยหลังหลังขึ้นคำว่า GO!!!", "ลูกเข้าได้ 10 แต้ม ถ้าเข้าติดกันจะคูณ ×2, ×3 ... สูงสุด ×10 พลาดแล้วคอมโบหลุด", "เข้าติดกัน 3 ลูกขึ้นไป ลูกบาสจะติดไฟ และแต้มทั้งหมดจะถูกบวกสะสมเข้าคะแนนรวม"],
  },
  {
    id: "memorymatch", name: "จับคู่ความจำ", desc: "จำตำแหน่งการ์ดให้แม่น จับคู่ให้ติดกันเพื่อคูณคะแนน แล้วผ่านด่านให้ไกลที่สุดก่อนหมดเวลา", category: "ความจำ", status: "NOW", time: "1 นาที", tone: "bg-[#A8B5E8]", glyph: "▦", href: "/game/memorymatch", video: "/video/memorymatch/memorymatch.mp4",
    scoring: "20 แต้มต่อคู่ × คอมโบติดกัน (สูงสุด ×5) บวกโบนัสผ่านด่านและ Perfect",
    rules: ["ทุกด่านจะเปิดการ์ดให้ดูสั้นๆ จำตำแหน่งให้แม่น แล้วการ์ดจะคว่ำลง (กด \"พร้อมแล้ว\" เพื่อข้ามได้) เวลาจะเดินเมื่อการ์ดคว่ำ", "แตะการ์ดทีละ 2 ใบ ถ้าเหมือนกันถือว่าจับคู่ได้ ถ้าไม่เหมือนจะคว่ำกลับ เสียเวลา 2 วินาทีและคอมโบหลุด", "จับคู่ได้คู่ละ 20 แต้ม จับติดกันจะคูณ ×2, ×3 ... สูงสุด ×5 ผ่านด่านได้โบนัสแต้มและเวลาเพิ่ม 6 วินาที ถ้าไม่พลาดเลยในด่านนั้นได้โบนัส PERFECT เพิ่ม", "เวลาเริ่มต้น 60 วินาที ยิ่งผ่านด่านไกล การ์ดยิ่งเยอะ (8 → 24 ใบ) และแต้มทั้งหมดจะถูกบวกสะสมเข้าคะแนนรวมทุกครั้งที่เล่นจบ"],
  },
  {
    id: "words", name: "ไล่หาคำ", desc: "หาคำศัพท์ที่ซ่อนในตารางตัวอักษรให้ครบก่อนหมดเวลา", category: "ตรรกะ", status: "SOON", time: "4 นาที", tone: "", glyph: "Ａ",
    scoring: "จำนวนคำและเวลาที่เหลือ",
    rules: ["หาคำศัพท์ที่ซ่อนในตารางตัวอักษร ทั้งแนวตั้ง แนวนอน และแนวทแยง", "ลากเลือกตัวอักษรเพื่อยืนยันคำ", "ต้องหาให้ครบก่อนหมดเวลา", "คะแนนคิดจากจำนวนคำที่หาเจอและเวลาที่เหลือ"],
  },
  {
    id: "xo", name: "XO ท้าบอท", desc: "เกมคลาสสิกกับบอทที่เก่งขึ้นเรื่อยๆ", category: "ตรรกะ", status: "SOON", time: "1 นาที", tone: "", glyph: "✕",
    scoring: "จำนวนรอบที่ชนะติดต่อกัน",
    rules: ["ผลัดกันวาง X และ O บนตาราง 3×3 โดยคุณเป็นฝ่ายเริ่ม", "เรียงได้ 3 ช่องติดกันก่อนคือผู้ชนะ", "บอทจะเก่งขึ้นเรื่อยๆ เมื่อคุณชนะ", "คะแนนคิดจากจำนวนรอบที่ชนะติดต่อกัน"],
  },
];

const STEPS = [
  { title: "สมัครเข้าร่วม", desc: "ใช้อีเมลบริษัทและตั้งชื่อที่จะแสดงบนอันดับ" },
  { title: "เลือกเกมแล้วเล่น", desc: "เล่นคนเดียว แต่ละเกมจบภายในไม่กี่นาที" },
  { title: "สะสมแต้ม", desc: "ทุกรอบที่เล่นจบ แต้มจะถูกบวกสะสมเข้าคะแนนรวมของคุณ" },
  { title: "ประกาศผู้ชนะ", desc: "เมื่อกิจกรรมสิ้นสุด ผู้ที่แต้มสูงสุดคือผู้ชนะ" },
];

const CATEGORIES = ["ทั้งหมด", "ความจำ", "ตรรกะ", "อาร์เคด"];

const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

// สีแท่นอันดับ 1-3 (เหมือนหน้า /rank) และจำนวนอันดับที่โชว์ในหน้าหลัก
const TONE = ["#17FFA2", "#0FD98A", "#0AB373"];
const INK = ["#00301B", "#00301B", "#00301B"];
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];
const RANK_LIMIT = 5;
const COUNT_MS = 2000; // เวลาที่เลขคะแนนอันดับ 1 วิ่ง

// ปกเกมในส่วน "เกมทั้งหมด" (เกมที่ไม่มีปกจะใช้พื้นไล่สี + ไอคอนเหมือนเดิม)
const COVERS: Record<string, string> = {
  typing: "/img/typinglogo.jpg",
  thinkfast: "/img/matchlogo.jpg",
  kickbattle: "/img/kickbattlelogo.jpg",
  basketball: "/img/basketballlogo.jpg",
  memorymatch: "/img/memorymatchlogo.jpg",
};

const toneHex = (g: Game) => g.tone.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#52525B";

const savedGamesKey = (uid?: string | null) => `savedGames:${uid || "guest"}`;
function writeSavedGames(uid: string | null | undefined, ids: string[]) {
  try {
    localStorage.setItem(savedGamesKey(uid), JSON.stringify(ids));
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  EFFECT HELPERS                                                     */
/* ------------------------------------------------------------------ */

type RevealVariant = "up" | "left" | "right" | "zoom";

function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${shown ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(to);
      return;
    }
    let raf = 0;
    let started = false;
    const run = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setVal(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return <span ref={ref}>{Math.round(val)}</span>;
}

/* ------------------------------------------------------------------ */
/*  BUTTONS (เอียงแบบ esport)                                          */
/* ------------------------------------------------------------------ */

type BtnVariant = "solid" | "outline" | "dark";

function btnClasses(variant: BtnVariant = "solid", small = false, fullWidth = false) {
  const base =
    "btn-fx relative inline-flex items-center justify-center overflow-hidden font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";
  const size = small ? "min-h-[44px] px-5 py-2.5 text-xs" : "min-h-[44px] px-7 py-3.5 text-xs";
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : variant === "dark"
      ? "bg-[#05080a] text-[#17FFA2] hover:bg-black"
      : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] hover:shadow-[0_0_18px_rgba(23,255,162,0.3)]";
  return `${base} ${size} ${styles} ${fullWidth ? "w-full" : ""}`;
}

function BtnInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-block">{children}</span>
    </>
  );
}

function Button({
  children,
  href,
  onClick,
  variant = "solid",
  small = false,
  fullWidth = false,
  disabled = false,
  pressed,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: BtnVariant;
  small?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  pressed?: boolean;
}) {
  const cls = btnClasses(variant, small, fullWidth);
  if (href && !disabled) {
    if (href.startsWith("#")) {
      return (
        <a href={href} className={cls}>
          <BtnInner>{children}</BtnInner>
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        <BtnInner>{children}</BtnInner>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed} className={cls}>
      <BtnInner>{children}</BtnInner>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SMALL PIECES                                                       */
/* ------------------------------------------------------------------ */

function SectionHead({ title, intro, action }: { title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <Reveal className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <span className="bar-grow mb-5 block h-1.5 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
          <h2 className="text-3xl font-bold uppercase leading-tight text-white [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-4xl">
            {title}
          </h2>
          {intro && <p className={`mt-4 text-base ${MUTED}`}>{intro}</p>}
        </div>
        {action}
      </div>
    </Reveal>
  );
}

function HeartButton({ saved, onToggle, label, size = 44 }: { saved: boolean; onToggle: () => void; label: string; size?: number }) {
  return (
    <button
      type="button"
      aria-label={saved ? `เอา ${label} ออกจากรายการโปรด` : `บันทึก ${label} เป็นรายการโปรด`}
      aria-pressed={saved}
      onClick={(ev) => {
        ev.stopPropagation();
        onToggle();
      }}
      onKeyDown={(ev) => ev.stopPropagation()}
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center outline-none drop-shadow-[0_0_6px_rgba(0,0,0,0.7)] transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-[#17FFA2] active:scale-95"
    >
      <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill={saved ? RED : "none"} stroke={saved ? RED : "#cbd5d1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={HEART_PATH} />
      </svg>
    </button>
  );
}

/* ---------- ส่วนประกอบของอันดับ (เหมือนหน้า /rank) ---------- */

function RankAvatar({ id, size }: { id?: string; size: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const num = Number(id?.replace(/\D/g, "")) || 1;
    return (
      <span
        style={{ backgroundColor: FALLBACK_BG[(num - 1) % 4] }}
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-900 ${size}`}
      >
        {num}
      </span>
    );
  }

  return (
    <img
      src={getAvatarSrc(id)}
      alt=""
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${size}`}
    />
  );
}

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" aria-hidden className={`drop-shadow ${className}`}>
      <path d="M3 9l6 5 7-10 7 10 6-5-3 13H6L3 9z" fill="#F4D35E" stroke="#4A3B00" strokeWidth="1.5" strokeLinejoin="round" />
      {[[3, 9], [16, 4], [29, 9]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2" fill="#F4D35E" stroke="#4A3B00" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ตัวเลขวิ่งจาก 0 ไปหยุดที่ค่าจริง (เริ่มเมื่อ run = true) แล้วเรียก onDone ตอนหยุด
function useCountUp(target: number, run: boolean, ms: number, onDone: () => void) {
  const [v, setV] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!run) return;
    if (target <= 0) {
      setV(0);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 4)))); // เร็วก่อนแล้วค่อยๆ ช้าลงจนหยุด
      if (k < 1) raf = requestAnimationFrame(step);
      else doneRef.current();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);

  return v;
}

/* ------------------------------------------------------------------ */
/*  GAME DETAIL                                                        */
/* ------------------------------------------------------------------ */

function GameDetail({ game, saved, onToggleSave, onClose }: { game: Game | null; saved: boolean; onToggleSave: () => void; onClose: () => void }) {
  useOverlay(!!game, onClose);
  if (!game) return null;
  const soon = game.status === "SOON";
  const playable = !!game.href && !soon;
  const accent = soon ? "#71717A" : toneHex(game);
  const cover = COVERS[game.id];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      style={{
        background: `radial-gradient(circle at 85% 0%, ${accent}55, transparent 50%), linear-gradient(rgba(23,255,162,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,255,162,0.045) 1px, transparent 1px), #05080a`,
        backgroundSize: "auto, 56px 56px, 56px 56px, auto",
        animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)",
      }}
      className="fixed inset-0 z-[60] isolate overflow-y-auto text-white"
    >
      {/* พื้นหลังเป็นรูปปกเกม ไล่ความเข้มลงล่าง (ไม่เลื่อนตามเนื้อหา) */}
      {cover && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
          <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(5,8,10,0.25) 0%, rgba(5,8,10,0.55) 35%, rgba(5,8,10,0.9) 70%, #05080a 100%)",
            }}
          />
        </div>
      )}

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge status={game.status} dark />
            <span className={`text-sm ${MUTED}`}>{game.category} · {game.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <HeartButton saved={saved} onToggle={onToggleSave} label={game.name} size={48} />
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="mb-5 block h-1.5 w-16 -skew-x-12 shadow-[0_0_14px_currentColor]" style={{ backgroundColor: accent, color: accent }} />
            <h2 className="break-words text-5xl font-bold uppercase leading-[1.05] tracking-tight [text-shadow:0_0_30px_rgba(23,255,162,0.35)] md:text-7xl">{game.name}</h2>
            <p className={`mt-6 max-w-md text-lg leading-8 ${MUTED}`}>{game.desc}</p>
          </div>
          {game.video ? (
            <div className="relative min-h-72 overflow-hidden border border-[#17FFA2]/40 bg-zinc-900 shadow-[10px_10px_0_0_#ff2a55] lg:min-h-80">
              <video
                key={game.video}
                src={game.video}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={`ตัวอย่างเกม ${game.name}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : game.image ? (
            <div className="relative min-h-72 overflow-hidden border border-[#17FFA2]/40 bg-zinc-900 shadow-[10px_10px_0_0_#ff2a55] lg:min-h-80">
              <Image src={game.image} alt={game.name} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
            </div>
          ) : (
            <div
              className="relative flex min-h-72 items-center justify-center overflow-hidden border border-white/10 shadow-[10px_10px_0_0_#ff2a55]"
              style={{ background: `linear-gradient(160deg, ${accent}, #05080a 90%)` }}
            >
              <span className="select-none text-[10rem] font-bold leading-none text-black/40">{game.glyph}</span>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[["หมวดหมู่", game.category], ["เวลาต่อรอบ", game.time], ["การนับคะแนน", game.scoring]].map(([label, value]) => (
            <div key={label} className="border border-white/10 bg-[#0a1014] p-6">
              <p className={`text-sm ${MUTED}`}>{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-l-4 bg-[#0a1014] p-8" style={{ borderColor: accent }}>
          <h3 className="text-xl font-bold uppercase tracking-wide">กติกา</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {game.rules.map((r) => (
              <li key={r} className="flex gap-3 text-base leading-7 text-white/75">
                <span style={{ backgroundColor: accent }} className="mt-2.5 h-2.5 w-2.5 shrink-0 rotate-45" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#05080a] from-60% to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
        <div className="w-full max-w-sm">
          {playable ? (
            <Button href={game.href} fullWidth>เริ่มเล่น</Button>
          ) : (
            <Button disabled fullWidth variant="outline">{soon ? "เปิดเร็วๆ นี้" : "เกมกำลังเตรียมพร้อม"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STACKED TEXT BACKGROUND (จางๆ อยู่หลังทั้งหน้า วิ่งช้าๆ ตลอดเวลา)    */
/* ------------------------------------------------------------------ */

const STACK_WORD = "PLAY";
const STACK_SOLID = "7 DAYS 7 GAMES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
// ยิ่งตัวเลขมาก ยิ่งวิ่งช้า (วินาทีต่อหนึ่งรอบ)
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex select-none flex-col justify-center overflow-hidden"
    >
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "txt-bg-outline opacity-50" : "txt-bg-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`bg-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
              style={{
                animationDuration: `${STACK_SECONDS[kind]}s`,
                animationDirection: reverse ? "reverse" : "normal",
              }}
            >
              {/* ซ้ำสองชุดเท่ากัน เพื่อให้วนต่อกันเนียนไม่มีรอยต่อ */}
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

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

type RankUser = { userId?: string; name: string; avatarId?: string; games: number; score: number };

const wrap = "mx-auto w-full max-w-7xl px-6";

export default function Home() {
  const [cat, setCat] = useState("ทั้งหมด");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedGames, setSavedGames] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [favOpen, setFavOpen] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const [topUsers, setTopUsers] = useState<RankUser[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [score, setScore] = useState<number | null>(null);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  // เอฟเฟกต์อันดับ 1: เลขคะแนนวิ่ง (เริ่มเมื่อเลื่อนมาเห็นแท่นรับรางวัล)
  const [inView, setInView] = useState(false);
  const [done, setDone] = useState(false);
  const podiumRef = useRef<HTMLDivElement>(null);
  const hasPodium = topUsers.length > 0;

  useEffect(() => {
    const el = podiumRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasPodium]);

  const champ = topUsers[0];
  const champScore = useCountUp(champ?.score ?? 0, inView && !!champ, COUNT_MS, () => {
    if ((champ?.score ?? 0) > 0) setDone(true);
  });

  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          setTotalParticipants(result.data.length);

          const list: RankUser[] = result.data.map((u: any) => {
            const scoresObj = u.gameScores || {};
            let totalScore = 0;
            let playedGamesCount = 0;

            for (const [key, val] of Object.entries(scoresObj)) {
              const num = Number(val) || 0;
              if (num > 0) {
                totalScore += num;
                if (key !== "dailyMission") playedGamesCount += 1;
              }
            }

            return {
              userId: u.userId || u._id,
              name: u.name || "ผู้เล่นไม่ระบุชื่อ",
              avatarId: u.avatarId || u.avatar || "p01",
              games: playedGamesCount,
              score: totalScore,
            };
          });

          list.sort((a, b) => b.score - a.score);
          setTopUsers(list.slice(0, RANK_LIMIT + 1)); // +1 เพื่อโชว์อันดับถัดไปแบบจางๆ
          setScoreMap(
            Object.fromEntries(list.filter((u) => u.userId).map((u) => [u.userId as string, u.score]))
          );
        }
      } catch (error) {
        console.error("Failed to fetch rankings:", error);
      }
    }

    fetchRanking();
  }, []);

  useEffect(() => {
    async function loadProfileAndData() {
      const localData = localStorage.getItem("profile");
      let currentUserId: string | null = null;
      let localProfile: Profile | null = null;

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          localProfile = {
            userId: parsed.userId || parsed.id || parsed._id,
            name: parsed.name || "ผู้เล่นใหม่",
            avatar: parsed.avatar || parsed.avatarId || "p01",
          };
          setProfile(localProfile);
          currentUserId = localProfile.userId || null;
        } catch (e) {
          console.error("Failed to parse local profile:", e);
        }
      }

      try {
        const rawGames = localStorage.getItem(savedGamesKey(currentUserId));
        if (rawGames) {
          const arr = JSON.parse(rawGames);
          if (Array.isArray(arr)) setSavedGames(arr);
        }
      } catch {}

      if (currentUserId) {
        try {
          const res = await fetch(`/api/user?userId=${currentUserId}`, { cache: "no-store" });
          const result = await res.json();

          if (result.success && result.data) {
            setProfile({
              userId: currentUserId,
              name: result.data.name || localProfile?.name || "ผู้เล่นใหม่",
              avatar: result.data.avatar || result.data.avatarId || localProfile?.avatar || "p01",
            });
            setSaved(result.data.savedEvents || []);
            if (Array.isArray(result.data.savedGames)) {
              setSavedGames(result.data.savedGames);
              writeSavedGames(currentUserId, result.data.savedGames);
            }

            const gs = result.data.gameScores;
            if (gs && typeof gs === "object") {
              setScore((Object.values(gs) as unknown[]).reduce<number>((sum, v) => sum + Math.max(0, Number(v) || 0), 0));
            }
          }
        } catch (error) {
          console.error("Failed to load user data from API:", error);
        }
      }
      setReady(true);
    }

    loadProfileAndData();

    const handleStorageChange = () => loadProfileAndData();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  async function toggleSave(id: string) {
    const nextSaved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(nextSaved);

    if (profile?.userId) {
      try {
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile.userId,
            savedEvents: nextSaved,
          }),
        });
      } catch (error) {
        console.error("Failed to sync favorites with database:", error);
      }
    }
  }

  async function toggleSaveGame(id: string) {
    const nextSaved = savedGames.includes(id) ? savedGames.filter((x) => x !== id) : [...savedGames, id];
    setSavedGames(nextSaved);
    writeSavedGames(profile?.userId, nextSaved);

    if (profile?.userId) {
      try {
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile.userId,
            savedGames: nextSaved,
          }),
        });
      } catch (error) {
        console.error("Failed to sync favorite games with database:", error);
      }
    }
  }

  const list = GAMES.filter((g) => cat === "ทั้งหมด" || g.category === cat);
  const upcoming = GAMES.filter((g) => g.status === "SOON");
  const openCount = GAMES.filter((g) => g.status !== "SOON").length;
  const detailGame = GAMES.find((g) => g.id === gameId) ?? null;

  const isFirst =
    !!profile?.userId &&
    (topUsers[0]?.score ?? 0) > 0 &&
    topUsers[0]?.userId === profile.userId;

  const myScore = score ?? (profile?.userId ? scoreMap[profile.userId] ?? null : null);

  // แบ่งเป็นแท่นรับรางวัล 1-3 และรายการอันดับ 4-5
  const podium = topUsers.slice(0, 3);
  const rest = topUsers.slice(3, RANK_LIMIT);
  const peek = topUsers[RANK_LIMIT] ?? null; // อันดับ 6 โชว์จางๆ
  const podiumOrder = ["order-2", "order-1", "order-3"]; // เรียง 2-1-3 (อันดับ 1 อยู่กลาง)

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col items-center overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white">
      <style>{`
        html { scroll-behavior: smooth; }
        section[id] { scroll-margin-top: 60px; }

        button, a, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .txt-bg-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }

        @keyframes bg-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .bg-marquee { animation: bg-marquee linear infinite; will-change: transform; }

        .reveal { opacity: 0; transition: opacity .75s ease, transform .75s cubic-bezier(.2,.8,.2,1); }
        .reveal-up { transform: translateY(44px); }
        .reveal-left { transform: translateX(-70px); }
        .reveal-right { transform: translateX(70px); }
        .reveal-zoom { transform: scale(.88); }
        @media (max-width: 639px) { .reveal-left { transform: translateX(-28px); } .reveal-right { transform: translateX(28px); } }
        .reveal.is-in { opacity: 1; transform: none; }

        .bar-grow { width: 0; transition: width .8s cubic-bezier(.2,.8,.2,1) .25s; }
        .is-in .bar-grow { width: 4rem; }

        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        .fx-rise { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }

        .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
        .btn-fx:hover .btn-shine { transform: translateX(120%); }

        .events-stage { position: relative; overflow: hidden; }

        @keyframes score-pop { 0% { transform: scale(1); } 35% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          .score-pop { animation: none !important; }
          html { scroll-behavior: auto; }
          .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
          .bar-grow { width: 4rem; transition: none; }
          .fx-rise { animation: none !important; }
          .bg-marquee { animation: none !important; }
        }
      `}</style>

      <BackdropText />

      <Navbar
        saved={[...saved, ...savedGames]}
        profile={profile}
        ready={ready}
        isFirst={isFirst}
        score={myScore}
        onOpenFavorites={() => setFavOpen(true)}
      />

      {/* Events เต็มความกว้างจอ พร้อมเอฟเฟกต์เปิดแบบ hero */}
      <div className="events-stage w-full">
        <EventsCarousel saved={saved} toggleSave={toggleSave} setOpenId={setOpenId} overlayOpen={!!openId || favOpen || !!gameId} onPlayGame={(id) => { setOpenId(null); setGameId(id); }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(23,255,162,0.16),transparent_45%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#17FFA2] to-transparent shadow-[0_0_14px_#17FFA2]" aria-hidden="true" />
      </div>

      {/* ---------------- STATS ---------------- */}
      <section className="w-full border-b border-[#17FFA2]/30 bg-[#0a1014]/80">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-y-6 px-6 py-10">
          {[
            { n: <CountUp to={totalParticipants} />, label: "ผู้เข้าร่วม" },
            { n: <>{openCount}/{GAMES.length}</>, label: "เกมที่เปิดแล้ว" },
            { n: <>4</>, label: "วันที่เหลือ" },
          ].map((st, i) => (
            <Reveal key={st.label} variant="zoom" delay={i * 110}>
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)] sm:text-5xl">{st.n}</p>
                <p className={`mt-2 text-sm ${MUTED}`}>{st.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- GAMES ---------------- */}
      <section id="games" className={`${wrap} pt-16 sm:pt-24`}>
        <SectionHead
          title="เกมทั้งหมด"
          intro="เลือกเกมที่ใช่ แล้วเก็บแต้มขึ้นอันดับ"
          action={
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button key={c} small pressed={cat === c} variant={cat === c ? "solid" : "outline"} onClick={() => setCat(c)}>
                  {c}
                </Button>
              ))}
            </div>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g, i) => {
            const soon = g.status === "SOON";
            const accent = soon ? "#52525B" : toneHex(g);
            const cover = COVERS[g.id];
            return (
              <Reveal key={g.id} delay={(i % 3) * 110} className="h-full">
                <article
                  role="button"
                  tabIndex={0}
                  aria-label={`${g.name} กดเพื่อดูกติกา`}
                  onClick={() => setGameId(g.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setGameId(g.id);
                    }
                  }}
                  className="group flex h-full cursor-pointer flex-col border border-white/10 bg-[#05080a] outline-none transition-all duration-300 hover:-translate-y-1.5 hover:border-[#17FFA2] hover:shadow-[0_0_28px_rgba(23,255,162,0.25)] focus-visible:ring-4 focus-visible:ring-[#17FFA2]"
                >
                  <div
                    className="relative flex h-56 items-end overflow-hidden"
                    style={{ background: `linear-gradient(160deg, ${accent}, #05080a 90%)` }}
                  >
                    {cover ? (
                      <>
                        <Image
                          src={cover}
                          alt={g.name}
                          fill
                          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05080a]/70 via-transparent to-transparent" aria-hidden="true" />
                      </>
                    ) : (
                      <span className="absolute -right-2 top-0 select-none text-[9rem] font-bold leading-none text-black/30 transition-transform duration-500 group-hover:-translate-x-3 group-hover:scale-110">
                        {g.glyph}
                      </span>
                    )}
                    <div className="relative m-4">
                      <Badge status={g.status} dark={soon} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <p className={`text-sm ${MUTED}`}>{g.category} · {g.time}</p>
                      <h3 className="mt-1 text-2xl font-bold uppercase tracking-tight">{g.name}</h3>
                      <p className={`mt-2 text-sm leading-6 ${MUTED}`}>{g.desc}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className={btnClasses(soon ? "outline" : "solid", true)}>
                        <BtnInner>{soon ? "เปิดเร็วๆ นี้" : "เล่นเกม"}</BtnInner>
                      </span>
                      <HeartButton saved={savedGames.includes(g.id)} onToggle={() => toggleSaveGame(g.id)} label={g.name} />
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- UPCOMING GAMES ---------------- */}
      {upcoming.length > 0 && (
        <section id="upcoming" className={`${wrap} pt-16 sm:pt-24`}>
          <SectionHead title="เกมที่กำลังจะเปิดให้เล่น" intro="เตรียมตัวให้พร้อม เกมใหม่กำลังมา" />
          <div className="bg-black/55 backdrop-blur-md">
            {upcoming.map((g, i) => (
              <Reveal key={g.id} variant="left" delay={i * 90}>
                <div className="grid items-center gap-4 px-6 py-6 transition-colors duration-200 hover:bg-white/[0.04] md:grid-cols-[140px_1fr_1.2fr_auto]">
                  <div>
                    <div className="text-2xl font-bold">{g.time}</div>
                    <div className="text-sm text-[#ff2a55]">เปิดเร็วๆ นี้</div>
                  </div>
                  <div className="text-xl font-semibold">
                    {g.name} <span className="text-[#ff2a55]">/</span> <span className={`text-base font-normal ${MUTED}`}>{g.category}</span>
                  </div>
                  <div className={MUTED}>{g.desc}</div>
                  <Button variant="outline" small onClick={() => setGameId(g.id)}>ดูกติกา</Button>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- RANKING (TOP 5 แบบเดียวกับหน้า /rank) ---------------- */}
      <section id="ranking" className="mt-16 w-full bg-[#0a1014]/70 py-16 sm:mt-24 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <SectionHead
            title="ผู้นำตอนนี้"
            intro={`${RANK_LIMIT} อันดับแรก แต้มสะสมจากทุกรอบที่เล่น อัปเดตทุกครั้งที่มีคนเล่นจบ`}
          />

          {topUsers.length === 0 ? (
            <div className="flex flex-col items-center border border-[#17FFA2]/40 bg-[#0a1014]/90 px-6 py-14 text-center shadow-[10px_10px_0_0_#ff2a55] backdrop-blur-sm">
              <Crown className="w-16" />
              <h3 className="mt-4 text-2xl font-bold uppercase tracking-tight">ยังไม่มีข้อมูลอันดับ</h3>
              <p className={`mt-2 max-w-xs text-sm leading-6 ${MUTED}`}>เล่นเกมรอบแรกเพื่อเป็นคนแรกบนกระดาน</p>
            </div>
          ) : (
            <>
              {/* 3 อันดับแรก เรียง 2-1-3 ทุกขนาดจอ */}
              <div ref={podiumRef} className="grid grid-cols-3 items-end gap-2 pt-6 sm:gap-4">
                {podium.map((p, i) => {
                  const rank = i + 1;
                  const first = rank === 1;
                  const mine = !!profile?.userId && p.userId === profile.userId;
                  const pad = first
                    ? "px-1.5 pb-9 pt-12 sm:px-6 sm:pb-12 sm:pt-14"
                    : "px-1.5 pb-5 pt-9 sm:px-6 sm:pb-8 sm:pt-10";
                  return (
                    <Reveal
                      key={p.userId || i}
                      delay={i * 100}
                      className={`${podiumOrder[i]} min-w-0 ${first ? "-mt-4 sm:-mt-6" : ""}`}
                    >
                      <article
                        style={{
                          backgroundColor: TONE[i],
                          color: INK[i],
                          // ออร่านีออนรอบการ์ดอันดับ 1
                          boxShadow: first
                            ? "0 0 18px 4px rgba(23,255,162,.85), 0 0 60px 14px rgba(23,255,162,.5), 0 0 130px 36px rgba(23,255,162,.28)"
                            : undefined,
                        }}
                        className={`relative flex min-w-0 flex-col items-center text-center outline outline-2 outline-white transition-transform duration-300 hover:-translate-y-1 sm:outline-4 ${pad}`}
                      >
                        <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-xs font-bold sm:left-5 sm:top-5 sm:h-9 sm:w-9 sm:text-sm">
                          {rank}
                        </span>
                        <div className="relative mt-2 sm:mt-4">
                          {first && <Crown className="absolute -top-6 left-1/2 w-9 -translate-x-1/2 -rotate-6 sm:-top-9 sm:w-14" />}
                          <RankAvatar
                            id={p.avatarId}
                            size={`${first ? "h-16 w-16 sm:h-32 sm:w-32" : "h-12 w-12 sm:h-24 sm:w-24"} ring-2 ring-white/80 sm:ring-4`}
                          />
                        </div>
                        <p className={`mt-2 max-w-full truncate font-bold tracking-tight sm:mt-5 ${first ? "text-sm sm:text-2xl" : "text-xs sm:text-2xl"}`}>
                          {p.name}
                          {mine && " (คุณ)"}
                        </p>
                        <p className="mt-0.5 text-[10px] opacity-60 sm:mt-1 sm:text-sm">เล่นแล้ว {p.games} เกม</p>
                        {first ? (
                          // อันดับ 1: เลขวิ่งขึ้นแล้วหยุดที่คะแนนจริง
                          <p
                            className="score-pop mt-2 max-w-full text-xl font-bold tabular-nums tracking-tight sm:mt-5 sm:text-5xl"
                            style={done ? { animation: "score-pop 500ms ease-out" } : undefined}
                            aria-label={`${p.score.toLocaleString("en-US")} แต้ม`}
                          >
                            {champScore.toLocaleString("en-US")}
                          </p>
                        ) : (
                          <p className="mt-2 max-w-full text-base font-bold tabular-nums tracking-tight sm:mt-5 sm:text-5xl">
                            {p.score.toLocaleString("en-US")}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] opacity-60 sm:mt-1 sm:text-xs">แต้ม</p>
                      </article>
                    </Reveal>
                  );
                })}
              </div>

              {/* อันดับที่ 4-5 */}
              {rest.length > 0 && (
                <ol className="mt-8 flex flex-col gap-2 sm:gap-3">
                  {rest.map((p, i) => {
                    const mine = !!profile?.userId && p.userId === profile.userId;
                    return (
                      <Reveal key={p.userId || i} delay={i * 90}>
                        <li
                          className={`flex items-center gap-3 border p-2.5 pr-4 backdrop-blur-sm transition-all duration-200 hover:border-[#17FFA2]/60 sm:gap-4 sm:p-3 sm:pr-6 ${
                            mine
                              ? "border-[#17FFA2] bg-[#17FFA2]/10 shadow-[0_0_18px_rgba(23,255,162,0.25)]"
                              : "border-white/10 bg-[#0a1014]/90"
                          }`}
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/10 text-base font-bold tabular-nums sm:h-12 sm:w-12">{i + 4}</span>
                          <RankAvatar id={p.avatarId} size="h-11 w-11 sm:h-12 sm:w-12" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold sm:text-lg">
                              {p.name}
                              {mine && " (คุณ)"}
                            </p>
                            <p className={`text-xs sm:hidden ${MUTED}`}>{p.games} เกม</p>
                          </div>
                          <span className={`hidden text-sm sm:inline ${MUTED}`}>{p.games} เกม</span>
                          <span className="w-20 text-right text-lg font-bold tabular-nums text-[#17FFA2] sm:w-24 sm:text-xl">{p.score.toLocaleString("en-US")}</span>
                        </li>
                      </Reveal>
                    );
                  })}
                </ol>
              )}

              {/* อันดับ 6 โชว์จางๆ เป็นการบอกใบ้ว่ายังมีต่อ */}
              {peek && (
                <div
                  aria-hidden
                  className="pointer-events-none mt-2 select-none opacity-45 sm:mt-3 [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
                >
                  <div className="flex items-center gap-3 border border-white/10 bg-[#0a1014]/90 p-2.5 pr-4 sm:gap-4 sm:p-3 sm:pr-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/10 text-base font-bold tabular-nums sm:h-12 sm:w-12">{RANK_LIMIT + 1}</span>
                    <RankAvatar id={peek.avatarId} size="h-11 w-11 sm:h-12 sm:w-12" />
                    <p className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">{peek.name}</p>
                    <span className="w-20 text-right text-lg font-bold tabular-nums text-[#17FFA2] sm:w-24 sm:text-xl">{peek.score.toLocaleString("en-US")}</span>
                  </div>
                </div>
              )}

              {/* ดูเพิ่มเติม -> หน้า /rank */}
              <Reveal className={`${peek ? "mt-2" : "mt-10"} flex flex-col items-center gap-3`}>
                <Button href="/rank">ดูเพิ่มเติม</Button>
                {totalParticipants > RANK_LIMIT && (
                  <p className={`text-sm ${MUTED}`}>และผู้เข้าร่วมอีก {(totalParticipants - RANK_LIMIT).toLocaleString("en-US")} คน</p>
                )}
              </Reveal>
            </>
          )}
        </div>
      </section>

      {/* ---------------- HOW TO PLAY ---------------- */}
      <section id="how" className={`${wrap} pt-16 sm:pt-24`}>
        <SectionHead title="วิธีเล่น" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="h-full">
              <li className="h-full border-l-4 border-[#17FFA2] bg-[#0a1014] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_28px_rgba(23,255,162,0.25)]">
                <span className="flex h-9 w-9 items-center justify-center bg-[#17FFA2] text-sm font-bold text-[#04110a]">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-lg font-bold uppercase tracking-tight">{s.title}</h3>
                <p className={`mt-2 text-sm leading-6 ${MUTED}`}>{s.desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mt-16 w-full bg-[#17FFA2] sm:mt-24 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(0,0,0,0.08)_18px_36px)] text-[#04110a]">
        <div className={`${wrap} py-14`}>
          <Reveal className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold uppercase sm:text-4xl">พร้อมเล่นรอบแรกหรือยัง</h2>
              <p className="mt-2 text-[#04110a]/80">สมัครใช้เวลาไม่ถึงหนึ่งนาที</p>
            </div>
            <Button href="/login/register" variant="dark">สมัครเข้าร่วม</Button>
          </Reveal>
        </div>
      </section>

      <footer className="w-full border-t border-white/10 bg-[#05080a]">
        <div className={`${wrap} pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-sm ${MUTED}`}>7 Days 7 Games · มินิเกมสำหรับพักสมอง</div>
      </footer>

      <GameDetail game={detailGame} saved={!!detailGame && savedGames.includes(detailGame.id)} onToggleSave={() => detailGame && toggleSaveGame(detailGame.id)} onClose={() => setGameId(null)} />

      {/* Component รายการโปรดที่แยกออกมา */}
      <FavoritesSheet
        open={favOpen}
        detailOpen={!!openId || !!gameId}
        saved={saved}
        savedGames={savedGames}
        gamesList={GAMES}
        covers={COVERS}
        toggleSave={toggleSave}
        toggleSaveGame={toggleSaveGame}
        onOpenEvent={setOpenId}
        onOpenGame={setGameId}
        onClose={() => setFavOpen(false)}
      />

      <EventDetail
        sel={EVENTS.find((e) => e.id === openId) ?? null}
        saved={saved}
        toggleSave={toggleSave}
        onClose={() => setOpenId(null)}
        onPlayGame={(id) => {
          setOpenId(null);
          setGameId(id);
        }}
        onPlay={() => {
          setOpenId(null);
          setFavOpen(false);
          setTimeout(() => (window.location.hash = "#games"), 50);
        }}
      />
    </div>
  );
}