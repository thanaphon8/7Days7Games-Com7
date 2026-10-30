// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // ลบ session ใน DB (ถ้าพลาด แค่ log ไม่ให้ตอบ 500)
  try {
    const { destroySession } = await import("../../../../lib/auth");
    await destroySession();
  } catch (e) {
    console.error("logout failed", e);
  }
  // ล้าง cookie เสมอ แม้ DB มีปัญหา
  try {
    (await cookies()).delete("session");
  } catch {}
  return NextResponse.json({ success: true });
}