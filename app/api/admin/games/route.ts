import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getLockedGames, isGameId, setGameLocked } from "@/lib/game-locks";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

// รายการ id เกมที่ล็อกอยู่
export async function GET() {
  if (!(await isAdmin())) return deny();
  try {
    return NextResponse.json({ success: true, locked: await getLockedGames() });
  } catch (error) {
    console.error("Failed to read game locks:", error);
    return NextResponse.json({ success: false, error: "db error" }, { status: 500 });
  }
}

// body: { id: string, locked: boolean }
export async function PUT(req: Request) {
  if (!(await isAdmin())) return deny();
  const body = await req.json().catch(() => null);
  if (!isGameId(body?.id) || typeof body?.locked !== "boolean") {
    return NextResponse.json({ success: false, error: "bad request" }, { status: 400 });
  }
  try {
    const locked = await setGameLocked(body.id, body.locked);
    return NextResponse.json({ success: true, locked });
  } catch (error) {
    console.error("Failed to update game lock:", error);
    return NextResponse.json({ success: false, error: "db error" }, { status: 500 });
  }
}