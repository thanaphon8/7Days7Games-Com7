import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ===== Kick Battle: API บันทึกแต้ม (โหมดเล่นกับบอท ตรรกะเกมอยู่ฝั่ง client) =====
// action เดียว: "award" -> บวกแต้มเข้า users.gameScores.kickbattle

const GAME_KEY = "kickbattle";
const POINTS_PER_HIT = 1; // ยิงเข้าหรือเซฟได้ +1 แต้ม (ไม่มีโบนัสผู้ชนะ)
const TOTAL = 6; // ลูกในเวลาปกติ
const TIEBREAK_SHOTS = 3; // ต่อเวลาสูงสุด 3 ลูก
// แต้มสูงสุดที่เป็นไปได้ใน 1 เกม = ทุกลูกได้แต้มหมด ใช้เป็นเพดานต่อ 1 คำขอ กันส่งตัวเลขเว่อร์จาก client
const MAX_POINTS_PER_GAME = (TOTAL + TIEBREAK_SHOTS) * POINTS_PER_HIT;

class HttpError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg);
  }
}

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

// บวกแต้มให้ผู้ใช้ ค้นด้วย userId ก่อน ไม่เจอค่อยลอง _id (ObjectId)
async function addScore(id: string, points: number): Promise<boolean> {
  try {
    const { getDb } = await import("@/lib/mongodb");
    const { ObjectId } = await import("mongodb");
    const users = (await getDb()).collection("users");
    const update = { $inc: { [`gameScores.${GAME_KEY}`]: points }, $set: { updatedAt: new Date() } };
    let matched = (await users.updateOne({ userId: id }, update)).matchedCount;
    if (!matched && ObjectId.isValid(id)) {
      matched = (await users.updateOne({ _id: new ObjectId(id) }, update)).matchedCount;
    }
    console.log(`kickbattle: +${points} แต้ม -> ${id} (${matched ? "บันทึกแล้ว" : "ไม่พบผู้ใช้นี้ใน users"})`);
    return matched > 0;
  } catch (e) {
    console.error("kickbattle: บันทึกแต้มไม่สำเร็จ", e);
    return false;
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("ข้อมูลไม่ถูกต้อง", 400);
  }
  try {
    return await handle(body);
  } catch (e) {
    if (e instanceof HttpError) return fail(e.msg, e.status);
    console.error("kickbattle POST error", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500);
  }
}

async function handle(body: any) {
  if (body?.action !== "award") throw new HttpError("ไม่รู้จักคำสั่งนี้", 400);

  const pid = String(body.playerId || "").slice(0, 64);
  if (!pid) throw new HttpError("ไม่พบผู้เล่น", 400);

  const points = Number(body.points);
  if (!Number.isInteger(points) || points < 0 || points > MAX_POINTS_PER_GAME) {
    throw new HttpError("แต้มไม่ถูกต้อง", 400);
  }

  // ไม่มีแต้มให้บวก ถือว่าสำเร็จ ไม่ต้องแตะ DB
  if (points === 0) return NextResponse.json({ ok: true, saved: false, points: 0 });

  const saved = await addScore(pid, points);
  return NextResponse.json({ ok: true, saved, points });
}