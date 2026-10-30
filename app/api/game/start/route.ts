import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getGameLimit, isGameId, isGameLocked } from "@/lib/game-locks";
import { nextResetAt, startRound } from "@/lib/game-plays";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status, headers: NO_STORE });

// body: { gameId }  -> หักรอบ 1 ครั้ง แล้วคืน sessionId ไว้ส่งตอนบันทึกแต้ม
export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return fail("กรุณาเข้าสู่ระบบ", 401, { code: "auth" });
    if (me.banned) return fail("บัญชีนี้ถูกระงับ", 403, { code: "banned" });

    const body = await req.json().catch(() => null);
    const gameId = body?.gameId;
    if (!isGameId(gameId)) return fail("ชื่อเกมไม่ถูกต้อง", 400, { code: "bad_game" });

    if (await isGameLocked(gameId)) return fail("เกมนี้ถูกล็อกอยู่", 403, { code: "locked" });

    const limit = await getGameLimit(gameId);
    const r = await startRound(me.username, gameId, limit);
    if (!r.ok) {
      return fail("ครบจำนวนรอบของวันนี้แล้ว", 403, {
        code: "limit",
        used: r.used,
        limit: r.limit,
        remaining: 0,
        resetAt: nextResetAt().toISOString(),
      });
    }
    return NextResponse.json(
      {
        success: true,
        sessionId: r.sessionId,
        used: r.used,
        limit: r.limit,
        remaining: r.remaining,
        resetAt: nextResetAt().toISOString(),
      },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("game start failed", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500, { code: "server" });
  }
}