// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { getSessionUser } from "../../../lib/auth";

// userId ในหน้าเว็บ = username (ตัวพิมพ์เล็ก) ที่เก็บในคอลเลกชัน users
const MAX_AVATAR = 5 * 1024 * 1024;

type UserDoc = {
  username: string;
  nickname: string;
  avatarUrl?: string;
  points?: number;
  gameScores?: Record<string, number>;
  savedEvents?: unknown[];
  savedGames?: unknown[];
  companyId?: number | null;
  departmentId?: number | null;
  branchId?: number | null;
};

const toPublic = (u: UserDoc) => ({
  userId: u.username,
  name: u.nickname,
  avatarUrl: u.avatarUrl ?? "",
  avatarId: u.avatarUrl ?? "", // เผื่อโค้ดเก่าที่ยังอ่าน avatarId
  points: u.points ?? 0,
  gameScores: u.gameScores ?? {},
  savedEvents: u.savedEvents ?? [],
  savedGames: u.savedGames ?? [],
  companyId: u.companyId ?? null,
  departmentId: u.departmentId ?? null,
  branchId: u.branchId ?? null,
});

// อัปโหลดรูปผ่าน Google Apps Script (เหมือน register)
async function uploadAvatar(file: File, username: string) {
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!GAS_URL) return null;
  try {
    const fileBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ext = file.name.split(".").pop() || "jpg";
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({
        fileBase64,
        fileName: `avatar_${username}_${Date.now()}.${ext}`,
        fileType: file.type,
      }),
    });
    const out = await res.json();
    return out.success ? { url: out.imageUrl as string, fileId: out.fileId as string } : null;
  } catch (e) {
    console.error("avatar upload failed", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/user?userId=xxx  → ผู้ใช้คนเดียว                           */
/*  GET /api/user             → รายชื่อทั้งหมด (ไว้คำนวณอันดับ)          */
/* ------------------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const userId = new URL(req.url).searchParams.get("userId")?.trim().toLowerCase();

    if (userId) {
      const me = await getSessionUser();
      if (!me) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
      }
      const u = await users.findOne({ username: userId }, { projection: { passwordHash: 0 } });
      if (!u) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้" }, { status: 404 });
      // ข้อมูลเต็ม (รายการโปรด ฯลฯ) ให้เฉพาะเจ้าของบัญชี คนอื่นเห็นแค่ข้อมูลสาธารณะ
      if (me.username !== userId) {
        return NextResponse.json({
          success: true,
          data: { userId: u.username, name: u.nickname, avatarUrl: u.avatarUrl ?? "", points: u.points ?? 0 },
        });
      }
      return NextResponse.json({ success: true, data: toPublic(u) });
    }

    const list = await users
      .find(
        {},
        { projection: { username: 1, nickname: 1, avatarUrl: 1, points: 1, gameScores: 1 } }
      )
      .sort({ points: -1 })
      .limit(1000)
      .toArray();
    return NextResponse.json({
      success: true,
      data: list.map((u: UserDoc) => ({
        userId: u.username,
        name: u.nickname,
        avatarUrl: u.avatarUrl ?? "",
        points: u.points ?? 0,
        gameScores: u.gameScores ?? {},
      })),
    });
  } catch (e) {
    console.error("user GET failed", e);
    return NextResponse.json({ success: false, message: "เซิร์ฟเวอร์ผิดพลาด" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/user  → แก้ชื่อเล่น / รูปโปรไฟล์                          */
/*  รับ multipart (userId, name, avatar?) หรือ JSON (userId, name)        */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request) {
  try {
    let userIdRaw: unknown;
    let nameRaw: unknown;
    let avatar: File | null = null;

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      userIdRaw = fd.get("userId");
      nameRaw = fd.get("name");
      const f = fd.get("avatar");
      if (f instanceof File && f.size > 0) avatar = f;
    } else {
      const body = await req.json().catch(() => ({}));
      userIdRaw = body.userId;
      nameRaw = body.name;
    }

    // แก้ได้เฉพาะบัญชีของตัวเอง: ใช้ username จาก session เท่านั้น
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }
    const username: string = me.username;
    const claimed = typeof userIdRaw === "string" ? userIdRaw.trim().toLowerCase() : "";
    if (claimed && claimed !== username) {
      return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์แก้บัญชีนี้" }, { status: 403 });
    }

    const $set: Record<string, unknown> = {};

    if (typeof nameRaw === "string") {
      const name = nameRaw.trim();
      if (name.length < 2 || name.length > 20) {
        return NextResponse.json(
          { success: false, message: "ชื่อต้องยาว 2-20 ตัวอักษร" },
          { status: 400 }
        );
      }
      $set.nickname = name;
    }

    if (avatar) {
      if (!avatar.type.startsWith("image/")) {
        return NextResponse.json({ success: false, message: "ไฟล์ต้องเป็นรูปภาพ" }, { status: 400 });
      }
      if (avatar.size > MAX_AVATAR) {
        return NextResponse.json({ success: false, message: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB" }, { status: 400 });
      }
      const up = await uploadAvatar(avatar, username);
      if (!up) {
        return NextResponse.json({ success: false, message: "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 502 });
      }
      $set.avatarUrl = up.url;
      $set.driveFileId = up.fileId;
    }

    if (Object.keys($set).length === 0) {
      return NextResponse.json({ success: false, message: "ไม่มีข้อมูลที่ต้องแก้" }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const r = await users.updateOne({ username }, { $set });
    if (r.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้" }, { status: 404 });
    }
    const u = await users.findOne({ username }, { projection: { passwordHash: 0 } });
    return NextResponse.json({ success: true, data: u ? toPublic(u) : null });
  } catch (e) {
    console.error("user PATCH failed", e);
    return NextResponse.json({ success: false, message: "เซิร์ฟเวอร์ผิดพลาด" }, { status: 500 });
  }
}