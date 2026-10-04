import { NextResponse } from "next/server";

// ===== Kick Battle: API ห้องเล่น 2 คน (เก็บในหน่วยความจำ ใช้ polling) =====
type Dir = "L" | "C" | "R";
type Player = { id: string; name: string; avatar: string };
type Shot = { round: number; shooter: 0 | 1; shot: Dir; keep: Dir; goal: boolean };
type Room = {
  code: string;
  players: Player[];
  first: 0 | 1; // คนที่ได้ยิงก่อน
  match: number; // นับจำนวนแมตช์ (เพิ่มเมื่อเล่นใหม่)
  picks: Record<string, Dir>; // ซ่อนไว้จนกว่าจะเลือกครบทั้งสองฝ่าย
  history: Shot[];
  status: "waiting" | "playing" | "finished";
  rematch: string[];
  winner: 0 | 1 | null;
  earned: [number, number]; // แต้มที่ได้ในแมตช์นี้ (ไปบวกเข้าคะแนนรวมแล้วทีละลูก)
  awardSaved: [boolean, boolean]; // บันทึกลงบัญชีสำเร็จหรือไม่
  left: [boolean, boolean]; // ผู้เล่นคนนั้นกดออกจากห้องแล้ว
  updated: number;
};

const GAME_KEY = "kickbattle"; // คีย์ใน gameScores
const POINTS_PER_HIT = 100; // ยิงเข้าหรือเซฟได้ บวกครั้งละ 100 แต้ม
const WINNER_BONUS = 200; // โบนัสให้ผู้ชนะ
const TOTAL = 6; // เล่น 6 ลูก (ยิงคนละ 3 ลูก) แต้มเสมอได้
const TIEBREAK_TARGET = 2; // ถ้าเสมอ ต่อเวลาอีกสูงสุด 3 ลูก ใครได้ 2 แต้มก่อนชนะ
const g = globalThis as unknown as { __kbRooms?: Map<string, Room> };
const rooms = (g.__kbRooms ??= new Map<string, Room>());

const isDir = (v: unknown): v is Dir => v === "L" || v === "C" || v === "R";
const coin = (): 0 | 1 => (Math.random() < 0.5 ? 0 : 1);
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

function sweep() {
  const now = Date.now();
  rooms.forEach((r, k) => {
    if (now - r.updated > 3 * 3600 * 1000) rooms.delete(k);
  });
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    let c = "";
    for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(c)) return c;
  }
}

function tally(history: Shot[]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const h of history) s[h.goal ? h.shooter : 1 - h.shooter]++;
  return s;
}
const scoresOf = (room: Room) => tally(room.history);

const shooterOf = (room: Room): 0 | 1 => ((room.first + room.history.length) % 2) as 0 | 1;

// บวกแต้มเข้า users.gameScores.kickbattle ทันที (ผู้เล่นชั่วคราวที่ไม่มีบัญชีจะไม่ถูกบันทึก)
async function persist(room: Room, gain: [number, number]) {
  for (const i of [0, 1] as const) {
    if (gain[i] <= 0) continue;
    const id = room.players[i].id;
    try {
      // โหลดเมื่อต้องใช้เท่านั้น เพื่อให้สร้างห้อง/เล่นได้แม้ MongoDB มีปัญหา
      const { default: clientPromise } = await import("@/lib/mongodb");
      const { ObjectId } = await import("mongodb");
      const users = (await clientPromise).db("7days7games").collection("users");
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
    oppLeft: you >= 0 && !!room.left[1 - you], // คู่แข่งออกจากห้องแล้วหรือยัง
  };
}

export async function GET(req: Request) {
  sweep();
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").toUpperCase();
  const pid = searchParams.get("playerId") || "";
  const room = rooms.get(code);
  if (!room) return fail("ไม่พบห้องนี้", 404);
  if (!room.players.some((p) => p.id === pid)) return fail("คุณไม่ได้อยู่ในห้องนี้", 403);
  return NextResponse.json(view(room, pid));
}

export async function POST(req: Request) {
  sweep();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("ข้อมูลไม่ถูกต้อง", 400);
  }
  const { action } = body;
  const pid = String(body.playerId || "");
  if (!pid) return fail("ไม่พบผู้เล่น", 400);
  const me: Player = {
    id: pid,
    name: String(body.name || "ผู้เล่น").slice(0, 20),
    avatar: String(body.avatar || "p01").slice(0, 20),
  };

  if (action === "create") {
    const code = makeCode();
    rooms.set(code, {
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
      updated: Date.now(),
    });
    return NextResponse.json({ code });
  }

  const code = String(body.code || "").toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) return fail("ไม่พบห้องนี้ ลองเช็กรหัสอีกครั้ง", 404);
  room.updated = Date.now();

  if (action === "join") {
    const existing = room.players.findIndex((p) => p.id === pid);
    if (existing >= 0) {
      room.left[existing] = false; // กลับเข้าห้องเดิม
      return NextResponse.json({ code });
    }
    if (room.players.length >= 2) return fail("ห้องนี้เต็มแล้ว", 409);
    room.players.push(me);
    room.first = coin(); // สุ่มว่าใครได้ยิงก่อน
    room.match = 1;
    room.status = "playing";
    return NextResponse.json({ code });
  }

  const idx = room.players.findIndex((p) => p.id === pid);
  if (idx < 0) return fail("คุณไม่ได้อยู่ในห้องนี้", 403);

  if (action === "leave") {
    room.left[idx] = true;
    room.rematch = room.rematch.filter((id) => id !== pid);
    // ลบห้องเมื่อออกครบทั้งคู่ หรือเจ้าของห้องออกตอนยังไม่มีใครเข้ามา
    // (ถ้ามีคนเหลืออยู่ ต้องเก็บห้องไว้ เพื่อให้เขาเห็นว่าคู่แข่งออกแล้ว)
    if (room.status === "waiting" || (room.left[0] && (room.players.length < 2 || room.left[1]))) {
      rooms.delete(code);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "pick") {
    if (room.status !== "playing") return fail("เกมยังไม่เริ่มหรือจบแล้ว", 409);
    if (room.left[1 - idx]) return fail("คู่แข่งออกจากห้องแล้ว", 409);
    if (!isDir(body.dir)) return fail("ทิศทางไม่ถูกต้อง", 400);
    if (room.picks[pid]) return fail("คุณเลือกไปแล้ว", 409);
    room.picks[pid] = body.dir;

    const [a, b] = room.players;
    if (room.picks[a.id] && room.picks[b.id]) {
      const shooter = shooterOf(room);
      const shooterId = room.players[shooter].id;
      const keeperId = room.players[1 - shooter].id;
      const shot = room.picks[shooterId];
      const keep = room.picks[keeperId];
      const goal = shot !== keep;
      room.history.push({ round: room.history.length, shooter, shot, keep, goal });
      room.picks = {};

      // ตัดสินผลทั้งหมดแบบ synchronous ก่อน เพื่อให้ทุกคนเห็นสถานะตรงกัน แล้วค่อยบันทึกลงฐานข้อมูล
      const gain: [number, number] = [0, 0];
      gain[goal ? shooter : 1 - shooter] += POINTS_PER_HIT;

      const n = room.history.length;
      let winner: 0 | 1 | null = null;
      if (n === TOTAL) {
        const [s0, s1] = scoresOf(room);
        if (s0 !== s1) winner = s0 > s1 ? 0 : 1; // เสมอ = ต่อเวลา
      } else if (n > TOTAL) {
        // ต่อเวลา: นับเฉพาะลูกหลังครบ 6 ใครได้ถึง 2 แต้มก่อนชนะ (ทุกลูกมีคนได้แต้ม จึงจบภายใน 3 ลูก)
        const [t0, t1] = tally(room.history.slice(TOTAL));
        if (t0 >= TIEBREAK_TARGET || t1 >= TIEBREAK_TARGET) winner = t0 > t1 ? 0 : 1;
      }
      if (winner !== null) {
        room.status = "finished";
        room.winner = winner;
        gain[winner] += WINNER_BONUS;
      }
      room.earned = [room.earned[0] + gain[0], room.earned[1] + gain[1]];
      await persist(room, gain);
    }
    return NextResponse.json(view(room, pid));
  }

  if (action === "rematch") {
    if (room.status !== "finished") return fail("เกมยังไม่จบ", 409);
    if (room.left[1 - idx]) return fail("คู่แข่งออกจากห้องแล้ว", 409);
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
    return NextResponse.json(view(room, pid));
  }

  return fail("ไม่รู้จักคำสั่งนี้", 400);
}