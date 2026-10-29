import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { userFilter, usersCollection } from "@/lib/admin-db";

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
  if (typeof body.name === "string") set.name = body.name.trim().slice(0, 60);
  if (typeof body.banned === "boolean") set.banned = body.banned;
  if (body.gameScores && typeof body.gameScores === "object") {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.gameScores)) {
      const n = Math.max(0, Math.round(Number(v) || 0));
      if (n > 0) clean[k] = n;
    }
    set.gameScores = clean;
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
  const r = await col.deleteOne(userFilter(id));
  return NextResponse.json({ success: r.deletedCount > 0 });
}