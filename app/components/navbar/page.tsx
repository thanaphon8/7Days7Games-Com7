"use client";

import Image from "next/image";
import Link from "next/link";
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
  if (avatar.endsWith(".png") || avatar.endsWith(".jpg") || avatar.endsWith(".jpeg") || avatar.endsWith(".webp")) {
    return `/img/${avatar}`;
  }

  return `/img/${avatar}.png`;
}

type NavbarProps = {
  saved: string[];
  profile: Profile | null;
  ready: boolean;
  onOpenFavorites: () => void;
};

export default function Navbar({ saved, profile, ready, onOpenFavorites }: NavbarProps) {
  return (
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
        <Link href="/rank" className="hover:opacity-60">อันดับ</Link>
        <button onClick={onOpenFavorites} className="flex items-center hover:opacity-60">
          รายการโปรด
          {saved.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-xs font-semibold text-white">{saved.length}</span>
          )}
        </button>
        <a href="#how" className="hover:opacity-60">วิธีเล่น</a>
      </nav>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFavorites}
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
        {!ready ? (
          <span className="h-10 w-10 animate-pulse rounded-full bg-zinc-200" />
        ) : profile ? (
          <Link
            href="/login/profile"
            aria-label="โปรไฟล์ของฉัน"
            className="flex items-center gap-3 rounded-full border border-black/[.08] p-1 transition-colors hover:bg-black/[.04] sm:pr-4"
          >
            {/* ใช้ <img> เผื่อกรณีไฟล์ไม่มีอยู่จริงจะติด Fallback onerror */}
            <img
              src={getAvatarSrc(profile.avatar)}
              alt={profile.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/img/p01.png";
              }}
            />
            <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{profile.name}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex h-10 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
}