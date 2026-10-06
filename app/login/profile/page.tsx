"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export type Profile = {
  userId?: string;
  name: string;
  avatar: string; // เช่น 'p1', 'p2', ...
};

// สร้างรายการ ID รูปภาพ p1 ถึง p25
const AVATAR_IDS = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];

const GREEN = "#17FFA2";
const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

export function Avatar({ id, size }: { id: string; size: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);

  // ดึงเฉพาะตัวเลขจาก ID เช่น p1 -> 1 เพื่อใช้คำนวณสีสลับ
  const numId = Number(id.replace(/\D/g, "")) || 1;

  if (failed) {
    return (
      <span
        style={{
          backgroundColor: FALLBACK_BG[(numId - 1) % FALLBACK_BG.length],
        }}
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-900 ${size}`}
      >
        {id.toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={`/img/${id}.png`}
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

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือซ้อนๆ วิ่งช้าๆ ตลอดเวลา (เหมือนหน้าหลัก)          */
/* ------------------------------------------------------------------ */

const STACK_WORD = "PLAYER";
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

/* ------------------------------------------------------------------ */
/*  ชิ้นส่วนเล็กๆ (ปุ่มเอียงแบบ esport)                                 */
/* ------------------------------------------------------------------ */

const STYLES = `
  button, a, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  .txt-bg-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }
  @keyframes bg-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .bg-marquee { animation: bg-marquee linear infinite; will-change: transform; }
  .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
  .btn-fx:hover .btn-shine { transform: translateX(120%); }
  @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  .fx-rise { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }
  @media (prefers-reduced-motion: reduce) {
    .bg-marquee, .fx-rise { animation: none !important; }
  }
`;

type BtnVariant = "solid" | "outline";

function Btn({
  children,
  onClick,
  variant = "solid",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] hover:shadow-[0_0_18px_rgba(23,255,162,0.3)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-fx relative inline-flex h-14 items-center justify-center overflow-hidden px-7 text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${styles} ${className}`}
    >
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-block">{children}</span>
    </button>
  );
}

// ปุ่มปิด
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ปิด"
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white outline-none transition-all hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] focus-visible:ring-4 focus-visible:ring-[#17FFA2] active:scale-90"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function CardTitle({ id, htmlFor, children }: { id?: string; htmlFor?: string; children: React.ReactNode }) {
  const cls = "text-lg font-bold uppercase tracking-tight";
  return (
    <div className="flex items-center gap-3">
      <span className="h-6 w-2 -skew-x-12 bg-[#17FFA2] text-[#17FFA2] shadow-[0_0_12px_currentColor]" />
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cls}>{children}</label>
      ) : (
        <h2 id={id} className={cls}>{children}</h2>
      )}
    </div>
  );
}

const pageShell =
  "relative isolate min-h-[100dvh] overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white";

/* ------------------------------------------------------------------ */
/*  PROFILE PAGE                                                       */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("p1");
  const [savedCount, setSavedCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // ได้มงกุฎเมื่ออยู่อันดับ 1 และมีคะแนนแล้ว
  const isTop = rank === 1 && (score ?? 0) > 0;

  useEffect(() => {
    async function loadData() {
      const localData = localStorage.getItem("profile");
      if (!localData) {
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(localData);
        const currentUserId = parsed.userId || parsed.id;

        // ตรวจสอบพาธ/ฟอร์แมตเดิมกรณีมีค่าตัวเลขธรรมดาติดมา
        let rawAvatar = parsed.avatarId || parsed.avatar || "p1";
        if (/^\d+$/.test(rawAvatar)) {
          rawAvatar = `p${Number(rawAvatar)}`;
        }

        const initialProfile: Profile = {
          userId: currentUserId,
          name: parsed.name || "ผู้เล่นใหม่",
          avatar: rawAvatar,
        };

        setProfile(initialProfile);
        setName(initialProfile.name);
        setAvatar(initialProfile.avatar);

        if (currentUserId) {
          const res = await fetch(`/api/user?userId=${currentUserId}`);
          const result = await res.json();
          if (result.success && result.data) {
            let fetchedAvatar = result.data.avatarId || initialProfile.avatar;
            if (/^\d+$/.test(fetchedAvatar)) {
              fetchedAvatar = `p${Number(fetchedAvatar)}`;
            }

            const fetchedProfile = {
              userId: currentUserId,
              name: result.data.name || initialProfile.name,
              avatar: fetchedAvatar,
            };
            setProfile(fetchedProfile);
            setName(fetchedProfile.name);
            setAvatar(fetchedProfile.avatar);
            // นับทั้งกิจกรรมและเกมที่บันทึกไว้
            setSavedCount(
              (result.data.savedEvents?.length || 0) + (result.data.savedGames?.length || 0)
            );
          }

          // คำนวณคะแนนรวมและอันดับของผู้ใช้
          const rankRes = await fetch("/api/user");
          const rankResult = await rankRes.json();
          if (rankResult.success && Array.isArray(rankResult.data)) {
            const sorted = rankResult.data
              .map((u: any) => {
                const scoresObj = u.gameScores || {};
                const totalScore = Object.values(scoresObj).reduce(
                  (a: number, b: any) => a + (Number(b) || 0),
                  0
                ) as number;
                return { id: u.userId || u._id, name: u.name, score: totalScore };
              })
              .sort((a: any, b: any) => b.score - a.score);

            const idx = sorted.findIndex(
              (u: any) => u.id === currentUserId || u.name === initialProfile.name
            );
            if (idx >= 0) {
              setRank(idx + 1);
              setScore(sorted[idx].score);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load profile data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const cleanName = name.trim();
  const valid = cleanName.length >= 2 && cleanName.length <= 20;
  const changed =
    profile && (cleanName !== profile.name || avatar !== profile.avatar);

  async function handleSave() {
    if (!profile || !valid) return;

    const updatedProfile: Profile = {
      ...profile,
      name: cleanName,
      avatar,
    };

    setProfile(updatedProfile);

    localStorage.setItem(
      "profile",
      JSON.stringify({
        userId: updatedProfile.userId,
        name: updatedProfile.name,
        avatarId: updatedProfile.avatar,
      })
    );

    if (updatedProfile.userId) {
      try {
        await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: updatedProfile.userId,
            name: updatedProfile.name,
            avatarId: updatedProfile.avatar,
          }),
        });
      } catch (error) {
        console.error("Failed to sync profile with database:", error);
      }
    }

    router.back();
  }

  function handleLogout() {
    localStorage.removeItem("profile");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className={`${pageShell} flex items-center justify-center`}>
        <style>{STYLES}</style>
        <BackdropText />
        <p className={`animate-pulse text-sm font-bold uppercase tracking-wider ${MUTED}`}>กำลังโหลด...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`${pageShell} flex items-center justify-center px-6`}>
        <style>{STYLES}</style>
        <BackdropText />
        <div className="fx-rise w-full max-w-md border border-[#17FFA2]/40 bg-[#0a1014]/90 p-8 text-center shadow-[10px_10px_0_0_#ff2a55] backdrop-blur-sm">
          <span className="mx-auto mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
          <h1 className="text-2xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)]">
            ยังไม่ได้เข้าสู่ระบบ
          </h1>
          <p className={`mt-2 text-sm ${MUTED}`}>กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์</p>
          <Btn onClick={() => router.push("/login")} className="mt-6">
            ไปที่หน้าเข้าสู่ระบบ
          </Btn>
        </div>
      </div>
    );
  }

  const stats: [string, string][] = [
    [score === null ? "–" : String(score), "คะแนนรวม"],
    [rank === null ? "–" : `#${rank}`, "อันดับ"],
    [String(savedCount), "โปรด"],
  ];

  return (
    <div className={pageShell}>
      <style>{STYLES}</style>
      <BackdropText />

      <div className="mx-auto max-w-5xl px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <div className="fx-rise flex items-end justify-between gap-4">
          <div>
            <span className="mb-4 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-3xl font-bold uppercase leading-tight tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-5xl">
              โปรไฟล์ของฉัน
            </h1>
          </div>
          <CloseBtn onClick={() => router.back()} />
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[360px_1fr] lg:items-start">
          {/* ===== การ์ดตัวอย่างโปรไฟล์ (แสดงผลสดตามที่แก้) ===== */}
          <section
            className="fx-rise relative overflow-hidden border border-[#17FFA2]/40 p-6 shadow-[10px_10px_0_0_#ff2a55] sm:p-8 lg:sticky lg:top-6"
            style={{
              animationDelay: "80ms",
              background: isTop
                ? "radial-gradient(circle at 85% 0%, #F4D35E55, transparent 55%), linear-gradient(160deg, rgba(23,255,162,0.22), #0a1014 75%)"
                : "radial-gradient(circle at 85% 0%, rgba(23,255,162,0.22), transparent 55%), linear-gradient(160deg, #0f1c1a, #0a1014 75%)",
            }}
          >
            {/* ตัวอักษรใหญ่จางๆ ตกแต่งพื้นหลังการ์ด */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-3 -top-4 select-none text-[9rem] font-bold leading-none text-black/30"
            >
              {isTop ? "#1" : "▦"}
            </span>

            <div className="relative flex items-center gap-5 lg:flex-col lg:gap-0 lg:text-center">
              <div className="relative shrink-0 lg:pt-8">
                {isTop && (
                  <Crown className="absolute -top-7 left-1/2 w-12 -translate-x-1/2 -rotate-6 lg:top-0 lg:w-14" />
                )}
                <Avatar
                  key={avatar}
                  id={avatar}
                  size="h-24 w-24 ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)] sm:h-28 sm:w-28 lg:h-36 lg:w-36"
                />
              </div>
              <div className="min-w-0 lg:mt-5">
                <p className="truncate text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                  {cleanName || "ชื่อของคุณ"}
                </p>
                <p className={`mt-1 text-sm ${isTop ? "text-[#F4D35E]" : MUTED}`}>
                  {isTop ? "ผู้นำอันดับ 1 ตอนนี้" : "ผู้เล่นใน 7 Days 7 Games"}
                </p>
              </div>
            </div>

            <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map(([n, label]) => (
                <div key={label} className="border border-white/10 bg-black/40 px-2 py-4 text-center">
                  <dd className="text-xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)] sm:text-2xl">
                    {n}
                  </dd>
                  <dt className={`mt-0.5 text-xs ${MUTED}`}>{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          {/* ===== ฟอร์มแก้ไข ===== */}
          <div className="flex flex-col gap-5">
            <section
              className="fx-rise border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-6 backdrop-blur-sm sm:p-8"
              style={{ animationDelay: "160ms" }}
            >
              <CardTitle htmlFor="pname">ชื่อที่แสดง</CardTitle>
              <div className="relative mt-4">
                <input
                  id="pname"
                  autoComplete="nickname"
                  enterKeyHint="done"
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อที่จะแสดงบนอันดับ"
                  className="h-14 w-full border border-white/15 bg-black/40 pl-5 pr-16 text-base text-white outline-none transition-all placeholder:text-zinc-500 focus:border-[#17FFA2] focus:shadow-[0_0_18px_rgba(23,255,162,0.25)]"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-zinc-500">
                  {cleanName.length}/20
                </span>
              </div>
              <p
                className="mt-3 text-sm"
                style={{ color: valid ? "#8fa6a1" : RED }}
              >
                {valid
                  ? "ชื่อนี้จะแสดงบนอันดับให้ผู้เล่นคนอื่นเห็น"
                  : "ชื่อต้องยาว 2-20 ตัวอักษร"}
              </p>
            </section>

            <section
              className="fx-rise border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-6 backdrop-blur-sm sm:p-8"
              style={{ animationDelay: "240ms" }}
            >
              <CardTitle id="avatar-label">รูปโปรไฟล์</CardTitle>
              <div
                role="radiogroup"
                aria-labelledby="avatar-label"
                className="mt-5 grid grid-cols-5 gap-3 p-1 sm:grid-cols-7 sm:gap-4 lg:grid-cols-5 xl:grid-cols-7"
              >
                {AVATAR_IDS.map((id) => {
                  const on = avatar === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`รูปโปรไฟล์ ${id}`}
                      onClick={() => setAvatar(id)}
                      className={`rounded-full outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-[#17FFA2] ${
                        on
                          ? "scale-105 ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-[#0a1014] shadow-[0_0_24px_rgba(23,255,162,0.6)]"
                          : "opacity-70 hover:scale-105 hover:opacity-100"
                      }`}
                    >
                      <Avatar id={id} size="aspect-square w-full" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ===== แถบปุ่มด้านล่าง ===== */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#05080a] from-60% to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-3">
          <Btn variant="outline" onClick={handleLogout} className="shrink-0">
            ออกจากระบบ
          </Btn>
          <Btn onClick={handleSave} disabled={!valid || !changed} className="flex-1">
            บันทึกการเปลี่ยนแปลง
          </Btn>
        </div>
      </div>
    </div>
  );
}