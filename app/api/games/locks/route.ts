import { NextResponse } from "next/server";
import { getLockedGames } from "@/lib/game-locks";

export const dynamic = "force-dynamic";

// สาธารณะ: คืนรายการ id เกมที่ถูกล็อก
export async function GET() {
  try {
    const locked = await getLockedGames();
    return NextResponse.json({ success: true, locked }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read game locks:", error);
    return NextResponse.json({ success: false, locked: [] }, { status: 500 });
  }
}