"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// ===== ข้อมูลตัวอย่าง (ยังไม่เชื่อมระบบ) =====
type Status = "NOW" | "SOON";
type Game = {
  id: string;
  name: string;
  desc: string;
  category: string;
  status: Status;
  time: string;
  tone: string;
  glyph: string;
};

const GAMES: Game[] = [
  { id: "memory", name: "จับคู่ความจำ", desc: "พลิกการ์ดให้เจอคู่เหมือนในจำนวนครั้งน้อยที่สุด", category: "ความจำ", status: "NOW", time: "3 นาที", tone: "bg-[#F4D35E]", glyph: "◐" },
  { id: "2048", name: "2048", desc: "รวมเลขเท่ากันให้ได้ 2048 ก่อนช่องเต็ม", category: "ตรรกะ", status: "NOW", time: "10 นาที", tone: "bg-[#F4A58A]", glyph: "▦" },
  { id: "snake", name: "งูน้อย", desc: "กินให้ยาว หลบกำแพงและหางตัวเอง", category: "อาร์เคด", status: "NOW", time: "5 นาที", tone: "bg-[#A8B5E8]", glyph: "∿" },
  { id: "reaction", name: "วัดปฏิกิริยา", desc: "กดให้ไวที่สุดเมื่อสีเปลี่ยน", category: "อาร์เคด", status: "NOW", time: "1 นาที", tone: "bg-[#B7CBB0]", glyph: "◉" },
  { id: "quiz", name: "ควิซประจำวัน", desc: "คำถามใหม่ทุกวัน สะสมสถิติตอบถูกต่อเนื่อง", category: "ความจำ", status: "SOON", time: "2 นาที", tone: "", glyph: "？" },
  { id: "words", name: "ไล่หาคำ", desc: "หาคำศัพท์ที่ซ่อนในตารางตัวอักษรให้ครบก่อนหมดเวลา", category: "ตรรกะ", status: "SOON", time: "4 นาที", tone: "", glyph: "Ａ" },
  { id: "xo", name: "XO ท้าบอท", desc: "เกมคลาสสิกกับบอทที่เก่งขึ้นเรื่อยๆ", category: "ตรรกะ", status: "SOON", time: "1 นาที", tone: "", glyph: "✕" },
];

const TOP = [
  { name: "ณัฐ", total: 3420, games: 4 },
  { name: "มินท์", total: 3180, games: 4 },
  { name: "ปิ่น", total: 2960, games: 3 },
];

const STEPS = [
  { title: "สมัครเข้าร่วม", desc: "ใช้อีเมลบริษัทและตั้งชื่อที่จะแสดงบนอันดับ" },
  { title: "เลือกเกมแล้วเล่น", desc: "เล่นคนเดียว แต่ละเกมจบภายในไม่กี่นาที" },
  { title: "สะสมแต้ม", desc: "นับจากคะแนนสูงสุดของแต่ละเกมมารวมกัน" },
  { title: "ประกาศผู้ชนะ", desc: "เมื่อกิจกรรมสิ้นสุด ผู้ที่แต้มสูงสุดคือผู้ชนะ" },
];

const CATEGORIES = ["ทั้งหมด", "ความจำ", "ตรรกะ", "อาร์เคด"];
const PODIUM = ["bg-[#F4D35E]", "bg-[#A8B5E8]", "bg-[#F4A58A]"];

function Badge({ status }: { status: Status }) {
  const now = status === "NOW";
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold tracking-wide ${
        now ? "bg-white/70 text-zinc-900" : "bg-black/10 text-zinc-600"
      }`}
    >
      {status}
    </span>
  );
}

// ===== Events: ประกาศกิจกรรม/การแข่งขันที่กำลังจะจัด (ข้อมูลตัวอย่าง แก้ได้เลย) =====
type EventItem = {
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
  info: [string, string][]; // การ์ดข้อมูลในหน้ารายละเอียด
  rules: string[]; // กติกา
};

const EVENTS: EventItem[] = [
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
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={open[i] ? { backgroundColor: open[i][0] } : undefined} className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-zinc-900 ${open[i] ? "" : "bg-zinc-900"}`}>
            {open[i]?.[1]}
          </div>
        ))}
      </div>
    );
  }
  if (kind === "tiles") {
    return (
      <div className="grid grid-cols-3 gap-3">
        {["2", "4", "8", "16", "32", "64", "128", "256", "512"].map((n, i) => (
          <div key={n} style={{ backgroundColor: TILE_COLORS[i % 4] }} className="flex h-20 w-20 items-center justify-center rounded-2xl text-xl font-semibold text-zinc-900">
            {n}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {["#F4D35E", "#A8B5E8", "#B7CBB0", "#B7CBB0", "#F4A58A", "#F4D35E", "#A8B5E8", "#F4D35E", "#F4A58A"].map((c, i) => (
        <div key={i} style={{ backgroundColor: c }} className={`h-20 w-20 ${i % 4 === 0 ? "rounded-full" : i % 4 === 2 ? "rounded-t-full rounded-b-xl" : "rounded-2xl"}`} />
      ))}
    </div>
  );
}

const SLIDE_MS = 5000;

function HeartButton({ on, onClick, className = "", tabIndex = 0 }: { on: boolean; onClick: () => void; className?: string; tabIndex?: number }) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-pressed={on}
      aria-label={on ? "ยกเลิกการบันทึกกิจกรรม" : "บันทึกกิจกรรม"}
      onClick={(e) => {
        e.stopPropagation(); // กดหัวใจต้องไม่เปิดหน้ารายละเอียด
        onClick();
      }}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill={on ? "#E5484D" : "none"}
        stroke={on ? "#E5484D" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: on ? "heart-pop 380ms ease-out" : undefined }}
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}

function EventsCarousel({ saved, toggleSave, setOpenId, overlayOpen }: { saved: string[]; toggleSave: (id: string) => void; setOpenId: (id: string | null) => void; overlayOpen: boolean }) {
  const n = EVENTS.length;
  const slides = [...EVENTS, EVENTS[0]]; // ท้ายสุดเป็นสำเนาใบแรก เพื่อให้วนต่อเนื่องไม่กระตุก
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // เลื่อนอัตโนมัติ (หยุดเมื่อเอาเมาส์ชี้ หรือเปิดหน้ารายละเอียดอยู่)
  useEffect(() => {
    if (paused || reduced || overlayOpen) return;
    const t = setInterval(() => {
      setAnimate(true);
      setIndex((i) => (i >= n ? i : i + 1));
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [paused, reduced, overlayOpen, n]);

  function onEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget || index !== n) return;
    setAnimate(false); // กระโดดกลับใบแรกแบบไม่เห็นการเลื่อน
    setIndex(0);
    setTimeout(() => setAnimate(true), 60);
  }

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

      <div className="overflow-hidden rounded-[2rem]">
        <div
          onTransitionEnd={onEnd}
          className="flex gap-4"
          style={{
            transform: `translateX(calc(${-index * 100}% - ${index}rem))`,
            transition: animate && !reduced ? "transform 700ms cubic-bezier(.65,0,.35,1)" : "none",
          }}
        >
          {slides.map((e, i) => {
            const Title = i === 0 ? "h1" : "h2";
            const clone = i === n;
            const stop = (ev: React.MouseEvent) => ev.stopPropagation();
            return (
              <article
                key={`${e.id}-${i}`}
                aria-hidden={clone}
                aria-label={`${e.lines.join(" ")} กดเพื่อดูรายละเอียด`}
                tabIndex={clone ? -1 : 0}
                onClick={() => setOpenId(e.id)}
                onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && setOpenId(e.id)}
                style={{ backgroundColor: e.bg, color: e.fg }}
                className="relative grid w-full shrink-0 cursor-pointer overflow-hidden rounded-[2rem] p-5 outline-none focus-visible:ring-4 focus-visible:ring-blue-400 md:grid-cols-2 md:p-6"
              >
                <HeartButton
                  on={saved.includes(e.id)}
                  onClick={() => toggleSave(e.id)}
                  tabIndex={clone ? -1 : 0}
                  className="absolute right-5 top-5 z-10 md:right-6 md:top-6"
                />
                <div className="flex flex-col justify-between gap-16 p-3 md:p-6">
                  <div className="flex items-center gap-3">
                    <Badge status={e.status} />
                    <span className="text-sm opacity-70">{e.meta}</span>
                  </div>
                  <div>
                    <Title className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                      {e.lines[0]}
                      <br />
                      {e.lines[1]}
                    </Title>
                    <p className="mt-5 max-w-xs text-base leading-7 opacity-70">{e.desc}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <a href={e.href} onClick={e.href === "#" ? (ev) => { ev.preventDefault(); } : stop} tabIndex={clone ? -1 : 0} style={{ backgroundColor: e.fg }} className="inline-flex h-12 items-center rounded-full px-6 text-sm font-medium text-white transition-opacity hover:opacity-85">
                        {e.cta}
                      </a>
                      {i === 0 && (
                        <a href="#how" onClick={stop} tabIndex={clone ? -1 : 0} style={{ borderColor: `${e.fg}33` }} className="inline-flex h-12 items-center rounded-full border px-6 text-sm font-medium transition-colors hover:bg-black/5">
                          วิธีเล่น
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex min-h-72 items-center justify-center rounded-3xl bg-white p-6">
                  <EventVisual kind={e.visual} />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {EVENTS.map((e, i) => (
          <button
            key={e.id}
            aria-label={`ไปที่ Event ${i + 1}`}
            aria-current={index % n === i}
            onClick={() => {
              setAnimate(true);
              setIndex(i);
            }}
            className={`h-2.5 rounded-full transition-all duration-300 ${index % n === i ? "w-8 bg-zinc-900" : "w-2.5 bg-zinc-300 hover:bg-zinc-400"}`}
          />
        ))}
      </div>

    </section>
  );
}

const HEART_PATH = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z";

// ล็อกการเลื่อนหน้าหลังตอนเปิดหน้าเต็มจอ + กด Esc เพื่อปิด
function useOverlay(active: boolean, onClose: () => void) {
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

function CloseButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      autoFocus
      aria-label="ปิด"
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

// ===== หน้ารายละเอียดกิจกรรมเต็มจอ =====
function EventDetail({ sel, saved, toggleSave, onClose, onPlay }: { sel: EventItem | null; saved: string[]; toggleSave: (id: string) => void; onClose: () => void; onPlay: () => void }) {
  useOverlay(!!sel, onClose);
  if (!sel) return null;
  const isSaved = saved.includes(sel.id);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sel.lines.join(" ")}
      style={{ backgroundColor: sel.bg, color: sel.fg, animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }}
      className="fixed inset-0 z-[60] overflow-y-auto"
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-36 pt-6">
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

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-8xl">
              {sel.lines[0]}
              <br />
              {sel.lines[1]}
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 opacity-80">{sel.desc}</p>
          </div>
          <div className="flex min-h-72 items-center justify-center rounded-[2rem] bg-white p-8">
            <div className="scale-110 md:scale-125">
              <EventVisual kind={sel.visual} />
            </div>
          </div>
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

// ===== รายการโปรด: กิจกรรมที่ผู้ใช้กดหัวใจไว้ =====
function FavoritesSheet({ open, detailOpen, saved, toggleSave, onOpenEvent, onClose }: { open: boolean; detailOpen: boolean; saved: string[]; toggleSave: (id: string) => void; onOpenEvent: (id: string) => void; onClose: () => void }) {
  useOverlay(open && !detailOpen, onClose);
  if (!open) return null;
  const items = EVENTS.filter((e) => saved.includes(e.id));
  return (
    <div role="dialog" aria-modal="true" aria-label="รายการโปรด" style={{ animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }} className="fixed inset-0 z-50 overflow-y-auto bg-white text-zinc-900">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-16 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">รายการโปรด</h2>
            <p className="mt-2 text-sm text-zinc-500">{items.length > 0 ? `บันทึกไว้ ${items.length} กิจกรรม` : "กิจกรรมที่คุณกดหัวใจจะมาอยู่ที่นี่"}</p>
          </div>
          <CloseButton onClick={onClose} className="!bg-zinc-100 !shadow-none" />
        </div>

        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-[2rem] bg-zinc-50 px-6 py-20 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={HEART_PATH} />
              </svg>
            </span>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">ยังไม่มีรายการโปรด</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">กดรูปหัวใจที่การ์ด Events เพื่อบันทึกกิจกรรมที่สนใจไว้ดูทีหลัง</p>
            <button
              onClick={() => {
                onClose();
                setTimeout(() => (window.location.hash = "#events"), 50);
              }}
              className="mt-6 h-12 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              ดู Events
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {items.map((e) => (
              <article
                key={e.id}
                tabIndex={0}
                onClick={() => onOpenEvent(e.id)}
                onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && onOpenEvent(e.id)}
                style={{ backgroundColor: e.bg, color: e.fg }}
                className="relative flex min-h-64 cursor-pointer flex-col justify-between rounded-[2rem] p-6 outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
              >
                <HeartButton on onClick={() => toggleSave(e.id)} className="absolute right-5 top-5" />
                <div className="flex items-center gap-3 pr-14">
                  <Badge status={e.status} />
                  <span className="text-sm opacity-70">{e.meta}</span>
                </div>
                <div>
                  <h3 className="text-4xl font-semibold leading-[1.1] tracking-tight">
                    {e.lines[0]}
                    <br />
                    {e.lines[1]}
                  </h3>
                  <p className="mt-3 line-clamp-2 max-w-xs text-sm leading-6 opacity-70">{e.desc}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [cat, setCat] = useState("ทั้งหมด");
  const [saved, setSaved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [favOpen, setFavOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("savedEvents");
      if (v) setSaved(JSON.parse(v));
    } catch {}
  }, []);

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // TODO: ส่งไปบันทึกกับบัญชีผู้ใช้จริงทีหลัง (ตอนนี้เก็บในเบราว์เซอร์)
      try {
        localStorage.setItem("savedEvents", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  const list = GAMES.filter((g) => cat === "ทั้งหมด" || g.category === cat);

  return (
    <div className="flex min-h-screen flex-col items-center bg-white font-sans text-zinc-900">
      {/* ===== เมนู ===== */}
      <header className="flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <a href="#" aria-label="COM7 หน้าแรก" className="flex items-center">
          <Image
            src="/img/com7logo.png"
            alt="COM7"
            width={120}
            height={36}
            priority
            className="h-9 w-auto origin-left scale-[2.1]"
          />
        </a>
        <nav className="hidden gap-10 text-sm font-medium sm:flex">
          <a href="#events" className="hover:opacity-60">Events</a>
          <a href="#games" className="hover:opacity-60">เกมทั้งหมด</a>
          <a href="#ranking" className="hover:opacity-60">อันดับ</a>
          <button onClick={() => setFavOpen(true)} className="flex items-center hover:opacity-60">
            รายการโปรด
            {saved.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-xs font-semibold text-white">{saved.length}</span>
            )}
          </button>
          <a href="#how" className="hover:opacity-60">วิธีเล่น</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFavOpen(true)}
            aria-label="รายการโปรด"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-black/[.04] sm:hidden"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill={saved.length ? "#E5484D" : "none"} stroke={saved.length ? "#E5484D" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={HEART_PATH} />
            </svg>
            {saved.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-semibold text-white">{saved.length}</span>
            )}
          </button>
          <a
            href="/login"
            className="flex h-10 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            เข้าสู่ระบบ
          </a>
        </div>
      </header>

      <main className="flex w-full max-w-5xl flex-col gap-6 px-6 pb-24">
        {/* ===== Events (เลื่อนอัตโนมัติ) ===== */}
        <EventsCarousel saved={saved} toggleSave={toggleSave} setOpenId={setOpenId} overlayOpen={!!openId || favOpen} />

        {/* ===== ตัวเลขสรุป ===== */}
        <section className="grid grid-cols-3 gap-3">
          {[
            ["50", "ผู้เข้าร่วม"],
            ["4/7", "เกมที่เปิดแล้ว"],
            ["4", "วันที่เหลือ"],
          ].map(([n, label]) => (
            <div key={label} className="rounded-3xl bg-zinc-50 px-5 py-6 text-center">
              <p className="text-4xl font-semibold tabular-nums tracking-tight">{n}</p>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </section>

        {/* ===== เกม ===== */}
        <div id="games" className="flex flex-wrap items-center justify-between gap-4 pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">เกมทั้งหมด</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                  cat === c
                    ? "bg-zinc-900 text-white"
                    : "border border-black/[.08] hover:bg-black/[.04]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <section className="grid gap-5 sm:grid-cols-2">
          {list.map((g) => {
            const soon = g.status === "SOON";
            return (
              <article
                key={g.id}
                className={`flex min-h-72 flex-col justify-between rounded-[2rem] p-6 ${
                  soon ? "bg-zinc-100 text-zinc-700" : `${g.tone} text-zinc-900`
                }`}
              >
                <div className="flex items-start justify-between">
                  <Badge status={g.status} />
                  <span className="text-6xl font-light leading-none opacity-80">{g.glyph}</span>
                </div>
                <div>
                  <p className="text-sm opacity-60">{g.category} · {g.time}</p>
                  <h3 className="mt-1 text-3xl font-semibold tracking-tight">{g.name}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 opacity-70">{g.desc}</p>
                  <button
                    disabled={soon}
                    className="mt-5 inline-flex h-11 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-zinc-500"
                  >
                    {soon ? "เปิดเร็วๆ นี้" : "เล่นเกม"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* ===== อันดับ ===== */}
        <section id="ranking" className="grid gap-6 pt-10 md:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">ผู้นำตอนนี้</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                แต้มรวมจากคะแนนสูงสุดของแต่ละเกม อัปเดตทุกครั้งที่มีคนเล่นจบ
              </p>
            </div>
            <a href="#" className="inline-flex h-11 w-fit items-center rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04]">
              ดูอันดับทั้งหมด
            </a>
          </div>
          <ol className="flex flex-col gap-3">
            {TOP.map((r, i) => (
              <li key={r.name} className={`flex items-center gap-4 rounded-full p-3 text-zinc-900 ${PODIUM[i]}`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-base font-semibold">{i + 1}</span>
                <span className="flex-1 truncate text-lg font-medium">{r.name}</span>
                <span className="text-sm opacity-60">{r.games} เกม</span>
                <span className="w-20 pr-3 text-right text-xl font-semibold tabular-nums">{r.total}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ===== วิธีเล่น ===== */}
        <section id="how" className="pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">วิธีเล่น</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl bg-zinc-50 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ===== ปิดท้าย ===== */}
        <section className="mt-10 flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-[#A8B5E8] p-8 text-[#1F2A5C] sm:flex-row sm:items-center md:p-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">พร้อมเล่นรอบแรกหรือยัง</h2>
            <p className="mt-2 text-sm opacity-70">สมัครใช้เวลาไม่ถึงหนึ่งนาที</p>
          </div>
          <a href="/login#signup" className="inline-flex h-12 items-center rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-black">
            สมัครเข้าร่วม
          </a>
        </section>
      </main>

      <footer className="w-full max-w-5xl border-t border-black/[.08] px-6 py-8 text-sm text-zinc-500">
        7 Days 7 Games · มินิเกมสำหรับพักสมอง
      </footer>

      <FavoritesSheet open={favOpen} detailOpen={!!openId} saved={saved} toggleSave={toggleSave} onOpenEvent={setOpenId} onClose={() => setFavOpen(false)} />
      <EventDetail
        sel={EVENTS.find((e) => e.id === openId) ?? null}
        saved={saved}
        toggleSave={toggleSave}
        onClose={() => setOpenId(null)}
        onPlay={() => {
          setOpenId(null);
          setFavOpen(false);
          setTimeout(() => (window.location.hash = "#games"), 50);
        }}
      />
    </div>
  );
}