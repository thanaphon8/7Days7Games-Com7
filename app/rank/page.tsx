"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navbar, { type Profile } from "../components/navbar/page";

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
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [ranking, setRanking] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const firstRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    // 1. ดึง ID และโปรไฟล์ผู้ใช้ปัจจุบันจาก LocalStorage (ใช้กับ Navbar)
    let uid: string | null = null;
    let localName = "ผู้เล่นใหม่";
    let localAvatar = "p01";
    try {
      const v = localStorage.getItem("profile");
      if (v) {
        const parsed = JSON.parse(v);
        uid = parsed?.userId || parsed?.id || parsed?._id || null;
        localName = parsed?.name || localName;
        localAvatar = parsed?.avatar || parsed?.avatarId || localAvatar;
        setProfile({ userId: uid || undefined, name: localName, avatar: localAvatar });
      } else {
        const directId = localStorage.getItem("userId");
        if (directId) uid = directId;
      }
      setMyId(uid);
    } catch {}

    // 1.1 อัปเดตโปรไฟล์และรายการโปรดจากฐานข้อมูล
    async function loadProfile() {
      if (uid) {
        try {
          const res = await fetch(`/api/user?userId=${uid}`, { cache: "no-store" });
          const result = await res.json();
          if (result.success && result.data) {
            setProfile({
              userId: uid as string,
              name: result.data.name || localName,
              avatar: result.data.avatar || result.data.avatarId || localAvatar,
            });
            setSaved([...(result.data.savedEvents || []), ...(result.data.savedGames || [])]);
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
        }
      }
      setReady(true);
    }
    loadProfile();

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
  // เดสก์ท็อป: จัดเป็นแท่นรับรางวัล 2-1-3 ส่วนมือถืออันดับ 1 เต็มแถว แล้วอันดับ 2-3 อยู่เคียงกัน
  const order = ["", "md:order-2 md:-mt-6 md:pb-12 md:pt-14", "md:order-1", "md:order-3"];

  // สถิติรวม และอันดับของผู้ใช้ปัจจุบัน
  const myIdx = myId ? ranking.findIndex((p) => p.userId === myId) : -1;
  const me = myIdx >= 0 ? ranking[myIdx] : null;
  const gap = me && myIdx > 0 ? ranking[myIdx - 1].score - me.score : 0;
  const isFirst = !!myId && (ranking[0]?.score ?? 0) > 0 && ranking[0]?.userId === myId;

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

      <Navbar
        saved={saved}
        profile={profile}
        ready={ready}
        isFirst={isFirst}
        score={me ? me.score : null}
        onOpenFavorites={() => router.push("/")}
      />

      <main className="w-full max-w-5xl px-6 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-2 sm:pt-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">อันดับ</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
              แต้มสะสมจากทุกรอบที่เล่น อัปเดตทุกครั้งที่มีคนเล่นจบ
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full bg-zinc-50 py-2.5 pl-4 pr-6">
            <span aria-hidden className="h-3 w-3 rounded-full bg-[#9CC593]" />
            <span className="text-sm text-zinc-500">ผู้เข้าร่วม</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {loading ? "–" : ranking.length.toLocaleString()}
            </span>
          </div>
        </div>

        {loading ? (
          /* โครงระหว่างโหลด */
          <div aria-busy className="mt-10 animate-pulse sm:mt-14">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              <div className="col-span-2 h-60 rounded-[2rem] bg-zinc-100 md:col-span-1 md:h-72" />
              <div className="h-52 rounded-[2rem] bg-zinc-100 md:h-60" />
              <div className="h-52 rounded-[2rem] bg-zinc-100 md:h-60" />
            </div>
            <p className="mt-6 text-center text-sm text-zinc-400">กำลังโหลดข้อมูลอันดับ...</p>
          </div>
        ) : ranking.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-[2rem] bg-[#F4D35E] px-6 py-16 text-center text-[#4A3B00] sm:mt-14">
            <Crown className="w-16" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">ยังไม่มีข้อมูลอันดับ</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 opacity-70">เล่นเกมรอบแรกเพื่อเป็นคนแรกบนกระดาน</p>
            <Link href="/#games" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#4A3B00] px-6 text-sm font-medium text-white transition-opacity hover:opacity-85">
              เลือกเกม
            </Link>
          </div>
        ) : (
          <>
            {/* ===== อันดับของคุณ (แสดงเมื่ออยู่นอก 3 อันดับแรก) ===== */}
            {me && myIdx >= 3 && (
              <section className="mt-6 flex items-center gap-4 rounded-[2rem] bg-[#9CC593] p-4 text-[#1E3A1A] sm:mt-8 sm:p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70 text-xl font-semibold tabular-nums">
                  {myIdx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm opacity-70">อันดับของคุณ</p>
                  <p className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                    {gap > 0 ? `อีก ${gap.toLocaleString()} แต้มจะแซงอันดับ ${myIdx}` : `แต้มเท่ากับอันดับ ${myIdx}`}
                  </p>
                </div>
                <span className="text-2xl font-semibold tabular-nums sm:text-3xl">{me.score.toLocaleString()}</span>
              </section>
            )}

            {/* ===== 3 อันดับแรก ===== */}
            <ol className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 md:grid-cols-3 md:items-end md:gap-4">
              {top.map((p, i) => {
                const rank = i + 1;
                const mine = myId ? p.userId === myId : false;
                const first = rank === 1;
                return (
                  <li
                    key={p.userId || i}
                    ref={first ? firstRef : undefined}
                    style={{ backgroundColor: TONE[i], color: INK[i], animation: `rise 600ms ${i * 120}ms both cubic-bezier(.2,.8,.2,1)` }}
                    className={`rise relative flex min-w-0 flex-col items-center rounded-[2rem] px-4 pb-7 pt-9 text-center sm:px-6 sm:pb-8 sm:pt-10 ${
                      first ? "col-span-2 md:col-span-1" : ""
                    } ${order[rank]} ${mine ? "ring-4 ring-zinc-900" : ""}`}
                  >
                    <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-sm font-semibold sm:left-5 sm:top-5">{rank}</span>
                    <div className="relative mt-4">
                      {first && <Crown className="absolute -top-9 left-1/2 w-14 -translate-x-1/2 -rotate-6" />}
                      <Avatar id={p.avatar} size={`${first ? "h-28 w-28 sm:h-32 sm:w-32" : "h-20 w-20 sm:h-24 sm:w-24"} ring-4 ring-white/80`} />
                    </div>
                    <p className={`mt-4 max-w-full truncate font-semibold tracking-tight sm:mt-5 ${first ? "text-2xl" : "text-lg sm:text-2xl"}`}>
                      {p.name}
                      {mine && " (คุณ)"}
                    </p>
                    <p className="mt-1 text-xs opacity-60 sm:text-sm">เล่นแล้ว {p.games} เกม</p>
                    {first ? (
                      // อันดับ 1: เลขวิ่งขึ้นแล้วหยุดที่คะแนนจริง
                      <p
                        className="score-pop mt-4 text-5xl font-semibold tabular-nums tracking-tight sm:mt-5"
                        style={done ? { animation: "score-pop 500ms ease-out" } : undefined}
                        aria-label={`${p.score.toLocaleString()} แต้ม`}
                      >
                        {champScore.toLocaleString()}
                      </p>
                    ) : (
                      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight sm:mt-5 sm:text-5xl">{p.score.toLocaleString()}</p>
                    )}
                    <p className="mt-1 text-xs opacity-60">แต้ม</p>
                  </li>
                );
              })}
            </ol>

            {/* ===== อันดับที่ 4 เป็นต้นไป ===== */}
            {rest.length > 0 && (
              <ol className="mt-6 flex flex-col gap-2 sm:gap-3">
                {rest.map((p, i) => {
                  const mine = myId ? p.userId === myId : false;
                  return (
                    <li
                      key={p.userId || i}
                      className={`flex items-center gap-3 rounded-full p-2.5 pr-5 sm:gap-4 sm:p-3 sm:pr-6 ${
                        mine ? "bg-[#9CC593]/30 ring-2 ring-zinc-900" : "bg-zinc-50"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold tabular-nums sm:h-12 sm:w-12">{i + 4}</span>
                      <Avatar id={p.avatar} size="h-11 w-11 sm:h-12 sm:w-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium sm:text-lg">
                          {p.name}
                          {mine && " (คุณ)"}
                        </p>
                        <p className="text-xs text-zinc-500 sm:hidden">{p.games} เกม</p>
                      </div>
                      <span className="hidden text-sm text-zinc-500 sm:inline">{p.games} เกม</span>
                      <span className="w-20 text-right text-lg font-semibold tabular-nums sm:w-24 sm:text-xl">{p.score.toLocaleString()}</span>
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
          <Link href="/#games" className="inline-flex h-12 items-center rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1F2A5C]/80">
            เลือกเกม
          </Link>
        </div>
      </main>
    </div>
  );
}