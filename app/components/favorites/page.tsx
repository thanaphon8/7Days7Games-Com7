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

// ไอคอนหัวใจ ใช้ซ้ำทั้งหน้า
function Heart({
  size,
  filled,
  stroke = "#71717A",
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
      fill={filled ? "#EF4444" : "none"}
      stroke={filled ? "#EF4444" : stroke}
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

// ปุ่มหัวใจสำหรับการ์ดเกมในรายการโปรด
function HeartButton({
  saved,
  onToggle,
  label,
  size = 40,
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
      className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-400 active:scale-95"
    >
      <Heart size={size * 0.45} filled={saved} />
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
      className={`relative flex cursor-pointer items-center gap-4 min-h-36 rounded-[2rem] p-5 outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-blue-400 sm:min-h-72 sm:flex-col sm:items-stretch sm:justify-between sm:gap-6 sm:p-8 ${
        soon ? "bg-zinc-100 text-zinc-700" : `${game.tone} text-zinc-900`
      }`}
    >
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/70 text-5xl font-light sm:h-24 sm:w-24 sm:text-6xl">
        {game.glyph}
      </span>

      <div className="min-w-0 flex-1 sm:flex-none">
        <p className="text-xs opacity-60">
          {game.category} · {game.time}
          {soon && " · เปิดเร็วๆ นี้"}
        </p>
        <h4 className="truncate text-xl font-semibold tracking-tight sm:text-3xl">
          {game.name}
        </h4>
        <p className="mt-1 line-clamp-3 text-sm leading-5 opacity-70 sm:mt-2 sm:text-base sm:leading-6">
          {game.desc}
        </p>
      </div>

      <div className="shrink-0 sm:absolute sm:right-6 sm:top-6">
        <HeartButton saved onToggle={onToggle} label={game.name} size={44} />
      </div>
    </article>
  );
}

// หัวข้อของแต่ละส่วน พร้อมจุดสีและจำนวน
function SectionTitle({ title, count, dot }: { title: string; count: number; dot: string }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ backgroundColor: dot }} className="h-3 w-3 rounded-full" />
      <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-medium tabular-nums text-zinc-500 ring-1 ring-black/5">
        {count}
      </span>
    </div>
  );
}

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
      style={{ animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }}
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-50 text-zinc-900"
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-4 sm:gap-8 sm:px-6 sm:pt-6">
        {/* ===== ส่วนหัวสีพาสเทล ===== */}
        <header className="relative overflow-hidden rounded-[2rem] bg-[#A8B5E8] p-6 text-[#1F2A5C] sm:p-10">
          {/* หัวใจใหญ่จางๆ เป็นลายพื้นหลัง */}
          <Heart
            size={260}
            stroke="#FFFFFF"
            className="pointer-events-none absolute -bottom-16 -right-10 rotate-12 opacity-30 sm:-bottom-24 sm:right-6 sm:h-[360px] sm:w-[360px]"
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                รายการโปรด
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 opacity-70 sm:text-base">
                {total > 0
                  ? "กิจกรรมและเกมที่คุณบันทึกไว้ดูทีหลัง"
                  : "กิจกรรมและเกมที่คุณกดหัวใจจะมาอยู่ที่นี่"}
              </p>
            </div>
            <CloseButton onClick={onClose} className="!bg-white/70 !shadow-none" />
          </div>

          <dl className="relative mt-8 grid max-w-md grid-cols-2 gap-3 sm:mt-10">
            {[
              [items.length, "กิจกรรม"],
              [games.length, "เกม"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-3xl bg-white/70 px-5 py-4 sm:py-5">
                <dd className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                  {n}
                </dd>
                <dt className="mt-0.5 text-sm opacity-70">{label}</dt>
              </div>
            ))}
          </dl>
        </header>

        {total === 0 ? (
          /* ===== สถานะว่าง: ลิงก์ลัดสีพาสเทลไปหน้า Events / เกม ===== */
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-center px-4 pt-4 text-center">
              <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                ยังไม่มีรายการโปรด
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                กดรูปหัวใจที่การ์ด Events หรือการ์ดเกม เพื่อบันทึกไว้ดูทีหลัง
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => goTo("#events")}
                className="flex min-h-40 items-end justify-between rounded-[2rem] bg-[#F4D35E] p-6 text-left text-zinc-900 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-blue-400 sm:min-h-56"
              >
                <span>
                  <span className="block text-sm opacity-60">กิจกรรมประจำสัปดาห์</span>
                  <span className="mt-1 block text-2xl font-semibold tracking-tight sm:text-3xl">
                    ดู Events
                  </span>
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/70">
                  <Heart size={26} stroke="#27272A" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => goTo("#games")}
                className="flex min-h-40 items-end justify-between rounded-[2rem] bg-[#9CC593] p-6 text-left text-zinc-900 outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-blue-400 sm:min-h-56"
              >
                <span>
                  <span className="block text-sm opacity-60">มินิเกมพักสมอง</span>
                  <span className="mt-1 block text-2xl font-semibold tracking-tight sm:text-3xl">
                    ดูเกม
                  </span>
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/70 text-3xl font-light">
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
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-blue-400 ${
                      activeTab === t.id
                        ? "bg-zinc-900 text-white"
                        : "bg-white ring-1 ring-black/[.08] hover:bg-black/[.04]"
                    }`}
                  >
                    {t.label}
                    <span className="ml-2 tabular-nums opacity-60">{t.count}</span>
                  </button>
                ))}
              </div>
            )}

            {showEvents && (
              <section>
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
              <section>
                <SectionTitle title="เกม" count={games.length} dot="#9CC593" />
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