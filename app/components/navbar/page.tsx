"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HEART_PATH } from "../events/page";

export type Profile = { userId?: string; name: string; avatar: string };

// Helper สำหรับดึง URL ของ Avatar จาก public/img/ โดยตรง
export function getAvatarSrc(avatar?: string) {
  if (!avatar) return "/img/p01.png"; // Default รูปถ้าไม่มีข้อมูล

  // หากเป็น URL เต็ม หรือ Data URL (Base64)
  if (avatar.startsWith("http") || avatar.startsWith("data:")) {
    return avatar;
  }

  // หากมี Path นำหน้าเป็น /img/ หรือ / แล้ว ให้ใช้นั้นเลย
  if (avatar.startsWith("/")) {
    return avatar;
  }

  // ถ้าส่งมาเป็น "p24.png" หรือ "p24" หรือ "24"
  if (
    avatar.endsWith(".png") ||
    avatar.endsWith(".jpg") ||
    avatar.endsWith(".jpeg") ||
    avatar.endsWith(".webp")
  ) {
    return `/img/${avatar}`;
  }

  return `/img/${avatar}.png`;
}

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" aria-hidden className={`drop-shadow ${className}`}>
      <path
        d="M3 9l6 5 7-10 7 10 6-5-3 13H6L3 9z"
        fill="#F4D35E"
        stroke="#4A3B00"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {[[3, 9], [16, 4], [29, 9]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2" fill="#F4D35E" stroke="#4A3B00" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

type NavbarProps = {
  saved: string[];
  profile: Profile | null;
  ready: boolean;
  isFirst: boolean;
  score: number | null; // คะแนนรวมของผู้ใช้ (null = ยังไม่มีข้อมูล)
  onOpenFavorites: () => void;
};

const COUNT_MS = 1200; // ระยะเวลาเลขไล่ขึ้น
const START_DELAY_MS = 500; // หน่วงก่อนเริ่มเอฟเฟกต์ ให้ผู้เล่นเห็นหน้าก่อน

export default function Navbar({
  saved,
  profile,
  ready,
  isFirst,
  score,
  onOpenFavorites,
}: NavbarProps) {
  const userId = profile?.userId;
  const [shown, setShown] = useState<number | null>(null); // คะแนนที่แสดงอยู่ (ไล่ขึ้นทีละน้อย)
  const [gain, setGain] = useState<number | null>(null); // คะแนนที่เพิ่มมา ใช้โชว์ +N
  const [bump, setBump] = useState(false);

  // ถ้าเพิ่งเล่นเกมจบแล้วมีแต้มเพิ่ม (หน้าเกมจดไว้ที่ scoreGain:<userId>) ให้เล่นเอฟเฟกต์ตามแต้มนั้น
  useEffect(() => {
    if (score === null || !userId) {
      setShown(null);
      return;
    }

    const key = `scoreGain:${userId}`;
    let pending = 0;
    try {
      pending = Number(localStorage.getItem(key)) || 0;
    } catch {}

    const diff = Math.min(pending, score);
    if (diff <= 0) {
      if (pending > 0) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
      setShown(score);
      return;
    }

    const from = score - diff;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    setShown(from);

    const startTimer = setTimeout(() => {
      try {
        localStorage.removeItem(key); // ใช้แล้วลบทิ้ง จะได้ไม่เล่นซ้ำ
      } catch {}
      setGain(diff);
      setBump(true);
      if (reduce) {
        setShown(score);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / COUNT_MS);
        setShown(Math.round(from + diff * (1 - Math.pow(1 - t, 3)))); // ease-out
        if (t < 1) raf = requestAnimationFrame(tick);
        else setBump(false);
      };
      raf = requestAnimationFrame(tick);
    }, START_DELAY_MS);

    const hideTimer = setTimeout(() => {
      setGain(null);
      setBump(false);
    }, START_DELAY_MS + 2600);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(hideTimer);
      cancelAnimationFrame(raf);
    };
  }, [score, userId]);

  return (
    <header className="sticky top-0 z-40 flex w-full justify-center bg-black/50 text-white backdrop-blur-xl backdrop-saturate-150">
      <div className="flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <style>{`
          @keyframes score-gain {
            0%   { opacity: 0; transform: translateY(-10px) scale(.6); }
            20%  { opacity: 1; transform: translateY(2px) scale(1.15); }
            75%  { opacity: 1; transform: translateY(12px) scale(1); }
            100% { opacity: 0; transform: translateY(22px) scale(1); }
          }
          .score-gain { animation: score-gain 2400ms cubic-bezier(.2,.8,.2,1) both; }
          @media (prefers-reduced-motion: reduce) { .score-gain { animation: none; } }
        `}</style>

        {/* Logo COM7 กลับหน้าแรก (แปลงเป็นสีขาวให้เห็นชัดบนพื้นดำ) */}
        <Link href="/" aria-label="COM7 หน้าแรก" className="flex items-center">
          <Image
            src="/img/com7logo.png"
            alt="COM7"
            width={213}
            height={64}
            priority
            className="h-16 w-auto object-contain brightness-0 invert"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-white sm:flex">
          <a href="#events" className="transition-opacity hover:opacity-60">
            Events
          </a>
          <a href="#games" className="transition-opacity hover:opacity-60">
            เกมทั้งหมด
          </a>
          <Link href="/rank" className="transition-opacity hover:opacity-60">
            อันดับ
          </Link>
          <button
            onClick={onOpenFavorites}
            className="flex items-center transition-opacity hover:opacity-60"
          >
            รายการโปรด
            {saved.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-xs font-semibold text-white">
                {saved.length}
              </span>
            )}
          </button>
          <a href="#how" className="transition-opacity hover:opacity-60">
            วิธีเล่น
          </a>
        </nav>

        {/* Right Section (Mobile Fav Icon + Score + Profile) */}
        <div className="flex items-center gap-3">
          {/* ปุ่มรายการโปรดสำหรับมือถือ */}
          <button
            onClick={onOpenFavorites}
            aria-label="รายการโปรด"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill={saved.length ? "#E5484D" : "none"}
              stroke={saved.length ? "#E5484D" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={HEART_PATH} />
            </svg>
            {saved.length > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-black">
                {saved.length}
              </span>
            )}
          </button>

          {/* คะแนนสะสม */}
          {ready && profile && shown !== null && (
            <div className="relative" title="คะแนนรวมของคุณ">
              <span
                aria-label={`คะแนนรวม ${shown} แต้ม`}
                className={`flex h-10 items-center gap-1.5 rounded-full bg-[#F4D35E] px-3.5 text-sm font-semibold tabular-nums text-[#4A3B00] transition-all duration-300 ${
                  bump ? "scale-110 ring-4 ring-[#F4D35E]/40" : ""
                }`}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
                  <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                </svg>
                {shown.toLocaleString()}
              </span>
              {gain !== null && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-full z-30 mt-1 flex justify-center"
                >
                  <span className="score-gain rounded-full bg-[#1F9D55] px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
                    +{gain.toLocaleString()}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* โปรไฟล์ / ปุ่มเข้าสู่ระบบ */}
          {!ready ? (
            <span className="h-10 w-10 animate-pulse rounded-full bg-zinc-700" />
          ) : profile ? (
            <Link
              href="/login/profile"
              aria-label="โปรไฟล์ของฉัน"
              className="flex items-center gap-3 rounded-full border border-white/20 p-1 text-white transition-colors hover:bg-white/10 sm:pr-4"
            >
              <span className="relative shrink-0">
                {isFirst && (
                  <Crown className="absolute -top-4 left-1/2 w-6 -translate-x-1/2 -rotate-6" />
                )}
                <img
                  src={getAvatarSrc(profile.avatar)}
                  alt={profile.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/img/p01.png";
                  }}
                />
              </span>
              <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                {profile.name}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-10 items-center rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}