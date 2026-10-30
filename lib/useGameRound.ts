"use client";

import { useCallback, useRef, useState } from "react";

export type RoundInfo = {
  used: number;
  limit: number; // 0 = ไม่จำกัด
  remaining: number | null; // null = ไม่จำกัด
  resetAt: string;
};

export type StartOutcome =
  | { ok: true; guest: boolean }
  | { ok: false; code: "limit" | "locked" | "banned" | "network" | "server"; message: string };

// เรียกตอนกด "เริ่มเล่น" / "เล่นอีกครั้ง": หักรอบที่เซิร์ฟเวอร์ แล้วเก็บ sessionId ไว้ส่งตอนบันทึกแต้ม
export function useGameRound(gameId: string) {
  // ใช้ ref เพื่อให้ effect ตอนจบเกมอ่านค่าล่าสุดได้เสมอ ไม่ติด closure เก่า
  const sessionIdRef = useRef<string | null>(null);
  const busyRef = useRef(false); // กันกดซ้ำระหว่างรอเซิร์ฟเวอร์ (กดซ้ำ = หักรอบซ้ำ)
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<RoundInfo | null>(null);

  const start = useCallback(async (): Promise<StartOutcome> => {
    if (busyRef.current) return { ok: false, code: "server", message: "กำลังเริ่มเกม" };
    busyRef.current = true;
    setStarting(true);
    setError("");
    sessionIdRef.current = null;

    const fail = (code: "limit" | "locked" | "banned" | "network" | "server", message: string): StartOutcome => {
      setError(message);
      return { ok: false, code, message };
    };

    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
        cache: "no-store",
      });
      const r = await res.json().catch(() => null);

      if (res.ok && r?.success && typeof r.sessionId === "string") {
        sessionIdRef.current = r.sessionId;
        setInfo({ used: r.used, limit: r.limit, remaining: r.remaining ?? null, resetAt: r.resetAt });
        return { ok: true, guest: false };
      }

      // guest: ไม่ได้ล็อกอิน เล่นได้เหมือนเดิม (ไม่นับรอบ ไม่บันทึกแต้ม)
      if (r?.code === "auth") return { ok: true, guest: true };

      if (r?.code === "limit") {
        setInfo({ used: r.used ?? 0, limit: r.limit ?? 0, remaining: 0, resetAt: r.resetAt });
        return fail("limit", "ครบจำนวนรอบของวันนี้แล้ว");
      }
      if (r?.code === "locked") return fail("locked", "เกมนี้ถูกล็อกอยู่");
      if (r?.code === "banned") return fail("banned", "บัญชีนี้ถูกระงับ");
      return fail("server", r?.message || "เริ่มเกมไม่สำเร็จ ลองใหม่อีกครั้ง");
    } catch {
      return fail("network", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      busyRef.current = false;
      setStarting(false);
    }
  }, [gameId]);

  return {
    start,
    starting,
    error,
    info,
    /** sessionId ของรอบที่กำลังเล่น (null = guest หรือยังไม่เริ่ม) อ่านผ่าน ref ตอนบันทึกแต้ม */
    sessionIdRef,
    clearError: () => setError(""),
  };
}