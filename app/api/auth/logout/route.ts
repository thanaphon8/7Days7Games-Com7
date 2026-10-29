// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { destroySession } from "../../../../lib/auth";

export async function POST() {
  try {
    await destroySession();
  } catch (e) {
    console.error("logout failed", e);
  }
  return NextResponse.json({ success: true });
}