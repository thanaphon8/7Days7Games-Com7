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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("p1");
  const [savedCount, setSavedCount] = useState(0);
  const [isTop, setIsTop] = useState(false);
  const [loading, setLoading] = useState(true);

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
            setSavedCount(result.data.savedEvents?.length || 0);
          }

          // ตรวจสอบอันดับผู้ใช้เพื่อแสดงมงกุฎ
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
                return { name: u.name, score: totalScore };
              })
              .sort((a: any, b: any) => b.score - a.score);

            if (sorted.length > 0 && sorted[0].name === initialProfile.name) {
              setIsTop(true);
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
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        <p className="animate-pulse text-sm text-zinc-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-zinc-900">
        <p className="text-zinc-500">กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white"
        >
          ไปที่หน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-3xl px-6 pb-44 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            โปรไฟล์ของฉัน
          </h1>
          <button
            onClick={() => router.back()}
            aria-label="ปิด"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 shadow-none ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex items-center gap-5 rounded-[2rem] bg-[#F4D35E] p-6 text-[#4A3B00]">
          <div className="relative">
            {isTop && (
              <Crown className="absolute -top-8 left-1/2 w-12 -translate-x-1/2 -rotate-6" />
            )}
            <Avatar key={avatar} id={avatar} size="h-24 w-24 ring-4 ring-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-3xl font-semibold tracking-tight">
              {cleanName || "ชื่อของคุณ"}
            </p>
            <p className="mt-1 text-sm opacity-70">
              กิจกรรมที่บันทึกไว้ {savedCount} รายการ
            </p>
          </div>
        </div>

        <div className="mt-8">
          <label htmlFor="pname" className="text-sm font-medium">
            ชื่อที่แสดง
          </label>
          <input
            id="pname"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อที่จะแสดงบนอันดับ"
            className="mt-2 h-12 w-full rounded-full border border-black/[.08] bg-white px-5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
          />
          <p
            className={`mt-2 px-2 text-sm ${
              valid ? "text-zinc-500" : "text-[#C4262E]"
            }`}
          >
            {valid
              ? "ชื่อนี้จะแสดงบนอันดับให้ผู้เล่นคนอื่นเห็น"
              : "ชื่อต้องยาว 2-20 ตัวอักษร"}
          </p>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium">รูปโปรไฟล์</p>
          <div
            role="radiogroup"
            aria-label="รูปโปรไฟล์"
            className="mt-4 grid grid-cols-4 gap-4 sm:grid-cols-5 sm:gap-5"
          >
            {AVATAR_IDS.map((id) => {
              const on = avatar === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={on}
                  aria-label={`รูปโปรไฟล์ ${id}`}
                  onClick={() => setAvatar(id)}
                  className={`rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                    on
                      ? "scale-105 shadow-lg ring-4 ring-[#2B7FFF]"
                      : "hover:scale-105"
                  }`}
                >
                  <Avatar id={id} size="aspect-square w-full" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-6 pb-6 pt-12">
        <div className="mx-auto flex max-w-3xl gap-3">
          <button
            onClick={handleLogout}
            className="h-14 rounded-full border border-black/[.08] bg-white px-6 text-sm font-medium transition-colors hover:bg-black/[.04]"
          >
            ออกจากระบบ
          </button>
          <button
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