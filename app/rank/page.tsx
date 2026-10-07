"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Navbar, { type Profile } from "../components/navbar/page";

const TONE = ["#17FFA2", "#0FD98A", "#0AB373"]; // สีอันดับ 1-3 (อันดับ 1 = เขียวนีออน #17FFA2 มีออร่า, อันดับ 2-3 = เขียวเข้มขึ้น ไม่มีออร่า)
const INK = ["#00301B", "#00301B", "#00301B"];
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];
const COUNT_MS = 2000; // เวลาที่เลขคะแนนวิ่ง
const MUTED = "text-[#8fa6a1]";

interface PlayerRank {
  userId: string;
  name: string;
  avatar: string;
  games: number;
  score: number;
}

type Bolt = { id: number; d: string; delay: number; dur: number; w: number };

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
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-900 ${size}`}
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

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือซ้อนๆ วิ่งช้าๆ ตลอดเวลา (เหมือนหน้าหลัก)          */
/* ------------------------------------------------------------------ */

const STACK_WORD = "RANK";
const STACK_SOLID = "7 DAYS 7 GAMES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
// ยิ่งตัวเลขมาก ยิ่งวิ่งช้า (วินาทีต่อหนึ่งรอบ)
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex select-none flex-col justify-center overflow-hidden"
    >
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "txt-bg-outline opacity-50" : "txt-bg-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`bg-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
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

// ปุ่มลิงก์เอียงแบบ esport
function linkBtn(variant: "solid" | "dark" = "solid") {
  const base =
    "btn-fx relative inline-flex min-h-[44px] items-center justify-center overflow-hidden px-7 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  return variant === "solid"
    ? `${base} bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]`
    : `${base} bg-[#05080a] text-[#17FFA2] hover:bg-black`;
}

function BtnInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-block">{children}</span>
    </>
  );
}

// ===== สายฟ้านีออน =====
type Pt = [number, number];
const fmt = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");

// เส้นซิกแซกจากจุดหนึ่งไปอีกจุด
function jag(x1: number, y1: number, x2: number, y2: number, segs: number, amp: number): Pt[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Pt[] = [[x1, y1]];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const o = (Math.random() - 0.5) * 2 * amp;
    pts.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]);
  }
  pts.push([x2, y2]);
  return pts;
}

// เส้นสายฟ้าหลัก + กิ่งแตกเล็กๆ 2 กิ่ง
function boltPath(x1: number, y1: number, x2: number, y2: number): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segs = Math.max(6, Math.round(len / 38));
  const pts = jag(x1, y1, x2, y2, segs, Math.min(40, len * 0.12));
  let d = "M" + fmt(pts);
  for (let b = 0; b < 2; b++) {
    const k = 2 + Math.floor(Math.random() * (pts.length - 4));
    const [bx, by] = pts[k];
    const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
    const bl = len * (0.12 + Math.random() * 0.15);
    d += " M" + fmt(jag(bx, by, bx + Math.cos(ang) * bl, by + Math.sin(ang) * bl, 4, 10));
  }
  return d;
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
  const [bolts, setBolts] = useState<Bolt[]>([]);
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
  // จัดเป็นแท่นรับรางวัล 2-1-3 เรียงแนวนอนทุกขนาดจอ (อันดับ 1 อยู่กลางและสูงสุด)
  const order = ["", "order-2", "order-1", "order-3"];

  // สถิติรวม และอันดับของผู้ใช้ปัจจุบัน
  const myIdx = myId ? ranking.findIndex((p) => p.userId === myId) : -1;
  const me = myIdx >= 0 ? ranking[myIdx] : null;
  const gap = me && myIdx > 0 ? ranking[myIdx - 1].score - me.score : 0;
  const isFirst = !!myId && (ranking[0]?.score ?? 0) > 0 && ranking[0]?.userId === myId;

  // สายฟ้านีออน: ฟาดลงมาจากบนจอใส่การ์ดอันดับ 1 แล้วแผ่ออกรอบการ์ด พร้อมแสงวาบทั้งจอ
  function fire() {
    setDone(true);
    const el = firstRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const out: Bolt[] = [];
    let id = 0;

    // ฟ้าผ่าจากบนจอลงมาที่การ์ด
    for (let i = 0; i < 4; i++) {
      const sx = rect.left + Math.random() * rect.width + (Math.random() - 0.5) * 200;
      const ex = rect.left + rect.width * (0.15 + Math.random() * 0.7);
      const ey = rect.top + rect.height * (0.1 + Math.random() * 0.3);
      out.push({ id: id++, d: boltPath(sx, -20, ex, ey), delay: i * 90, dur: 900 + Math.random() * 300, w: 2 + Math.random() * 1.5 });
    }
    // สายฟ้าแผ่ออกจากการ์ดรอบทิศ
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const sx = cx + Math.cos(ang) * rect.width * 0.4;
      const sy = cy + Math.sin(ang) * rect.height * 0.4;
      const r = 160 + Math.random() * 140;
      out.push({ id: id++, d: boltPath(sx, sy, sx + Math.cos(ang) * r, sy + Math.sin(ang) * r), delay: 120 + i * 70, dur: 800 + Math.random() * 300, w: 1.5 + Math.random() * 1.2 });
    }
    setBolts(out);
    setTimeout(() => setBolts([]), 1800);
  }

  const champ = top[0];
  const champScore = useCountUp(champ?.score ?? 0, !loading && !!champ, COUNT_MS, () => {
    if ((champ?.score ?? 0) > 0) fire();
  });

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col items-center overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white">
      <style>{`
        button, a, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .txt-bg-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }
        @keyframes bg-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .bg-marquee { animation: bg-marquee linear infinite; will-change: transform; }
        .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
        .btn-fx:hover .btn-shine { transform: translateX(120%); }

        @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes score-pop { 0% { transform: scale(1); } 35% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @keyframes bolt {
          0% { stroke-dashoffset: 1; opacity: 0; }
          12% { stroke-dashoffset: 0; opacity: 1; }
          22% { opacity: .35; }
          32% { opacity: 1; }
          55% { opacity: .5; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes flash { 0% { opacity: 0; } 8% { opacity: 1; } 100% { opacity: 0; } }
        .bolt { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; animation: bolt var(--dur) linear var(--d) forwards; }
        .flash { background: radial-gradient(circle at 50% 35%, rgba(23,255,162,.28), rgba(23,255,162,.06) 60%, transparent); opacity: 0; animation: flash 600ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none !important; } .bolt, .flash { display: none; } .score-pop { animation: none !important; } .bg-marquee { animation: none !important; } }
      `}</style>

      <BackdropText />

      {/* ชั้นสายฟ้านีออน (ไม่รับการคลิก) */}
      {bolts.length > 0 && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          <div className="flash absolute inset-0" />
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ filter: "drop-shadow(0 0 6px #17FFA2) drop-shadow(0 0 18px #17FFA2)" }}
          >
            {bolts.map((b) => {
              const v = { "--d": `${b.delay}ms`, "--dur": `${b.dur}ms` } as React.CSSProperties;
              return (
                <g key={b.id}>
                  <path d={b.d} pathLength={1} className="bolt" style={{ ...v, stroke: "#17FFA2", strokeWidth: b.w * 3 }} />
                  <path d={b.d} pathLength={1} className="bolt" style={{ ...v, stroke: "#FFFFFF", strokeWidth: b.w }} />
                </g>
              );
            })}
          </svg>
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

      <main className="w-full max-w-5xl px-4 pb-[max(6rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pt-2 sm:pt-6">
          <div>
            <span className="mb-4 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-5xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-6xl md:text-7xl">อันดับ</h1>
            <p className={`mt-3 max-w-md text-sm leading-6 sm:text-base sm:leading-7 ${MUTED}`}>
              แต้มสะสมจากทุกรอบที่เล่น อัปเดตทุกครั้งที่มีคนเล่นจบ
            </p>
          </div>
          <div className="inline-flex items-center gap-3 border border-[#17FFA2]/40 bg-[#0a1014]/90 py-2.5 pl-4 pr-6 backdrop-blur-sm">
            <span aria-hidden className="h-5 w-1.5 -skew-x-12 bg-[#17FFA2] shadow-[0_0_10px_#17FFA2]" />
            <span className={`text-sm ${MUTED}`}>ผู้เข้าร่วม</span>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)]">
              {loading ? "–" : ranking.length.toLocaleString()}
            </span>
          </div>
        </div>

        {loading ? (
          /* โครงระหว่างโหลด */
          <div aria-busy className="mt-10 animate-pulse sm:mt-14">
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
              <div className="order-1 h-52 bg-[#0a1014] sm:h-60" />
              <div className="order-2 h-64 bg-[#0a1014] sm:h-72" />
              <div className="order-3 h-52 bg-[#0a1014] sm:h-60" />
            </div>
            <p className={`mt-6 text-center text-sm ${MUTED}`}>กำลังโหลดข้อมูลอันดับ...</p>
          </div>
        ) : ranking.length === 0 ? (
          <div className="mt-10 flex flex-col items-center border border-[#17FFA2]/40 bg-[#0a1014]/90 px-6 py-16 text-center shadow-[10px_10px_0_0_#ff2a55] backdrop-blur-sm sm:mt-14">
            <Crown className="w-16" />
            <h2 className="mt-4 text-2xl font-bold uppercase tracking-tight">ยังไม่มีข้อมูลอันดับ</h2>
            <p className={`mt-2 max-w-xs text-sm leading-6 ${MUTED}`}>เล่นเกมรอบแรกเพื่อเป็นคนแรกบนกระดาน</p>
            <Link href="/#games" className={`${linkBtn("solid")} mt-6`}>
              <BtnInner>เลือกเกม</BtnInner>
            </Link>
          </div>
        ) : (
          <>
            {/* ===== อันดับของคุณ (แสดงเมื่ออยู่นอก 3 อันดับแรก) ===== */}
            {me && myIdx >= 3 && (
              <section className="mt-6 flex items-center gap-4 border border-white/10 border-l-4 border-l-[#17FFA2] bg-[#0a1014]/90 p-4 backdrop-blur-sm sm:mt-8 sm:p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#17FFA2] text-xl font-bold tabular-nums text-[#04110a]">
                  {myIdx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${MUTED}`}>อันดับของคุณ</p>
                  <p className="truncate text-lg font-bold tracking-tight sm:text-xl">
                    {gap > 0 ? `อีก ${gap.toLocaleString()} แต้มจะแซงอันดับ ${myIdx}` : `แต้มเท่ากับอันดับ ${myIdx}`}
                  </p>
                </div>
                <span className="text-2xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)] sm:text-3xl">{me.score.toLocaleString()}</span>
              </section>
            )}

            {/* ===== 3 อันดับแรก (เรียงแนวนอน 2-1-3 ทุกขนาดจอ) ===== */}
            <ol className="mt-10 grid grid-cols-3 items-end gap-2 sm:mt-14 sm:gap-4">
              {top.map((p, i) => {
                const rank = i + 1;
                const mine = myId ? p.userId === myId : false;
                const first = rank === 1;
                const pad = first
                  ? "-mt-4 px-1.5 pb-9 pt-12 sm:-mt-6 sm:px-6 sm:pb-12 sm:pt-14"
                  : "px-1.5 pb-5 pt-9 sm:px-6 sm:pb-8 sm:pt-10";
                return (
                  <li
                    key={p.userId || i}
                    ref={first ? firstRef : undefined}
                    style={{
                      backgroundColor: TONE[i],
                      color: INK[i],
                      animation: `rise 600ms ${i * 120}ms both cubic-bezier(.2,.8,.2,1)`,
                      // ออร่านีออนรอบการ์ดอันดับ 1
                      boxShadow: first
                        ? "0 0 18px 4px rgba(23,255,162,.85), 0 0 60px 14px rgba(23,255,162,.5), 0 0 130px 36px rgba(23,255,162,.28)"
                        : undefined,
                    }}
                    className={`rise relative flex min-w-0 flex-col items-center text-center outline outline-2 outline-white sm:outline-4 ${pad} ${order[rank]}`}
                  >
                    <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-xs font-bold sm:left-5 sm:top-5 sm:h-9 sm:w-9 sm:text-sm">{rank}</span>
                    <div className="relative mt-2 sm:mt-4">
                      {first && <Crown className="absolute -top-6 left-1/2 w-9 -translate-x-1/2 -rotate-6 sm:-top-9 sm:w-14" />}
                      <Avatar
                        id={p.avatar}
                        size={`${first ? "h-16 w-16 sm:h-32 sm:w-32" : "h-12 w-12 sm:h-24 sm:w-24"} ring-2 ring-white/80 sm:ring-4`}
                      />
                    </div>
                    <p className={`mt-2 max-w-full truncate font-bold tracking-tight sm:mt-5 ${first ? "text-sm sm:text-2xl" : "text-xs sm:text-2xl"}`}>
                      {p.name}
                      {mine && " (คุณ)"}
                    </p>
                    <p className="mt-0.5 text-[10px] opacity-60 sm:mt-1 sm:text-sm">เล่นแล้ว {p.games} เกม</p>
                    {first ? (
                      // อันดับ 1: เลขวิ่งขึ้นแล้วหยุดที่คะแนนจริง
                      <p
                        className="score-pop mt-2 max-w-full text-xl font-bold tabular-nums tracking-tight sm:mt-5 sm:text-5xl"
                        style={done ? { animation: "score-pop 500ms ease-out" } : undefined}
                        aria-label={`${p.score.toLocaleString()} แต้ม`}
                      >
                        {champScore.toLocaleString()}
                      </p>
                    ) : (
                      <p className="mt-2 max-w-full text-base font-bold tabular-nums tracking-tight sm:mt-5 sm:text-5xl">{p.score.toLocaleString()}</p>
                    )}
                    <p className="mt-0.5 text-[10px] opacity-60 sm:mt-1 sm:text-xs">แต้ม</p>
                  </li>
                );
              })}
            </ol>

            {/* ===== อันดับที่ 4 เป็นต้นไป ===== */}
            {rest.length > 0 && (
              <ol className="mt-8 flex flex-col gap-2 sm:gap-3">
                {rest.map((p, i) => {
                  const mine = myId ? p.userId === myId : false;
                  return (
                    <li
                      key={p.userId || i}
                      className={`flex items-center gap-3 border p-2.5 pr-4 backdrop-blur-sm transition-all duration-200 hover:border-[#17FFA2]/60 sm:gap-4 sm:p-3 sm:pr-6 ${
                        mine
                          ? "border-[#17FFA2] bg-[#17FFA2]/10 shadow-[0_0_18px_rgba(23,255,162,0.25)]"
                          : "border-white/10 bg-[#0a1014]/90"
                      }`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-white/10 text-base font-bold tabular-nums sm:h-12 sm:w-12">{i + 4}</span>
                      <Avatar id={p.avatar} size="h-11 w-11 sm:h-12 sm:w-12" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold sm:text-lg">
                          {p.name}
                          {mine && " (คุณ)"}
                        </p>
                        <p className={`text-xs sm:hidden ${MUTED}`}>{p.games} เกม</p>
                      </div>
                      <span className={`hidden text-sm sm:inline ${MUTED}`}>{p.games} เกม</span>
                      <span className="w-20 text-right text-lg font-bold tabular-nums text-[#17FFA2] sm:w-24 sm:text-xl">{p.score.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-6 bg-[#17FFA2] bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(0,0,0,0.08)_18px_36px)] p-8 text-[#04110a] sm:flex-row sm:items-center md:p-10">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tight">อยากขึ้นอันดับ</h2>
            <p className="mt-2 text-sm text-[#04110a]/80">เล่นเกมเพิ่มเพื่อสะสมแต้มให้มากขึ้น</p>
          </div>
          <Link href="/#games" className={linkBtn("dark")}>
            <BtnInner>เลือกเกม</BtnInner>
          </Link>
        </div>
      </main>
    </div>
  );
}