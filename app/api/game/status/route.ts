import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { GAME_IDS, getGameLimits } from "@/lib/game-locks";
import { getStatus, nextResetAt, type GameStatus } from "@/lib/game-plays";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// รอบที่เหลือวันนี้ของผู้ใช้ที่ล็อกอิน ทุกเกม
// guest: คืน authed=false และ remaining=null (guest เล่นได้ไม่จำกัด ไม่บันทึกแต้ม)
export async function GET() {
  try {
    const limits = await getGameLimits();
    const me = await getSessionUser();

    let games: GameStatus[];
    if (me) {
      games = await getStatus(me.username, limits, GAME_IDS);
    } else {
      games = GAME_IDS.map((gameId) => ({
        gameId,
        limit: limits[gameId] ?? 0,
        used: 0,
        remaining: null,
      }));
    }

    return NextResponse.json(
      { success: true, authed: !!me, games, resetAt: nextResetAt().toISOString() },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("game status failed", e);
    return NextResponse.json({ success: false, games: [] }, { status: 500, headers: NO_STORE });
  }
}