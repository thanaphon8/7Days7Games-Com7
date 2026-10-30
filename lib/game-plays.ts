import { MongoClient, type Filter } from "mongodb";
import { randomUUID } from "crypto";

// ใช้ connection ตัวเดียวกับ lib/admin-db.ts และ lib/game-locks.ts
const g = globalThis as unknown as { _adminMongo?: Promise<MongoClient>; _playIdx?: Promise<void> };

function client() {
  if (!g._adminMongo) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    g._adminMongo = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return g._adminMongo;
}

// นับรอบต่อวัน: 1 เอกสาร = ผู้ใช้ 1 คน x เกม 1 เกม x วัน 1 วัน
type PlayDoc = { _id: string; username: string; gameId: string; dayKey: string; count: number };
// session ของรอบที่กำลังเล่น ใช้ได้ครั้งเดียว
type SessionDoc = {
  _id: string;
  username: string;
  gameId: string;
  dayKey: string;
  startedAt: Date;
  expiresAt: Date;
  used: boolean;
};

export const SESSION_TTL_MS = 40 * 60 * 1000; // 40 นาที
const TH_OFFSET_H = 7; // เวลาไทย UTC+7
const DAY_RESET_HOUR = 6; // รีเซ็ตรอบทุก 06:00 เวลาไทย
const SHIFT_MS = (TH_OFFSET_H - DAY_RESET_HOUR) * 3600_000;

async function cols() {
  const c = await client();
  const db = c.db(process.env.MONGODB_DB || undefined);
  const plays = db.collection<PlayDoc>("game_plays");
  const sessions = db.collection<SessionDoc>("game_sessions");
  // ลบ session เก่าอัตโนมัติ 1 วันหลังหมดอายุ (สร้าง index ครั้งเดียวต่อ process)
  if (!g._playIdx) {
    g._playIdx = sessions
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 86400 })
      .then(() => undefined)
      .catch(() => undefined);
  }
  await g._playIdx;
  return { plays, sessions };
}

// "วัน" ของเกม: เลื่อนเวลาให้ 06:00 ไทยเป็นเที่ยงคืน แล้วใช้วันที่ UTC เป็นคีย์
export function dayKey(now = Date.now()): string {
  return new Date(now + SHIFT_MS).toISOString().slice(0, 10);
}

// เวลาที่รอบจะรีเซ็ตครั้งถัดไป (06:00 ไทย)
export function nextResetAt(now = Date.now()): Date {
  const shifted = now + SHIFT_MS;
  const nextMidnight = (Math.floor(shifted / 86400_000) + 1) * 86400_000;
  return new Date(nextMidnight - SHIFT_MS);
}

export type StartResult =
  | { ok: true; sessionId: string; used: number; limit: number; remaining: number | null }
  | { ok: false; used: number; limit: number };

// หักรอบ 1 ครั้งแบบ atomic แล้วเปิด session ใหม่
// limit <= 0 = ไม่จำกัด (ยังนับไว้เพื่อโชว์ใน admin)
export async function startRound(username: string, gameId: string, limit: number): Promise<StartResult> {
  const { plays, sessions } = await cols();
  const day = dayKey();
  const id = `${username}:${gameId}:${day}`;
  const filter: Filter<PlayDoc> = limit > 0 ? { _id: id, count: { $lt: limit } } : { _id: id };

  try {
    // ถ้าครบลิมิต filter ไม่ตรง -> upsert พยายามสร้าง _id ซ้ำ -> error 11000
    await plays.updateOne(
      filter,
      { $inc: { count: 1 }, $setOnInsert: { username, gameId, dayKey: day } },
      { upsert: true }
    );
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      const cur = await plays.findOne({ _id: id });
      return { ok: false, used: cur?.count ?? limit, limit };
    }
    throw e;
  }

  try {
    // เริ่มรอบใหม่ = รอบเก่าที่ค้างอยู่ (รีเว็บ/เปิดหลายแท็บ) ใช้ส่งแต้มไม่ได้อีก
    await sessions.updateMany({ username, gameId, used: false }, { $set: { used: true } });
    const now = new Date();
    const sessionId = randomUUID();
    await sessions.insertOne({
      _id: sessionId,
      username,
      gameId,
      dayKey: day,
      startedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      used: false,
    });
    const cur = await plays.findOne({ _id: id });
    const used = cur?.count ?? 1;
    return { ok: true, sessionId, used, limit, remaining: limit > 0 ? Math.max(0, limit - used) : null };
  } catch (e) {
    // สร้าง session ไม่สำเร็จ: คืนรอบที่หักไป
    await plays.updateOne({ _id: id }, { $inc: { count: -1 } }).catch(() => undefined);
    throw e;
  }
}

// ปิด session ตอนส่งแต้ม: สำเร็จเฉพาะ session ของ user+เกมนี้ ยังไม่ใช้ และยังไม่หมดอายุ
export async function closeSession(sessionId: unknown, username: string, gameId: string): Promise<boolean> {
  if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 64) return false;
  const { sessions } = await cols();
  const r = await sessions.updateOne(
    { _id: sessionId, username, gameId, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true } }
  );
  return r.modifiedCount === 1;
}

export type GameStatus = { gameId: string; limit: number; used: number; remaining: number | null };

// รอบที่ใช้ไปวันนี้ของผู้ใช้ 1 คน ทุกเกม (remaining = null เมื่อไม่จำกัด)
export async function getStatus(
  username: string,
  limits: Record<string, number>,
  gameIds: readonly string[]
): Promise<GameStatus[]> {
  const { plays } = await cols();
  const rows = await plays.find({ username, dayKey: dayKey() }).toArray();
  const usedBy: Record<string, number> = {};
  for (const r of rows) usedBy[r.gameId] = r.count;
  return gameIds.map((gameId) => {
    const limit = limits[gameId] ?? 0;
    const used = usedBy[gameId] ?? 0;
    return { gameId, limit, used, remaining: limit > 0 ? Math.max(0, limit - used) : null };
  });
}

// ใช้ใน admin: รอบที่ใช้วันนี้ของทุกคน { username: { gameId: count } }
export async function getTodayPlaysMap(): Promise<Record<string, Record<string, number>>> {
  const { plays } = await cols();
  const rows = await plays.find({ dayKey: dayKey() }).toArray();
  const map: Record<string, Record<string, number>> = {};
  for (const r of rows) (map[r.username] ||= {})[r.gameId] = r.count;
  return map;
}

// ใช้ใน admin: รีเซ็ตรอบวันนี้ของผู้ใช้ (ระบุเกม หรือทุกเกม)
export async function resetTodayPlays(username: string, gameId?: string): Promise<number> {
  const { plays } = await cols();
  const filter: Filter<PlayDoc> = { username, dayKey: dayKey() };
  if (gameId) filter.gameId = gameId;
  const r = await plays.deleteMany(filter);
  return r.deletedCount;
}  