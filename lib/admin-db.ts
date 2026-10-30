import { MongoClient, ObjectId } from "mongodb";

const g = globalThis as unknown as { _adminMongo?: Promise<MongoClient> };

function client() {
  if (!g._adminMongo) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    g._adminMongo = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return g._adminMongo;
}

async function db() {
  const c = await client();
  return c.db(process.env.MONGODB_DB || undefined);
}

export async function usersCollection() {
  return (await db()).collection(process.env.USERS_COLLECTION || "users");
}

// คอลเลกชัน session (ใช้ลบ session ตอนลบผู้ใช้)
export async function sessionsCollection() {
  return (await db()).collection("sessions");
}

// หา user ด้วย username (หลัก), userId หรือ _id
export function userFilter(id: string) {
  const or: Record<string, unknown>[] = [
    { username: id.trim().toLowerCase() },
    { userId: id },
  ];
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) });
  return { $or: or };
}