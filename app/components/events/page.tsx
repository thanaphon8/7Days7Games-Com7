"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type Status = "NOW" | "SOON";

export function Badge({ status }: { status: Status }) {
  const now = status === "NOW";
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold tracking-wide ${
        now ? "bg-white/70 text-zinc-900" : "bg-black/10 text-zinc-600"
      }`}
    >
      {status}
    </span>
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
    image: "/img/pubg1.png", cover: "/img/pubg2.jpg", logo: "/img/pubglogo.png",
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
          <div key={i} style={open[i] ? { backgroundColor: open[i][0] } : undefined} className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg text-zinc-900 ${open[i] ? "" : "bg-zinc-900"}`}>
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
          <div key={n} style={{ backgroundColor: TILE_COLORS[i % 4] }} className="flex h-14 w-14 items-center justify-center rounded-xl text-base font-semibold text-zinc-900">
            {n}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {["#F4D35E", "#A8B5E8", "#B7CBB0", "#B7CBB0", "#F4A58A", "#F4D35E", "#A8B5E8", "#F4D35E", "#F4A58A"].map((c, i) => (
        <div key={i} style={{ backgroundColor: c }} className={`h-14 w-14 ${i % 4 === 0 ? "rounded-full" : i % 4 === 2 ? "rounded-t-full rounded-b-lg" : "rounded-xl"}`} />
      ))}
    </div>
  );
}

// ===== ปรับแต่ง PrizeChip ให้เหมือนป้ายคะแนนใน Navbar =====
function PrizeChip({ prize }: { prize: NonNullable<EventItem["prize"]> }) {
  return (
    <div className="inline-flex items-center gap-2">
      {prize.rank && (
        <span className="text-xs font-medium opacity-80">{prize.rank}</span>
      )}
      <div
        className="flex h-9 items-center gap-1.5 rounded-full bg-[#F4D35E] px-3.5 text-sm font-semibold tabular-nums text-[#4A3B00] shadow-sm"
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
      <Image src={e.logo} alt="" width={480} height={160} priority className={`h-auto rounded-xl ${logoClass}`} />
    </>
  );
}

const SLIDE_MS = 5000;

export const HEART_PATH = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z";

function HeartButton({ on, onClick, className = "", tabIndex = 0 }: { on: boolean; onClick: () => void; className?: string; tabIndex?: number }) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-pressed={on}
      aria-label={on ? "ยกเลิกการบันทึกกิจกรรม" : "บันทึกกิจกรรม"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill={on ? "#E5484D" : "none"}
        stroke={on ? "#E5484D" : "currentColor"}
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

function EventCard({ e, titleTag, saved, toggleSave, onOpen, clone = false, style, onNavigate }: { e: EventItem; titleTag: "h1" | "h2" | "h3"; saved: string[]; toggleSave: (id: string) => void; onOpen: () => void; clone?: boolean; style?: React.CSSProperties; onNavigate?: () => void }) {
  const Title = titleTag;
  const isMain = e.id === "main";
  const stop = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    onNavigate?.();
  };
  return (
    <article
      aria-hidden={clone}
      aria-label={`${e.lines.join(" ")} กดเพื่อดูรายละเอียด`}
      tabIndex={clone ? -1 : 0}
      onClick={onOpen}
      onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && onOpen()}
      style={{ backgroundColor: e.bg, color: e.fg, ...style }}
      className={`relative grid w-full shrink-0 cursor-pointer overflow-hidden rounded-[2rem] p-4 outline-none focus-visible:ring-4 focus-visible:ring-blue-400 md:grid-cols-2 md:p-5 ${
        e.image ? "min-h-[22rem] md:min-h-[20rem]" : "min-h-[20rem]"
      }`}
    >
      {e.image && (
        <>
          <Image src={e.image} alt="" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0 md:hidden" style={{ background: `linear-gradient(to top, ${e.bg} 0%, ${e.bg}F2 45%, ${e.bg}00 100%)` }} />
          <div aria-hidden className="absolute inset-0 hidden md:block" style={{ background: `linear-gradient(to right, ${e.bg} 0%, ${e.bg}F2 30%, ${e.bg}99 52%, ${e.bg}00 78%)` }} />
        </>
      )}
      <HeartButton
        on={saved.includes(e.id)}
        onClick={() => toggleSave(e.id)}
        tabIndex={clone ? -1 : 0}
        className="absolute right-4 top-4 z-10 md:right-5 md:top-5"
      />
      <div className="relative z-10 flex flex-col justify-between gap-4 p-2 md:p-4">
        <div className="flex items-center gap-2.5">
          <Badge status={e.status} />
          <span className="text-xs opacity-70">{e.meta}</span>
        </div>
        <div>
          <Title className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            <TitleContent e={e} logoClass="w-full max-w-[14rem] md:max-w-[17rem]" />
          </Title>
          <p className="mt-2.5 max-w-xs text-sm leading-6 opacity-70">{e.desc}</p>
          {e.prize && (
            <div className="mt-3">
              <PrizeChip prize={e.prize} />
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <a href={e.href} onClick={e.href === "#" ? (ev) => { ev.preventDefault(); } : stop} tabIndex={clone ? -1 : 0} style={{ backgroundColor: e.fg }} className="inline-flex h-10 items-center rounded-full px-5 text-xs font-medium text-white transition-opacity hover:opacity-85">
              {e.cta}
            </a>
            {isMain && (
              <a href="#how" onClick={stop} tabIndex={clone ? -1 : 0} style={{ borderColor: `${e.fg}33` }} className="inline-flex h-10 items-center rounded-full border px-5 text-xs font-medium transition-colors hover:bg-black/5">
                วิธีเล่น
              </a>
            )}
          </div>
        </div>
      </div>
      {!e.image && (
        <div className="flex min-h-48 items-center justify-center rounded-2xl bg-white p-4">
          <EventVisual kind={e.visual} />
        </div>
      )}
    </article>
  );
}

export default function EventsCarousel({ saved, toggleSave, setOpenId, overlayOpen }: { saved: string[]; toggleSave: (id: string) => void; setOpenId: (id: string | null) => void; overlayOpen: boolean }) {
  const n = EVENTS.length;
  const [pos, setPos] = useState(0);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const active = ((pos % n) + n) % n;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (paused || reduced || overlayOpen) return;
    const t = setInterval(() => setPos((p) => p + 1), SLIDE_MS);
    return () => clearInterval(t);
  }, [paused, reduced, overlayOpen]);

  return (
    <section
      id="events"
      aria-roledescription="carousel"
      aria-label="Events"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <style>{`
        @keyframes heart-pop { 0% { transform: scale(1); } 40% { transform: scale(1.4); } 100% { transform: scale(1); } }
        @keyframes sheet-in { from { opacity: 0; transform: translateY(28px) scale(.98); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="grid overflow-hidden rounded-[2rem]">
        {EVENTS.map((e, i) => {
          const rel = ((((i - pos + 1) % n) + n) % n) - 1;
          return (
            <EventCard
              key={e.id}
              e={e}
              titleTag={e.id === "main" ? "h1" : "h2"}
              saved={saved}
              toggleSave={toggleSave}
              onOpen={() => setOpenId(e.id)}
              clone={rel !== 0}
              style={{
                gridArea: "1 / 1",
                transform: `translateX(calc(${rel * 100}% + ${rel}rem))`,
                transition: instant || reduced || rel === n - 2 ? "none" : "transform 700ms cubic-bezier(.65,0,.35,1)",
              }}
            />
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {EVENTS.map((e, i) => (
          <button
            key={e.id}
            aria-label={`ไปที่ Event ${i + 1}`}
            aria-current={active === i}
            onClick={() => {
              setInstant(true);
              setPos((p) => p - (((p % n) + n) % n) + i);
              setTimeout(() => setInstant(false), 60);
            }}
            className={`h-2 rounded-full transition-all duration-300 ${active === i ? "w-6 bg-zinc-900" : "w-2 bg-zinc-300 hover:bg-zinc-400"}`}
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
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90 ${className}`}
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
      <span style={name ? { backgroundColor: accent } : undefined} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${name ? "text-zinc-900" : "bg-zinc-200 text-zinc-400"}`}>
        {name ? seed : "-"}
      </span>
      <span className={`truncate text-sm ${name ? "font-medium text-zinc-900" : "text-zinc-400"}`}>{name ?? "รอผลการแข่ง"}</span>
    </div>
  );
  const match = (a?: number, b?: number) => (
    <div className="w-full overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-black/5">
      {row(a !== undefined ? teams[a] : undefined, a !== undefined ? a + 1 : undefined)}
      <div className="h-px bg-black/5" />
      {row(b !== undefined ? teams[b] : undefined, b !== undefined ? b + 1 : undefined)}
    </div>
  );
  const line = "absolute bg-zinc-300";
  const first: [number, number][] = [[0, 7], [3, 4], [1, 6], [2, 5]];
  const rounds = [{ label: "รอบ 8 ทีม", n: 4 }, { label: "รอบรอง", n: 2 }, { label: "ชิงชนะเลิศ", n: 1 }];

  return (
    <div className="flex min-w-max gap-12">
      {rounds.map((r, ri) => (
        <div key={r.label} className="w-48">
          <p className="mb-3 text-sm font-medium text-zinc-500">{r.label}</p>
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
        <p className="mb-3 text-sm font-medium text-zinc-500">แชมป์</p>
        <div className="flex h-[28rem] items-center">
          <div style={{ backgroundColor: accent }} className="flex w-full flex-col items-center gap-2 rounded-2xl px-4 py-6 text-center text-zinc-900">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl">★</span>
            <span className="text-sm font-semibold">ผู้ชนะเลิศ</span>
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
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sel.lines.join(" ")}
      onScroll={sel.cover ? (e) => setFade(Math.min(1, e.currentTarget.scrollTop / (window.innerHeight * 0.45))) : undefined}
      style={{ backgroundColor: sel.bg, color: sel.fg, animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }}
      className="fixed inset-0 z-[60] overflow-y-auto"
    >
      {sel.cover && (
        <div aria-hidden className="fixed inset-x-0 top-0 h-[62vh] overflow-hidden">
          <Image src={sel.cover} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,0) 30%, ${sel.bg} 100%)` }} />
          <div className="absolute inset-0" style={{ backgroundColor: sel.bg, opacity: fade * 0.92 }} />
        </div>
      )}
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-36 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge status={sel.status} />
            <span className="text-sm opacity-70">{sel.meta}</span>
          </div>
          <div className="flex gap-3">
            <HeartButton on={isSaved} onClick={() => toggleSave(sel.id)} />
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className={`${sel.cover ? "mt-[26vh]" : "mt-12"} grid gap-10 lg:grid-cols-2 lg:items-center`}>
          <div>
            <h2 className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-8xl">
              <TitleContent e={sel} logoClass="w-full max-w-[20rem] md:max-w-[28rem]" />
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 opacity-80">{sel.desc}</p>
            {sel.prize && (
              <div className="mt-6">
                <PrizeChip prize={sel.prize} />
              </div>
            )}
          </div>
          {sel.image ? (
            <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-zinc-900 lg:min-h-80">
              <Image src={sel.image} alt={sel.lines.join(" ")} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-[2rem] bg-white p-8">
              <div className="scale-110 md:scale-125">
                <EventVisual kind={sel.visual} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {sel.info.map(([label, value]) => (
            <div key={label} className="rounded-3xl bg-white/70 p-6">
              <p className="text-sm opacity-60">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[2rem] bg-white p-8 text-zinc-900">
          <h3 className="text-xl font-semibold tracking-tight">กติกา</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {sel.rules.map((r) => (
              <li key={r} className="flex gap-3 text-base leading-7 text-zinc-600">
                <span style={{ backgroundColor: sel.bg }} className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {sel.bracket && (
          <div className="mt-4 rounded-[2rem] bg-white p-8 text-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold tracking-tight">สายการแข่งขัน</h3>
              <span className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-4 text-xs font-semibold tracking-wide text-zinc-600">รอเริ่มแข่ง</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{sel.bracket.note}</p>
            <div className="mt-6 overflow-x-auto pb-2">
              <Bracket teams={sel.bracket.teams} accent={sel.bg} />
            </div>
            <p className="mt-3 text-xs text-zinc-400 sm:hidden">เลื่อนไปทางขวาเพื่อดูสายทั้งหมด</p>
          </div>
        )}
      </div>

      <div style={{ background: `linear-gradient(to top, ${sel.bg} 60%, transparent)` }} className="fixed inset-x-0 bottom-0 flex justify-center px-6 pb-6 pt-12">
        <button
          onClick={() => (sel.status === "NOW" ? onPlay() : toggleSave(sel.id))}
          style={{ backgroundColor: sel.fg }}
          className="h-14 w-full max-w-sm rounded-full text-base font-medium text-white transition-opacity hover:opacity-85"
        >
          {sel.status === "NOW" ? "เริ่มเล่น" : isSaved ? "บันทึกกิจกรรมแล้ว" : "บันทึกกิจกรรมนี้"}
        </button>
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
      style={{ backgroundColor: e.bg, color: e.fg }}
      className="relative flex min-h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] p-4 outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-blue-400"
    >
      {e.image ? (
        <>
          <Image src={e.image} alt="" fill sizes="(min-width: 640px) 480px, 100vw" className="object-cover" />
          <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(to right, ${e.bg} 0%, ${e.bg}F2 38%, ${e.bg}99 60%, ${e.bg}00 85%)` }} />
        </>
      ) : (
        <div aria-hidden className="absolute bottom-4 right-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white">
          <div className="scale-[0.25]">
            <EventVisual kind={e.visual} />
          </div>
        </div>
      )}
      <HeartButton on onClick={() => toggleSave(e.id)} className="absolute right-4 top-4 z-10" />
      <div className="relative z-10 flex items-center gap-2.5 pr-12">
        <Badge status={e.status} />
        <span className="text-xs opacity-70">{e.meta}</span>
      </div>
      <div className="relative z-10 max-w-[62%]">
        <h3 className="text-2xl font-semibold leading-[1.1] tracking-tight">
          <TitleContent e={e} logoClass="w-full max-w-[8rem]" />
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-70">{e.desc}</p>
      </div>
    </article>
  );
}