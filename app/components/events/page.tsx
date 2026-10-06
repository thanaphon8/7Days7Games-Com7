"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type Status = "NOW" | "SOON";

const MUTED = "text-[#8fa6a1]";

export function Badge({ status, dark = false }: { status: Status; dark?: boolean }) {
  const now = status === "NOW";
  const tone = now
    ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_12px_rgba(23,255,162,0.5)]"
    : dark
      ? "bg-white/15 text-white"
      : "bg-black/20 text-zinc-300";
  return (
    <span className={`inline-flex h-7 items-center px-3 text-xs font-bold uppercase tracking-widest ${tone}`}>
      {status}
    </span>
  );
}

/* ---------- ปุ่มเอียงแบบ esport ---------- */
function skewBtn(variant: "solid" | "outline" = "solid", fullWidth = false) {
  const base =
    "btn-fx relative inline-flex -skew-x-12 items-center justify-center overflow-hidden px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : "border border-white/30 text-white hover:border-[#17FFA2] hover:text-[#17FFA2] hover:shadow-[0_0_18px_rgba(23,255,162,0.3)]";
  return `${base} ${styles} ${fullWidth ? "w-full" : ""}`;
}

function SkewInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-block skew-x-12">{children}</span>
    </>
  );
}

// ===== Events =====
export type EventItem = {
  id: string;
  status: Status;
  meta: string;
  lines: string[];
  desc: string;
  cta: string;
  href: string;
  bg: string;
  fg: string;
  visual: "shapes" | "memory" | "tiles";
  image?: string;
  cover?: string;
  logo?: string;
  dark?: boolean; // หน้ารายละเอียดแบบกว้าง (เดิมคือพื้นดำ)
  bracket?: { teams: string[]; note: string };
  prize?: { rank: string; amount: string; unit: string };
  info: [string, string][];
  rules: string[];
};

export const EVENTS: EventItem[] = [
  {
    id: "pubg", status: "SOON", meta: "เริ่ม 26 ต.ค. 2026", lines: ["PUBG", "Mobile Cup"],
    desc: "ศึกชิงแชมป์ PUBG Mobile ของบริษัท รวมทีม 4 คน ลงสนามแบบ Squad ลุ้นเป็นทีมสุดท้ายที่รอดชีวิต",
    cta: "ดูรายละเอียด", href: "#", bg: "#B7CBB0", fg: "#1F3A2A", visual: "shapes",
    image: "/img/pubg1.png", cover: "/img/pubg2.jpg", logo: "/img/pubglogo.png", dark: true,
    prize: { rank: "ผู้ชนะอันดับ 1 รับ", amount: "60,000", unit: "คะแนน" },
    info: [["วันแข่ง", "26 ต.ค. 2026 เวลา 18:00 น."], ["รูปแบบ", "Squad ทีมละ 4 คน"], ["รอบการแข่ง", "คัดเลือก 3 แมตช์ แล้วน็อกเอาต์ 8 ทีม"]],
    rules: ["สมัครเป็นทีม ทีมละ 4 คน และมีผู้เล่นสำรองได้ 1 คน", "รอบคัดเลือกแข่ง 3 แมตช์ คะแนนรวมมาจากอันดับของทีมและจำนวน Kill", "8 ทีมคะแนนสูงสุดเข้าสู่รอบน็อกเอาต์ แข่งโหมด Team Deathmatch 4 ต่อ 4", "ทีมที่ชนะรอบชิงชนะเลิศเป็นแชมป์ ผู้ชนะอันดับ 1 รับ 60,000 คะแนน", "ทุกคนต้องใช้บัญชีของตัวเอง และห้ามใช้โปรแกรมช่วยเล่นทุกชนิด"],
    bracket: {
      teams: ["Alpha Squad", "Night Owls", "Red Dragons", "Pixel Force", "Blue Wolves", "Gold Rush", "Silent Hawks", "Neon Crew"],
      note: "ตัวอย่างสาย 8 ทีมสุดท้าย เรียงตามอันดับจากรอบคัดเลือก (ข้อมูลจำลอง) ผลแต่ละรอบจะอัปเดตเมื่อเริ่มแข่ง",
    },
  },
  {
    id: "main", status: "NOW", meta: "เหลืออีก 4 วัน", lines: ["7 Days", "7 Games"],
    desc: "พักสมองด้วยเกมสั้นๆ เล่นคนเดียว สะสมแต้ม แล้วลุ้นอันดับ เมื่อครบ 7 วันจะประกาศผู้ชนะ",
    cta: "เลือกเกม", href: "#games", bg: "#F4A58A", fg: "#4A2412", visual: "shapes",
    info: [["ระยะเวลา", "7 วัน"], ["รูปแบบ", "เล่นคนเดียว"], ["การนับแต้ม", "คะแนนสูงสุดของแต่ละเกมรวมกัน"]],
    rules: ["สมัครด้วยอีเมลบริษัทและตั้งชื่อที่จะแสดงบนอันดับ", "เลือกเล่นเกมไหนก็ได้ เล่นซ้ำเพื่อทำคะแนนให้สูงขึ้น", "ดูอันดับของตัวเองได้ตลอดเวลา", "เมื่อครบ 7 วัน ผู้ที่ได้แต้มรวมสูงสุดคือผู้ชนะ"],
  },
  {
    id: "memory", status: "SOON", meta: "เริ่ม 12 ต.ค. 2026", lines: ["แข่งจับคู่", "ความจำ"],
    desc: "ทุกคนเล่นรอบเดียว ใครจับคู่ได้ไวที่สุดและพลาดน้อยที่สุดคือผู้ชนะ",
    cta: "ดูรายละเอียด", href: "#", bg: "#F4D35E", fg: "#4A3B00", visual: "memory",
    info: [["เริ่มแข่ง", "12 ต.ค. 2026"], ["รูปแบบ", "เล่นได้รอบเดียวต่อคน"], ["ตัดสินจาก", "จำนวนครั้งที่พลิกและเวลาที่ใช้"]],
    rules: ["ทุกคนเล่นได้เพียงหนึ่งรอบ", "คะแนนคิดจากจำนวนครั้งที่พลิกและเวลาที่ใช้", "ผู้ที่ได้คะแนนสูงสุดเป็นผู้ชนะ", "รายละเอียดรางวัลจะประกาศก่อนวันแข่ง"],
  },
  {
    id: "2048", status: "SOON", meta: "เริ่ม 19 ต.ค. 2026", lines: ["2048", "Showdown"],
    desc: "รวมเลขให้ได้แต้มสูงสุดภายใน 10 นาที ลุ้นขึ้นอันดับหนึ่งของบริษัท",
    cta: "ดูรายละเอียด", href: "#", bg: "#A8B5E8", fg: "#1F2A5C", visual: "tiles",
    info: [["เริ่มแข่ง", "19 ต.ค. 2026"], ["เวลา", "10 นาทีต่อรอบ"], ["ตัดสินจาก", "แต้มสูงสุดที่ทำได้"]],
    rules: ["มีเวลาเล่น 10 นาทีต่อรอบ", "นับแต้มจากรอบที่ดีที่สุดของแต่ละคน", "ผู้ที่ได้แต้มสูงสุดเป็นผู้ชนะ", "รายละเอียดรางวัลจะประกาศก่อนวันแข่ง"],
  },
];

const TILE_COLORS = ["#F4D35E", "#F4A58A", "#B7CBB0", "#A8B5E8"];

function EventVisual({ kind }: { kind: EventItem["visual"] }) {
  if (kind === "memory") {
    const open: Record<number, [string, string]> = { 0: ["#F4A58A", "◐"], 3: ["#A8B5E8", "▦"], 5: ["#B7CBB0", "∿"], 6: ["#A8B5E8", "▦"], 9: ["#F4A58A", "◐"], 11: ["#B7CBB0", "∿"] };
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={open[i] ? { backgroundColor: open[i][0] } : undefined} className={`flex h-12 w-12 items-center justify-center text-lg text-zinc-900 ${open[i] ? "" : "border border-white/10 bg-[#101a1f]"}`}>
            {open[i]?.[1]}
          </div>
        ))}
      </div>
    );
  }
  if (kind === "tiles") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {["2", "4", "8", "16", "32", "64", "128", "256", "512"].map((n, i) => (
          <div key={n} style={{ backgroundColor: TILE_COLORS[i % 4] }} className="flex h-14 w-14 items-center justify-center text-base font-bold text-zinc-900">
            {n}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {["#F4D35E", "#A8B5E8", "#B7CBB0", "#B7CBB0", "#F4A58A", "#F4D35E", "#A8B5E8", "#F4D35E", "#F4A58A"].map((c, i) => (
        <div key={i} style={{ backgroundColor: c }} className={`h-14 w-14 ${i % 4 === 0 ? "rounded-full" : i % 4 === 2 ? "rounded-t-full" : ""}`} />
      ))}
    </div>
  );
}

// ===== ป้ายรางวัล =====
function PrizeChip({ prize }: { prize: NonNullable<EventItem["prize"]> }) {
  return (
    <div className="inline-flex items-center gap-2">
      {prize.rank && <span className="text-xs font-medium opacity-80">{prize.rank}</span>}
      <div
        className="flex h-9 items-center gap-1.5 bg-[#17FFA2] px-3.5 text-sm font-bold tabular-nums text-[#04110a] shadow-[0_0_16px_rgba(23,255,162,0.45)]"
        title={`${prize.rank} ${prize.amount} ${prize.unit}`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
        <span>
          {prize.amount} <span className="text-xs font-normal opacity-85">{prize.unit}</span>
        </span>
      </div>
    </div>
  );
}

function TitleContent({ e, logoClass }: { e: EventItem; logoClass: string }) {
  if (!e.logo)
    return (
      <>
        {e.lines[0]}
        <br />
        {e.lines[1]}
      </>
    );
  return (
    <>
      <span className="sr-only">{e.lines.join(" ")}</span>
      <Image src={e.logo} alt="" width={480} height={160} priority className={`h-auto ${logoClass}`} />
    </>
  );
}

const SLIDE_MS = 7000;
const TRANSITION_MS = 950;

// ระยะขอบซ้าย/ขวา ให้เนื้อหาในการ์ดตรงกับ container แม้การ์ดเต็มจอ
const EDGE = "max(1rem, calc((100% - 80rem) / 2 + 0.5rem))";
const EDGE_HEART = "max(1rem, calc((100% - 80rem) / 2 + 1.5rem))";

export const HEART_PATH = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z";

function HeartButton({ on, onClick, className = "", tabIndex = 0, style }: { on: boolean; onClick: () => void; className?: string; tabIndex?: number; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-pressed={on}
      aria-label={on ? "ยกเลิกการบันทึกกิจกรรม" : "บันทึกกิจกรรม"}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-9 w-9 items-center justify-center text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.7)] transition-transform hover:scale-110 active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={on ? "#ff2a55" : "none"}
        stroke={on ? "#ff2a55" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: on ? "heart-pop 380ms ease-out" : undefined }}
      >
        <path d={HEART_PATH} />
      </svg>
    </button>
  );
}

type SlideState = "active" | "out" | "idle";

function EventCard({
  e, titleTag, saved, toggleSave, onOpen, state, animKey, onNavigate,
}: {
  e: EventItem;
  titleTag: "h1" | "h2" | "h3";
  saved: string[];
  toggleSave: (id: string) => void;
  onOpen: () => void;
  state: SlideState;
  animKey: number;
  onNavigate?: () => void;
}) {
  const Title = titleTag;
  const isMain = e.id === "main";
  const live = state === "active";
  const stop = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onNavigate?.();
  };
  const stateCls = state === "active" ? "ev-in" : state === "out" ? "ev-out pointer-events-none" : "invisible pointer-events-none";
  return (
    <article
      aria-hidden={!live}
      aria-label={`${e.lines.join(" ")} กดเพื่อดูรายละเอียด`}
      tabIndex={live ? 0 : -1}
      onClick={onOpen}
      onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && onOpen()}
      style={{ gridArea: "1 / 1", paddingLeft: EDGE, paddingRight: EDGE }}
      className={`relative grid w-full min-h-[calc(100svh-6.5rem)] shrink-0 cursor-pointer overflow-hidden bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] py-4 text-white outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#17FFA2] md:grid-cols-2 md:py-6 ${stateCls}`}
    >
      {e.image && (
        <>
          <Image src={e.image} alt="" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 md:hidden"
            style={{ background: "linear-gradient(to top, rgba(5,8,10,.95) 0%, rgba(5,8,10,.8) 40%, rgba(5,8,10,0) 80%)" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 hidden md:block"
            style={{ background: "linear-gradient(to right, rgba(5,8,10,.95) 0%, rgba(5,8,10,.85) 28%, rgba(5,8,10,.4) 50%, rgba(5,8,10,0) 72%)" }}
          />
        </>
      )}

      <HeartButton
        on={saved.includes(e.id)}
        onClick={() => toggleSave(e.id)}
        tabIndex={live ? 0 : -1}
        style={{ right: EDGE_HEART }}
        className="absolute top-4 z-10 md:top-6"
      />

      {/* key เปลี่ยนทุกครั้งที่สไลด์ขึ้น เพื่อให้แอนิเมชันข้อความเล่นใหม่ */}
      <div key={live ? `on-${animKey}` : "off"} className="relative z-10 flex flex-col justify-between gap-4 p-2 md:p-4">
        <div className="ev-rise flex items-center gap-2.5">
          <Badge status={e.status} dark />
          <span className="text-xs text-white/70">{e.meta}</span>
        </div>
        <div>
          <Title className="ev-title text-4xl font-bold uppercase leading-tight tracking-tight text-white [text-shadow:0_0_32px_rgba(23,255,162,0.4)] md:text-5xl">
            <TitleContent e={e} logoClass="w-full max-w-[18rem] md:max-w-[26rem]" />
          </Title>
          <p className="ev-rise mt-2.5 max-w-xs text-sm leading-6 text-white/85" style={{ animationDelay: "150ms" }}>{e.desc}</p>
          {e.prize && (
            <div className="ev-rise mt-3 text-white" style={{ animationDelay: "220ms" }}>
              <PrizeChip prize={e.prize} />
            </div>
          )}
          <div className="ev-rise mt-5 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
            <a
              href={e.href}
              onClick={e.href === "#" ? (ev) => { ev.preventDefault(); } : stop}
              tabIndex={live ? 0 : -1}
              className={skewBtn("solid")}
            >
              <SkewInner>{e.cta}</SkewInner>
            </a>
            {isMain && (
              <a href="#how" onClick={stop} tabIndex={live ? 0 : -1} className={skewBtn("outline")}>
                <SkewInner>วิธีเล่น</SkewInner>
              </a>
            )}
          </div>
        </div>
      </div>

      {!e.image && (
        <div className="relative z-10 flex min-h-48 items-center justify-center border border-[#17FFA2]/30 bg-[#0a1014] p-4 shadow-[10px_10px_0_0_#ff2a55]">
          <EventVisual kind={e.visual} />
        </div>
      )}
    </article>
  );
}

export default function EventsCarousel({ saved, toggleSave, setOpenId, overlayOpen }: { saved: string[]; toggleSave: (id: string) => void; setOpenId: (id: string | null) => void; overlayOpen: boolean }) {
  const n = EVENTS.length;
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const goTo = (i: number) => {
    if (i === active) return;
    setPrev(active);
    setActive(i);
    setTick((t) => t + 1);
  };

  // เลื่อนอัตโนมัติต่อเนื่อง แม้เมาส์ชี้อยู่ (หยุดเฉพาะตอนเปิดหน้ารายละเอียด)
  const running = !reduced && !overlayOpen;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      setPrev(active);
      setActive((active + 1) % n);
      setTick((k) => k + 1);
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [active, running, n]);

  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [prev, active]);

  return (
    <section
      id="events"
      aria-roledescription="carousel"
      aria-label="Events"
      className="relative"
    >
      <style>{`
        @keyframes heart-pop { 0% { transform: scale(1); } 40% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes sheet-in { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }

        @keyframes evIn {
          from { clip-path: inset(0 0 0 100%); transform: scale(1.18) translateX(50px); filter: brightness(2.2) saturate(1.5); }
          to   { clip-path: inset(0 0 0 0); transform: none; filter: none; }
        }
        @keyframes evOut {
          from { opacity: 1; transform: none; filter: none; }
          to   { opacity: 0; transform: scale(.92) translateX(-40px); filter: brightness(.4) blur(3px); }
        }
        @keyframes evSweep { from { left: 100%; opacity: 1; } to { left: -8%; opacity: 0; } }
        @keyframes evProgress { from { width: 0; } to { width: 100%; } }
        @keyframes evTitle {
          0%   { opacity: 0; transform: translateX(-60px) skewX(-10deg); filter: blur(10px); text-shadow: 6px 0 #ff2a55, -6px 0 #17FFA2; }
          60%  { opacity: 1; filter: blur(0); text-shadow: 3px 0 #ff2a55, -3px 0 #17FFA2; }
          100% { opacity: 1; transform: none; filter: none; }
        }
        @keyframes evRise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

        .ev-in { animation: evIn .9s cubic-bezier(.2,.8,.2,1) both; }
        .ev-out { animation: evOut .9s ease both; }
        .ev-sweep { position: absolute; top: 0; bottom: 0; width: 6px; background: #fff; box-shadow: 0 0 34px 12px #17FFA2; z-index: 20; pointer-events: none; animation: evSweep .9s cubic-bezier(.6,0,.2,1) both; }
        .ev-progress { animation: evProgress ${SLIDE_MS}ms linear both; }
        .ev-title { animation: evTitle .8s cubic-bezier(.2,.8,.2,1) both; }
        .ev-rise { animation: evRise .6s cubic-bezier(.2,.8,.2,1) both; }

        .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
        .btn-fx:hover .btn-shine { transform: translateX(120%); }

        @media (prefers-reduced-motion: reduce) {
          .ev-in, .ev-out, .ev-sweep, .ev-title, .ev-rise { animation: none !important; }
          .ev-progress { animation: none; width: 100%; }
        }
      `}</style>

      <div className="relative grid overflow-hidden">
        {EVENTS.map((e, i) => (
          <EventCard
            key={e.id}
            e={e}
            titleTag={e.id === "main" ? "h1" : "h2"}
            saved={saved}
            toggleSave={toggleSave}
            onOpen={() => setOpenId(e.id)}
            state={i === active ? "active" : i === prev ? "out" : "idle"}
            animKey={tick}
          />
        ))}
        {prev !== null && <div key={`sweep-${tick}`} className="ev-sweep" aria-hidden="true" />}

        {running && (
          <div className="absolute bottom-0 left-0 z-20 h-[3px] w-full bg-white/10" aria-hidden="true">
            <div key={`p-${active}-${tick}`} className="ev-progress h-full bg-[#17FFA2] shadow-[0_0_10px_#17FFA2]" />
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 bg-[#05080a] py-4">
        {EVENTS.map((e, i) => (
          <button
            key={e.id}
            aria-label={`ไปที่ Event ${i + 1}`}
            aria-current={active === i}
            onClick={() => goTo(i)}
            className={`h-1.5 -skew-x-12 transition-all duration-300 hover:bg-[#17FFA2] ${
              active === i ? "w-8 bg-[#17FFA2] shadow-[0_0_10px_#17FFA2]" : "w-4 bg-white/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export function useOverlay(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, onClose]);
}

export function CloseButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      autoFocus
      aria-label="ปิด"
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.7)] transition-all hover:scale-110 hover:text-[#17FFA2] active:scale-90 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function Bracket({ teams, accent }: { teams: string[]; accent: string }) {
  const row = (name?: string, seed?: number) => (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span style={name ? { backgroundColor: accent } : undefined} className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold ${name ? "text-zinc-900" : "bg-white/10 text-white/40"}`}>
        {name ? seed : "-"}
      </span>
      <span className={`truncate text-sm ${name ? "font-medium text-white" : "text-white/40"}`}>{name ?? "รอผลการแข่ง"}</span>
    </div>
  );
  const match = (a?: number, b?: number) => (
    <div className="w-full overflow-hidden border border-white/10 bg-[#05080a]">
      {row(a !== undefined ? teams[a] : undefined, a !== undefined ? a + 1 : undefined)}
      <div className="h-px bg-white/10" />
      {row(b !== undefined ? teams[b] : undefined, b !== undefined ? b + 1 : undefined)}
    </div>
  );
  const line = "absolute bg-[#17FFA2]/40";
  const first: [number, number][] = [[0, 7], [3, 4], [1, 6], [2, 5]];
  const rounds = [{ label: "รอบ 8 ทีม", n: 4 }, { label: "รอบรอง", n: 2 }, { label: "ชิงชนะเลิศ", n: 1 }];

  return (
    <div className="flex min-w-max gap-12">
      {rounds.map((r, ri) => (
        <div key={r.label} className="w-48">
          <p className={`mb-3 text-sm font-medium ${MUTED}`}>{r.label}</p>
          <div className="flex h-[28rem] flex-col">
            {Array.from({ length: r.n }, (_, c) => (
              <div key={c} className="relative flex flex-1 items-center">
                {ri === 0 ? match(first[c][0], first[c][1]) : match()}
                <span className={`${line} left-full top-1/2 h-px ${ri < 2 ? "w-6" : "w-12"}`} />
                {ri < 2 && c % 2 === 0 && (
                  <>
                    <span className={`${line} top-1/2 h-full w-px`} style={{ left: "calc(100% + 1.5rem)" }} />
                    <span className={`${line} top-full h-px w-6`} style={{ left: "calc(100% + 1.5rem)" }} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="w-48">
        <p className={`mb-3 text-sm font-medium ${MUTED}`}>แชมป์</p>
        <div className="flex h-[28rem] items-center">
          <div style={{ backgroundColor: accent }} className="flex w-full flex-col items-center gap-2 px-4 py-6 text-center text-zinc-900 shadow-[6px_6px_0_0_#ff2a55]">
            <span className="flex h-12 w-12 items-center justify-center bg-[#05080a] text-xl text-white">★</span>
            <span className="text-sm font-bold">ผู้ชนะเลิศ</span>
            <span className="text-xs opacity-60">รอผลการแข่ง</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventDetail({ sel, saved, toggleSave, onClose, onPlay }: { sel: EventItem | null; saved: string[]; toggleSave: (id: string) => void; onClose: () => void; onPlay: () => void }) {
  useOverlay(!!sel, onClose);
  const [fade, setFade] = useState(0);
  useEffect(() => setFade(0), [sel?.id]);
  if (!sel) return null;
  const isSaved = saved.includes(sel.id);
  const wide = !!sel.dark;
  const bg = "#05080a";
  const accent = sel.bg;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sel.lines.join(" ")}
      onScroll={sel.cover ? (e) => setFade(Math.min(1, e.currentTarget.scrollTop / (window.innerHeight * 0.45))) : undefined}
      style={{
        background: `radial-gradient(circle at 85% 0%, ${accent}40, transparent 50%), linear-gradient(rgba(23,255,162,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(23,255,162,0.045) 1px, transparent 1px), ${bg}`,
        backgroundSize: "auto, 56px 56px, 56px 56px, auto",
        animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)",
      }}
      className="fixed inset-0 z-[60] overflow-y-auto text-white"
    >
      {sel.cover && (
        <div aria-hidden className="fixed inset-x-0 top-0 h-[62vh] overflow-hidden">
          <Image src={sel.cover} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 30%, ${bg} 100%)` }} />
          <div className="absolute inset-0" style={{ backgroundColor: bg, opacity: fade * 0.92 }} />
        </div>
      )}
      <div className={`relative mx-auto flex min-h-full flex-col px-6 pb-36 pt-6 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge status={sel.status} dark />
            <span className={`text-sm ${MUTED}`}>{sel.meta}</span>
          </div>
          <div className="flex gap-3">
            <HeartButton on={isSaved} onClick={() => toggleSave(sel.id)} className="!h-10 !w-10" />
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className={`${sel.cover ? "mt-[26vh]" : "mt-12"} grid gap-10 lg:grid-cols-2 lg:items-center`}>
          <div>
            <span className="mb-5 block h-1.5 w-16 -skew-x-12 shadow-[0_0_14px_currentColor]" style={{ backgroundColor: accent, color: accent }} />
            <h2 className="text-5xl font-bold uppercase leading-[1.05] tracking-tight [text-shadow:0_0_30px_rgba(23,255,162,0.35)] md:text-7xl">
              <TitleContent e={sel} logoClass="w-full max-w-[20rem] md:max-w-[28rem]" />
            </h2>
            <p className={`mt-6 max-w-md text-lg leading-8 ${MUTED}`}>{sel.desc}</p>
            {sel.prize && (
              <div className="mt-6">
                <PrizeChip prize={sel.prize} />
              </div>
            )}
          </div>
          {sel.image ? (
            <div className="relative min-h-72 overflow-hidden border border-[#17FFA2]/40 bg-zinc-900 shadow-[10px_10px_0_0_#ff2a55] lg:min-h-80">
              <Image src={sel.image} alt={sel.lines.join(" ")} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center border border-[#17FFA2]/30 bg-[#0a1014] p-8 shadow-[10px_10px_0_0_#ff2a55]">
              <div className="scale-110 md:scale-125">
                <EventVisual kind={sel.visual} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {sel.info.map(([label, value]) => (
            <div key={label} className="border border-white/10 bg-[#0a1014] p-6">
              <p className={`text-sm ${MUTED}`}>{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-l-4 bg-[#0a1014] p-8" style={{ borderColor: accent }}>
          <h3 className="text-xl font-bold uppercase tracking-wide">กติกา</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {sel.rules.map((r) => (
              <li key={r} className="flex gap-3 text-base leading-7 text-white/75">
                <span style={{ backgroundColor: accent }} className="mt-2.5 h-2.5 w-2.5 shrink-0 rotate-45" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {sel.bracket && (
          <div className="mt-4 border border-white/10 bg-[#0a1014] p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold uppercase tracking-wide">สายการแข่งขัน</h3>
              <span className="inline-flex h-8 items-center bg-white/10 px-4 text-xs font-bold uppercase tracking-wider text-white/70">รอเริ่มแข่ง</span>
            </div>
            <p className={`mt-2 text-sm leading-6 ${MUTED}`}>{sel.bracket.note}</p>
            <div className="mt-6 overflow-x-auto pb-2">
              <Bracket teams={sel.bracket.teams} accent={accent} />
            </div>
            <p className={`mt-3 text-xs sm:hidden ${MUTED}`}>เลื่อนไปทางขวาเพื่อดูสายทั้งหมด</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#05080a] from-60% to-transparent px-6 pb-6 pt-12">
        <div className="w-full max-w-sm">
          <button
            onClick={() => (sel.status === "NOW" ? onPlay() : toggleSave(sel.id))}
            className={skewBtn(sel.status === "NOW" || !isSaved ? "solid" : "outline", true)}
          >
            <SkewInner>
              {sel.status === "NOW" ? "เริ่มเล่น" : isSaved ? "บันทึกกิจกรรมแล้ว" : "บันทึกกิจกรรมนี้"}
            </SkewInner>
          </button>
        </div>
      </div>
    </div>
  );
}

export function FavoriteCard({ e, onOpen, toggleSave }: { e: EventItem; onOpen: () => void; toggleSave: (id: string) => void }) {
  return (
    <article
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && onOpen()}
      className="relative flex min-h-40 cursor-pointer flex-col justify-between overflow-hidden border border-white/10 border-l-4 bg-[#05080a] p-4 text-white outline-none transition-all duration-200 hover:-translate-y-1 hover:border-[#17FFA2] hover:shadow-[0_0_24px_rgba(23,255,162,0.2)] focus-visible:ring-4 focus-visible:ring-[#17FFA2]"
      style={{ borderLeftColor: e.bg }}
    >
      {e.image ? (
        <>
          <Image src={e.image} alt="" fill sizes="(min-width: 640px) 480px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to right, #05080a 0%, rgba(5,8,10,.95) 38%, rgba(5,8,10,.6) 60%, rgba(5,8,10,0) 85%)" }} />
        </>
      ) : (
        <div aria-hidden className="absolute bottom-4 right-4 flex h-20 w-20 items-center justify-center overflow-hidden border border-white/10 bg-[#0a1014]">
          <div className="scale-[0.25]">
            <EventVisual kind={e.visual} />
          </div>
        </div>
      )}
      <HeartButton on onClick={() => toggleSave(e.id)} className="absolute right-4 top-4 z-10" />
      <div className="relative z-10 flex items-center gap-2.5 pr-12">
        <Badge status={e.status} dark />
        <span className="text-xs text-white/70">{e.meta}</span>
      </div>
      <div className="relative z-10 max-w-[62%]">
        <h3 className="text-2xl font-bold uppercase leading-[1.1] tracking-tight">
          <TitleContent e={e} logoClass="w-full max-w-[8rem]" />
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/70">{e.desc}</p>
      </div>
    </article>
  );
}