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
        className={`flex shrink-0 items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
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

// ปุ่มปิด (ใช้ดีไซน์เดียวกับปุ่มปิดของหน้าอื่น)
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ปิด"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-blue-400 active:scale-90"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
        <p className="animate-pulse text-sm text-zinc-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
        <div className="w-full max-w-md rounded-[2rem] bg-[#A8B5E8] p-8 text-center text-[#1F2A5C]">
          <h1 className="text-2xl font-semibold tracking-tight">ยังไม่ได้เข้าสู่ระบบ</h1>
          <p className="mt-2 text-sm opacity-70">กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 h-12 rounded-full bg-[#1F2A5C] px-6 text-sm font-medium text-white transition-colors hover:bg-[#1F2A5C]/80"
          >
            ไปที่หน้าเข้าสู่ระบบ
          </button>
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 pb-40 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            โปรไฟล์ของฉัน
          </h1>
          <CloseBtn onClick={() => router.back()} />
        </div>

        <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-[360px_1fr] lg:items-start">
          {/* ===== การ์ดตัวอย่างโปรไฟล์ (แสดงผลสดตามที่แก้) ===== */}
          <section className="relative overflow-hidden rounded-[2rem] bg-[#F4D35E] p-6 text-[#4A3B00] sm:p-8 lg:sticky lg:top-6">
            {/* วงกลมตกแต่งพื้นหลัง */}
            <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#F4A58A] opacity-60" />
            <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#A8B5E8] opacity-60" />

            <div className="relative flex items-center gap-5 lg:flex-col lg:gap-0 lg:text-center">
              <div className="relative shrink-0 lg:pt-8">
                {isTop && (
                  <Crown className="absolute -top-7 left-1/2 w-12 -translate-x-1/2 -rotate-6 lg:top-0 lg:w-14" />
                )}
                <Avatar
                  key={avatar}
                  id={avatar}
                  size="h-24 w-24 ring-4 ring-white sm:h-28 sm:w-28 lg:h-36 lg:w-36"
                />
              </div>
              <div className="min-w-0 lg:mt-5">
                <p className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  {cleanName || "ชื่อของคุณ"}
                </p>
                <p className="mt-1 text-sm opacity-70">
                  {isTop ? "ผู้นำอันดับ 1 ตอนนี้" : "ผู้เล่นใน 7 Days 7 Games"}
                </p>
              </div>
            </div>

            <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map(([n, label]) => (
                <div key={label} className="rounded-3xl bg-white/70 px-2 py-4 text-center">
                  <dd className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                    {n}
                  </dd>
                  <dt className="mt-0.5 text-xs opacity-70">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          {/* ===== ฟอร์มแก้ไข ===== */}
          <div className="flex flex-col gap-5">
            <section className="rounded-[2rem] bg-white p-6 ring-1 ring-black/5 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#A8B5E8]" />
                <label htmlFor="pname" className="text-lg font-semibold tracking-tight">
                  ชื่อที่แสดง
                </label>
              </div>
              <div className="relative mt-4">
                <input
                  id="pname"
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อที่จะแสดงบนอันดับ"
                  className="h-14 w-full rounded-full border border-black/[.08] bg-zinc-50 pl-6 pr-16 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-zinc-400">
                  {cleanName.length}/20
                </span>
              </div>
              <p
                className={`mt-3 px-2 text-sm ${
                  valid ? "text-zinc-500" : "text-[#C4262E]"
                }`}
              >
                {valid
                  ? "ชื่อนี้จะแสดงบนอันดับให้ผู้เล่นคนอื่นเห็น"
                  : "ชื่อต้องยาว 2-20 ตัวอักษร"}
              </p>
            </section>

            <section className="rounded-[2rem] bg-white p-6 ring-1 ring-black/5 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#9CC593]" />
                <h2 id="avatar-label" className="text-lg font-semibold tracking-tight">
                  รูปโปรไฟล์
                </h2>
              </div>
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
                      className={`rounded-full outline-none transition-transform duration-150 focus-visible:ring-4 focus-visible:ring-blue-400 ${
                        on
                          ? "scale-105 shadow-lg ring-4 ring-zinc-900 ring-offset-2"
                          : "hover:scale-105"
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
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="h-14 shrink-0 rounded-full bg-white px-6 text-sm font-medium ring-1 ring-black/[.08] transition-colors hover:bg-zinc-100"
          >
            ออกจากระบบ
          </button>
          <button
            type="button"
            disabled={!valid || !changed}
            onClick={handleSave}
            className="h-14 flex-1 rounded-full bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>
    </div>
  );
}