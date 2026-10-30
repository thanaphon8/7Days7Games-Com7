import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { sessionsCollection, userFilter, usersCollection } from "@/lib/admin-db";

export const dynamic = "force-dynamic";

const deny = () => NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
const SECRET_FIELDS = { password: 0, passwordHash: 0, hash: 0, salt: 0 };

export async function GET() {
  if (!(await isAdmin())) return deny();
  const col = await usersCollection();
  const data = await col.find({}, { projection: SECRET_FIELDS }).toArray();
  return NextResponse.json({ success: true, data });
}

// body: { id, name?, gameScores?, banned? }
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return deny();
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ success: false, error: "missing id" }, { status: 400 });

  const set: Record<string, unknown> = {};
  // ชื่อที่แสดงของระบบใหม่ = nickname (จำกัด 2-20 ตัวเหมือนหน้าโปรไฟล์)
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 20);
    if (name.length < 2) {
      return NextResponse.json({ success: false, error: "ชื่อต้องยาว 2-20 ตัวอักษร" }, { status: 400 });
    }
    set.nickname = name;
  }
  if (typeof body.banned === "boolean") set.banned = body.banned;
  if (body.gameScores && typeof body.gameScores === "object") {
    const clean: Record<string, number> = {};
    let total = 0;
    for (const [k, v] of Object.entries(body.gameScores)) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
      const n = Math.max(0, Math.round(Number(v) || 0));
      if (n > 0) {
        clean[k] = n;
        total += n;
      }
    }
    set.gameScores = clean;
    set.points = total; // แต้มรวมต้องตรงกับผลรวมรายเกมเสมอ
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ success: false, error: "nothing to update" }, { status: 400 });
  }

  const col = await usersCollection();
  const r = await col.updateOne(userFilter(String(body.id)), { $set: set });
  return NextResponse.json({ success: r.matchedCount > 0 });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return deny();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "missing id" }, { status: 400 });
  const col = await usersCollection();
  const filter = userFilter(id);
  const u = await col.findOne(filter, { projection: { _id: 1 } });
  if (!u) return NextResponse.json({ success: false });
  const r = await col.deleteOne({ _id: u._id });
  if (r.deletedCount > 0) {
    // ลบ session ที่ค้างอยู่ด้วย ผู้ใช้ที่ถูกลบจะได้ล็อกอินต่อไม่ได้
    const sessions = await sessionsCollection();
    await sessions.deleteMany({ userId: u._id });
  }
  return NextResponse.json({ success: r.deletedCount > 0 });
}