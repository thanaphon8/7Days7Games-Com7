// lib/mongodb.ts
import { MongoClient, type Db } from "mongodb";

// เก็บ client ไว้ใน globalThis กัน dev server (hot reload) เปิด connection ซ้ำ
const g = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _mongoIndexes?: boolean;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in environment");
  if (!g._mongoClient) g._mongoClient = new MongoClient(uri).connect();
  return g._mongoClient;
}

// สร้าง index ครั้งเดียวต่อ process (ถ้าสร้างไม่ได้ เช่นมีข้อมูลซ้ำอยู่ จะแค่ log ไม่ล้ม)
async function ensureIndexes(db: Db) {
  if (g._mongoIndexes) return;
  g._mongoIndexes = true;
  try {
    const users = db.collection("users");
    // partial = ผู้ใช้เก่าที่ยังไม่มี username / employeeId จะไม่ชนกันเอง
    await users.createIndex(
      { username: 1 },
      { unique: true, partialFilterExpression: { username: { $type: "string" } } }
    );
    await users.createIndex(
      { companyId: 1, employeeId: 1 },
      { unique: true, partialFilterExpression: { employeeId: { $type: "string" } } }
    );
    const sessions = db.collection("sessions");
    await sessions.createIndex({ tokenHash: 1 }, { unique: true });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // หมดอายุแล้ว Mongo ลบเอง
  } catch (e) {
    console.error("ensureIndexes failed", e);
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB); // ไม่ตั้ง = ใช้ชื่อ db ใน MONGODB_URI
  await ensureIndexes(db);
  return db;
}