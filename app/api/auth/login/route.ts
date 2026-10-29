// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "../../../../lib/mongodb";
import { createSession } from "../../../../lib/auth";

// hash ปลอมไว้เทียบเวลา username ไม่มีในระบบ (กันเดาว่า username ไหนมีอยู่จริงจากเวลาตอบ)
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.rJ6vYk1xv6m3o2dQxY0eQ1b0fQ5K";

const BAD_LOGIN = "username หรือรหัสผ่านไม่ถูกต้อง";

export async function POST(req: Request) {
  try {
    let body: { username?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const errors: Record<string, string> = {};
    if (!username) errors.username = "กรอก username";
    if (!password) errors.password = "กรอกรหัสผ่าน";
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const db = await getDb();
    const u = await db.collection("users").findOne({ username });

    const ok = await bcrypt.compare(password, u?.passwordHash ?? DUMMY_HASH);
    if (!u || !ok) {
      return NextResponse.json({ error: BAD_LOGIN }, { status: 401 });
    }

    await createSession(u._id);

    return NextResponse.json({
      user: {
        name: u.nickname,
        username: u.display ?? u.username,
        employeeId: u.employeeId,
        avatarUrl: u.avatarUrl ?? "",
        points: u.points ?? 0,
        companyId: u.companyId ?? null,
        departmentId: u.departmentId ?? null,
        branchId: u.branchId ?? null,
      },
    });
  } catch (e) {
    console.error("login failed", e);
    return NextResponse.json({ error: "เซิร์ฟเวอร์ผิดพลาด" }, { status: 500 });
  }
}