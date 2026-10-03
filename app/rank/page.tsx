"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const TONE = ["#F4D35E", "#A8B5E8", "#F4A58A"]; // สีอันดับ 1-3
const INK = ["#4A3B00", "#1F2A5C", "#4A2412"];
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];

interface PlayerRank {
  userId: string;
  name: string;
  avatar: string;
  games: number;
  score: number;
}

function Avatar({ id, size }: { id: string; size: string }) {
  const [failed, setFailed] = useState(false);
  
  const cleanId = id ? String(parseInt(id, 10)) : "1";

  if (failed || !id)
    return (
      <span
        style={{ backgroundColor: FALLBACK_BG[((Number(cleanId) || 1) - 1) % 4] }}
        className={`flex shrink-0 items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
      >
        {cleanId}
      </span>
    );

  return (
    <Image
      src={`/img/avatars/${cleanId}.png`}
      alt=""
      width={216}
      height={216}
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

export default function RankPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. ดึง ID ผู้ใช้ปัจจุบันจาก LocalStorage
    try {
      const v = localStorage.getItem("profile");
      if (v) {
        const profile = JSON.parse(v);
        setMyId(profile?.userId || profile?.id || profile?._id || null);
      } else {
        const directId = localStorage.getItem("userId");
        if (directId) setMyId(directId);
      }
    } catch {}

    // 2. ดึงข้อมูลรายชื่อและคะแนนโดยสั่งห้ามจำ Cache
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/user", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          const formatted: PlayerRank[] = result.data.map((user: any) => {
            const scores: Record<string, number> = user.gameScores || {};
            const scoreValues = Object.values(scores);
            
            const playedGames = scoreValues.filter((score) => Number(score) > 0).length;
            const totalScore = scoreValues.reduce((sum: number, score: any) => sum + (Number(score) || 0), 0);

            const fallbackEmailName = user.email ? user.email.split("@")[0] : null;
            const userName =
              user.name ||
              user.displayName ||
              user.username ||
              user.nickname ||
              fallbackEmailName ||
              "ผู้เล่นทั่วไป";

            return {
              userId: user.userId || user._id,
              name: userName,
              avatar: user.avatarId || user.avatar || "1",
              games: playedGames,
              score: totalScore,
            };
          });

          formatted.sort((a, b) => b.score - a.score);
          setRanking(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch ranking:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const top = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const order = ["", "md:order-2 md:-mt-6 md:pb-12 md:pt-14", "md:order-1", "md:order-3"];

  return (
    <div className="flex min-h-screen flex-col items-center bg-white font-sans text-zinc-900">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none !important; } }
      `}</style>

      <header className="flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="COM7 หน้าแรก" className="flex items-center">
          <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto origin-left scale-[2.1]" />
        </Link>
        <Link href="/" className="flex h-10 items-center rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04]">
          กลับหน้าแรก
        </Link>
      </header>

      <main className="w-full max-w-5xl px-6 pb-24">
        <div className="pt-6">
          <p className="text-sm text-zinc-500">7 Days 7 Games</p>
          <h1 className="mt-1 text-6xl font-semibold tracking-tight md:text-7xl">อันดับ</h1>
          <p className="mt-3 max-w-md text-base leading-7 text-zinc-500">
            แต้มรวมจากคะแนนสูงสุดของแต่ละเกม มีผู้เข้าร่วมทั้งหมด {ranking.length} คน
          </p>
        </div>

        {loading ? (
          <div className="mt-20 text-center text-zinc-400">กำลังโหลดข้อมูลอันดับ...</div>
        ) : ranking.length === 0 ? (
          <div className="mt-20 text-center text-zinc-400">ยังไม่มีข้อมูลอันดับในขณะนี้</div>
        ) : (
          <>
            {/* ===== 3 อันดับแรก ===== */}
            <ol className="mt-14 grid gap-4 md:grid-cols-3 md:items-end">
              {top.map((p, i) => {
                const rank = i + 1;
                const mine = myId ? p.userId === myId : false;
                return (
                  <li
                    key={p.userId || i}
                    style={{ backgroundColor: TONE[i], color: INK[i], animation: `rise 600ms ${i * 120}ms both cubic-bezier(.2,.8,.2,1)` }}
                    className={`rise relative flex flex-col items-center rounded-[2rem] px-6 pb-8 pt-10 text-center ${order[rank]} ${mine ? "ring-4 ring-zinc-900" : ""}`}
                  >
                    <span className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-sm font-semibold">{rank}</span>
                    <div className="relative mt-4">
                      {rank === 1 && <Crown className="absolute -top-9 left-1/2 w-14 -translate-x-1/2 -rotate-6" />}
                      <Avatar id={p.avatar} size={`${rank === 1 ? "h-28 w-28" : "h-24 w-24"} ring-4 ring-white/80`} />
                    </div>
                    <p className="mt-5 max-w-full truncate text-2xl font-semibold tracking-tight">
                      {p.name}
                      {mine && " (คุณ)"}
                    </p>
                    <p className="mt-1 text-sm opacity-60">เล่นแล้ว {p.games} เกม</p>
                    <p className="mt-5 text-5xl font-semibold tabular-nums tracking-tight">{p.score.toLocaleString()}</p>
                    <p className="mt-1 text-xs opacity-60">แต้ม</p>
                  </li>
                );
              })}
            </ol>

            {/* ===== อันดับที่ 4 เป็นต้นไป ===== */}
            {rest.length > 0 && (
              <ol className="mt-6 flex flex-col gap-3">
                {rest.map((p, i) => {
                  const mine = myId ? p.userId === myId : false;
                  return (
                    <li key={p.userId || i} className={`flex items-center gap-4 rounded-full bg-zinc-50 p-3 pr-6 ${mine ? "ring-2 ring-zinc-900" : ""}`}>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold ring-1 ring-black/5">{i + 4}</span>
                      <Avatar id={p.avatar} size="h-12 w-12" />
                      <span className="flex-1 truncate text-lg font-medium">
                        {p.name}
                        {mine && " (คุณ)"}
                      </span>
                      <span className="hidden text-sm text-zinc-500 sm:inline">{p.games} เกม</span>
                      <span className="w-24 text-right text-xl font-semibold tabular-nums">{p.score.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-[#A8B5E8] p-8 text-[#1F2A5C] sm:flex-row sm:items-center md:p-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">อยากขึ้นอันดับ</h2>
            <p className="mt-2 text-sm opacity-70">เล่นเกมเพิ่มเพื่อทำคะแนนสูงสุดของแต่ละเกมให้ดีขึ้น</p>
          </div>
          <Link href="/#games" className="inline-flex h-12 items-center rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-black">
            เลือกเกม
          </Link>
        </div>
      </main>
    </div>
  );
}