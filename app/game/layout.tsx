"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// กันหน้าเกมที่ admin ล็อกไว้: ถ้าเข้า /game/<id> ของเกมที่ล็อก จะพากลับหน้าหลัก
// (การกันจริงของคะแนนอยู่ที่ API ส่วนนี้กันแค่การพิมพ์ลิงก์ตรง)
export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const gameId = pathname.split("/")[2] ?? "";
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    setOk(false);
    (async () => {
      try {
        const res = await fetch("/api/games/locks", { cache: "no-store" });
        const result = await res.json();
        const locked: string[] = result.success && Array.isArray(result.locked) ? result.locked : [];
        if (!alive) return;
        if (gameId && locked.includes(gameId)) router.replace("/");
        else setOk(true);
      } catch {
        // เช็กไม่ได้ ให้เล่นต่อได้ (API ฝั่งคะแนนยังกันอยู่)
        if (alive) setOk(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [gameId, router]);

  if (!ok) return <div aria-busy="true" className="min-h-[100dvh] bg-[#05080a]" />;
  return <>{children}</>;
}