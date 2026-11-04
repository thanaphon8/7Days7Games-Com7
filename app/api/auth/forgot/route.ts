// app/api/auth/forgot/route.ts
// ลืมรหัสผ่าน 2 ขั้น
//   step "verify": username + companyId + employeeId ถูกต้อง → ออก token (10 นาที ใช้ครั้งเดียว)
//   step "reset" : token + password ใหม่ → เปลี่ยนรหัส + ลบ session เก่าทั้งหมด
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import type { Db } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

const BAD = "ข้อมูลไม่ถูกต้อง"; // ข้อความเดียวทุกกรณี ไม่บอกว่าผิดช่องไหน
const TOO_MANY = "ลองผิดหลายครั้งเกินไป รอสักครู่แล้วลองใหม่";
const BAD_TOKEN = "หมดเวลาหรือลิงก์ไม่ถูกต้อง กรุณาเริ่มใหม่";

const TOKEN_TTL_MS = 10 * 60 * 1000; // token อายุ 10 นาที
const WINDOW_MS = 15 * 60 * 1000; // หน้าต่างนับครั้งที่ผิด 15 นาที
const MAX_FAILS_USER = 5; // ผิดได้ต่อ username
const MAX_FAILS_IP = 20; // ผิดได้ต่อ IP (สูงกว่า เพราะคนในออฟฟิศเดียวกันใช้ IP ร่วมกัน)

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64) || "unknown";
  return (req.headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

type Limit = { key: string; max: number };

// โดนล็อกอยู่ไหม (ลบตัวนับที่หมดอายุก่อน เพราะ TTL ของ Mongo ลบช้าได้ถึง ~1 นาที)
async function isLimited(db: Db, limits: Limit[]): Promise<boolean> {
  const col = db.collection("rate_limits");
  const keys = limits.map((l) => l.key);
  await col.deleteMany({ key: { $in: keys }, expiresAt: { $lte: new Date() } });
  const rows = await col.find({ key: { $in: keys } }).toArray();
  return rows.some((r) => {
    const max = limits.find((l) => l.key === r.key)?.max ?? MAX_FAILS_USER;
    return (r.count ?? 0) >= max;
  });
}

// บันทึกว่ากรอกผิด 1 ครั้ง
async function addFail(db: Db, limits: Limit[]) {
  const col = db.collection("rate_limits");
  const expiresAt = new Date(Date.now() + WINDOW_MS);
  await Promise.allSettled(
    limits.map((l) =>
      col.updateOne(
        { key: l.key },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true }
      )
    )
  );
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail(BAD, 400);
    }

    const db = await getDb();
    const ip = clientIp(req);
    const ipLimit: Limit = { key: `forgot:ip:${ip}`, max: MAX_FAILS_IP };

    /* ============================ ขั้น 1: ตรวจ 3 อย่าง ============================ */
    if (body.step === "verify") {
      const username =
        typeof body.username === "string" ? body.username.trim().toLowerCase().slice(0, 40) : "";
      // รหัสพนักงานเก็บเป็นตัวพิมพ์ใหญ่ตอนสมัคร (เทียบแบบไม่สนตัวพิมพ์)
      const employeeId =
        typeof body.employeeId === "string" ? body.employeeId.trim().toUpperCase().slice(0, 40) : "";
      const companyRaw = body.companyId;
      const companyId =
        (typeof companyRaw === "string" || typeof companyRaw === "number") &&
        /^\d{1,3}$/.test(String(companyRaw))
          ? Number(companyRaw)
          : null;

      const userLimit: Limit = { key: `forgot:u:${username || "_"}`, max: MAX_FAILS_USER };
      const limits = [userLimit, ipLimit];

      if (await isLimited(db, limits)) return fail(TOO_MANY, 429);

      // รูปแบบข้อมูลผิด นับเป็นครั้งที่ผิดด้วย
      if (!username || !employeeId || companyId === null) {
        await addFail(db, limits);
        return fail(BAD, 400);
      }

      const user = await db.collection("users").findOne(
        { username, companyId, employeeId },
        { projection: { _id: 1 } }
      );

      // สร้าง token ทุกกรณี (แม้ไม่พบ user) เวลาตอบจะได้ใกล้เคียงกัน
      const token = randomBytes(32).toString("hex");
      const tokenHash = sha256(token);

      if (!user) {
        await addFail(db, limits);
        return fail(BAD, 400);
      }

      // 1 user มี token ได้ใบเดียว ขอใหม่ = ใบเก่าใช้ไม่ได้
      const tokens = db.collection("reset_tokens");
      await tokens.deleteMany({ userId: user._id });
      await tokens.insertOne({
        tokenHash,
        userId: user._id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      });

      return NextResponse.json({ success: true, token });
    }

    /* ============================ ขั้น 2: ตั้งรหัสใหม่ ============================ */
    if (body.step === "reset") {
      const token = typeof body.token === "string" ? body.token : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (await isLimited(db, [ipLimit])) return fail(TOO_MANY, 429);

      if (!/^[a-f0-9]{64}$/.test(token)) {
        await addFail(db, [ipLimit]);
        return fail(BAD_TOKEN, 400, { code: "bad_token" });
      }
      // ตรวจรหัสผ่านก่อนใช้ token (รหัสสั้นเกินไม่ทำให้ token หมด)
      if (password.length < 6 || password.length > 72) {
        return NextResponse.json(
          { errors: { password: "รหัสผ่านต้องยาว 6-72 ตัวอักษร" } },
          { status: 400 }
        );
      }

      const tokens = db.collection("reset_tokens");
      const doc = await tokens.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
      if (!doc) {
        await addFail(db, [ipLimit]);
        return fail(BAD_TOKEN, 400, { code: "bad_token" });
      }
      // ใช้ได้ครั้งเดียว: ใครลบสำเร็จก่อนคนนั้นได้ไป (กันยิงซ้อน)
      const used = await tokens.deleteOne({ _id: doc._id });
      if (used.deletedCount !== 1) {
        return fail(BAD_TOKEN, 400, { code: "bad_token" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const users = db.collection("users");
      const r = await users.updateOne(
        { _id: doc.userId },
        { $set: { passwordHash, passwordChangedAt: new Date() } }
      );
      if (r.matchedCount === 0) return fail(BAD_TOKEN, 400, { code: "bad_token" });

      // เตะทุกเครื่องที่ล็อกอินค้างไว้ + ล้าง token ที่เหลือ
      await db.collection("sessions").deleteMany({ userId: doc.userId });
      await tokens.deleteMany({ userId: doc.userId });

      // ล้างตัวนับผิดของ username นี้
      const u = await users.findOne({ _id: doc.userId }, { projection: { username: 1 } });
      if (u?.username) {
        await db.collection("rate_limits").deleteOne({ key: `forgot:u:${u.username}` });
      }

      return NextResponse.json({ success: true });
    }

    return fail(BAD, 400);
  } catch (e) {
    console.error("forgot failed", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500);
  }
}