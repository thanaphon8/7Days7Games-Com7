import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  getGameLimits,
  getLockedGames,
  isGameId,
  isValidLimit,
  setGameLimit,
  setGameLocked,
  MAX_GAME_LIMIT,
} from "@/lib/game-locks";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

// รายการ id เกมที่ล็อกอยู่ + ลิมิตรอบต่อวันของแต่ละเกม (0 = ไม่จำกัด)
export async function GET() {
  if (!(await isAdmin())) return deny();
  try {
    const [locked, limits] = await Promise.all([getLockedGames(), getGameLimits()]);
    return NextResponse.json({ success: true, locked, limits });
  } catch (error) {
    console.error("Failed to read game settings:", error);
    return NextResponse.json({ success: false, error: "db error" }, { status: 500 });
  }
}

// body: { id: string, locked?: boolean, limit?: number }  (ส่งอย่างใดอย่างหนึ่งหรือทั้งคู่)
export async function PUT(req: Request) {
  if (!(await isAdmin())) return deny();
  const body = await req.json().catch(() => null);

  const hasLocked = body?.locked !== undefined;
  const hasLimit = body?.limit !== undefined;
  if (!isGameId(body?.id) || (!hasLocked && !hasLimit)) {
    return NextResponse.json({ success: false, error: "bad request" }, { status: 400 });
  }
  if (hasLocked && typeof body.locked !== "boolean") {
    return NextResponse.json({ success: false, error: "bad request" }, { status: 400 });
  }
  if (hasLimit && !isValidLimit(body.limit)) {
    return NextResponse.json(
      { success: false, error: `ลิมิตต้องเป็นจำนวนเต็ม 0-${MAX_GAME_LIMIT} (0 = ไม่จำกัด)` },
      { status: 400 }
    );
  }

  try {
    if (hasLocked) await setGameLocked(body.id, body.locked);
    if (hasLimit) await setGameLimit(body.id, body.limit);
    const [locked, limits] = await Promise.all([getLockedGames(), getGameLimits()]);
    return NextResponse.json({ success: true, locked, limits });
  } catch (error) {
    console.error("Failed to update game settings:", error);
    return NextResponse.json({ success: false, error: "db error" }, { status: 500 });
  }
}