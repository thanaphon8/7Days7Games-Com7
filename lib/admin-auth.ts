import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง

const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
const hmac = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("hex");

export function signToken(): string {
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${hmac(exp)}`;
}

export function verifyToken(token?: string | null): boolean {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  const expected = hmac(exp);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(ADMIN_COOKIE)?.value);
}