import { MongoClient } from "mongodb";

// ใช้ connection ตัวเดียวกับ lib/admin-db.ts (key เดียวกันบน globalThis)
const g = globalThis as unknown as { _adminMongo?: Promise<MongoClient> };

function client() {
  if (!g._adminMongo) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    g._adminMongo = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return g._adminMongo;
}

type LockDoc = { _id: string; locked: string[] };

async function settings() {
  const c = await client();
  return c.db(process.env.MONGODB_DB || undefined).collection<LockDoc>("settings");
}

const DOC_ID = "gameLocks";

// id เกมที่อนุญาตให้ล็อกได้ (เพิ่มที่นี่เมื่อมีเกมใหม่)
export const GAME_IDS = [
  "upandup",
  "thinkfast",
  "kickbattle",
  "basketball",
  "fruitiebubbly",
  "com7quiz",
  "itemjam",
] as const;

export const isGameId = (id: unknown): id is (typeof GAME_IDS)[number] =>
  typeof id === "string" && (GAME_IDS as readonly string[]).includes(id);

// cache สั้นๆ ลดการยิง DB เวลาหน้าเกมเช็กบ่อย
const TTL_MS = 5000;
let cache: { at: number; locked: string[] } | null = null;

export async function getLockedGames(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.locked;
  const col = await settings();
  const doc = await col.findOne({ _id: DOC_ID });
  const locked = Array.isArray(doc?.locked) ? doc.locked : [];
  cache = { at: Date.now(), locked };
  return locked;
}

export async function isGameLocked(id: string): Promise<boolean> {
  return (await getLockedGames()).includes(id);
}

export async function setGameLocked(id: string, locked: boolean): Promise<string[]> {
  const col = await settings();
  await col.updateOne(
    { _id: DOC_ID },
    locked ? { $addToSet: { locked: id } } : { $pull: { locked: id } },
    { upsert: true }
  );
  cache = null; // ให้การอ่านครั้งถัดไปดึงค่าใหม่ทันที
  return getLockedGames();
}