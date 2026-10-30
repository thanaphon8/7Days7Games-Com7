"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameQuota = { limit: number; used: number; remaining: number | null };

// มุมมองที่หน้าเว็บใช้แสดงผล (null = ยังโหลดไม่เสร็จ หรือเป็น guest ไม่ต้องแสดง)
export type QuotaView =
  | { kind: "unlimited" }
  | { kind: "left"; remaining: number; limit: number }
  | { kind: "out"; limit: number; msLeft: number };

// เวลาที่เหลือก่อนรีเซ็ต เช่น "5 ชม. 42 น." / "42 น."
export function formatWait(ms: number): string {
  const total = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} น.`;
}

const TICK_MS = 20_000; // อัปเดตตัวนับถอยหลังทุก 20 วินาที (แสดงผลเป็นนาที)

// ดึงรอบที่เหลือวันนี้ของทุกเกมจาก /api/game/status
// โหลดใหม่เมื่อ: เข้าหน้า, กลับมาที่แท็บ, กลับมาจากหน้าอื่น (bfcache), และเมื่อถึงเวลารีเซ็ต 06:00
export function useGameQuota() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [games, setGames] = useState<Record<string, GameQuota>>({});
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const aliveRef = useRef(true);
  const resetReloadedFor = useRef<number | null>(null); // กันโหลดซ้ำวนๆ ถ้าเซิร์ฟเวอร์ตอบ resetAt เดิม

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/game/status", { cache: "no-store" });
      const r = await res.json().catch(() => null);
      if (!res.ok || !r?.success || !Array.isArray(r.games)) return;
      if (!aliveRef.current) return;
      const map: Record<string, GameQuota> = {};
      for (const g of r.games as { gameId: string; limit: number; used: number; remaining: number | null }[]) {
        map[g.gameId] = { limit: Number(g.limit) || 0, used: Number(g.used) || 0, remaining: g.remaining ?? null };
      }
      const t = Date.parse(r.resetAt);
      setGames(map);
      setAuthed(!!r.authed);
      setResetAt(Number.isFinite(t) ? t : null);
      setNow(Date.now());
    } catch {
      // เน็ตหลุด: ใช้ค่าเดิมต่อ แล้วลองใหม่ตอนกลับมาที่แท็บ
    }
  }, []);

  // โหลดตอนเข้าหน้า + ตอนกลับมาที่แท็บ/หน้า
  useEffect(() => {
    aliveRef.current = true;
    reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [reload]);

  // ตัวนับถอยหลัง
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // ถึงเวลารีเซ็ตแล้ว: โหลดรอบใหม่ (ครั้งเดียวต่อรอบรีเซ็ต)
  useEffect(() => {
    if (resetAt === null || now < resetAt) return;
    if (resetReloadedFor.current === resetAt) return;
    resetReloadedFor.current = resetAt;
    reload();
  }, [now, resetAt, reload]);

  const quotaOf = useCallback(
    (id: string): QuotaView | null => {
      if (authed !== true) return null; // guest หรือยังโหลดไม่เสร็จ
      const g = games[id];
      if (!g) return null;
      if (g.limit <= 0) return { kind: "unlimited" };
      const remaining = g.remaining ?? Math.max(0, g.limit - g.used);
      if (remaining > 0) return { kind: "left", remaining, limit: g.limit };
      return { kind: "out", limit: g.limit, msLeft: resetAt === null ? 0 : resetAt - now };
    },
    [authed, games, resetAt, now]
  );

  return { authed, quotaOf, reload };
}