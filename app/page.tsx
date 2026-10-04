"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import EventsCarousel, {
  Badge,
  CloseButton,
  EVENTS,
  EventDetail,
  FavoriteCard,
  HEART_PATH,
  useOverlay,
  type Status,
} from "./components/events/page";
import Navbar, { getAvatarSrc, type Profile } from "./components/navbar/page";

// ===== ข้อมูลตัวอย่าง =====
type Game = {
  id: string;
  name: string;
  desc: string;
  category: string;
  status: Status;
  time: string;
  tone: string;
  glyph: string;
  href?: string;
  image?: string;
  scoring: string;
  rules: string[];
};

const GAMES: Game[] = [
  {
    id: "typing", name: "พิมพ์ไว", desc: "พิมพ์ข้อความภาษาอังกฤษให้เร็วและแม่นที่สุดก่อนหมดเวลา", category: "อาร์เคด", status: "NOW", time: "1 นาที", tone: "bg-[#F4D35E]", glyph: "Aa", href: "/game/typing", image: "/img/typing.jpg",
    scoring: "คำต่อนาที (WPM)",
    rules: ["พิมพ์คำที่ขึ้นบนเทปให้ตรงกับตัวอักษร แล้วเว้นวรรคเพื่อไปคำถัดไป", "เลือกเวลาได้ 30, 60 หรือ 120 วินาที เวลาจะเริ่มนับเมื่อพิมพ์ตัวอักษรแรก", "กด Tab เพื่อเริ่มใหม่ได้ทุกเมื่อ", "คะแนนคือ WPM โดยนับเฉพาะคำที่พิมพ์ถูก"],
  },
  {
    id: "thinkfast", name: "ตอบปัญหาเชาว์", desc: "คำถามกวนๆ ปั่นสมอง ฟังเผินๆ ง่าย แต่ตอบเร็วเมื่อไรก็โดนหลอก", category: "ตรรกะ", status: "NOW", time: "3 นาที", tone: "bg-[#F4A58A]", glyph: "∴", href: "/game/thinkfast",
    scoring: "แต้มสะสมจากข้อที่ตอบถูกและเวลาที่เหลือ",
    rules: ["สุ่มคำถามกวนๆ 10 ข้อ แต่ละข้อมี 4 ตัวเลือกและเวลา 20 วินาที", "ตอบถูกได้ 100 แต้ม บวกโบนัส 5 แต้มต่อทุกวินาทีที่เหลือ", "ตอบผิดหรือหมดเวลาไม่ได้แต้ม แต่จะเฉลยให้ทุกข้อ", "แต้มรวมของทั้ง 10 ข้อจะถูกบวกสะสมเข้าคะแนนรวมทุกครั้งที่เล่นจบ"],
  },
  {
    id: "kickbattle", name: "Kick Battle", desc: "ดวลจุดโทษสองคน เลือกมุมยิงหรือมุมรับ อ่านใจคู่แข่งให้ขาด", category: "อาร์เคด", status: "NOW", time: "5 นาที", tone: "bg-[#9CC593]", glyph: "⚽", href: "/game/kickbattle",
    scoring: "100 แต้มต่อการยิงเข้าหรือเซฟ บวกโบนัสผู้ชนะ 200 แต้ม",
    rules: ["คนแรกสร้างห้องแล้วส่งรหัสห้องให้เพื่อน คนที่สองกดเข้าร่วมด้วยรหัสนั้น", "ระบบสุ่มว่าใครได้ยิงก่อน ใครได้เฝ้าประตู แล้วสลับบทบาทกันทุกลูก", "ผู้ยิงและผู้รับเลือกซ้าย กลาง หรือขวาพร้อมกัน ถ้าตรงกันผู้รับเซฟและได้ 100 แต้ม ถ้าไม่ตรงผู้ยิงได้ 100 แต้ม", "เล่น 6 ลูก (ยิงคนละ 3 ลูก) ใครแต้มสูงกว่าชนะ ถ้าเสมอต่อเวลาอีกสูงสุด 3 ลูก ใครได้ 2 แต้มก่อนชนะ ผู้ชนะรับโบนัสเพิ่ม 200 แต้ม และแต้มทั้งหมดจะถูกบวกสะสมเข้าคะแนนรวม"],
  },
  {
    id: "reaction", name: "วัดปฏิกิริยา", desc: "กดให้ไวที่สุดเมื่อสีเปลี่ยน", category: "อาร์เคด", status: "NOW", time: "1 นาที", tone: "bg-[#B7CBB0]", glyph: "◉",
    scoring: "เวลาตอบสนองที่ไวที่สุด",
    rules: ["รอจนหน้าจอเปลี่ยนสี แล้วกดให้เร็วที่สุด", "กดก่อนสีเปลี่ยนนับว่าพลาดและต้องเริ่มรอบใหม่", "เล่นได้หลายรอบ ระบบนับรอบที่ไวที่สุด", "ยิ่งตอบสนองไว ยิ่งได้คะแนนมาก"],
  },
  {
    id: "quiz", name: "ควิซประจำวัน", desc: "คำถามใหม่ทุกวัน สะสมสถิติตอบถูกต่อเนื่อง", category: "ความจำ", status: "SOON", time: "2 นาที", tone: "", glyph: "？",
    scoring: "จำนวนข้อที่ตอบถูก",
    rules: ["ทุกวันจะมีชุดคำถามใหม่", "ตอบแล้วระบบเก็บสถิติการตอบถูกต่อเนื่องไว้ให้", "แต่ละวันเล่นได้รอบเดียว", "คะแนนคือจำนวนข้อที่ตอบถูก"],
  },
  {
    id: "words", name: "ไล่หาคำ", desc: "หาคำศัพท์ที่ซ่อนในตารางตัวอักษรให้ครบก่อนหมดเวลา", category: "ตรรกะ", status: "SOON", time: "4 นาที", tone: "", glyph: "Ａ",
    scoring: "จำนวนคำและเวลาที่เหลือ",
    rules: ["หาคำศัพท์ที่ซ่อนในตารางตัวอักษร ทั้งแนวตั้ง แนวนอน และแนวทแยง", "ลากเลือกตัวอักษรเพื่อยืนยันคำ", "ต้องหาให้ครบก่อนหมดเวลา", "คะแนนคิดจากจำนวนคำที่หาเจอและเวลาที่เหลือ"],
  },
  {
    id: "xo", name: "XO ท้าบอท", desc: "เกมคลาสสิกกับบอทที่เก่งขึ้นเรื่อยๆ", category: "ตรรกะ", status: "SOON", time: "1 นาที", tone: "", glyph: "✕",
    scoring: "จำนวนรอบที่ชนะติดต่อกัน",
    rules: ["ผลัดกันวาง X และ O บนตาราง 3×3 โดยคุณเป็นฝ่ายเริ่ม", "เรียงได้ 3 ช่องติดกันก่อนคือผู้ชนะ", "บอทจะเก่งขึ้นเรื่อยๆ เมื่อคุณชนะ", "คะแนนคิดจากจำนวนรอบที่ชนะติดต่อกัน"],
  },
];

const STEPS = [
  { title: "สมัครเข้าร่วม", desc: "ใช้อีเมลบริษัทและตั้งชื่อที่จะแสดงบนอันดับ" },
  { title: "เลือกเกมแล้วเล่น", desc: "เล่นคนเดียว แต่ละเกมจบภายในไม่กี่นาที" },
  { title: "สะสมแต้ม", desc: "ทุกรอบที่เล่นจบ แต้มจะถูกบวกสะสมเข้าคะแนนรวมของคุณ" },
  { title: "ประกาศผู้ชนะ", desc: "เมื่อกิจกรรมสิ้นสุด ผู้ที่แต้มสูงสุดคือผู้ชนะ" },
];

const CATEGORIES = ["ทั้งหมด", "ความจำ", "ตรรกะ", "อาร์เคด"];
const PODIUM = ["bg-[#F4D35E]", "bg-[#A8B5E8]", "bg-[#F4A58A]"];

const toneHex = (g: Game) => g.tone.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#E7E5E4";

function GameDetail({ game, onClose }: { game: Game | null; onClose: () => void }) {
  useOverlay(!!game, onClose);
  if (!game) return null;
  const soon = game.status === "SOON";
  const playable = !!game.href && !soon;
  const bg = toneHex(game);
  const fg = soon ? "#3F3F46" : "#27272A";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      style={{ backgroundColor: bg, color: fg, animation: "sheet-in 300ms cubic-bezier(.2,.8,.2,1)" }}
      className="fixed inset-0 z-[60] overflow-y-auto"
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-36 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge status={game.status} />
            <span className="text-sm opacity-70">{game.category} · {game.time}</span>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-8xl">{game.name}</h2>
            <p className="mt-6 max-w-md text-lg leading-8 opacity-80">{game.desc}</p>
          </div>
          {game.image ? (
            <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-zinc-900 lg:min-h-80">
              <Image src={game.image} alt={game.name} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-[2rem] bg-white p-8">
              <span style={{ backgroundColor: bg }} className="flex h-44 w-44 items-center justify-center rounded-[2.5rem] text-8xl font-light md:h-52 md:w-52">
                {game.glyph}
              </span>
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[["หมวดหมู่", game.category], ["เวลาต่อรอบ", game.time], ["การนับคะแนน", game.scoring]].map(([label, value]) => (
            <div key={label} className="rounded-3xl bg-white/70 p-6">
              <p className="text-sm opacity-60">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[2rem] bg-white p-8 text-zinc-900">
          <h3 className="text-xl font-semibold tracking-tight">กติกา</h3>
          <ul className="mt-5 flex flex-col gap-4">
            {game.rules.map((r) => (
              <li key={r} className="flex gap-3 text-base leading-7 text-zinc-600">
                <span style={{ backgroundColor: bg }} className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ background: `linear-gradient(to top, ${bg} 60%, transparent)` }} className="fixed inset-x-0 bottom-0 flex justify-center px-6 pb-6 pt-12">
        {playable ? (
          <Link href={game.href!} style={{ backgroundColor: fg }} className="flex h-14 w-full max-w-sm items-center justify-center rounded-full text-base font-medium text-white transition-opacity hover:opacity-85">
            เริ่มเล่น
          </Link>
        ) : (
          <button disabled style={{ backgroundColor: fg }} className="h-14 w-full max-w-sm cursor-not-allowed rounded-full text-base font-medium text-white opacity-40">
            {soon ? "เปิดเร็วๆ นี้" : "เกมกำลังเตรียมพร้อม"}
          </button>
        )}
      </div>
    </div>
  );
}

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
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {items.map((e) => (
              <FavoriteCard key={e.id} e={e} onOpen={() => onOpenEvent(e.id)} toggleSave={toggleSave} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== ผู้ใช้ =====
type RankUser = { userId?: string; name: string; avatarId?: string; games: number; score: number };

export default function Home() {
  const [cat, setCat] = useState("ทั้งหมด");
  const [saved, setSaved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [favOpen, setFavOpen] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  // State สำหรับเก็บข้อมูลอันดับจาก API
  const [topUsers, setTopUsers] = useState<RankUser[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  // คะแนนรวมของผู้ใช้ที่ล็อกอินอยู่ (ใช้โชว์บน Navbar)
  const [score, setScore] = useState<number | null>(null);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});

  // 1. ดึงข้อมูล Leaderboard 3 อันดับแรก
  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          setTotalParticipants(result.data.length);

          const list: RankUser[] = result.data.map((u: any) => {
            const scoresObj = u.gameScores || {};
            let totalScore = 0;
            let playedGamesCount = 0;

            for (const val of Object.values(scoresObj)) {
              const num = Number(val) || 0;
              if (num > 0) {
                totalScore += num;
                playedGamesCount += 1;
              }
            }

            return {
              userId: u.userId || u._id,
              name: u.name || "ผู้เล่นไม่ระบุชื่อ",
              avatarId: u.avatarId || u.avatar || "p01",
              games: playedGamesCount,
              score: totalScore,
            };
          });

          // เรียงตามคะแนนรวมมากไปน้อย
          list.sort((a, b) => b.score - a.score);
          setTopUsers(list.slice(0, 3));
          setScoreMap(
            Object.fromEntries(list.filter((u) => u.userId).map((u) => [u.userId as string, u.score]))
          );
        }
      } catch (error) {
        console.error("Failed to fetch rankings:", error);
      }
    }

    fetchRanking();
  }, []);

  // 2. ดึงข้อมูล Profile และ Saved Events จาก LocalStorage และ API
  useEffect(() => {
    async function loadProfileAndData() {
      const localData = localStorage.getItem("profile");
      let currentUserId: string | null = null;
      let localProfile: Profile | null = null;

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          localProfile = {
            userId: parsed.userId || parsed.id || parsed._id,
            name: parsed.name || "ผู้เล่นใหม่",
            avatar: parsed.avatar || parsed.avatarId || "p01",
          };
          setProfile(localProfile);
          currentUserId = localProfile.userId || null;
        } catch (e) {
          console.error("Failed to parse local profile:", e);
        }
      }

      if (currentUserId) {
        try {
          const res = await fetch(`/api/user?userId=${currentUserId}`, { cache: "no-store" });
          const result = await res.json();

          if (result.success && result.data) {
            setProfile({
              userId: currentUserId,
              name: result.data.name || localProfile?.name || "ผู้เล่นใหม่",
              avatar: result.data.avatar || result.data.avatarId || localProfile?.avatar || "p01",
            });
            setSaved(result.data.savedEvents || []);

            const gs = result.data.gameScores;
            if (gs && typeof gs === "object") {
              setScore((Object.values(gs) as unknown[]).reduce<number>((sum, v) => sum + Math.max(0, Number(v) || 0), 0));
            }
          }
        } catch (error) {
          console.error("Failed to load user data from API:", error);
        }
      }
      setReady(true);
    }

    loadProfileAndData();

    const handleStorageChange = () => loadProfileAndData();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 3. บันทึกรายการโปรด (Saved Events)
  async function toggleSave(id: string) {
    const nextSaved = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(nextSaved);

    if (profile?.userId) {
      try {
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profile.userId,
            savedEvents: nextSaved,
          }),
        });
      } catch (error) {
        console.error("Failed to sync favorites with database:", error);
      }
    }
  }

  const list = GAMES.filter((g) => cat === "ทั้งหมด" || g.category === cat);

  const isFirst =
    !!profile?.userId &&
    (topUsers[0]?.score ?? 0) > 0 &&
    topUsers[0]?.userId === profile.userId;

  // ถ้า API ผู้ใช้ไม่ส่ง gameScores มา ให้ใช้คะแนนจากรายการอันดับแทน
  const myScore = score ?? (profile?.userId ? scoreMap[profile.userId] ?? null : null);

  return (
    <div className="flex min-h-screen flex-col items-center bg-white font-sans text-zinc-900">
      {/* ===== เมนู / NAVBAR ===== */}
      <Navbar
        saved={saved}
        profile={profile}
        ready={ready}
        isFirst={isFirst}
        score={myScore}
        onOpenFavorites={() => setFavOpen(true)}
      />

      <main className="flex w-full max-w-5xl flex-col gap-6 px-6 pb-24">
        {/* ===== Events (เลื่อนอัตโนมัติ) ===== */}
        <EventsCarousel saved={saved} toggleSave={toggleSave} setOpenId={setOpenId} overlayOpen={!!openId || favOpen || !!gameId} />

        {/* ===== ตัวเลขสรุป ===== */}
        <section className="grid grid-cols-3 gap-3">
          {[
            [totalParticipants > 0 ? String(totalParticipants) : "0", "ผู้เข้าร่วม"],
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
                role="button"
                tabIndex={0}
                aria-label={`${g.name} กดเพื่อดูกติกา`}
                onClick={() => setGameId(g.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setGameId(g.id);
                  }
                }}
                className={`flex min-h-72 cursor-pointer flex-col justify-between rounded-[2rem] p-6 outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-blue-400 ${
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
                  <span className={`mt-5 inline-flex h-11 items-center rounded-full px-5 text-sm font-medium ${soon ? "bg-black/10 text-zinc-500" : "bg-zinc-900 text-white"}`}>
                    {soon ? "เปิดเร็วๆ นี้" : "เล่นเกม"}
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        {/* ===== อันดับ (ดึงข้อมูล Dynamic จาก API) ===== */}
        <section id="ranking" className="grid gap-6 pt-10 md:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">ผู้นำตอนนี้</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                แต้มสะสมจากทุกรอบที่เล่น อัปเดตทุกครั้งที่มีคนเล่นจบ
              </p>
            </div>
            <Link href="/rank" className="inline-flex h-11 w-fit items-center rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04]">ดูอันดับทั้งหมด</Link>
          </div>
          <ol className="flex flex-col gap-3">
            {topUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">ยังไม่มีข้อมูลอันดับ</p>
            ) : (
              topUsers.map((r, i) => (
                <li key={r.name + i} className={`flex items-center gap-4 rounded-full p-3 text-zinc-900 ${PODIUM[i]}`}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70 text-base font-semibold">{i + 1}</span>
                  <img
                    src={getAvatarSrc(r.avatarId)}
                    alt={r.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white/80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/img/p01.png";
                    }}
                  />
                  <span className="flex-1 truncate text-lg font-medium">{r.name}</span>
                  <span className="text-sm opacity-60">{r.games} เกม</span>
                  <span className="w-20 pr-3 text-right text-xl font-semibold tabular-nums">{r.score}</span>
                </li>
              ))
            )}
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
          <Link href="/login/register" className="inline-flex h-12 items-center rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1F2A5C]/80">
            สมัครเข้าร่วม
          </Link>
        </section>
      </main>

      <footer className="w-full max-w-5xl border-t border-black/[.08] px-6 py-8 text-sm text-zinc-500">
        7 Days 7 Games · มินิเกมสำหรับพักสมอง
      </footer>

      <GameDetail game={GAMES.find((g) => g.id === gameId) ?? null} onClose={() => setGameId(null)} />
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