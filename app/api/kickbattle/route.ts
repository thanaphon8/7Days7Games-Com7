import { NextResponse } from "next/server";
import type { Collection } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ===== Kick Battle: API ห้องเล่น 2 คน (เก็บใน MongoDB ใช้ polling) =====
type Dir = "L" | "C" | "R";
type Player = { id: string; name: string; avatar: string };
type Shot = { round: number; shooter: 0 | 1; shot: Dir; keep: Dir; goal: boolean };
type Room = {
  code: string;
  players: Player[];
  first: 0 | 1;
  match: number;
  picks: Record<string, Dir>;
  history: Shot[];
  status: "waiting" | "playing" | "finished";
  rematch: string[];
  winner: 0 | 1 | null;
  earned: [number, number];
  awardSaved: [boolean, boolean];
  left: [boolean, boolean];
};
// เอกสารใน MongoDB: _id = รหัสห้อง, v = เลขเวอร์ชันสำหรับ optimistic locking
type RoomDoc = Room & { _id: string; v: number; updatedAt: Date };

const DB_NAME = "7days7games";
const ROOMS_COL = "kb_rooms";
const GAME_KEY = "kickbattle";
const POINTS_PER_HIT = 100;
const WINNER_BONUS = 200;
const TOTAL = 6;
const TIEBREAK_TARGET = 2;
const ROOM_TTL_SECONDS = 3 * 3600;

class HttpError extends Error {
  constructor(public msg: string, public status: number) {
    super(msg);
  }
}

const isDir = (v: unknown): v is Dir => v === "L" || v === "C" || v === "R";
const coin = (): 0 | 1 => (Math.random() < 0.5 ? 0 : 1);
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

// ===== เชื่อมต่อ collection (สร้าง index ครั้งเดียวต่อ instance) =====
let indexReady: Promise<unknown> | null = null;
async function roomsCol(): Promise<Collection<RoomDoc>> {
  const { default: clientPromise } = await import("@/lib/mongodb");
  const col = (await clientPromise).db(DB_NAME).collection<RoomDoc>(ROOMS_COL);
  // ห้องที่ไม่มีการอัปเดตเกิน 3 ชั่วโมงจะถูก MongoDB ลบเอง (TTL index)
  indexReady ??= col.createIndex({ updatedAt: 1 }, { expireAfterSeconds: ROOM_TTL_SECONDS }).catch(() => {});
  await indexReady;
  return col;
}

function makeCodeCandidate() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// โหลดห้อง -> แก้ไขสำเนา -> บันทึกเฉพาะถ้า version ยังไม่เปลี่ยน ไม่งั้นโหลดใหม่แล้วทำซ้ำ
// ฟังก์ชัน fn ต้องไม่มี side effect ภายนอก (เพราะอาจถูกเรียกซ้ำ)
async function mutate<T>(col: Collection<RoomDoc>, code: string, fn: (room: RoomDoc) => T): Promise<{ room: RoomDoc; result: T }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const doc = await col.findOne({ _id: code });
    if (!doc) throw new HttpError("ไม่พบห้องนี้ ลองเช็กรหัสอีกครั้ง", 404);
    const room = structuredClone(doc) as RoomDoc;
    const result = fn(room);
    const { _id, v, updatedAt, ...fields } = room;
    void _id;
    void v;
    void updatedAt;
    const r = await col.updateOne(
      { _id: code, v: doc.v },
      { $set: { ...fields, updatedAt: new Date() }, $inc: { v: 1 } }
    );
    if (r.matchedCount === 1) return { room: { ...room, v: doc.v + 1 }, result };
    // มีคนแก้ห้องตัดหน้า -> วนโหลดใหม่
  }
  throw new HttpError("เซิร์ฟเวอร์ไม่ว่าง ลองใหม่อีกครั้ง", 503);
}

function tally(history: Shot[]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const h of history) s[h.goal ? h.shooter : 1 - h.shooter]++;
  return s;
}
const scoresOf = (room: Room) => tally(room.history);
const shooterOf = (room: Room): 0 | 1 => ((room.first + room.history.length) % 2) as 0 | 1;

// บวกแต้มเข้า users.gameScores.kickbattle (เรียกหลังบันทึกห้องสำเร็จเท่านั้น)
async function persist(col: Collection<RoomDoc>, room: RoomDoc, gain: [number, number]) {
  let touched = false;
  for (const i of [0, 1] as const) {
    if (gain[i] <= 0) continue;
    touched = true;
    const id = room.players[i].id;
    try {
      const { default: clientPromise } = await import("@/lib/mongodb");
      const { ObjectId } = await import("mongodb");
      const users = (await clientPromise).db(DB_NAME).collection("users");
      const update = { $inc: { [`gameScores.${GAME_KEY}`]: gain[i] }, $set: { updatedAt: new Date() } };
      let matched = (await users.updateOne({ userId: id }, update)).matchedCount;
      if (!matched && ObjectId.isValid(id)) {
        matched = (await users.updateOne({ _id: new ObjectId(id) }, update)).matchedCount;
      }
      console.log(`kickbattle: +${gain[i]} แต้ม -> ${id} (${matched ? "บันทึกแล้ว" : "ไม่พบผู้ใช้นี้ใน users"})`);
      room.awardSaved[i] = matched > 0;
    } catch (e) {
      room.awardSaved[i] = false;
      console.error("kickbattle: บันทึกแต้มไม่สำเร็จ", e);
    }
  }
  if (touched) {
    // เขียนเฉพาะ field นี้ ไม่แตะ version จึงไม่ทำให้ผู้เล่นอีกคนชนกับ lock
    await col.updateOne({ _id: room.code }, { $set: { awardSaved: room.awardSaved } });
  }
}

function view(room: Room, pid: string) {
  const you = room.players.findIndex((p) => p.id === pid);
  const opp = room.players.find((p) => p.id !== pid);
  return {
    code: room.code,
    status: room.status,
    match: room.match,
    players: room.players,
    you,
    first: room.first,
    round: room.history.length,
    shooter: shooterOf(room),
    scores: scoresOf(room),
    history: room.history,
    total: TOTAL,
    youPicked: !!room.picks[pid],
    oppPicked: !!(opp && room.picks[opp.id]),
    winner: room.winner,
    earned: room.earned,
    awardSaved: room.awardSaved,
    youRematch: room.rematch.includes(pid),
    oppRematch: !!(opp && room.rematch.includes(opp.id)),
    oppLeft: you >= 0 && !!room.left[1 - you],
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").toUpperCase();
    const pid = searchParams.get("playerId") || "";
    const col = await roomsCol();
    const room = await col.findOne({ _id: code });
    if (!room) return fail("ไม่พบห้องนี้", 404);
    if (!room.players.some((p) => p.id === pid)) return fail("คุณไม่ได้อยู่ในห้องนี้", 403);
    return NextResponse.json(view(room, pid));
  } catch (e) {
    if (e instanceof HttpError) return fail(e.msg, e.status);
    console.error("kickbattle GET error", e);
    return fail("เซิร์ฟเวอร์ผิดพลาด", 500);
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
  const { action } = body;
  const pid = String(body.playerId || "");
  if (!pid) throw new HttpError("ไม่พบผู้เล่น", 400);
  const me: Player = {
    id: pid,
    name: String(body.name || "ผู้เล่น").slice(0, 20),
    avatar: String(body.avatar || "p01").slice(0, 20),
  };
  const col = await roomsCol();

  if (action === "create") {
    for (let i = 0; i < 20; i++) {
      const code = makeCodeCandidate();
      const doc: RoomDoc = {
        _id: code,
        v: 0,
        code,
        players: [me],
        first: 0,
        match: 0,
        picks: {},
        history: [],
        status: "waiting",
        rematch: [],
        winner: null,
        earned: [0, 0],
        awardSaved: [false, false],
        left: [false, false],
        updatedAt: new Date(),
      };
      try {
        await col.insertOne(doc);
        return NextResponse.json({ code });
      } catch (e: any) {
        if (e?.code === 11000) continue; // รหัสซ้ำ สุ่มใหม่
        throw e;
      }
    }
    throw new HttpError("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง", 503);
  }

  const code = String(body.code || "").toUpperCase().trim();

  if (action === "join") {
    await mutate(col, code, (room) => {
      const existing = room.players.findIndex((p) => p.id === pid);
      if (existing >= 0) {
        room.left[existing] = false; // กลับเข้าห้องเดิม
        return;
      }
      if (room.players.length >= 2) throw new HttpError("ห้องนี้เต็มแล้ว", 409);
      room.players.push(me);
      room.first = coin();
      room.match = 1;
      room.status = "playing";
    });
    return NextResponse.json({ code });
  }

  if (action === "leave") {
    const { result } = await mutate(col, code, (room) => {
      const idx = room.players.findIndex((p) => p.id === pid);
      if (idx < 0) throw new HttpError("คุณไม่ได้อยู่ในห้องนี้", 403);
      room.left[idx] = true;
      room.rematch = room.rematch.filter((id) => id !== pid);
      return room.status === "waiting" || (room.left[0] && (room.players.length < 2 || room.left[1]));
    }).catch((e) => {
      if (e instanceof HttpError && e.status === 404) return { result: false }; // ห้องหายไปแล้ว ถือว่าออกสำเร็จ
      throw e;
    });
    if (result) await col.deleteOne({ _id: code });
    return NextResponse.json({ ok: true });
  }

  if (action === "pick") {
    const { room, result: gain } = await mutate(col, code, (room) => {
      const idx = room.players.findIndex((p) => p.id === pid);
      if (idx < 0) throw new HttpError("คุณไม่ได้อยู่ในห้องนี้", 403);
      if (room.status !== "playing") throw new HttpError("เกมยังไม่เริ่มหรือจบแล้ว", 409);
      if (room.left[1 - idx]) throw new HttpError("คู่แข่งออกจากห้องแล้ว", 409);
      if (!isDir(body.dir)) throw new HttpError("ทิศทางไม่ถูกต้อง", 400);
      if (room.picks[pid]) throw new HttpError("คุณเลือกไปแล้ว", 409);
      room.picks[pid] = body.dir;

      const gain: [number, number] = [0, 0];
      const [a, b] = room.players;
      if (room.picks[a.id] && room.picks[b.id]) {
        const shooter = shooterOf(room);
        const shot = room.picks[room.players[shooter].id];
        const keep = room.picks[room.players[1 - shooter].id];
        const goal = shot !== keep;
        room.history.push({ round: room.history.length, shooter, shot, keep, goal });
        room.picks = {};

        gain[goal ? shooter : 1 - shooter] += POINTS_PER_HIT;

        const n = room.history.length;
        let winner: 0 | 1 | null = null;
        if (n === TOTAL) {
          const [s0, s1] = scoresOf(room);
          if (s0 !== s1) winner = s0 > s1 ? 0 : 1;
        } else if (n > TOTAL) {
          const [t0, t1] = tally(room.history.slice(TOTAL));
          if (t0 >= TIEBREAK_TARGET || t1 >= TIEBREAK_TARGET) winner = t0 > t1 ? 0 : 1;
        }
        if (winner !== null) {
          room.status = "finished";
          room.winner = winner;
          gain[winner] += WINNER_BONUS;
        }
        room.earned = [room.earned[0] + gain[0], room.earned[1] + gain[1]];
      }
      return gain;
    });
    // บวกแต้มหลังบันทึกห้องสำเร็จแล้วเท่านั้น (กันบวกซ้ำเมื่อ retry)
    if (gain[0] > 0 || gain[1] > 0) await persist(col, room, gain);
    return NextResponse.json(view(room, pid));
  }

  if (action === "rematch") {
    const { room } = await mutate(col, code, (room) => {
      const idx = room.players.findIndex((p) => p.id === pid);
      if (idx < 0) throw new HttpError("คุณไม่ได้อยู่ในห้องนี้", 403);
      if (room.status !== "finished") throw new HttpError("เกมยังไม่จบ", 409);
      if (room.left[1 - idx]) throw new HttpError("คู่แข่งออกจากห้องแล้ว", 409);
      if (!room.rematch.includes(pid)) room.rematch.push(pid);
      if (room.rematch.length >= 2) {
        room.history = [];
        room.picks = {};
        room.rematch = [];
        room.winner = null;
        room.earned = [0, 0];
        room.awardSaved = [false, false];
        room.first = coin();
        room.match += 1;
        room.status = "playing";
      }
    });
    return NextResponse.json(view(room, pid));
  }

  throw new HttpError("ไม่รู้จักคำสั่งนี้", 400);
}