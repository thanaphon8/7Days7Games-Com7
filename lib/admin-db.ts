import { MongoClient, ObjectId } from "mongodb";

const g = globalThis as unknown as { _adminMongo?: Promise<MongoClient> };

function client() {
  if (!g._adminMongo) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    g._adminMongo = new MongoClient(process.env.MONGODB_URI).connect();
  }
  return g._adminMongo;
}

export async function usersCollection() {
  const c = await client();
  return c.db(process.env.MONGODB_DB || undefined).collection(process.env.USERS_COLLECTION || "users");
}

// หา user ด้วย userId หรือ _id
export function userFilter(id: string) {
  const or: Record<string, unknown>[] = [{ userId: id }];
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) });
  return { $or: or };
}