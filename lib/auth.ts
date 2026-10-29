// lib/auth.ts
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 วัน

// ใน DB เก็บแค่ hash ของ token (ถ้า DB รั่ว ก็เอา token ไปสวมสิทธิ์ไม่ได้)
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// สร้าง session ให้ user แล้วตั้ง cookie (ใช้ใน register / login)
export async function createSession(userId: ObjectId) {
  const token = randomBytes(32).toString("hex");
  const db = await getDb();
  await db.collection("sessions").insertOne({
    tokenHash: hash(token),
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + MAX_AGE * 1000),
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

// อ่าน user ที่ล็อกอินอยู่จาก cookie (ไม่มี / หมดอายุ = null)
export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const s = await db
    .collection("sessions")
    .findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } });
  if (!s) return null;
  return db
    .collection("users")
    .findOne({ _id: s.userId }, { projection: { passwordHash: 0 } });
}

// ออกจากระบบ: ลบ session ใน DB และล้าง cookie
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection("sessions").deleteOne({ tokenHash: hash(token) });
  }
  jar.delete(COOKIE);
}