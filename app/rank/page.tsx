"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const TONE = ["#F4D35E", "#A8B5E8", "#F4A58A"]; // สีอันดับ 1-3
const INK = ["#4A3B00", "#1F2A5C", "#4A2412"];
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];
const PAPER = ["#F4D35E", "#A8B5E8", "#F4A58A", "#B7CBB0", "#FFFFFF"]; // สีกระดาษพลุ (โทนเดียวกับธีม)
const COUNT_MS = 2000; // เวลาที่เลขคะแนนวิ่ง

interface PlayerRank {
  userId: string;
  name: string;
  avatar: string;
  games: number;
  score: number;
}

type Piece = { id: number; ox: number; oy: number; x: number; y: number; r: number; w: number; h: number; c: string; d: number; dur: number; round: boolean };

// Helper แปลง Path รูปภาพให้อยู่ใน public/img/
function getAvatarSrc(id?: string) {
  if (!id) return "/img/p01.png";

  // หากเป็น URL เต็ม หรือ Data URL
  if (id.startsWith("http") || id.startsWith("data:")) return id;

  // หากมี / นำหน้าแล้ว
  if (id.startsWith("/")) return id;

  // ถ้าส่งมาแบบมี นามสกุลไฟล์ เช่น "p24.png"
  if (id.endsWith(".png") || id.endsWith(".jpg") || id.endsWith(".jpeg") || id.endsWith(".webp")) {
    return `/img/${id}`;
  }

  // กรณีเป็น "p24" หรือ "24" หรือ "01"
  return `/img/${id.startsWith("p") ? id : `p${id}`}.png`;
}

function Avatar({ id, size }: { id: string; size: string }) {
  const [failed, setFailed] = useState(false);
  const imgSrc = getAvatarSrc(id);

  if (failed) {
    const num = Number(id?.replace(/\D/g, "")) || 1;
    return (
      <span
        style={{ backgroundColor: FALLBACK_BG[(num - 1) % 4] }}
        className={`flex shrink-0 items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
      >
        {num}
      </span>
    );
  }

  return (
    <Image
      src={imgSrc}
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
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
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

export default function RankPage() {
  const [myId, setMyId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const firstRef = useRef<HTMLLIElement>(null);

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
              avatar: user.avatarId || user.avatar || "p01",
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

  // พลุกระดาษ: ยิงจากมุมบนซ้าย-ขวาของการ์ดอันดับ 1 พุ่งขึ้นเฉียงเข้าหากลาง แล้วค่อยๆ ร่วงลง
  function fire() {
    setDone(true);
    const el = firstRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const out: Piece[] = [];
    const per = 22;
    (["L", "R"] as const).forEach((side, s) => {
      const ox = side === "L" ? rect.left + 24 : rect.right - 24;
      const oy = rect.top + 36;
      // มุมยิง: ซ้ายยิงขึ้นขวา ขวายิงขึ้นซ้าย (องศาจากแกน x, ลบ = ขึ้นบน)
      const base = side === "L" ? -62 : -118;
      for (let i = 0; i < per; i++) {
        const ang = ((base + (Math.random() - 0.5) * 46) * Math.PI) / 180;
        const speed = 150 + Math.random() * 170;
        const round = Math.random() < 0.3;
        out.push({
          id: s * per + i,
          ox,
          oy,
          x: Math.cos(ang) * speed,
          y: Math.sin(ang) * speed,
          r: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 480),
          w: round ? 7 : 6 + Math.random() * 3,
          h: round ? 7 : 10 + Math.random() * 6,
          c: PAPER[Math.floor(Math.random() * PAPER.length)],
          d: Math.random() * 120,
          dur: 1500 + Math.random() * 900,
          round,
        });
      }
    });
    setPieces(out);
    setTimeout(() => setPieces([]), 3200);
  }

  const champ = top[0];
  const champScore = useCountUp(champ?.score ?? 0, !loading && !!champ, COUNT_MS, () => {
    if ((champ?.score ?? 0) > 0) fire();
  });

  return (
    <div className="flex min-h-screen flex-col items-center bg-white font-sans text-zinc-900">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes score-pop { 0% { transform: scale(1); } 35% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @keyframes paper {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0); opacity: 1; animation-timing-function: cubic-bezier(.1, .8, .3, 1); }
          36% { transform: translate(-50%, -50%) translate(var(--x), var(--y)) rotate(calc(var(--r) * .4)); opacity: 1; animation-timing-function: cubic-bezier(.45, 0, .9, .55); }
          100% { transform: translate(-50%, -50%) translate(calc(var(--x) * 1.3), calc(var(--y) + 460px)) rotate(var(--r)); opacity: 0; }
        }
        .paper { position: absolute; animation: paper var(--dur) linear var(--d) forwards; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none !important; } .paper { display: none; } .score-pop { animation: none !important; } }
      `}</style>

      {/* ชั้นพลุกระดาษ (ไม่รับการคลิก) */}
      {pieces.length > 0 && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {pieces.map((p) => (
            <span
              key={p.id}
              className="paper"
              style={
                {
                  left: p.ox,
                  top: p.oy,
                  width: p.w,
                  height: p.h,
                  background: p.c,
                  borderRadius: p.round ? "9999px" : 2,
                  boxShadow: p.c === "#FFFFFF" ? "0 0 0 1px rgba(0,0,0,.08)" : undefined,
                  "--x": `${p.x}px`,
                  "--y": `${p.y}px`,
                  "--r": `${p.r}deg`,
                  "--d": `${p.d}ms`,
                  "--dur": `${p.dur}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

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
            แต้มสะสมจากทุกรอบที่เล่น มีผู้เข้าร่วมทั้งหมด {ranking.length} คน
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
                    ref={rank === 1 ? firstRef : undefined}
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
                    {rank === 1 ? (
                      // อันดับ 1: เลขวิ่งขึ้นแล้วหยุดที่คะแนนจริง (ล็อกความกว้างไว้ไม่ให้ตัวเลขกระตุก)
                      <p
                        className="score-pop mt-5 text-5xl font-semibold tabular-nums tracking-tight"
                        style={done ? { animation: "score-pop 500ms ease-out" } : undefined}
                        aria-label={`${p.score.toLocaleString()} แต้ม`}
                      >
                        {champScore.toLocaleString()}
                      </p>
                    ) : (
                      <p className="mt-5 text-5xl font-semibold tabular-nums tracking-tight">{p.score.toLocaleString()}</p>
                    )}
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
            <p className="mt-2 text-sm opacity-70">เล่นเกมเพิ่มเพื่อสะสมแต้มให้มากขึ้น</p>
          </div>
          <Link href="/#games" className="inline-flex h-12 items-center rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-black">
            เลือกเกม
          </Link>
        </div>
      </main>
    </div>
  );
}