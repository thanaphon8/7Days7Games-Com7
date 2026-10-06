"use client";

import { useState } from "react";
import {
  CloseButton,
  EVENTS,
  FavoriteCard,
  HEART_PATH,
  useOverlay,
} from "../events/page";

// ===== ประเภทข้อมูล Game สำหรับใช้ในรายการโปรด =====
export type Game = {
  id: string;
  name: string;
  desc: string;
  category: string;
  status: "NOW" | "SOON";
  time: string;
  tone: string;
  glyph: string;
  href?: string;
  image?: string;
  video?: string;
  scoring: string;
  rules: string[];
};

type Tab = "all" | "events" | "games";

const RED = "#ff2a55";
const GREEN = "#17FFA2";
const MUTED = "text-[#8fa6a1]";

const toneHex = (g: Game) => g.tone.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#52525B";

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือซ้อนๆ วิ่งช้าๆ ตลอดเวลา (CSS ล้วน ไม่ต้องใช้ JS)   */
/* ------------------------------------------------------------------ */

const STACK_WORD = "SAVED";
const STACK_SOLID = "YOUR FAVORITES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
// ยิ่งตัวเลขมาก ยิ่งวิ่งช้า (วินาทีต่อหนึ่งรอบ)
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex select-none flex-col justify-center overflow-hidden"
    >
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "fav-txt-outline opacity-50" : "fav-txt-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`fav-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
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
/*  ชิ้นส่วนเล็กๆ                                                      */
/* ------------------------------------------------------------------ */

// ไอคอนหัวใจ ใช้ซ้ำทั้งหน้า
function Heart({
  size,
  filled,
  stroke = "#cbd5d1",
  className,
}: {
  size: number;
  filled?: boolean;
  stroke?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? RED : "none"}
      stroke={filled ? RED : stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

// ปุ่มหัวใจสำหรับการ์ดเกมในรายการโปรด (สไตล์เดียวกับหน้าหลัก)
function HeartButton({
  saved,
  onToggle,
  label,
  size = 44,
}: {
  saved: boolean;
  onToggle: () => void;
  label: string;
  size?: number;
}) {
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
      <Heart size={size * 0.5} filled={saved} />
    </button>
  );
}

// ปุ่มเอียงแบบ esport
function EsButton({
  children,
  onClick,
  active = false,
  small = false,
  role,
  ariaSelected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  small?: boolean;
  role?: string;
  ariaSelected?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={ariaSelected}
      onClick={onClick}
      className={`fav-btn relative inline-flex shrink-0 items-center justify-center overflow-hidden font-bold uppercase tracking-wider outline-none transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 ${
        small ? "px-5 py-2.5 text-xs" : "px-7 py-3.5 text-xs"
      } ${
        active
          ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6]"
          : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] hover:shadow-[0_0_18px_rgba(23,255,162,0.3)]"
      }`}
    >
      <span className="fav-shine" aria-hidden="true" />
      <span className="relative inline-block">{children}</span>
    </button>
  );
}

// การ์ดเกม: มือถือเป็นแถวแนวนอน, จอใหญ่เป็นการ์ดแนวตั้ง
function FavoriteGameCard({
  game,
  onOpen,
  onToggle,
}: {
  game: Game;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const soon = game.status === "SOON";
  const accent = soon ? "#52525B" : toneHex(game);
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${game.name} กดเพื่อดูกติกา`}
      onClick={onOpen}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onOpen();
        }
      }}
      style={{ background: `linear-gradient(160deg, ${accent}55, #05080a 75%)` }}
      className="group relative flex min-h-36 cursor-pointer items-center gap-4 overflow-hidden border border-white/10 p-5 text-white outline-none transition-all duration-300 hover:-translate-y-1.5 hover:border-[#17FFA2] hover:shadow-[0_0_28px_rgba(23,255,162,0.25)] focus-visible:ring-4 focus-visible:ring-[#17FFA2] sm:min-h-72 sm:flex-col sm:items-stretch sm:justify-between sm:gap-6 sm:p-8"
    >
      {/* glyph ใหญ่จางๆ เป็นลายพื้นหลังการ์ด */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-2 select-none text-[9rem] font-bold leading-none text-black/30 transition-transform duration-500 group-hover:-translate-x-3 group-hover:scale-110"
      >
        {game.glyph}
      </span>

      <span
        style={{ borderColor: accent, color: accent }}
        className="relative flex h-20 w-20 shrink-0 items-center justify-center border-2 bg-black/40 text-5xl font-bold sm:h-24 sm:w-24 sm:text-6xl"
      >
        {game.glyph}
      </span>

      <div className="relative min-w-0 flex-1 sm:flex-none">
        <p className={`text-xs ${MUTED}`}>
          {game.category} · {game.time}
          {soon && " · เปิดเร็วๆ นี้"}
        </p>
        <h4 className="mt-1 truncate text-xl font-bold uppercase tracking-tight sm:text-3xl">{game.name}</h4>
        <p className={`mt-1 line-clamp-3 text-sm leading-5 sm:mt-2 sm:leading-6 ${MUTED}`}>{game.desc}</p>
      </div>

      <div className="relative shrink-0 sm:absolute sm:right-4 sm:top-4">
        <HeartButton saved onToggle={onToggle} label={game.name} size={44} />
      </div>
    </article>
  );
}

// หัวข้อของแต่ละส่วน พร้อมแท่งเอียงและจำนวน
function SectionTitle({ title, count, dot }: { title: string; count: number; dot: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        style={{ backgroundColor: dot, color: dot }}
        className="h-6 w-2 -skew-x-12 shadow-[0_0_12px_currentColor]"
      />
      <h3 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">{title}</h3>
      <span className="border border-[#17FFA2]/40 bg-[#17FFA2]/10 px-3 py-0.5 text-xs font-bold tabular-nums text-[#17FFA2]">
        {count}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAVORITES SHEET                                                    */
/* ------------------------------------------------------------------ */

type FavoritesSheetProps = {
  open: boolean;
  detailOpen: boolean;
  saved: string[];
  savedGames: string[];
  gamesList: Game[];
  toggleSave: (id: string) => void;
  toggleSaveGame: (id: string) => void;
  onOpenEvent: (id: string) => void;
  onOpenGame: (id: string) => void;
  onClose: () => void;
};

export default function FavoritesSheet({
  open,
  detailOpen,
  saved,
  savedGames,
  gamesList,
  toggleSave,
  toggleSaveGame,
  onOpenEvent,
  onOpenGame,
  onClose,
}: FavoritesSheetProps) {
  const [tab, setTab] = useState<Tab>("all");

  useOverlay(open && !detailOpen, onClose);
  if (!open) return null;

  const items = EVENTS.filter((e) => saved.includes(e.id));
  const games = gamesList.filter((g) => savedGames.includes(g.id));
  const total = items.length + games.length;

  // ถ้าแท็บที่เลือกไม่มีข้อมูลแล้ว (เช่น กดเอาออกจนหมด) ให้กลับไปแสดงทั้งหมด
  const activeTab: Tab =
    (tab === "events" && items.length === 0) || (tab === "games" && games.length === 0)
      ? "all"
      : tab;
  const showEvents = items.length > 0 && activeTab !== "games";
  const showGames = games.length > 0 && activeTab !== "events";

  const goTo = (hash: string) => {
    onClose();
    setTimeout(() => (window.location.hash = hash), 50);
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "ทั้งหมด", count: total },
    { id: "events", label: "กิจกรรม", count: items.length },
    { id: "games", label: "เกม", count: games.length },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="รายการโปรด"
      style={{
        animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)",
        backgroundSize: "56px 56px, 56px 56px, auto",
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] text-white"
    >
      <style>{`
        .fav-txt-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }
        .fav-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
        .fav-btn:hover .fav-shine { transform: translateX(120%); }
        @keyframes fav-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .fav-marquee { animation: fav-marquee linear infinite; will-change: transform; }
        @keyframes fav-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        .fav-rise { animation: fav-rise .6s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .fav-rise, .fav-marquee { animation: none !important; } }
      `}</style>

      <BackdropText />

      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-4 sm:gap-8 sm:px-6 sm:pt-6">
        {/* ===== ส่วนหัว ===== */}
        <header
          className="fav-rise relative overflow-hidden border border-[#17FFA2]/40 bg-[#0a1014]/90 p-6 shadow-[10px_10px_0_0_#ff2a55] backdrop-blur-sm sm:p-10"
          style={{ backgroundImage: "radial-gradient(circle at 90% 0%, rgba(23,255,162,0.18), transparent 55%)" }}
        >
          {/* หัวใจใหญ่จางๆ เป็นลายพื้นหลัง */}
          <Heart
            size={260}
            stroke={GREEN}
            className="pointer-events-none absolute -bottom-16 -right-10 rotate-12 opacity-20 sm:-bottom-24 sm:right-6 sm:h-[360px] sm:w-[360px]"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
              <h2 className="text-4xl font-bold uppercase leading-tight tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-6xl">
                รายการโปรด
              </h2>
              <p className={`mt-3 max-w-xs text-sm leading-6 sm:text-base ${MUTED}`}>
                {total > 0
                  ? "กิจกรรมและเกมที่คุณบันทึกไว้ดูทีหลัง"
                  : "กิจกรรมและเกมที่คุณกดหัวใจจะมาอยู่ที่นี่"}
              </p>
            </div>
            <CloseButton onClick={onClose} />
          </div>

          <dl className="relative mt-8 grid max-w-md grid-cols-2 gap-3 sm:mt-10">
            {[
              [items.length, "กิจกรรม"],
              [games.length, "เกม"],
            ].map(([n, label]) => (
              <div key={label} className="border border-white/10 bg-black/40 px-5 py-4 sm:py-5">
                <dd className="text-3xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)] sm:text-4xl">
                  {n}
                </dd>
                <dt className={`mt-0.5 text-sm ${MUTED}`}>{label}</dt>
              </div>
            ))}
          </dl>
        </header>

        {total === 0 ? (
          /* ===== สถานะว่าง: ลิงก์ลัดไปหน้า Events / เกม ===== */
          <section className="fav-rise flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
            <div className="flex flex-col items-center px-4 pt-4 text-center">
              <h3 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
                ยังไม่มีรายการโปรด
              </h3>
              <p className={`mt-2 max-w-sm text-sm leading-6 ${MUTED}`}>
                กดรูปหัวใจที่การ์ด Events หรือการ์ดเกม เพื่อบันทึกไว้ดูทีหลัง
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => goTo("#events")}
                style={{ background: "linear-gradient(160deg, #F4D35E55, #05080a 80%)" }}
                className="group flex min-h-40 items-end justify-between border border-white/10 p-6 text-left outline-none transition-all duration-300 hover:-translate-y-1.5 hover:border-[#17FFA2] hover:shadow-[0_0_28px_rgba(23,255,162,0.25)] focus-visible:ring-4 focus-visible:ring-[#17FFA2] sm:min-h-56"
              >
                <span>
                  <span className={`block text-sm ${MUTED}`}>กิจกรรมประจำสัปดาห์</span>
                  <span className="mt-1 block text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                    ดู Events
                  </span>
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#F4D35E] bg-black/40">
                  <Heart size={26} stroke="#F4D35E" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => goTo("#games")}
                style={{ background: "linear-gradient(160deg, #9CC59355, #05080a 80%)" }}
                className="group flex min-h-40 items-end justify-between border border-white/10 p-6 text-left outline-none transition-all duration-300 hover:-translate-y-1.5 hover:border-[#17FFA2] hover:shadow-[0_0_28px_rgba(23,255,162,0.25)] focus-visible:ring-4 focus-visible:ring-[#17FFA2] sm:min-h-56"
              >
                <span>
                  <span className={`block text-sm ${MUTED}`}>มินิเกมพักสมอง</span>
                  <span className="mt-1 block text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                    ดูเกม
                  </span>
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#9CC593] bg-black/40 text-3xl font-bold text-[#9CC593]">
                  ▦
                </span>
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* ===== ตัวกรอง: แสดงเมื่อมีทั้งกิจกรรมและเกม ===== */}
            {items.length > 0 && games.length > 0 && (
              <div
                role="tablist"
                aria-label="กรองรายการโปรด"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
              >
                {tabs.map((t) => (
                  <EsButton
                    key={t.id}
                    small
                    role="tab"
                    ariaSelected={activeTab === t.id}
                    active={activeTab === t.id}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                    <span className="ml-2 tabular-nums opacity-60">{t.count}</span>
                  </EsButton>
                ))}
              </div>
            )}

            {showEvents && (
              <section className="fav-rise" style={{ animationDelay: "100ms" }}>
                <SectionTitle title="กิจกรรม" count={items.length} dot="#F4D35E" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="[&>*]:h-full [&>*]:min-h-44 sm:[&>*]:min-h-72"
                    >
                      <FavoriteCard
                        e={e}
                        onOpen={() => onOpenEvent(e.id)}
                        toggleSave={toggleSave}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showGames && (
              <section className="fav-rise" style={{ animationDelay: "200ms" }}>
                <SectionTitle title="เกม" count={games.length} dot="#17FFA2" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
                  {games.map((g) => (
                    <FavoriteGameCard
                      key={g.id}
                      game={g}
                      onOpen={() => onOpenGame(g.id)}
                      onToggle={() => toggleSaveGame(g.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}