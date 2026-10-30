// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";
import { getSessionUser } from "../../../lib/auth";

// userId ในหน้าเว็บ = username (ตัวพิมพ์เล็ก) ที่เก็บในคอลเลกชัน users
const MAX_AVATAR = 5 * 1024 * 1024;
// รูปสำเร็จรูป p1-p25 (ตรงกับ /img/p1.png - /img/p25.png)
const PRESET_RE = /^p([1-9]|1\d|2[0-5])$/;
const GAME_KEY_RE = /^[A-Za-z0-9_]{1,40}$/;
const MAX_SAVED = 200;
const MAX_SCORE_PER_ROUND = 100000; // กันค่าผิดปกติ

type UserDoc = {
  username: string;
  nickname: string;
  avatarUrl?: string; // รูปที่ผู้ใช้อัปโหลดเอง
  avatarPreset?: string; // รูปสำเร็จรูป เช่น "p3"
  points?: number;
  gameScores?: Record<string, number>;
  savedEvents?: unknown[];
  savedGames?: unknown[];
  companyId?: number | null;
  departmentId?: number | null;
  branchId?: number | null;
  banned?: boolean;
};

// รูปที่ใช้แสดงจริง: รูปที่อัปโหลด > รูปสำเร็จรูป > ว่าง
// หน้าเว็บอ่านจาก avatarId / avatar จึงส่งค่านี้ให้ทั้งสองชื่อ
const effAvatar = (u: Pick<UserDoc, "avatarUrl" | "avatarPreset">) =>
  u.avatarUrl || u.avatarPreset || "";

// แต้มรวม: ใช้ points ถ้ามี ไม่งั้นรวมจาก gameScores
const totalPoints = (u: Pick<UserDoc, "points" | "gameScores">) => {
  if (typeof u.points === "number" && u.points > 0) return u.points;
  return Object.values(u.gameScores ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
};

const toPublic = (u: UserDoc) => {
  const avatar = effAvatar(u);
  return {
    userId: u.username,
    name: u.nickname,
    avatar,
    avatarId: avatar,
    avatarUrl: u.avatarUrl ?? "",
    avatarPreset: u.avatarPreset ?? "",
    points: totalPoints(u),
    gameScores: u.gameScores ?? {},
    savedEvents: u.savedEvents ?? [],
    savedGames: u.savedGames ?? [],
    companyId: u.companyId ?? null,
    departmentId: u.departmentId ?? null,
    branchId: u.branchId ?? null,
  };
};

// รายการ id ที่บันทึกไว้ (กิจกรรม/เกม): ต้องเป็น array ของ string สั้นๆ
const strList = (v: unknown): string[] | null =>
  Array.isArray(v) &&
  v.length <= MAX_SAVED &&
  v.every((x) => typeof x === "string" && x.length > 0 && x.length <= 64)
    ? (v as string[])
    : null;

// อัปโหลดรูปผ่าน Google Apps Script (เหมือน register)
type UploadResult = { ok: true; url: string; fileId: string } | { ok: false; reason: string };

async function uploadAvatar(file: File, username: string): Promise<UploadResult> {
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!GAS_URL) {
    console.error("avatar upload: ไม่ได้ตั้ง GOOGLE_APPS_SCRIPT_URL (ใส่ใน .env.local แล้วรีสตาร์ต npm run dev)");
    return { ok: false, reason: "ยังไม่ได้ตั้งค่า GOOGLE_APPS_SCRIPT_URL" };
  }
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
    const text = await res.text();
    let out: { success?: boolean; imageUrl?: string; fileId?: string; error?: string; message?: string };
    try {
      out = JSON.parse(text);
    } catch {
      console.error("avatar upload: Apps Script ไม่ได้ตอบเป็น JSON", res.status, text.slice(0, 200));
      return { ok: false, reason: "Apps Script ไม่ได้ตอบเป็น JSON (เช็กว่า deploy แบบ Anyone)" };
    }
    if (!out.success || !out.imageUrl) {
      console.error("avatar upload: Apps Script ตอบว่าไม่สำเร็จ", out);
      return { ok: false, reason: out.error || out.message || "Apps Script ตอบว่าไม่สำเร็จ" };
    }
    return { ok: true, url: out.imageUrl, fileId: out.fileId ?? "" };
  } catch (e) {
    console.error("avatar upload: เรียก Apps Script ไม่สำเร็จ", e);
    return { ok: false, reason: "เรียก Apps Script ไม่สำเร็จ" };
  }
}

const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

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
      if (!me) return fail("กรุณาเข้าสู่ระบบ", 401);
      const u = await users.findOne({ username: userId }, { projection: { passwordHash: 0 } });
      if (!u) return fail("ไม่พบผู้ใช้", 404);
      // ข้อมูลเต็ม (รายการโปรด ฯลฯ) ให้เฉพาะเจ้าของบัญชี คนอื่นเห็นแค่ข้อมูลสาธารณะ
      if (me.username !== userId) {
        const avatar = effAvatar(u);
        return NextResponse.json({
          success: true,
          data: {
            userId: u.username,
            name: u.nickname,
            avatar,
            avatarId: avatar,
            avatarUrl: u.avatarUrl ?? "",
            points: totalPoints(u),
          },
        });
      }
      return NextResponse.json({ success: true, data: toPublic(u) });
    }

    const list = await users
      .find(
        { banned: { $ne: true } },
        {
          projection: {
            username: 1,
            nickname: 1,
            avatarUrl: 1,
            avatarPreset: 1,
            points: 1,
            gameScores: 1,
          },
        }
      )
      .sort({ points: -1 })
      .limit(1000)
      .toArray();
    return NextResponse.json({
      success: true,
      data: list.map((u: UserDoc) => {
        const avatar = effAvatar(u);
        return {
          userId: u.username,
          name: u.nickname,
          avatar,
          avatarId: avatar,
          avatarUrl: u.avatarUrl ?? "",
          points: totalPoints(u),
          gameScores: u.gameScores ?? {},
        };
      }),
    });
  } catch (e) {
    console.error("user GET failed", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500);
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/user                                                    */
/*  multipart: userId, name, avatar(ไฟล์), avatarPreset                  */
/*  JSON: userId, name, avatarPreset, savedEvents, savedGames            */
/*  JSON (เกม): userId, gameKey, score → บวกสะสมเข้า gameScores + points  */
/* ------------------------------------------------------------------ */
export async function PATCH(req: Request) {
  try {
    let userIdRaw: unknown;
    let nameRaw: unknown;
    let presetRaw: unknown;
    let savedEventsRaw: unknown;
    let savedGamesRaw: unknown;
    let gameKeyRaw: unknown;
    let scoreRaw: unknown;
    let avatar: File | null = null;

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      userIdRaw = fd.get("userId");
      nameRaw = fd.get("name");
      presetRaw = fd.get("avatarPreset");
      const f = fd.get("avatar");
      if (f instanceof File && f.size > 0) avatar = f;
    } else {
      const body = await req.json().catch(() => ({}));
      userIdRaw = body.userId;
      nameRaw = body.name;
      presetRaw = body.avatarPreset;
      savedEventsRaw = body.savedEvents;
      savedGamesRaw = body.savedGames;
      gameKeyRaw = body.gameKey;
      scoreRaw = body.score;
    }

    // แก้ได้เฉพาะบัญชีของตัวเอง: ใช้ username จาก session เท่านั้น
    const me = await getSessionUser();
    if (!me) return fail("กรุณาเข้าสู่ระบบ", 401);
    const username: string = me.username;
    const claimed = typeof userIdRaw === "string" ? userIdRaw.trim().toLowerCase() : "";
    if (claimed && claimed !== username) return fail("ไม่มีสิทธิ์แก้บัญชีนี้", 403);

    const $set: Record<string, unknown> = {};
    const $inc: Record<string, number> = {};

    // ---- บันทึกแต้มเกม (บวกสะสมทุกรอบ) ----
    if (gameKeyRaw !== undefined || scoreRaw !== undefined) {
      if (me.banned) return fail("บัญชีนี้ถูกระงับ", 403);
      const score = Math.floor(Number(scoreRaw));
      if (typeof gameKeyRaw !== "string" || !GAME_KEY_RE.test(gameKeyRaw)) {
        return fail("ชื่อเกมไม่ถูกต้อง", 400);
      }
      if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE_PER_ROUND) {
        return fail("แต้มไม่ถูกต้อง", 400);
      }
      $inc[`gameScores.${gameKeyRaw}`] = score;
      $inc.points = score;
    }

    if (typeof nameRaw === "string") {
      const name = nameRaw.trim();
      if (name.length < 2 || name.length > 20) return fail("ชื่อต้องยาว 2-20 ตัวอักษร", 400);
      $set.nickname = name;
    }

    if (avatar) {
      // อัปโหลดรูปเอง
      if (!avatar.type.startsWith("image/")) return fail("ไฟล์ต้องเป็นรูปภาพ", 400);
      if (avatar.size > MAX_AVATAR) return fail("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB", 400);
      const up = await uploadAvatar(avatar, username);
      if (!up.ok) {
        const dev = process.env.NODE_ENV !== "production";
        return fail(dev ? `อัปโหลดรูปไม่สำเร็จ: ${up.reason}` : "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง", 502);
      }
      $set.avatarUrl = up.url;
      $set.driveFileId = up.fileId;
      $set.avatarPreset = "";
    } else if (presetRaw !== undefined && presetRaw !== null && presetRaw !== "") {
      // เลือกรูปสำเร็จรูป p1-p25 (ล้างรูปที่อัปโหลดไว้ เพื่อให้รูปนี้มีผล)
      if (typeof presetRaw !== "string" || !PRESET_RE.test(presetRaw)) {
        return fail("รูปที่เลือกไม่ถูกต้อง", 400);
      }
      $set.avatarPreset = presetRaw;
      $set.avatarUrl = "";
      $set.driveFileId = "";
    }

    if (savedEventsRaw !== undefined) {
      const list = strList(savedEventsRaw);
      if (!list) return fail("รายการกิจกรรมที่บันทึกไม่ถูกต้อง", 400);
      $set.savedEvents = list;
    }
    if (savedGamesRaw !== undefined) {
      const list = strList(savedGamesRaw);
      if (!list) return fail("รายการเกมที่บันทึกไม่ถูกต้อง", 400);
      $set.savedGames = list;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($inc).length) update.$inc = $inc;
    if (Object.keys(update).length === 0) return fail("ไม่มีข้อมูลที่ต้องแก้", 400);

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const r = await users.updateOne({ username }, update);
    if (r.matchedCount === 0) return fail("ไม่พบผู้ใช้", 404);
    const u = await users.findOne({ username }, { projection: { passwordHash: 0 } });
    return NextResponse.json({ success: true, data: u ? toPublic(u) : null });
  } catch (e) {
    console.error("user PATCH failed", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500);
  }
}