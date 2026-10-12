"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";

/* =========================================================
  UP AND UP! — เกมปีนหน้าผา 2D ดูมีมิติ
  วิธีเล่น: แตะ/ลากถอยหลังแบบหนังสติ๊ก แล้วปล่อยนิ้วเพื่อให้นักปีนพุ่งไปจับหิน
            คอม: ← → เล็งทิศ, ↑ ↓ ปรับแรง, Space กระโดด (หรือลากเมาส์ถอยหลังแล้วปล่อย), M = เสียง
  ตัวละคร: เลือกชาย(ผิวเข้ม)/หญิง(ผิวขาว)ก่อนเริ่ม (ชาย = แรงเกาะอึดแต่กระโดดช้า / หญิง = กระโดดไวแต่แรงเกาะลดเร็ว)
  สัตว์เลี้ยงติดหลัง: เลือกต่อจากตัวละคร มี 6 ตัว แต่ละตัวเสริมความสามารถต่างกัน
      กระรอก = วงจับหินกว้างขึ้น / แมว = แรงเกาะลดช้าลง / กบ = พุ่งไกลขึ้น
      นก = ร่อนนานขึ้น / เต่า = ตัวหนักลมกระทบน้อยลง 10% / ตุ๊กแก = หินร่วงทนขึ้น + หินน้ำแข็งกินแรงน้อยลง
  - เริ่มเกม: นักปีนยืนหันหน้าที่ฐานแคมป์ แล้วกระโดดหมุนตัวขึ้นไปเกาะหินก้อนแรก (ช่วงนี้ยังเล็ง/แรงเกาะยังไม่ทำงาน)
  - นักปีนห้อยแกว่งเป็นลูกตุ้มจากหินที่จับอยู่ ปล่อยตอนแกว่งไปทางที่ต้องการจะได้แรงเสริม
  - จับตรงวงกลางหิน = PERFECT ตัวคูณคะแนนเพิ่มทีละ 1 (สูงสุด ×10) จับไม่ตรงตัวคูณรีเซ็ต
  - สภาพอากาศเปลี่ยนตามระดับความสูง: ฟ้าใส → ลมแรง → หิมะ → ฝน → พายุ แล้วสุ่มวนต่อไป
      ลม = ดันตัวขณะลอย/แกว่ง, หิมะ = เส้นเล็งสั้นลง, ฝน = หินลื่น (วงจับเล็กลง) + แรงเกาะหมดเร็ว,
      พายุ = ลมกระโชก ฟ้าผ่าทำให้ตัวสะดุ้งแกว่ง
  - ฟิสิกส์เขียนเอง ไม่ต้องติดตั้งไลบรารีเพิ่ม วาดด้วย canvas ล้วน (ไม่ใช้รูปภาพ)
  ========================================================= */

// ===== ตั้งค่าเกม (ปรับสมดุลได้ที่นี่) =====
const GAME_ID = "upandup"; // key ที่ใช้บวกแต้มเข้า gameScores
const MAX_SAVE = 15; // แต้มสะสมสูงสุดต่อรอบ
// เกณฑ์แปลงคะแนนในเกม → แต้มสะสม: [คะแนนขั้นต่ำ, แต้มที่ได้]
// ผู้เล่นทั่วไป (~250-700 คะแนน) ได้ราว 3-5 แต้ม / คนเก่ง (2,000+) ได้ 8+ / คนเทพ (12,000+) ได้เต็ม 15
const SCORE_TIERS: [number, number][] = [
  [1, 1], [100, 2], [250, 3], [450, 4], [700, 5],
  [1000, 6], [1400, 7], [1900, 8], [2500, 9], [3300, 10],
  [4300, 11], [5600, 12], [7200, 13], [9200, 14], [12000, 15],
];
const pointsFor = (score: number) => {
  let p = 0;
  for (const [min, pt] of SCORE_TIERS) if (score >= min) p = pt;
  return Math.min(p, MAX_SAVE);
};
const nextTier = (score: number) => SCORE_TIERS.find(([min]) => score < min) ?? null;

const W = 360; // ความกว้างหน้าผา (หน่วยในเกม)
const UNIT = 8; // หน่วยในเกมต่อ 1 เมตร
const ZONE_M = 90; // ทุกกี่เมตรเปลี่ยนสภาพอากาศ
const GRAV = 820; // แรงโน้มถ่วง
const L = 32; // ความยาวตัวห้อย (มือ → จุดกลางลำตัว)
const PULL_MAX = 120; // ระยะดึงสูงสุด
const V_PER = 5.4; // ความเร็วพุ่งต่อหน่วยระยะดึง
const WIND_ACC = 95; // แรงลมที่ดันตัวตอนลอย (ต่อ 1 หน่วยลม)
const LIVES = 3; // จำนวนห่วงเชือก (ตกแล้วเสียหนึ่ง)
const TAU = Math.PI * 2;
const STAND_OY = 40; // ตอนยืน: จุดอ้างอิงตัวละครอยู่ต่ำกว่าหินก้อนแรกกี่หน่วย
const LEDGE_Y = 106; // ความสูงของชั้นหินฐานแคมป์ (ตำแหน่งเท้าตอนยืน)
const PRE = 0.12; // เวลาย่อตัวก่อนกระโดด (วินาที)
const JD = 0.9; // เวลากระโดดทั้งหมดจนเกาะหินก้อนแรก (วินาที)
// ตัวละคร: drain = ตัวคูณการลดแรงเกาะ, v = ตัวคูณความเร็วพุ่ง, grip/spd = ดาวโชว์ในหน้าเลือก (เต็ม 5)
type Hero = "m" | "f";
const HERO: Record<Hero, { n: string; sym: string; col: string; drain: number; v: number; catch: number; grip: number; spd: number; d: string }> = {
  m: { n: "Max", sym: "♂", col: "#2B7BFF", drain: 0.75, v: 0.88, catch: 1, grip: 5, spd: 3, d: "แรงเกาะลดช้า ห้อยได้นาน แต่พุ่งสั้นกว่าเล็กน้อย" },
  f: { n: "Minnie", sym: "♀", col: "#E8478F", drain: 1.3, v: 1.0, catch: 1.1, grip: 3, spd: 4, d: "จับหินไว วงจับกว้างกว่า แต่แรงเกาะลดเร็ว" },
};
// สัตว์เลี้ยงติดหลัง: ตัวคูณโบนัส (1 = ปกติ)
// grab = วงจับหิน, drain = แรงเกาะลด, v = ความเร็วพุ่ง, grav = แรงโน้มถ่วงตอนลอย,
// wind = แรงลมที่กระทบ, crumble = เวลาหินร่วงทน, ice = แรงเกาะที่หินน้ำแข็งกิน
type Pet = "sq" | "cat" | "frog" | "bird" | "turtle" | "gecko";
type PetDef = { n: string; ic: string; d: string; grab: number; drain: number; v: number; grav: number; wind: number; crumble: number; ice: number };
const P1 = { grab: 1, drain: 1, v: 1, grav: 1, wind: 1, crumble: 1, ice: 1 };
const PET_LIST: Pet[] = ["sq", "cat", "frog", "bird", "turtle", "gecko"];
const PET: Record<Pet, PetDef> = {
  sq: { ...P1, n: "กระรอก", ic: "🐿️", d: "ตาไว วงจับหินกว้างขึ้น 12%", grab: 1.12 },
  cat: { ...P1, n: "แมว", ic: "🐱", d: "ทรงตัวเก่ง แรงเกาะลดช้าลง 15%", drain: 0.85 },
  frog: { ...P1, n: "กบ", ic: "🐸", d: "ขาแข็งแรง พุ่งไกลขึ้น 8%", v: 1.08 },
  bird: { ...P1, n: "นก", ic: "🐦", d: "ปีกช่วยร่อน แรงโน้มถ่วงตอนลอยลด 10%", grav: 0.9 },
  turtle: { ...P1, n: "เต่า", ic: "🐢", d: "ตัวหนัก ลมแรงกระทบน้อยลง 10% นิ่งขึ้น", wind: 0.9 },
  gecko: { ...P1, n: "ตุ๊กแก", ic: "🦎", d: "เกาะหนึบ หินร่วงทนนานขึ้น 50% หินน้ำแข็งกินแรงน้อยลงครึ่งหนึ่ง", crumble: 1.5, ice: 0.5 },
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (n: number) => {
  let x = (Math.imul(n | 0, 374761393) + 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};
const hash2 = (i: number, j: number) => hash(Math.imul(i, 73856093) ^ Math.imul(j, 19349663));
function rgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixc(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b);
  const k = clamp(t, 0, 1);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}

// สภาพอากาศ: w = ความแรงลม, s = หิมะ, r = ฝน, d = ความมืด
const WX = [
  { n: "ฟ้าใส", ic: "☀️", w: 0.25, s: 0, r: 0, d: 0 },
  { n: "ลมแรง!", ic: "💨", w: 1.0, s: 0, r: 0, d: 0.15 },
  { n: "หิมะตก", ic: "❄️", w: 0.35, s: 1, r: 0, d: 0.3 },
  { n: "ฝนตก", ic: "🌧️", w: 0.5, s: 0, r: 1, d: 0.5 },
  { n: "พายุ!!", ic: "⛈️", w: 1.25, s: 0, r: 1, d: 1 },
];
function zoneWx(z: number, prev: number) {
  if (z < 5) return z;
  let k = 1 + Math.floor(hash(z * 31 + 7) * 4);
  if (k === prev) k = 1 + (k % 4);
  return k;
}

const CHEERS = ["เยี่ยมเลย!", "ไต่ต่อไป!", "เท้าเบาจริง!", "ลื่นสุดๆ!", "สุดยอด!"];

// ===== เสียง (สังเคราะห์ด้วย WebAudio ไม่ต้องใช้ไฟล์) =====
let actx: AudioContext | null = null;
let bus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let ambSrc: AudioBufferSourceNode | null = null;
let ambGain: GainNode | null = null;
let ambFilt: BiquadFilterNode | null = null;
function audio() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (C) {
      actx = new C();
      bus = actx.createGain();
      bus.gain.value = 0.9;
      bus.connect(actx.destination);
    }
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function getNoise(a: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, to?: number, delay = 0) {
  const a = audio();
  const out = bus;
  if (!a || !out || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn);
  gn.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function noise(dur: number, vol: number, f0: number, f1: number) {
  const a = audio();
  const out = bus;
  if (!a || !out || muted) return;
  const t0 = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = getNoise(a);
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  f.Q.value = 0.9;
  const gn = a.createGain();
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(gn);
  gn.connect(out);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}
// เสียงลม/ฝนพื้นหลังต่อเนื่อง (ปรับความดังตามสภาพอากาศ)
function ambient(level: number) {
  if (!actx || !bus) return;
  if (!ambSrc) {
    ambSrc = actx.createBufferSource();
    ambSrc.buffer = getNoise(actx);
    ambSrc.loop = true;
    ambFilt = actx.createBiquadFilter();
    ambFilt.type = "bandpass";
    ambFilt.Q.value = 0.6;
    ambGain = actx.createGain();
    ambGain.gain.value = 0;
    ambSrc.connect(ambFilt);
    ambFilt.connect(ambGain);
    ambGain.connect(bus);
    ambSrc.start();
  }
  const t = actx.currentTime;
  ambGain!.gain.setTargetAtTime(muted ? 0 : level, t, 0.25);
  ambFilt!.frequency.setTargetAtTime(300 + level * 5000, t, 0.3);
}
const SCALE = [523, 659, 784, 988, 1175, 1319, 1568, 1760, 2093, 2349];
const sfx = {
  jump: (p: number) => { noise(0.28, 0.1 + p * 0.12, 500, 2200); tone(260 + p * 160, 0.18, "sine", 0.1, 520 + p * 200); },
  grab: () => { tone(190, 0.12, "sine", 0.18, 90); noise(0.06, 0.07, 1800, 500); },
  perfect: (st: number) => {
    const f = SCALE[clamp(st - 1, 0, SCALE.length - 1)];
    tone(f, 0.4, "sine", 0.16);
    tone(f * 2, 0.45, "sine", 0.07, undefined, 0.05);
    noise(0.1, 0.1, 3000, 900);
  },
  big: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.5, "triangle", 0.12, undefined, i * 0.07)),
  crack: () => { noise(0.18, 0.2, 1200, 300); tone(150, 0.12, "square", 0.05, 70); },
  fall: () => tone(520, 0.8, "triangle", 0.14, 90),
  warn: () => tone(330, 0.1, "triangle", 0.09, 260),
  thunder: () => { noise(1.3, 0.5, 400, 60); tone(70, 0.9, "sawtooth", 0.16, 32); },
  whoosh: () => noise(0.5, 0.3, 400, 2400),
  buzzer: () => tone(220, 0.7, "triangle", 0.18, 120),
  sparkle: () => [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.3, "sine", 0.05, undefined, i * 0.055)),
};

// ===== ชนิดข้อมูล =====
type Phase = "menu" | "intro" | "playing" | "over";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";
type Kind = "rock" | "ice" | "crumble";
type Hold = { id: number; x: number; y: number; r: number; kind: Kind; pts: number[]; crack: number; shake: number; dead: boolean; fall: number; fv: number };
type Pt = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; size: number; star: boolean };
type Tx = { x: number; y: number; text: string; life: number; max: number; color: string; size: number };
type Rg = { x: number; y: number; r: number; life: number; max: number; color: string };
type Aim = { on: boolean; key: boolean; dx: number; dy: number; pw: number; sx: number; sy: number; ch: number };
type G = {
  round: number; hero: Hero; pet: Pet; stand: boolean; jt: number; phase: Phase; holds: Hold[]; nextId: number; genX: number; genY: number; lastKind: Kind;
  cur: Hold; state: "hang" | "fly"; th: number; om: number; bx: number; by: number; bvx: number; bvy: number; ang: number;
  relT: number; fromId: number; candId: number; candD: number;
  stamina: number; lives: number; score: number; streak: number; bestStreak: number; perfects: number; grabs: number; jumps: number;
  bestY: number; bestAlt: number; nextMile: number;
  camY: number; viewH: number; clock: number; shake: number; flash: number; bolt: number; lowT: number; pruneT: number; cx: number;
  zone: number; tw: number; dirSign: number; wind: number; wb: number; snow: number; rain: number; dark: number;
  aim: Aim; ended: boolean; hud: string;
  fx: { x: number; y: number; z: number; s: number }[];
  parts: Pt[]; texts: Tx[]; rings: Rg[];
};

function addHold(g: G, x: number, y: number, kind: Kind, r = 13 + Math.random() * 4) {
  const pts: number[] = [];
  for (let i = 0; i < 9; i++) pts.push(r * (0.8 + Math.random() * 0.38));
  g.holds.push({ id: ++g.nextId, x, y, r, kind, pts, crack: 0, shake: 0, dead: false, fall: 0, fv: 0 });
}

// สร้างหินต่อขึ้นไปเรื่อยๆ ตามความสูง (ยิ่งสูงยิ่งห่าง ยิ่งมีหินร่วง/น้ำแข็ง)
function genHolds(g: G, untilY: number) {
  while (g.genY > untilY) {
    const alt = -g.genY / UNIT;
    const gap = 74 + Math.random() * 34 + Math.min(30, alt * 0.08);
    const ny = g.genY - gap;
    let nx = clamp(g.genX + (Math.random() - 0.5) * 2 * (110 + Math.min(60, alt * 0.15)), 34, W - 34);
    if (Math.abs(nx - g.genX) < 30) nx = clamp(g.genX + (Math.random() < 0.5 ? -1 : 1) * 70, 34, W - 34);
    let kind: Kind = "rock";
    if (g.lastKind === "rock") {
      const q = Math.random();
      if (alt > 60 && q < Math.min(0.3, (alt - 60) / 600)) kind = "crumble";
      else if (alt > 200 && q > 1 - Math.min(0.25, (alt - 200) / 800)) kind = "ice";
    }
    addHold(g, nx, ny, kind);
    g.lastKind = kind;
    g.genX = nx;
    g.genY = ny;
    if (Math.random() < 0.4) {
      const sx = clamp(W - nx + (Math.random() - 0.5) * 60, 34, W - 34);
      if (Math.abs(sx - nx) > 70) addHold(g, sx, ny + (Math.random() - 0.5) * 50, "rock");
    }
  }
}

function newG(round: number, hero: Hero = "m", pet: Pet = "sq"): G {
  const g: G = {
    round, hero, pet, stand: true, jt: -1, phase: "menu", holds: [], nextId: 0, genX: W / 2, genY: 0, lastKind: "rock",
    cur: null as unknown as Hold, state: "hang", th: 0, om: 0, bx: W / 2, by: L, bvx: 0, bvy: 0, ang: 0,
    relT: 0, fromId: -1, candId: -1, candD: 0,
    stamina: 100, lives: LIVES, score: 0, streak: 0, bestStreak: 0, perfects: 0, grabs: 0, jumps: 0,
    bestY: 0, bestAlt: 0, nextMile: 100,
    camY: -300, viewH: 560, clock: 0, shake: 0, flash: 0, bolt: 4, lowT: 0, pruneT: 0, cx: 0,
    zone: -1, tw: 0, dirSign: 1, wind: 0, wb: 0.25, snow: 0, rain: 0, dark: 0,
    aim: { on: false, key: false, dx: 0, dy: -1, pw: 0, sx: 0, sy: 0, ch: 0 }, ended: false, hud: "",
    fx: Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.6, s: Math.random() * 6 })),
    parts: [], texts: [], rings: [],
  };
  addHold(g, W / 2, 0, "rock", 18);
  g.cur = g.holds[0];
  g.th = 0;
  genHolds(g, -1000);
  return g;
}

/* =========================================================
  ฟิสิกส์ + กติกา
  ========================================================= */
const grabR = (g: G, h: Hold) => (h.kind === "ice" ? 26 : 30) * (1 - 0.22 * g.rain) * PET[g.pet].grab * HERO[g.hero].catch;
const perfR = (g: G, h: Hold) => (h.kind === "ice" ? 7 : 10) * (1 - 0.25 * g.rain);

function burst(g: G, x: number, y: number, n: number, colors: string[], sp: number, star = false) {
  for (let i = 0; i < n && g.parts.length < 160; i++) {
    const a = Math.random() * TAU;
    const s = sp * (0.4 + Math.random() * 0.8);
    g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.3, life: 0.5 + Math.random() * 0.5, max: 1, c: colors[i % colors.length], size: 2 + Math.random() * 3, star });
  }
}
function pop(g: G, x: number, y: number, text: string, color: string, size: number, life = 1) {
  g.texts.push({ x, y, text, life, max: life, color, size });
}

// ปล่อยตัวจากหินที่จับอยู่ (ใช้ทั้งตอนกระโดด / แรงหมด / หินร่วง)
function release(g: G, vx: number, vy: number) {
  const h = g.cur;
  g.state = "fly";
  g.bvx = vx;
  g.bvy = vy;
  g.fromId = h.id;
  g.relT = 0;
  g.candId = -1;
  g.ang = 0;
}

function launch(g: G) {
  const a = g.aim;
  const ok = g.phase === "playing" && g.state === "hang" && !g.stand && a.on && a.pw >= 0.1;
  a.on = false;
  a.key = false;
  if (!ok) return;
  const len = Math.hypot(a.dx, a.dy) || 1;
  const sp = a.pw * PULL_MAX * V_PER * HERO[g.hero].v * PET[g.pet].v;
  const tv = g.om * L * 0.8; // แรงเสริมจากการแกว่ง
  release(g, (a.dx / len) * sp + Math.cos(g.th) * tv, (a.dy / len) * sp - Math.sin(g.th) * tv);
  g.stamina = Math.max(0, g.stamina - (4 + a.pw * 6));
  g.jumps += 1;
  sfx.jump(a.pw);
  burst(g, g.cur.x, g.cur.y, 6, ["#fff", "#E8EEF8"], 90);
}

function grab(g: G, hd: Hold, d: number) {
  const perfect = d <= perfR(g, hd);
  g.state = "hang";
  g.cur = hd;
  g.candId = -1;
  g.grabs += 1;
  hd.crack = 0;
  g.th = clamp(Math.atan2(g.bx - hd.x, Math.max(10, g.by - hd.y)), -1, 1);
  g.om = clamp((g.bvx * Math.cos(g.th) - g.bvy * Math.sin(g.th)) / L, -7, 7) * (perfect ? 0.3 : 0.8);
  g.bvx = 0;
  g.bvy = 0;
  g.stamina = Math.min(100, g.stamina + (perfect ? 15 : 7));
  const px = hd.x, py = hd.y;
  burst(g, px, py, perfect ? 14 : 7, perfect ? ["#fff", "#FFD23F", "#FF9ACB"] : ["#fff", "#D9DEE8"], perfect ? 200 : 110, perfect);
  g.rings.push({ x: px, y: py, r: 14, life: 0.45, max: 0.45, color: perfect ? "#FFD23F" : "#fff" });
  if (hd.y < g.bestY - 2) {
    const dh = (g.bestY - hd.y) / UNIT;
    g.bestY = hd.y;
    g.bestAlt = Math.max(g.bestAlt, Math.round(-hd.y / UNIT));
    if (perfect) { g.streak += 1; g.perfects += 1; } else g.streak = 0;
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    const mult = 1 + Math.min(9, g.streak);
    const pts = Math.round((10 + dh * 1.2) * mult);
    g.score += pts;
    pop(g, px, py - 34, `+${pts}`, "#FF7A3D", 20 + Math.min(10, mult * 2));
    if (perfect) pop(g, W / 2, g.camY + g.viewH * 0.3, `PERFECT ×${mult}`, "#FFB000", 30, 1.1);
    else if (Math.random() < 0.3) pop(g, W / 2, g.camY + g.viewH * 0.3, CHEERS[Math.floor(Math.random() * CHEERS.length)], "#3B7DDD", 26, 1);
    if (g.bestAlt >= g.nextMile) {
      const bonus = g.nextMile * 2;
      g.score += bonus;
      pop(g, W / 2, g.camY + g.viewH * 0.42, `ถึง ${g.nextMile} เมตร! +${bonus}`, "#E8368F", 28, 1.6);
      g.nextMile += 100;
      g.shake = 0.3;
      sfx.big();
    }
  }
  if (perfect) sfx.perfect(Math.max(1, g.streak)); else sfx.grab();
}

function loseLife(g: G, why: string) {
  g.lives -= 1;
  g.streak = 0;
  g.shake = 0.5;
  sfx.fall();
  pop(g, W / 2, g.camY + g.viewH * 0.4, why, "#E5484D", 30, 1.4);
  if (g.lives <= 0) { g.ended = true; return; }
  const h = g.cur;
  h.dead = false; h.fall = 0; h.fv = 0; h.crack = 0; h.kind = "rock";
  g.state = "hang";
  g.th = 0; g.om = 0; g.bvx = 0; g.bvy = 0;
  g.stamina = Math.max(g.stamina, 60);
}

// ก้าวฟิสิกส์ของนักปีน: ห้อยแกว่ง (ลูกตุ้ม) หรือพุ่ง/ตกอิสระ
function stepPhys(g: G, h: number) {
  const pt = PET[g.pet];
  g.relT += h;
  if (g.state === "hang") {
    const hd = g.cur;
    if (g.stand) { g.th = 0; g.om = 0; g.bx = hd.x; g.by = hd.y + L; return; }
    g.om += (-(GRAV / L) * Math.sin(g.th) * 0.9 + g.wind * pt.wind * 9 * Math.cos(g.th) - 0.5 * g.om) * h;
    g.th += g.om * h;
    if (Math.abs(g.th) > 1.25) { g.th = Math.sign(g.th) * 1.25; g.om = 0; }
    g.bx = hd.x + Math.sin(g.th) * L;
    g.by = hd.y + Math.cos(g.th) * L;
    return;
  }
  g.bvy += GRAV * pt.grav * h;
  g.bvx += (g.wind * pt.wind * WIND_ACC - g.bvx * 0.12) * h;
  g.bvy -= g.bvy * 0.05 * h;
  g.bx += g.bvx * h;
  g.by += g.bvy * h;
  if (g.bx < 12) { g.bx = 12; if (g.bvx < 0) g.bvx *= -0.25; }
  else if (g.bx > W - 12) { g.bx = W - 12; if (g.bvx > 0) g.bvx *= -0.25; }
  g.ang += (clamp(g.bvx / 800, -0.6, 0.6) - g.ang) * Math.min(1, h * 8);
  // จับหินตอนมือเข้าใกล้ที่สุด (ยิ่งใกล้ศูนย์กลางยิ่ง PERFECT)
  const rx = g.bx, ry = g.by - L;
  let best: Hold | null = null;
  let bd = 1e9;
  for (let i = 0; i < g.holds.length; i++) {
    const o = g.holds[i];
    if (o.dead || Math.abs(ry - o.y) > 60) continue;
    if (o.id === g.fromId && g.relT < 0.4) continue;
    const d = Math.hypot(rx - o.x, ry - o.y);
    if (d < grabR(g, o) && d < bd) { best = o; bd = d; }
  }
  if (best) {
    if (g.candId === best.id) {
      if (bd > g.candD) { grab(g, best, g.candD); return; }
      g.candD = bd;
    } else { g.candId = best.id; g.candD = bd; }
  } else if (g.candId >= 0) {
    const ch = g.holds.find((o) => o.id === g.candId);
    g.candId = -1;
    if (ch && !ch.dead) grab(g, ch, g.candD);
  }
}

// ส่วนที่ไม่ต้องก้าวถี่: สภาพอากาศ แรงเกาะ หินร่วง กล้อง อนุภาค
function world(g: G, dt: number) {
  const playing = g.phase === "playing";
  // เลือกสภาพอากาศ (หน้าเมนูวนโชว์ให้ดู)
  if (g.phase === "menu") {
    const k = Math.floor(g.clock / 6) % WX.length;
    if (k !== g.tw) { g.tw = k; g.dirSign = k % 2 ? 1 : -1; }
  } else {
    const z = Math.floor(g.bestAlt / ZONE_M);
    if (z !== g.zone) {
      const prev = g.tw;
      g.zone = z;
      g.tw = zoneWx(z, prev);
      g.dirSign = hash(z * 13 + 3) > 0.5 ? 1 : -1;
      if (z > 0 && playing) pop(g, W / 2, g.camY + g.viewH * 0.22, `${WX[g.tw].ic} ${WX[g.tw].n}`, "#2B4C9B", 34, 2);
    }
  }
  const T = WX[g.tw];
  const k = 1 - Math.exp(-0.7 * dt);
  g.wb += (g.dirSign * T.w - g.wb) * k;
  g.snow += (T.s - g.snow) * k;
  g.rain += (T.r - g.rain) * k;
  g.dark += (T.d - g.dark) * k;
  g.wind = g.wb * (0.8 + 0.45 * Math.sin(g.clock * 0.9) * Math.sin(g.clock * 0.37 + 1.3) + 0.15 * Math.sin(g.clock * 2.7));
  g.cx += (6 + g.wind * 40) * dt;

  // ฟ้าผ่า (พายุ)
  if (g.dark > 0.7 && g.phase !== "menu") {
    g.bolt -= dt;
    if (g.bolt <= 0) {
      g.bolt = 3 + Math.random() * 5;
      g.flash = 1;
      g.shake = Math.max(g.shake, 0.3);
      sfx.thunder();
      if (g.state === "hang") g.om += (Math.random() < 0.5 ? -1 : 1) * 2.2;
      else g.bvx += (Math.random() < 0.5 ? -1 : 1) * 60;
    }
  }
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 2.4);

  // กระโดดขึ้นไปเกาะหินก้อนแรก
  if (g.stand && g.jt >= 0) {
    g.jt += dt;
    if (g.jt >= JD) {
      g.stand = false;
      g.th = 0;
      g.om = (g.dirSign || 1) * 1.2;
      g.shake = Math.max(g.shake, 0.12);
      burst(g, g.cur.x, g.cur.y, 8, ["#fff", "#E8EEF8"], 110);
      sfx.grab();
    }
  }
  if (playing && !g.stand) {
    if (g.state === "hang") {
      const hd = g.cur;
      const pt = PET[g.pet];
      const drain = (2.2 * HERO[g.hero].drain * pt.drain) + 2.5 * g.rain + (hd.kind === "ice" ? 4 * pt.ice : 0) + Math.abs(g.wind) * 1 + Math.min(3, g.zone * 0.35);
      g.stamina -= drain * dt;
      if (hd.kind === "crumble") {
        hd.crack += dt;
        hd.shake = clamp((hd.crack - 0.5 * pt.crumble) / (0.9 * pt.crumble), 0, 1);
        if (hd.crack > 1.4 * pt.crumble) { hd.dead = true; hd.fv = 0; sfx.crack(); pop(g, hd.x, hd.y - 30, "หินร่วง!", "#B86B2B", 24); release(g, 0, 0); }
      }
      if (g.stamina <= 0) { g.stamina = 0; pop(g, g.bx, g.by - 50, "แรงหมด!", "#E5484D", 26); release(g, 0, 0); }
      if (g.stamina < 25) { g.lowT -= dt; if (g.lowT <= 0) { g.lowT = 0.7; sfx.warn(); } }
    } else if (g.by > g.camY + g.viewH + 40) {
      loseLife(g, g.lives > 1 ? "ตกแล้ว!" : "ตกหน้าผา!");
    }
  }
  for (let i = 0; i < g.holds.length; i++) {
    const o = g.holds[i];
    if (o.dead) { o.fv += 900 * dt; o.fall += o.fv * dt; }
  }

  // กล้องตามนักปีน (ปีนขึ้น = เลื่อนตาม ตกลงไม่ตามเพื่อให้รู้ว่าหลุดจอ)
  const focus = g.state === "hang" ? g.cur.y : Math.min(g.cur.y, g.by);
  const ty = focus - g.viewH * (g.phase === "menu" ? 0.36 : 0.62);
  g.camY += (ty - g.camY) * (1 - Math.exp(-4 * dt));
  genHolds(g, g.camY - 500);
  g.pruneT -= dt;
  if (g.pruneT <= 0) {
    g.pruneT = 1;
    const lim = g.camY + g.viewH + 500;
    g.holds = g.holds.filter((o) => o.id === g.cur.id || o.y + o.fall < lim);
  }

  // อนุภาค / ข้อความ / วงแหวน
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt);
  let n = 0;
  for (let i = 0; i < g.parts.length; i++) {
    const p = g.parts[i];
    p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life > 0) g.parts[n++] = p;
  }
  g.parts.length = n;
  n = 0;
  for (let i = 0; i < g.texts.length; i++) { const t = g.texts[i]; t.life -= dt; if (t.life > 0) g.texts[n++] = t; }
  g.texts.length = n;
  n = 0;
  for (let i = 0; i < g.rings.length; i++) { const r = g.rings[i]; r.life -= dt; if (r.life > 0) g.rings[n++] = r; }
  g.rings.length = n;
}

/* =========================================================
  วาด canvas
  ========================================================= */
type View = { w: number; h: number; sc: number };
type Pal = { suit: string; pants: string; pack: string; helmet: string; skin: string; glove: string; boot: string; hair: string };
// ชาย = ผิวเข้ม ผมดำ / หญิง = ผิวขาว
const PALS: Record<Hero, Pal> = {
  m: { suit: "#FF6B3D", pants: "#2E3A6B", pack: "#22A39B", helmet: "#FFD23F", skin: "#5E3A24", glove: "#2B2B3A", boot: "#3A2E2A", hair: "#15100D" },
  f: { suit: "#E8478F", pants: "#2E3A6B", pack: "#FFB020", helmet: "#7FE0D0", skin: "#FBDCC8", glove: "#2B2B3A", boot: "#3A2E2A", hair: "#6B3F2A" },
};
const SHADOW = "rgba(12,14,34,.3)";
const PAL_SH: Pal = { suit: SHADOW, pants: SHADOW, pack: SHADOW, helmet: SHADOW, skin: SHADOW, glove: SHADOW, boot: SHADOW, hair: SHADOW };

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ตัวช่วยวาดสัตว์
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}
function tri(ctx: CanvasRenderingContext2D, a: number[], c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(a[2], a[3]);
  ctx.lineTo(a[4], a[5]);
  ctx.closePath();
  ctx.fill();
}

// สัตว์เลี้ยงเกาะหลัง (มองจากด้านหน้าของสัตว์): พิกัดท้องถิ่น ลำตัวอยู่ราว (0,30) หัวราว (0,21)
// sh = วาดเป็นเงาเรียบ / reach = ตอนพุ่ง / lg = แรงเฉื่อย
function drawPet(ctx: CanvasRenderingContext2D, k: Pet, t: number, reach: number, lg: number, sh: boolean) {
  const C = (c: string) => (sh ? SHADOW : c);
  const sw = Math.sin(t * 3) * 0.25 - reach * 0.5 + lg * 0.04;
  const DK = "#1B1B2A";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (k === "sq") {
    ctx.save();
    ctx.translate(4, 37);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(14, 2, 16, -14, 8, -22);
    ctx.strokeStyle = C("#B8693A");
    ctx.lineWidth = 8;
    ctx.stroke();
    if (!sh) { ctx.strokeStyle = "#F0C79A"; ctx.lineWidth = 3.2; ctx.stroke(); }
    ctx.restore();
    ell(ctx, 0, 30, 5.6, 7, 0, C("#B8693A"));
    dot(ctx, 0, 21.5, 4.4, C("#B8693A"));
    tri(ctx, [-4.2, 19.5, -3.2, 15, -0.6, 18], C("#B8693A"));
    tri(ctx, [0.6, 18, 3.2, 15, 4.2, 19.5], C("#B8693A"));
    if (!sh) {
      ell(ctx, 0, 31, 3, 4.6, 0, "#F0C79A");
      dot(ctx, -1.8, 21.3, 0.9, DK); dot(ctx, 1.8, 21.3, 0.9, DK);
      dot(ctx, 0, 23, 0.8, "#6B3A22");
    }
  } else if (k === "cat") {
    ctx.save();
    ctx.translate(-3, 37);
    ctx.rotate(-sw * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-12, 2, -14, -10, -9, -18);
    ctx.strokeStyle = C("#E59A4A");
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.restore();
    ell(ctx, 0, 30, 6, 7.5, 0, C("#E59A4A"));
    dot(ctx, 0, 21.5, 5.4, C("#E59A4A"));
    tri(ctx, [-5.4, 20, -4.8, 14, -1, 17.6], C("#E59A4A"));
    tri(ctx, [1, 17.6, 4.8, 14, 5.4, 20], C("#E59A4A"));
    if (!sh) {
      tri(ctx, [-4.2, 18.6, -4, 15.8, -2.2, 17.6], "#FF9ACB");
      tri(ctx, [2.2, 17.6, 4, 15.8, 4.2, 18.6], "#FF9ACB");
      ell(ctx, 0, 31.5, 3.4, 5, 0, "#FFE7C7");
      ctx.strokeStyle = "#B96A25";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-1.6, 17.4); ctx.lineTo(-1.6, 19.4);
      ctx.moveTo(0, 17.2); ctx.lineTo(0, 19.4);
      ctx.moveTo(1.6, 17.4); ctx.lineTo(1.6, 19.4);
      ctx.stroke();
      dot(ctx, -2.1, 21.8, 1.2, DK); dot(ctx, 2.1, 21.8, 1.2, DK);
      dot(ctx, 0, 23.4, 0.9, "#FF7AA8");
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2.6, 23.4); ctx.lineTo(-7.6, 22.4);
      ctx.moveTo(-2.6, 24.2); ctx.lineTo(-7.6, 25);
      ctx.moveTo(2.6, 23.4); ctx.lineTo(7.6, 22.4);
      ctx.moveTo(2.6, 24.2); ctx.lineTo(7.6, 25);
      ctx.stroke();
    }
  } else if (k === "frog") {
    const kick = clamp(lg * 0.3, -2, 2) + reach * 2;
    ell(ctx, -7 - kick * 0.3, 36 + kick, 3.2, 5, 0.5, C("#4CB35C"));
    ell(ctx, 7 + kick * 0.3, 36 + kick, 3.2, 5, -0.5, C("#4CB35C"));
    ell(ctx, -6.4, 27, 2, 3.2, -0.4, C("#4CB35C"));
    ell(ctx, 6.4, 27, 2, 3.2, 0.4, C("#4CB35C"));
    ell(ctx, 0, 31.5, 6.4, 6.6, 0, C("#5CC46B"));
    ell(ctx, 0, 24, 6, 4.4, 0, C("#5CC46B"));
    dot(ctx, -3.6, 20.5, 2.7, C("#5CC46B"));
    dot(ctx, 3.6, 20.5, 2.7, C("#5CC46B"));
    if (!sh) {
      ell(ctx, 0, 33, 4, 4.5, 0, "#CDF2A5");
      dot(ctx, -3.6, 20.5, 1.9, "#fff"); dot(ctx, 3.6, 20.5, 1.9, "#fff");
      dot(ctx, -3.6, 20.7, 1, DK); dot(ctx, 3.6, 20.7, 1, DK);
      ctx.strokeStyle = "#2E7A3B";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 24, 3.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      dot(ctx, -4.8, 25, 1.1, "rgba(255,120,170,.7)"); dot(ctx, 4.8, 25, 1.1, "rgba(255,120,170,.7)");
    }
  } else if (k === "bird") {
    ctx.save();
    ctx.translate(0, 36);
    ctx.rotate(sw * 0.4);
    tri(ctx, [-2.8, 0, 2.8, 0, 0, 8.5], C("#2F7FD6"));
    ctx.restore();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 5.2, 27);
      ctx.rotate(s * (0.35 + Math.sin(t * 5) * 0.12 + reach * 0.7));
      ell(ctx, 0, 3, 2.6, 6, 0, C("#3A8DE8"));
      ctx.restore();
    }
    ell(ctx, 0, 30, 5.4, 7, 0, C("#4DA3FF"));
    dot(ctx, 0, 22, 4.6, C("#4DA3FF"));
    if (!sh) {
      ell(ctx, 0, 31.5, 3.2, 5, 0, "#CFE9FF");
      tri(ctx, [-1.6, 23.2, 1.6, 23.2, 0, 26.4], "#FFB020");
      dot(ctx, -2, 21.2, 1.1, DK); dot(ctx, 2, 21.2, 1.1, DK);
      ctx.strokeStyle = "#2F7FD6";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 17.8); ctx.lineTo(-1.2, 14.8);
      ctx.moveTo(0, 17.8); ctx.lineTo(1.4, 14.6);
      ctx.stroke();
    }
  } else if (k === "turtle") {
    for (const [lx, ly, lr] of [[-6.8, 26, 2.2], [6.8, 26, 2.2], [-7, 36, 2.4], [7, 36, 2.4]]) dot(ctx, lx, ly, lr, C("#A7C957"));
    tri(ctx, [-1.4, 36.5, 1.4, 36.5, 0, 41.5], C("#A7C957"));
    ell(ctx, 0, 30.5, 8, 7.2, 0, C("#6BA84E"));
    dot(ctx, 0, 22, 3.6, C("#A7C957"));
    if (!sh) {
      ell(ctx, 0, 30.5, 6.2, 5.4, 0, "#82C262");
      ctx.strokeStyle = "#4B7F36";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2.6, 27.4); ctx.lineTo(2.6, 27.4); ctx.lineTo(4.4, 30.5); ctx.lineTo(2.6, 33.6);
      ctx.lineTo(-2.6, 33.6); ctx.lineTo(-4.4, 30.5); ctx.closePath();
      ctx.moveTo(-2.6, 27.4); ctx.lineTo(-4.6, 25.4);
      ctx.moveTo(2.6, 27.4); ctx.lineTo(4.6, 25.4);
      ctx.moveTo(-2.6, 33.6); ctx.lineTo(-4.6, 35.6);
      ctx.moveTo(2.6, 33.6); ctx.lineTo(4.6, 35.6);
      ctx.stroke();
      dot(ctx, -1.4, 21.7, 0.8, DK); dot(ctx, 1.4, 21.7, 0.8, DK);
      ctx.strokeStyle = "#4B6B24";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 22.8, 1.4, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  } else {
    // gecko ตุ๊กแก
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.bezierCurveTo(-5, 43, 7, 47, 3 + sw * 14, 54);
    ctx.strokeStyle = C("#8FD14F");
    ctx.lineWidth = 3.6;
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.strokeStyle = C("#8FD14F");
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(s * 3, 25); ctx.lineTo(s * 8, 23); ctx.lineTo(s * 9.6, 26);
      ctx.moveTo(s * 3, 35); ctx.lineTo(s * 8, 37.5); ctx.lineTo(s * 9.6, 34.5);
      ctx.stroke();
      for (const [ex, ey] of [[9.6, 26], [9.6, 34.5]]) dot(ctx, s * ex, ey, 1.5, C("#7BBE3F"));
    }
    ell(ctx, 0, 30, 4.2, 8.6, 0, C("#8FD14F"));
    ell(ctx, 0, 21.2, 4.2, 3.6, 0, C("#8FD14F"));
    dot(ctx, -2.8, 19.6, 2, C("#8FD14F"));
    dot(ctx, 2.8, 19.6, 2, C("#8FD14F"));
    if (!sh) {
      dot(ctx, -2.8, 19.6, 1.5, "#FFE066"); dot(ctx, 2.8, 19.6, 1.5, "#FFE066");
      dot(ctx, -2.8, 19.6, 0.6, DK); dot(ctx, 2.8, 19.6, 0.6, DK);
      for (const [sx, sy, sr] of [[-1.6, 27, 1], [1.8, 30, 1.1], [-1, 34, 1], [1.4, 24.6, 0.9]]) dot(ctx, sx, sy, sr, "#4E9A2B");
    }
  }
}

// นักปีนมองจากด้านหลัง: พิกัดท้องถิ่น มือที่ (0,0) ตัวห้อยลงไปทาง +y
// reach 0 = ห้อยจับหิน, 1 = พุ่งกางแขน / lag = ขาแกว่งตามแรงเฉื่อย / t = เวลา (สัตว์กระดิก) / fem = ผมหางม้า
function figure(ctx: CanvasRenderingContext2D, p: Pal, reach: number, lag: number, t: number, fem: boolean, pet: Pet) {
  const lg = clamp(lag, -9, 9);
  const sh = p.suit === SHADOW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = p.pants;
  ctx.lineWidth = 7;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, 38);
    ctx.lineTo(s * 6 + lg * 0.5, 50 - reach * 3);
    ctx.lineTo(s * 5 + lg, 62 - reach * 8);
    ctx.stroke();
    ctx.fillStyle = p.boot;
    ctx.beginPath();
    ctx.ellipse(s * 5 + lg, 63 - reach * 8, 4.5, 3.2, 0, 0, TAU);
    ctx.fill();
  }
  const hx = 3 + reach * 7;
  for (const s of [-1, 1]) {
    // ต้นแขนสีเสื้อ ปลายแขนและมือเป็นสีผิว
    ctx.strokeStyle = p.suit;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(s * 8, 22);
    ctx.lineTo(s * (hx + 3), 9 - reach * 2);
    ctx.stroke();
    ctx.strokeStyle = p.skin;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s * (hx + 3), 9 - reach * 2);
    ctx.lineTo(s * hx, -1 - reach * 3);
    ctx.stroke();
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(s * hx, -2 - reach * 3, 3.6, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = p.suit;
  rrect(ctx, -9.5, 17, 19, 24, 7);
  ctx.fill();
  ctx.fillStyle = p.pack;
  rrect(ctx, -7, 21, 14, 17, 4);
  ctx.fill();
  // สัตว์เลี้ยงเกาะหลัง
  ctx.save();
  ctx.translate(2.5, 0);
  drawPet(ctx, pet, t, reach, lg, sh);
  ctx.restore();
  if (fem) {
    ctx.strokeStyle = p.hair;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.quadraticCurveTo(-9 - lg * 0.5, 22, -7 - lg * 0.9, 33 + Math.sin(t * 4));
    ctx.stroke();
  }
  // คอ + หู + หัว + หมวก
  ctx.fillStyle = p.skin;
  ctx.fillRect(-2.6, 14, 5.2, 5);
  ctx.beginPath();
  ctx.arc(-7.2, 12.5, 1.9, 0, TAU);
  ctx.moveTo(9.1, 12.5);
  ctx.arc(7.2, 12.5, 1.9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = p.hair;
  ctx.beginPath();
  ctx.arc(0, 12, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = p.helmet;
  ctx.beginPath();
  ctx.arc(0, 11, 8, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-8, 10.5, 16, 2);
}

// นักปีนยืน: front = หันหน้า / ไม่ใช่ = หันหลัง (เห็นเป้และสัตว์เลี้ยง)
// up = ยกแขน 0..1 (1 = ท่าห้อยจับหิน) / tuck = งอขา 0..1 / petFx = ตำแหน่งสัตว์ตอนกำลังกระโดดขึ้นหลัง
function figureStand(ctx: CanvasRenderingContext2D, p: Pal, t: number, fem: boolean, front: boolean, up: number, tuck: number, pet: Pet | null, petFx?: { x: number; y: number; s: number }) {
  const sh = p.suit === SHADOW;
  const bob = Math.sin(t * 2) * 0.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = p.pants;
  ctx.lineWidth = 7;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, 38);
    ctx.lineTo(s * (6 + tuck * 3), 50 - tuck * 4);
    ctx.lineTo(s * (5 + tuck), 62 - tuck * 10);
    ctx.stroke();
    ctx.fillStyle = p.boot;
    ctx.beginPath();
    ctx.ellipse(s * (5 + tuck), 63 - tuck * 10, 4.5, 3.2, 0, 0, TAU);
    ctx.fill();
  }
  for (const s of [-1, 1]) {
    const ex = lerp(11.5, 6, up), ey = lerp(31, 9, up);
    const hx = lerp(11.5, 3, up), hy = lerp(39 + bob, -1, up);
    ctx.strokeStyle = p.suit;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(s * 8, 22);
    ctx.lineTo(s * ex, ey);
    ctx.stroke();
    ctx.strokeStyle = p.skin;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s * ex, ey);
    ctx.lineTo(s * hx, hy);
    ctx.stroke();
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(s * hx, hy - 1, 3.6, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = p.suit;
  rrect(ctx, -9.5, 17, 19, 24, 7);
  ctx.fill();
  if (front) {
    if (!sh) {
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 19); ctx.lineTo(0, 40);
      ctx.stroke();
      ctx.strokeStyle = p.pack;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-5, 18); ctx.lineTo(-4.5, 36);
      ctx.moveTo(5, 18); ctx.lineTo(4.5, 36);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = p.pack;
    rrect(ctx, -7, 21, 14, 17, 4);
    ctx.fill();
    if (pet) {
      const f = petFx || { x: 0, y: 0, s: 1 };
      ctx.save();
      ctx.translate(2.5 + f.x, f.y);
      ctx.translate(0, 30);
      ctx.scale(f.s, f.s);
      ctx.translate(0, -30);
      drawPet(ctx, pet, t, 0, 0, sh);
      ctx.restore();
    }
  }
  ctx.fillStyle = p.skin;
  ctx.fillRect(-2.6, 14, 5.2, 5);
  ctx.beginPath();
  ctx.arc(-7.2, 12.5, 1.9, 0, TAU);
  ctx.moveTo(9.1, 12.5);
  ctx.arc(7.2, 12.5, 1.9, 0, TAU);
  ctx.fill();
  if (front) {
    if (fem) {
      ctx.strokeStyle = p.hair;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-6.4, 12); ctx.lineTo(-8.6, 25);
      ctx.moveTo(6.4, 12); ctx.lineTo(8.6, 25);
      ctx.stroke();
    }
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(0, 12.5, 6.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0, 11.5, 7, Math.PI, TAU);
    ctx.fill();
  } else {
    if (fem) {
      ctx.strokeStyle = p.hair;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-3, 14);
      ctx.quadraticCurveTo(-9, 22, -7, 33 + Math.sin(t * 4));
      ctx.stroke();
    }
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0, 12, 7, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = p.helmet;
  ctx.beginPath();
  ctx.arc(0, 11, 8, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-8, 10.5, 16, 2);
}

// ท่ายืน→ย่อ→กระโดดหมุนตัวขึ้นไปเกาะหิน: คืนตำแหน่งแนวตั้ง ท่าแขน/ขา และมุมหมุน (sx = cos)
function standMotion(g: G) {
  const jt = g.jt;
  if (jt < 0) return { oy: STAND_OY + Math.sin(g.clock * 2) * 0.6, up: 0, tuck: 0, sx: 1, front: true };
  if (jt < PRE) {
    const a = jt / PRE;
    return { oy: STAND_OY + a * 5, up: 0, tuck: a * 0.6, sx: 1, front: true };
  }
  const k = clamp((jt - PRE) / (JD - PRE), 0, 1);
  const e = k * k * (3 - 2 * k);
  const tt = clamp((k - 0.2) / 0.45, 0, 1);
  const sx = Math.cos(tt * Math.PI);
  const u = clamp((k - 0.1) / 0.5, 0, 1);
  return { oy: lerp(STAND_OY + 5, 0, e) - Math.sin(k * Math.PI) * 24, up: u * u * (3 - 2 * u), tuck: Math.sin(k * Math.PI), sx, front: sx >= 0 };
}

function placeClimber(ctx: CanvasRenderingContext2D, g: G, dx: number, dy: number, p: Pal) {
  const fem = g.hero === "f";
  ctx.save();
  if (g.stand) {
    const m = standMotion(g);
    ctx.translate(g.cur.x + dx, g.cur.y + m.oy + dy);
    ctx.scale(Math.max(0.08, Math.abs(m.sx)), 1);
    figureStand(ctx, p, g.clock, fem, m.front, m.up, m.tuck, g.pet);
  } else if (g.state === "hang") {
    ctx.translate(g.cur.x + dx, g.cur.y + dy);
    ctx.rotate(-g.th);
    figure(ctx, p, 0, -g.om * 1.4, g.clock, fem, g.pet);
  } else {
    ctx.translate(g.bx + dx, g.by + dy);
    ctx.rotate(g.ang);
    ctx.translate(0, -L);
    figure(ctx, p, 1, -g.bvx * 0.012, g.clock, fem, g.pet);
  }
  ctx.restore();
}

function rockPath(ctx: CanvasRenderingContext2D, h: Hold, ox: number, oy: number) {
  const n = h.pts.length;
  const P = (i: number): [number, number] => {
    const k = ((i % n) + n) % n;
    const a = (k / n) * TAU;
    return [Math.cos(a) * h.pts[k] * 1.15 + ox, Math.sin(a) * h.pts[k] * 0.9 + oy];
  };
  const [sx, sy] = P(-1);
  const [fx, fy] = P(0);
  ctx.beginPath();
  ctx.moveTo((sx + fx) / 2, (sy + fy) / 2);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = P(i);
    const [x2, y2] = P(i + 1);
    ctx.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2);
  }
  ctx.closePath();
}

const ROCK_COL: Record<Kind, [string, string]> = {
  rock: ["#D6CCCF", "#6B6073"],
  ice: ["#F1FDFF", "#6FB2DD"],
  crumble: ["#E8C892", "#8A6238"],
};

function drawHold(ctx: CanvasRenderingContext2D, g: G, h: Hold) {
  const r = h.r;
  const sh = h.shake > 0 ? Math.sin(g.clock * 70) * h.shake * 2.2 : 0;
  ctx.save();
  ctx.translate(h.x + sh, h.y + h.fall);
  if (h.dead) ctx.rotate(h.fall * 0.01);
  rockPath(ctx, h, 5, 5);
  ctx.fillStyle = "rgba(15,15,35,.32)";
  ctx.fill();
  const [c0, c1] = ROCK_COL[h.kind];
  const gr = ctx.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  rockPath(ctx, h, 0, 0);
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "rgba(255,255,255,.5)";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,15,40,.28)";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, Math.PI * 0.1, Math.PI * 0.6);
  ctx.stroke();
  if (h.kind === "crumble") {
    ctx.strokeStyle = "rgba(60,30,10,.65)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.7); ctx.lineTo(0, -r * 0.1); ctx.lineTo(-r * 0.2, r * 0.4); ctx.lineTo(r * 0.15, r * 0.8);
    ctx.stroke();
  }
  if (g.rain > 0.25) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 * g.rain})`;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.28, r * 0.12, -0.5, 0, TAU);
    ctx.fill();
  }
  if (g.snow > 0.2) {
    ctx.fillStyle = `rgba(255,255,255,${0.95 * g.snow})`;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.85, r * 0.34, 0, Math.PI, TAU);
    ctx.fill();
  }
  if (!h.dead) {
    // วง PERFECT: มือแตะวงนี้ = คะแนนคูณ
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 1, perfR(g, h), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.beginPath();
    ctx.arc(0, 1, 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ฐานแคมป์: ชั้นหินที่นักปีนยืนตอนเริ่มเกม + ธงโบก
function drawCamp(ctx: CanvasRenderingContext2D, g: G) {
  const w = 200;
  const x0 = W / 2 - w / 2;
  const y = LEDGE_Y;
  ctx.fillStyle = "rgba(15,12,30,.35)";
  rrect(ctx, x0 + 6, y + 6, w, 26, 9);
  ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + 24);
  gr.addColorStop(0, "#CFC6C9");
  gr.addColorStop(1, "#6B6073");
  ctx.fillStyle = gr;
  rrect(ctx, x0, y, w, 24, 9);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillRect(x0 + 8, y + 1.5, w - 16, 3);
  ctx.strokeStyle = "rgba(20,15,40,.3)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + 30, y + 10); ctx.lineTo(x0 + 52, y + 16);
  ctx.moveTo(x0 + 120, y + 8); ctx.lineTo(x0 + 150, y + 15);
  ctx.stroke();
  const fx = x0 + 18;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5B4636";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(fx, y + 1); ctx.lineTo(fx, y - 46);
  ctx.stroke();
  const fl = g.wind * 5 + Math.sin(g.clock * 5) * 2.5;
  ctx.fillStyle = "#E5502A";
  ctx.beginPath();
  ctx.moveTo(fx, y - 46);
  ctx.quadraticCurveTo(fx + 14 + fl, y - 44, fx + 24 + fl * 1.4, y - 38);
  ctx.quadraticCurveTo(fx + 12 + fl, y - 34, fx, y - 30);
  ctx.closePath();
  ctx.fill();
  ell(ctx, x0 + w - 24, y - 2, 8, 5, 0, "#8F8497");
  ell(ctx, x0 + w - 27, y - 4, 4, 2, -0.3, "#B9AEBB");
}

function render(ctx: CanvasRenderingContext2D, g: G, v: View) {
  const { w, h, sc } = v;
  const ox = (w - W * sc) / 2;
  const camY = g.camY;
  const vh = h / sc;
  const t = clamp(g.bestAlt / 450, 0, 1);
  const asc = -camY * sc;

  // ท้องฟ้า (เข้มขึ้นตามความสูง)
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mixc("#6EC6FF", "#1F2766", t));
  sky.addColorStop(0.7, mixc("#FFE3B8", "#7A5FD0", t));
  sky.addColorStop(1, mixc("#FFD6A0", "#C58CE0", t));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunA = (1 - g.dark) * (1 - g.rain) * (1 - t * 0.6);
  if (sunA > 0.02) {
    const sy = h * 0.16 + Math.min(asc * 0.02, h * 0.3);
    const sg = ctx.createRadialGradient(w * 0.78, sy, 0, w * 0.78, sy, h * 0.3);
    sg.addColorStop(0, `rgba(255,248,210,${0.95 * sunA})`);
    sg.addColorStop(0.2, `rgba(255,230,160,${0.5 * sunA})`);
    sg.addColorStop(1, "rgba(255,230,160,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
  }
  // ภูเขาไกล 3 ชั้น (parallax)
  const LAY = [
    { p: 0.04, c: "#B9C9F0", hb: 0.66, a: 50 },
    { p: 0.08, c: "#8FA2D8", hb: 0.74, a: 70 },
    { p: 0.13, c: "#6A7DB8", hb: 0.84, a: 90 },
  ];
  for (let i = 0; i < LAY.length; i++) {
    const l = LAY[i];
    const base = h * l.hb + asc * l.p;
    ctx.fillStyle = mixc(l.c, "#3B4466", g.dark * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, h + 10);
    for (let x = 0; x <= w + 14; x += 14) {
      const y = base - l.a * (0.55 + 0.45 * Math.sin(x * 0.011 + i * 1.7)) - l.a * 0.25 * Math.sin(x * 0.027 + i * 3.1);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 14, h + 10);
    ctx.closePath();
    ctx.fill();
  }
  // เมฆลอยตามลม ไหลลงเวลาปีนขึ้น
  for (let i = 0; i < 7; i++) {
    const cx = (((hash(i) * w * 1.4 + g.cx * (0.6 + (i % 3) * 0.3)) % (w + 300)) + w + 300) % (w + 300) - 150;
    const cy = ((((hash(i + 50) * h * 1.2 + asc * (0.25 + (i % 3) * 0.1)) % (h + 160)) + h + 160) % (h + 160)) - 80;
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - g.dark * 0.5)})`;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(cx + k * 22 - 33, cy + (k % 2) * 6, 20 + (k % 3) * 6, 0, TAU);
      ctx.fill();
    }
  }

  // ===== โลกในเกม =====
  ctx.save();
  ctx.translate(ox + (g.shake > 0 ? Math.sin(g.clock * 90) * g.shake * 12 : 0), g.shake > 0 ? Math.cos(g.clock * 70) * g.shake * 8 : 0);
  ctx.scale(sc, sc);
  ctx.translate(0, -camY);
  const y0 = camY - 30;
  const y1 = camY + vh + 30;

  // ผนังหน้าผา (ขอบมืดให้ดูเว้าลึกเป็นมิติ)
  const wall = mixc("#A39397", "#7C84A0", t);
  const wg = ctx.createLinearGradient(0, 0, W, 0);
  wg.addColorStop(0, "#3E3850");
  wg.addColorStop(0.2, wall);
  wg.addColorStop(0.8, wall);
  wg.addColorStop(1, "#3E3850");
  ctx.fillStyle = wg;
  ctx.fillRect(0, y0, W, y1 - y0);
  for (let j = Math.floor(y0 / 37); j <= Math.ceil(y1 / 37); j++) {
    const r = hash(j * 3 + 1);
    const y = j * 37 + r * 20;
    ctx.lineWidth = 1 + r * 2;
    ctx.strokeStyle = `rgba(30,25,45,${0.16 + r * 0.14})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 30; x <= W; x += 30) ctx.lineTo(x, y + (hash2(j, x) - 0.5) * 6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath();
    ctx.moveTo(0, y + 3);
    ctx.lineTo(W, y + 3);
    ctx.stroke();
  }
  for (let j = Math.floor(y0 / 48); j <= Math.ceil(y1 / 48); j++) {
    for (let i = 0; i < 8; i++) {
      const r = hash2(i, j);
      if (r < 0.55) continue;
      const cx = i * 48 + r * 40, cy = j * 48 + hash2(j, i) * 40, s = 5 + r * 9;
      ctx.fillStyle = r > 0.78 ? "rgba(255,255,255,.1)" : "rgba(20,15,40,.12)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 1.2, cy + s * 0.6); ctx.lineTo(cx - s * 0.8, cy + s);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (g.snow > 0.05) {
    ctx.fillStyle = `rgba(255,255,255,${0.22 * g.snow})`;
    for (let j = Math.floor(y0 / 37); j <= Math.ceil(y1 / 37); j++) ctx.fillRect(0, j * 37 + hash(j * 3 + 1) * 20 - 4, W, 4);
  }
  // ขอบหน้าผาด้านข้าง (หน้าผาที่หักเข้าไปด้านหลัง)
  for (const s of [-1, 1]) {
    const x = s < 0 ? 0 : W;
    const fg = ctx.createLinearGradient(x, 0, x + s * 46, 0);
    fg.addColorStop(0, "#2A2640");
    fg.addColorStop(1, "rgba(42,38,64,0)");
    ctx.fillStyle = fg;
    ctx.fillRect(s < 0 ? -46 : W, y0, 46, y1 - y0);
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }

  // หิน
  for (let i = 0; i < g.holds.length; i++) {
    const o = g.holds[i];
    if (o.y + o.fall < y0 - 40 || o.y + o.fall > y1 + 40) continue;
    drawHold(ctx, g, o);
  }

  drawCamp(ctx, g);

  // เชือกนิรภัย
  const rbx = g.bx;
  const rby = g.stand ? g.cur.y + standMotion(g).oy + L : g.by;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#E4572E";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(rbx, rby + 8);
  ctx.quadraticCurveTo(rbx + g.wind * 30, (rby + camY + vh) / 2, W / 2 + g.wind * 40, camY + vh + 60);
  ctx.stroke();

  // นักปีน + เงาบนผนัง
  placeClimber(ctx, g, 9, 8, PAL_SH);
  placeClimber(ctx, g, 0, 0, PALS[g.hero]);

  // เส้นเล็ง: ยางหนังสติ๊ก + วงแรง + จุดแสดงวิถี (ไม่รวมแรงลม — ลมจะดันตัวให้เพี้ยนเอง)
  const a = g.aim;
  if (a.on && g.state === "hang" && g.phase === "playing" && a.pw > 0.05) {
    const len = Math.hypot(a.dx, a.dy) || 1;
    const ux = a.dx / len, uy = a.dy / len;
    const px = g.bx - ux * a.pw * PULL_MAX * 0.8;
    const py = g.by - uy * a.pw * PULL_MAX * 0.8;
    ctx.strokeStyle = "rgba(255,122,61,.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(g.bx, g.by);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = "#FF7A3D";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = mixc("#4ADE80", "#FF4D6D", a.pw);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(g.bx, g.by, 24, -Math.PI / 2, -Math.PI / 2 + a.pw * TAU);
    ctx.stroke();
    const sp = a.pw * PULL_MAX * V_PER * HERO[g.hero].v * PET[g.pet].v;
    const tv = g.om * L * 0.8;
    let vx = ux * sp + Math.cos(g.th) * tv;
    let vy = uy * sp - Math.sin(g.th) * tv;
    let qx = g.bx, qy = g.by;
    const alt = g.bestAlt;
    const N = Math.max(8, Math.round(26 * (1 - 0.55 * g.snow) * (1 - 0.25 * g.dark) * (1 - Math.min(0.3, alt / 1500))));
    for (let i = 1; i <= N; i++) {
      vy += (GRAV * PET[g.pet].grav) / 28;
      qx += vx / 28;
      qy += vy / 28;
      ctx.fillStyle = `rgba(255,255,255,${0.95 - (i / N) * 0.75})`;
      ctx.beginPath();
      ctx.arc(qx, qy - L, 3.4 * (1 - (i / N) * 0.5), 0, TAU);
      ctx.fill();
    }
  }

  for (let i = 0; i < g.rings.length; i++) {
    const rg = g.rings[i];
    const k = 1 - rg.life / rg.max;
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.strokeStyle = rg.color;
    ctx.lineWidth = Math.max(2, 6 * (1 - k));
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, rg.r * (0.6 + k * 2.2), 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < g.parts.length; i++) {
    const p = g.parts[i];
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    if (p.star) {
      const s = p.size * 1.8;
      ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.3, p.y - s * 0.3); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
      ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3); ctx.lineTo(p.x - s, p.y); ctx.lineTo(p.x - s * 0.3, p.y - s * 0.3);
      ctx.closePath();
    } else ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < g.texts.length; i++) {
    const tx = g.texts[i];
    const k = 1 - tx.life / tx.max;
    ctx.save();
    ctx.globalAlpha = clamp(tx.life / (tx.max * 0.4), 0, 1);
    ctx.translate(tx.x, tx.y - k * 40);
    const pp = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.4);
    ctx.scale(pp, pp);
    ctx.font = `900 ${tx.size}px system-ui, "Noto Sans Thai", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.strokeText(tx.text, 0, 0);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // ===== เลเยอร์สภาพอากาศ (บนหน้าจอ) =====
  if (g.dark > 0.02 || g.rain > 0.02) {
    ctx.fillStyle = `rgba(25,30,60,${g.dark * 0.35 + g.rain * 0.1})`;
    ctx.fillRect(0, 0, w, h);
  }
  const inten = Math.max(g.rain, g.snow);
  const cnt = Math.floor(g.fx.length * inten);
  if (cnt > 0) {
    const isRain = g.rain >= g.snow;
    ctx.lineCap = "round";
    for (let i = 0; i < cnt; i++) {
      const f = g.fx[i];
      const px = (((f.x + (g.wind * 0.12 * g.clock * f.z) + (isRain ? 0 : Math.sin(g.clock + f.s) * 0.02)) % 1) + 1) % 1;
      const py = (((f.y + g.clock * (isRain ? 1.2 + f.z : 0.1 + f.z * 0.12)) % 1) + 1) % 1;
      const X = px * w, Y = py * h;
      if (isRain) {
        ctx.strokeStyle = `rgba(210,225,255,${0.35 + f.z * 0.3})`;
        ctx.lineWidth = 1.2 * f.z + 0.4;
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.lineTo(X + g.wind * 14, Y + 16 * f.z);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + f.z * 0.45})`;
        ctx.beginPath();
        ctx.arc(X, Y, 1.4 + f.z * 2.4, 0, TAU);
        ctx.fill();
      }
    }
  } else if (Math.abs(g.wind) > 0.5) {
    // เส้นลมพัดผ่านจอ
    ctx.strokeStyle = `rgba(255,255,255,${clamp(Math.abs(g.wind) - 0.4, 0, 0.5) * 0.5})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 14; i++) {
      const f = g.fx[i];
      const dir = Math.sign(g.wind);
      const px = (((f.x + dir * g.clock * (0.5 + f.z * 0.6)) % 1) + 1) % 1;
      const X = px * w, Y = f.y * h;
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X - dir * 46 * f.z, Y + 2);
      ctx.stroke();
    }
  }
  if (g.snow > 0.05) {
    ctx.fillStyle = `rgba(235,242,255,${g.snow * 0.18})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${g.flash * 0.85})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (g.phase === "playing" && g.stamina < 25) {
    const pulse = 0.35 + 0.25 * Math.sin(g.clock * 8);
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, "rgba(255,70,90,0)");
    vg.addColorStop(1, `rgba(255,70,90,${pulse})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}

/* =========================================================
  ส่วนช่วยของหน้า UI
  ========================================================= */
function useCountUp(target: number, run: boolean, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) { setV(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = clamp((now - t0) / ms, 0, 1);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function Star({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-16 w-16" style={{ animation: `ua-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#FFC83D" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon({ size = 24, color = "#3A2A10" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ display: "block" }}>
      <path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function Ring({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden style={{ display: "block" }}>
      <rect x="5" y="3" width="14" height="18" rx="7" fill="none" stroke={on ? "#FF6B3D" : "#B8BFCC"} strokeWidth="3.4" />
    </svg>
  );
}
function PopText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span aria-hidden className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF9A5E] blur-xl ${size}`} style={{ animation: "ua-glow .6s ease-in-out infinite alternate" }}>{text}</span>
      <span className={`relative block bg-gradient-to-t from-[#FF5A2E] via-[#FF9A3D] to-[#FFE08A] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`} style={{ filter: "drop-shadow(0 3px 0 rgba(255,255,255,.95))" }}>{text}</span>
    </div>
  );
}

// ตัวอย่างนักปีนในหน้าเลือกตัวละคร: ยืนหันหน้า ยังไม่มีสัตว์เลี้ยง
function HeroPreview({ hero }: { hero: Hero }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = ref.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cv.width !== 120 * dpr) { cv.width = 120 * dpr; cv.height = 150 * dpr; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 120, 150);
        const t = now / 1000;
        ell(ctx, 60, 142, 38, 8, 0, "#8F8497");
        ell(ctx, 52, 140, 16, 3, -0.2, "rgba(255,255,255,.35)");
        ctx.save();
        ctx.translate(60, 42 + Math.sin(t * 2) * 0.6);
        ctx.scale(1.5, 1.5);
        figureStand(ctx, PALS[hero], t, hero === "f", true, 0, 0, null);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hero]);
  return <canvas ref={ref} aria-hidden style={{ width: 120, height: 150, display: "block", margin: "0 auto" }} />;
}
// ตัวอย่างสัตว์เลี้ยงในหน้าเลือกสัตว์
function PetPreview({ pet }: { pet: Pet }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = ref.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cv.width !== 80 * dpr) { cv.width = 80 * dpr; cv.height = 88 * dpr; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 80, 88);
        const t = now / 1000;
        ctx.save();
        ctx.translate(38, 38 + Math.sin(t * 3) * 1.2);
        ctx.scale(1.7, 1.7);
        ctx.translate(0, -30);
        drawPet(ctx, pet, t, 0, 0, false);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [pet]);
  return <canvas ref={ref} aria-hidden style={{ width: 80, height: 88, display: "block", margin: "0 auto" }} />;
}
// เวทีหน้าเลือกสัตว์: ตัวละครที่เลือกยืนหันหน้า สัตว์ที่เลือกยืนอยู่ข้างๆ
function PetStage({ hero, pet }: { hero: Hero; pet: Pet }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = ref.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cv.width !== 170 * dpr) { cv.width = 170 * dpr; cv.height = 160 * dpr; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 170, 160);
        const t = now / 1000;
        ell(ctx, 85, 144, 76, 8, 0, "#8F8497");
        ell(ctx, 62, 142, 24, 3, -0.2, "rgba(255,255,255,.35)");
        ctx.save();
        ctx.translate(52, 44 + Math.sin(t * 2) * 0.6);
        ctx.scale(1.5, 1.5);
        figureStand(ctx, PALS[hero], t, hero === "f", true, 0, 0, null);
        ctx.restore();
        ctx.save();
        ctx.translate(122, 141 + Math.sin(t * 3) * 0.8);
        ctx.scale(1.8, 1.8);
        ctx.translate(0, -44);
        drawPet(ctx, pet, t, 0, 0, false);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hero, pet]);
  return <canvas ref={ref} aria-hidden style={{ width: 170, height: 160, display: "block", margin: "0 auto" }} />;
}
function Pips({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-2 w-3 rounded-full ${i < n ? "bg-[#FF7A3D]" : "bg-zinc-200"}`} />)}
    </span>
  );
}

const BTN_MAIN = "h-14 w-full rounded-full bg-[#1E2A4A] text-base font-semibold text-white transition-opacity hover:opacity-85";
const BTN_ORANGE = "h-14 w-full rounded-full bg-gradient-to-b from-[#FF8A4C] to-[#FF5A2E] text-lg font-black text-white shadow-lg ring-2 ring-white transition-transform active:scale-95";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] bg-white/70 text-sm font-medium transition-colors hover:bg-white";
const BTN_DARK = "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-white/15 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/25";
const BTN_ROUND = "pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm ring-1 ring-black/5 transition-transform active:scale-95";
const POP_SHADOW = "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 0 14px rgba(255,255,255,.9)";
const RANKS: Record<number, string> = { 0: "ยังไม่พ้นฐานแคมป์", 1: "นักปีนมือใหม่", 2: "นักปีนฝีมือดี", 3: "ราชาแห่งหน้าผา" };
const PRAISES = [
  "สุดยอด! ยอดเขานี้ต้องยกให้คุณ 🏔️",
  "เก่งมากกก! จับตรงวงแทบทุกก้อน 🎯",
  "ฝ่าพายุมาได้ ใจแข็งจริง! ⛈️",
  "เทพการปีนตัวจริง! ✨",
];
const starsFor = (score: number) => (score >= 1500 ? 3 : score >= 600 ? 2 : score >= 150 ? 1 : 0);

/* =========================================================
  หน้าเกม
  ========================================================= */
export default function UpAndUpPage() {
  const gRef = useRef<G>(null as unknown as G);
  if (!gRef.current) gRef.current = newG(0);
  const g = gRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);

  const timers = useRef<number[]>([]);
  const roundRef = useRef(0);
  const recordRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ w: 360, h: 640, sc: 1 });
  const pressRef = useRef<number | null>(null);
  const keysRef = useRef({ l: false, r: false, u: false, d: false, ang: 0, pow: 0.7, active: false });
  const heroRef = useRef<Hero>("m");
  const petRef = useRef<Pet>("sq");
  const pickRef = useRef<0 | 1 | 2>(0); // 0 = ปิด, 1 = เลือกตัวละคร, 2 = เลือกสัตว์
  const pausedRef = useRef(false);
  const sumRef = useRef<HTMLDivElement>(null);

  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [intro, setIntro] = useState<"ready" | "go" | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedPts, setSavedPts] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [record, setRecord] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [praise, setPraise] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [hero, setHero] = useState<Hero>("m");
  const [pet, setPet] = useState<Pet>("sq");
  const [pick, setPick] = useState<0 | 1 | 2>(0);
  const [ptsFly, setPtsFly] = useState(false);
  const [ptsLand, setPtsLand] = useState(false);
  const [natH, setNatH] = useState(620);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => {
    try {
      recordRef.current = Number(localStorage.getItem("upandupBest")) || 0;
      setRecord(recordRef.current);
      const hv = localStorage.getItem("upandupHero");
      if (hv === "m" || hv === "f") { heroRef.current = hv; setHero(hv); gRef.current.hero = hv; }
      const pv = localStorage.getItem("upandupPet") as Pet | null;
      if (pv && PET_LIST.includes(pv)) { petRef.current = pv; setPet(pv); gRef.current.pet = pv; }
      if (localStorage.getItem("upandupMuted") === "1") { muted = true; setIsMuted(true); }
    } catch {}
  }, []);

  function setPickStep(s: 0 | 1 | 2) { pickRef.current = s; setPick(s); }
  function openPick(v: boolean) { setPickStep(v ? 1 : 0); }
  function chooseHero(h: Hero) {
    heroRef.current = h;
    setHero(h);
    gRef.current.hero = h;
    try { localStorage.setItem("upandupHero", h); } catch {}
  }
  function choosePet(p: Pet) {
    petRef.current = p;
    setPet(p);
    gRef.current.pet = p;
    try { localStorage.setItem("upandupPet", p); } catch {}
  }

  function setRules(v: boolean) { pausedRef.current = v || showHow; setShowRules(v); }
  function setHow(v: boolean) { pausedRef.current = v || showRules; setShowHow(v); }

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try { localStorage.setItem("upandupMuted", muted ? "1" : "0"); } catch {}
  }

  // ===== บันทึกแต้มรอบนี้ (API ใช้ $inc จึงส่งเฉพาะแต้มของรอบนี้ ซึ่งแปลงจากเกณฑ์แล้ว 0-15) =====
  async function saveScore(score: number) {
    if (score <= 0) return;
    let userId: string | null = null;
    try {
      const raw = localStorage.getItem("profile");
      if (raw) {
        const p = JSON.parse(raw);
        userId = p.userId || p.id || p._id || null;
      }
    } catch {}
    if (!userId) { setSaveState("guest"); return; }
    setSaveState("saving");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gameKey: GAME_ID, score }),
      });
      const result = await res.json().catch(() => null);
      setSaveState(res.ok && result?.success ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  // ===== ลำดับเกม =====
  function goMenu() {
    clearTimers();
    pressRef.current = null;
    pausedRef.current = false;
    setShowRules(false);
    setShowHow(false);
    openPick(false);
    setIntro(null);
    roundRef.current += 1;
    gRef.current = newG(roundRef.current, heroRef.current, petRef.current);
    setSaveState("idle");
    force();
  }

  function beginRound() {
    clearTimers();
    audio();
    pressRef.current = null;
    pausedRef.current = false;
    setShowRules(false);
    setShowHow(false);
    roundRef.current += 1;
    const ng = newG(roundRef.current, heroRef.current, petRef.current);
    ng.phase = "intro";
    ng.camY = -ng.viewH * 0.62;
    gRef.current = ng;
    setSaveState("idle");
    setSavedPts(0);
    setNewRecord(false);
    setPraise("");
    setIntro("ready");
    force();
    later(() => {
      setIntro("go");
      sfx.whoosh();
      if (gRef.current === ng) { ng.phase = "playing"; ng.jt = 0; force(); }
    }, 1300);
    later(() => setIntro(null), 2200);
  }

  function endGame() {
    const cur = gRef.current;
    if (cur.phase === "over") return;
    cur.phase = "over";
    cur.aim.on = false;
    pressRef.current = null;
    clearTimers();
    ambient(0);
    sfx.buzzer();
    const isNew = cur.score > recordRef.current && cur.score > 0;
    if (isNew) {
      recordRef.current = cur.score;
      try { localStorage.setItem("upandupBest", String(cur.score)); } catch {}
    }
    setRecord(recordRef.current);
    setNewRecord(isNew);
    setPraise(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
    const pts = pointsFor(cur.score);
    setSavedPts(pts);
    saveScore(pts);
    force();
  }

  // ===== เล็ง/ปล่อย (เมาส์/นิ้ว ผ่าน Pointer Events) =====
  function aimFrom(e: React.PointerEvent<HTMLDivElement>) {
    const a = gRef.current.aim;
    a.dx = a.sx - e.clientX;
    a.dy = a.sy - e.clientY;
    a.pw = clamp(Math.hypot(a.dx, a.dy) / (100 * viewRef.current.sc), 0, 1);
  }
  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    const cur = gRef.current;
    if (cur.phase !== "playing" || pausedRef.current || e.button > 0 || cur.state !== "hang" || cur.stand) return;
    audio();
    pressRef.current = e.pointerId;
    keysRef.current.active = false;
    cur.aim.on = true;
    cur.aim.key = false;
    cur.aim.sx = e.clientX;
    cur.aim.sy = e.clientY;
    cur.aim.pw = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pressRef.current === e.pointerId) aimFrom(e);
  }
  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pressRef.current !== e.pointerId) return;
    pressRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    aimFrom(e);
    launch(gRef.current);
  }
  function onCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (pressRef.current === e.pointerId) { pressRef.current = null; gRef.current.aim.on = false; }
  }

  // ===== ผูกกับหน้าเว็บ =====
  useEffect(() => {
    const calc = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setDims({ w: Math.floor(window.innerWidth), h: Math.floor(vh) });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // คีย์ลัดบนคอม: ← → เล็งทิศ, Space ค้างชาร์จแรง ปล่อยเพื่อกระโดด (หน้าสรุป = เล่นอีกครั้ง), M = เสียง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const kr = keysRef.current;
      const onBtn = !!document.activeElement && document.activeElement.tagName === "BUTTON";
      if (pickRef.current) {
        const step = pickRef.current;
        const dl = e.code === "ArrowLeft" || e.code === "KeyA";
        const dr = e.code === "ArrowRight" || e.code === "KeyD";
        const du = e.code === "ArrowUp" || e.code === "KeyW";
        const dd = e.code === "ArrowDown" || e.code === "KeyS";
        if (e.code === "Escape") { setPickStep(step === 2 ? 1 : 0); return; }
        if (step === 1) {
          if (dl) chooseHero("m");
          else if (dr) chooseHero("f");
          else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); setPickStep(2); }
        } else {
          const i = PET_LIST.indexOf(petRef.current);
          const n = PET_LIST.length;
          if (dl) choosePet(PET_LIST[(i + n - 1) % n]);
          else if (dr) choosePet(PET_LIST[(i + 1) % n]);
          else if (du || dd) { e.preventDefault(); choosePet(PET_LIST[(i + 3) % n]); }
          else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); setPickStep(0); beginRound(); }
        }
        return;
      }
      if (e.code === "Escape" && pausedRef.current) { pausedRef.current = false; setShowRules(false); setShowHow(false); return; }
      if (e.code === "KeyM") toggleMute();
      const c = gRef.current;
      if (c.phase === "menu" && !pausedRef.current && (e.code === "Enter" || e.code === "Space")) {
        if (!onBtn) { e.preventDefault(); openPick(true); }
        return;
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") kr.l = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") kr.r = true;
      if (e.code === "ArrowUp" || e.code === "KeyW") { kr.u = true; e.preventDefault(); }
      if (e.code === "ArrowDown" || e.code === "KeyS") { kr.d = true; e.preventDefault(); }
      if (e.code === "Space" || e.code === "Enter") {
        if (onBtn || pausedRef.current) return;
        if (c.phase === "over") { e.preventDefault(); beginRound(); }
        else if (c.phase === "playing" && c.state === "hang" && !c.stand) {
          e.preventDefault();
          if (!e.repeat) {
            audio();
            if (kr.active) launch(c);
            else kr.active = true; // กดครั้งแรก = โชว์เส้นเล็ง กดอีกครั้ง = กระโดด
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const kr = keysRef.current;
      if (e.code === "ArrowLeft" || e.code === "KeyA") kr.l = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") kr.r = false;
      if (e.code === "ArrowUp" || e.code === "KeyW") kr.u = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") kr.d = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ลูปหลัก: ฟิสิกส์ + กติกา + วาด (ไม่ re-render React ทุกเฟรม อัปเดต HUD เมื่อค่าเปลี่ยนเท่านั้น)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let ambT = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const cur = gRef.current;
      const v = viewRef.current;
      cur.clock += dt;
      cur.viewH = v.h / v.sc;
      if (cur.phase !== "over" && !pausedRef.current) {
        // เล็งด้วยคีย์บอร์ด: ← → หมุนทิศ, ↑ ↓ ปรับแรง, เส้นเล็งโชว์ตลอดหลังกดปุ่มครั้งแรก
        const kr = keysRef.current;
        const dir = (kr.r ? 1 : 0) - (kr.l ? 1 : 0);
        const pd = (kr.u ? 1 : 0) - (kr.d ? 1 : 0);
        if (dir || pd) kr.active = true;
        if (dir) kr.ang = clamp(kr.ang + dir * 1.5 * dt, -1.35, 1.35);
        if (pd) kr.pow = clamp(kr.pow + pd * 0.8 * dt, 0.2, 1);
        if (kr.active && cur.phase === "playing" && cur.state === "hang" && !cur.stand && pressRef.current === null) {
          cur.aim.on = true;
          cur.aim.key = true;
          cur.aim.pw = kr.pow;
          cur.aim.dx = Math.sin(kr.ang);
          cur.aim.dy = -Math.cos(kr.ang);
        }
        const n = Math.max(1, Math.ceil(dt / (1 / 90)));
        for (let i = 0; i < n; i++) stepPhys(cur, dt / n);
        world(cur, dt);
        if (cur.ended) endGame();
        ambT -= dt;
        if (ambT <= 0) {
          ambT = 0.2;
          ambient(cur.phase === "playing" ? clamp(Math.abs(cur.wind) * 0.05 + cur.rain * 0.04 + cur.dark * 0.03, 0, 0.12) : 0);
        }
        const hudKey = `${cur.score}|${Math.round(-cur.bestY / UNIT)}|${Math.round(cur.stamina / 2)}|${cur.lives}|${cur.streak}|${cur.tw}|${Math.round(cur.wind * 4)}|${cur.jumps}`;
        if (hudKey !== cur.hud) { cur.hud = hudKey; force(); }
      }
      const cv = canvasRef.current;
      if (cv && cur.phase !== "over") {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bw = Math.round(v.w * dpr);
        const bh = Math.round(v.h * dpr);
        if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
        const ctx = cv.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          render(ctx, cur, v);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ambient(0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (g.phase === "over" && sumRef.current) setNatH(sumRef.current.offsetHeight);
  });

  // หน้าสรุป: คะแนนนับขึ้น → ชิป "+แต้ม" บินลงกล่องแต้มสะสม → นับแต้ม + ประกายดาว
  useEffect(() => {
    if (g.phase !== "over") { setPtsFly(false); setPtsLand(false); return; }
    const t1 = window.setTimeout(() => setPtsFly(true), 1300);
    const t2 = window.setTimeout(() => { setPtsLand(true); sfx.sparkle(); }, 2050);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [g.phase, g.round]);

  // ===== ค่าที่ใช้แสดงผล =====
  const compact = dims.h < 500;
  const wide = dims.w >= 640;
  const sc = clamp(Math.min(dims.h / 540, dims.w / (W + 10)), 0.5, 1.9);
  viewRef.current = { w: dims.w, h: dims.h, sc };
  const over = g.phase === "over";
  const playing = g.phase === "playing";
  const menu = g.phase === "menu";
  const stars = starsFor(g.score);
  const nt = nextTier(g.score);
  const shownScore = useCountUp(g.score, over);
  const shownPts = useCountUp(savedPts, over && ptsLand, 700);
  const showHint = playing && g.jumps < 3;
  const alt = Math.max(0, Math.round(-g.bestY / UNIT));
  const mult = 1 + Math.min(9, g.streak);
  const WXc = WX[g.tw];
  const windStr = Math.min(4, Math.round(Math.abs(g.wind) * 2.5));
  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${savedPts} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };
  const stCol = g.stamina > 50 ? "#4ADE80" : g.stamina > 25 ? "#FFB020" : "#FF4D6D";

  return (
    <div className="ua-anim fixed inset-0 z-50 select-none overflow-hidden overscroll-none bg-[#8FD3FF] font-sans text-zinc-900" style={{ touchAction: "manipulation" }}>
      <style>{`
        .ua-anim { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
        @keyframes ua-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes ua-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes ua-bump { 0% { transform: scale(1.3) } 100% { transform: scale(1) } }
        @keyframes ua-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes ua-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes ua-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes ua-fly { 0% { transform: translateY(-135px) scale(1.7); opacity: 0 } 15% { opacity: 1 } 80% { opacity: 1 } 100% { transform: translateY(0) scale(.85); opacity: 0 } }
        @keyframes ua-burst { 0% { transform: translate(0,0) scale(0) rotate(0); opacity: 1 } 100% { transform: translate(var(--dx),var(--dy)) scale(1) rotate(160deg); opacity: 0 } }
        @keyframes ua-new { 0% { transform: scale(0) rotate(-30deg); opacity: 0 } 100% { transform: scale(1) rotate(12deg); opacity: 1 } }
        @keyframes ua-hint { 0%, 100% { opacity: .65 } 50% { opacity: 1 } }
        @keyframes ua-title { 0% { transform: translateY(-30px) scale(.8); opacity: 0 } 100% { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ua-anim, .ua-anim * { animation: none !important } }
      `}</style>

      {/* ===== กระดาน (รับการเล็ง/ปล่อยทั้งจอ) ===== */}
      <main
        className="absolute inset-0"
        style={{ visibility: over ? "hidden" : "visible", zIndex: 0, touchAction: "none", cursor: playing ? "crosshair" : "default" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} aria-label="หน้าผา" style={{ width: dims.w, height: dims.h, display: "block" }} />
      </main>

      {/* ===== หน้าเมนู ===== */}
      {menu && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-between px-5" style={{ paddingTop: "max(env(safe-area-inset-top), 24px)", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}>
          <div className="text-center" style={{ animation: "ua-title .7s cubic-bezier(.2,1.3,.4,1) both" }}>
            {!compact && (
              <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#1E2A4A]/70 px-3 py-0.5 text-[11px] font-bold tracking-[.25em] text-[#FFE08A] ring-1 ring-white/40">▲ เกมปีนหน้าผา ▲</span>
            )}
            <div>
              <PopText text="UP AND UP!" size={compact ? "text-5xl" : "text-6xl sm:text-8xl"} />
            </div>
            <p className="text-sm font-bold text-[#1E3A6B]" style={{ textShadow: POP_SHADOW }}>ปีนให้สูง ฝ่าลม หิมะ ฝน และพายุ</p>
            {!compact && (
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-2 ring-white" aria-hidden>
                {WX.map((w, i) => (
                  <span key={i} className={`text-base leading-none transition-all duration-300 ${i === g.tw ? "scale-125 opacity-100" : "opacity-40"}`}>{w.ic}</span>
                ))}
              </div>
            )}
          </div>
          <div className="w-full max-w-xs space-y-2.5 rounded-[2rem] bg-[#1E2A4A]/65 p-3.5 ring-1 ring-white/30 backdrop-blur-sm">
            {record > 0 && (
              <p className="text-center text-sm font-bold text-[#FFE08A]">🏆 สถิติสูงสุด {record.toLocaleString("en-US")}</p>
            )}
            <button onClick={() => openPick(true)} className={BTN_ORANGE}>▲ เริ่มปีน</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setHow(true)} className={BTN_DARK}>วิธีเล่น</button>
              <button onClick={() => setRules(true)} className={BTN_DARK}>⭐ เกณฑ์แต้ม</button>
              <Link href="/rank" className={BTN_DARK}>🏆 อันดับ</Link>
              <Link href="/#games" className={BTN_DARK}>← หน้าเกม</Link>
            </div>
          </div>
        </div>
      )}

      {/* ===== เลือกตัวละคร (ขั้น 1) / เลือกสัตว์เลี้ยง (ขั้น 2) ===== */}
      {pick > 0 && menu && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1E2A4A]/45 p-4" onClick={() => openPick(false)}>
          <div role="dialog" aria-modal="true" aria-label={pick === 1 ? "เลือกนักปีน" : "เลือกสัตว์เลี้ยง"} className="max-h-[94%] w-full max-w-md overflow-y-auto rounded-[2rem] bg-gradient-to-b from-[#EAF6FF] via-[#FFF8E6] to-white px-4 pb-4 pt-5 shadow-2xl ring-4 ring-white" style={{ animation: "ua-rise .3s cubic-bezier(.2,.8,.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            {pick === 1 ? (
              <>
                <h2 className="text-center text-xl font-black tracking-tight text-[#E5502A]">เลือกนักปีน</h2>
                <p className="mt-0.5 text-center text-xs text-zinc-500">ต่อไปเลือกสัตว์เลี้ยงที่จะติดหลังไปด้วย 🐾</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["m", "f"] as Hero[]).map((h) => (
                    <button
                      key={h}
                      onClick={() => chooseHero(h)}
                      aria-pressed={hero === h}
                      className={`relative rounded-3xl px-2 pb-3 pt-2 text-center ring-2 transition-transform ${hero === h ? "scale-[1.03] bg-white shadow-lg ring-[#FF5A2E]" : "bg-white/60 ring-white"}`}
                    >
                      <span aria-hidden className="absolute right-3 top-2 text-base font-black leading-none" style={{ color: HERO[h].col }}>{HERO[h].sym}</span>
                      <HeroPreview hero={h} />
                      <p className="text-base font-black">{HERO[h].n}</p>
                      <div className="mt-1 space-y-1 text-[11px] font-medium text-zinc-600">
                        <div className="flex items-center justify-between px-1"><span>แรงเกาะ</span><Pips n={HERO[h].grip} /></div>
                        <div className="flex items-center justify-between px-1"><span>กระโดดไว</span><Pips n={HERO[h].spd} /></div>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{HERO[h].d}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setPickStep(2)} className={`${BTN_ORANGE} mt-4`}>ต่อไป</button>
                <p className="mt-2 hidden text-center text-[11px] text-zinc-500 sm:block">← → เลือกตัวละคร · Enter ต่อไป · Esc ปิด</p>
              </>
            ) : (
              <>
                <h2 className="text-center text-xl font-black tracking-tight text-[#E5502A]">เลือกสัตว์เลี้ยง</h2>
                <p className="mt-0.5 text-center text-xs text-zinc-500">สัตว์ที่เกาะหลังช่วยเสริมความสามารถให้นักปีน</p>
                <div className="mt-2 rounded-3xl bg-white/70 pb-2 pt-1 ring-2 ring-white">
                  <PetStage hero={hero} pet={pet} />
                  <p className="-mt-1 text-center text-sm font-black">{PET[pet].ic} {PET[pet].n}</p>
                  <p className="mx-auto mt-0.5 max-w-[17rem] px-2 text-center text-[12px] leading-snug text-[#B8431F]">{PET[pet].d}</p>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {PET_LIST.map((k) => (
                    <button
                      key={k}
                      onClick={() => choosePet(k)}
                      aria-pressed={pet === k}
                      className={`rounded-2xl px-1 pb-1.5 pt-1 text-center ring-2 transition-transform ${pet === k ? "scale-[1.04] bg-white shadow-lg ring-[#FF5A2E]" : "bg-white/60 ring-white"}`}
                    >
                      <PetPreview pet={k} />
                      <p className="text-xs font-black">{PET[k].n}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setPickStep(0); beginRound(); }} className={`${BTN_ORANGE} mt-4`}>ลุย!</button>
                <button onClick={() => setPickStep(1)} className={`${BTN_SUB} mt-2`}>ย้อนกลับ</button>
                <p className="mt-2 hidden text-center text-[11px] text-zinc-500 sm:block">← → ↑ ↓ เลือกสัตว์ · Enter เริ่มเกม · Esc ย้อนกลับ</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== HUD ===== */}
      {(playing || g.phase === "intro") && (
        <div className="pointer-events-none absolute inset-0 z-[5]" style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}>
          <div className="relative h-full w-full">
            {/* ความสูง + คะแนน + ตัวคูณ */}
            <div className="absolute left-3 top-2 sm:left-4 sm:top-3">
              <p className="pl-1 text-sm font-bold text-[#1E3A6B]" style={{ textShadow: POP_SHADOW }}>ความสูง</p>
              <p
                key={alt}
                className={`-mt-1 px-1 font-black italic leading-[1.05] tabular-nums tracking-tighter bg-gradient-to-t from-[#FF5A2E] via-[#FF9A3D] to-[#FFD66B] bg-clip-text text-transparent ${compact ? "text-4xl" : "text-5xl sm:text-7xl"}`}
                style={{ animation: "ua-bump .35s ease-out", filter: "drop-shadow(0 3px 0 rgba(255,255,255,.95))" }}
              >
                {alt}<span className="text-2xl"> ม.</span>
              </p>
              <p className="pl-1 text-sm font-bold tabular-nums text-[#1E3A6B]" style={{ textShadow: POP_SHADOW }}>คะแนน {g.score.toLocaleString("en-US")}</p>
              <p className="pl-1 text-xs font-semibold text-[#1E3A6B]" style={{ textShadow: POP_SHADOW }}>สถิติสูงสุด {record.toLocaleString("en-US")}</p>
              {mult > 1 && (
                <span key={mult} className="mt-1 inline-block rounded-full bg-gradient-to-r from-[#FF5A2E] to-[#FFB020] px-3 py-0.5 text-lg font-black italic text-white shadow ring-2 ring-white" style={{ animation: "ua-bump .3s ease-out" }}>
                  ×{mult}
                </span>
              )}
            </div>

            {/* สภาพอากาศ + ลม + ห่วงเชือก */}
            <div className="absolute right-3 top-2 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
              <div className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 shadow-md ring-2 ring-white">
                <span className="text-lg leading-none">{WXc.ic}</span>
                <span className="text-sm font-bold text-[#1E3A6B]">{WXc.n}</span>
                <span className="w-9 text-center text-xs font-black text-[#2B7BFF]" aria-label="ทิศและแรงลม">
                  {windStr === 0 ? "—" : (g.wind > 0 ? "→" : "←").repeat(windStr)}
                </span>
              </div>
              <div className="flex items-center gap-0.5 rounded-full bg-white/85 px-2 py-0.5 shadow ring-2 ring-white" aria-label={`ห่วงเชือกเหลือ ${g.lives}`}>
                {Array.from({ length: LIVES }, (_, i) => <Ring key={i} on={i < g.lives} />)}
              </div>
            </div>

            {/* แรงเกาะ (แนวตั้งขอบขวา) */}
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 sm:right-4">
              <div className="relative h-36 w-3.5 overflow-hidden rounded-full bg-white/70 ring-2 ring-white">
                <div className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-150" style={{ height: `${g.stamina}%`, background: stCol }} />
              </div>
              <span className="text-[10px] font-bold text-[#1E3A6B]" style={{ textShadow: POP_SHADOW }}>แรงเกาะ</span>
            </div>

            {/* คำใบ้ */}
            {!compact && (showHint || wide) && (
              <div className="absolute inset-x-0 flex justify-center" style={{ bottom: wide ? 90 : 76 }}>
                <span className="max-w-[78vw] text-center text-xs font-bold leading-tight text-[#1E3A6B] sm:text-sm" style={{ textShadow: POP_SHADOW, animation: showHint ? "ua-hint 1.4s ease-in-out infinite" : undefined }}>
                  {wide ? "ลากเมาส์ถอยหลังแล้วปล่อย หรือใช้ ← → เล็ง · ↑ ↓ ปรับแรง · Space กระโดด · M เสียง" : "ลากนิ้วถอยหลังเหมือนหนังสติ๊ก แล้วปล่อยเพื่อพุ่งไปจับหิน จับตรงวงขาว = PERFECT"}
                </span>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 sm:inset-x-5 sm:bottom-5">
              <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ" className={BTN_ROUND}>←</Link>
              <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง (M)" className={BTN_ROUND}>{isMuted ? "🔇" : "🔊"}</button>
              <button onClick={() => setHow(true)} aria-label="วิธีเล่น" title="วิธีเล่น" className={BTN_ROUND}>?</button>
              <button onClick={() => setRules(true)} aria-label="ดูเกณฑ์แต้มสะสม" title="เกณฑ์แต้มสะสม" className={`${BTN_ROUND} !bg-[#FFD66B]`}><StarIcon size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {/* READY → GO!!! */}
      <div className={`pointer-events-none absolute inset-0 bg-[#1E2A4A]/35 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`} />
      {intro && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div key={intro} style={{ animation: intro === "ready" ? "ua-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "ua-go .9s ease-out both" }}>
            <PopText text={intro === "ready" ? "READY" : "GO!!!"} size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"} />
          </div>
        </div>
      )}

      {/* ===== หน้าสรุปคะแนน ===== */}
      {over && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#BFE6FF] via-[#FFF1D6] to-white">
          <div style={{ width: 340, height: natH, transform: `scale(${Math.min((dims.h * 0.9) / natH, (dims.w * 0.94) / 340, 1.35)})` }} className="shrink-0">
            <div ref={sumRef} className="text-center" style={{ animation: "ua-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
              <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#FFD66B]" : "bg-zinc-100 text-zinc-600"}`}>
                {newRecord ? "🏆 สถิติใหม่!" : "หมดห่วงเชือกแล้ว!"}
              </span>
              <div className="mt-4 flex items-end justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={i === 1 ? "-translate-y-3" : ""}><Star on={i < stars} delay={0.3 + i * 0.22} /></div>
                ))}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-500">{RANKS[stars]}</p>
              {stars === 3 && praise && (
                <p className="mx-auto mt-2 max-w-[18rem] rounded-2xl bg-[#FFF3C4] px-3 py-2 text-sm font-semibold text-[#8A5A00]">{praise}</p>
              )}

              <div className="relative mt-4 rounded-3xl bg-[#FFB36B] px-4 py-5">
                {newRecord && (
                  <span aria-label="สถิติใหม่" className="absolute -right-2 -top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-br from-[#FF5A2E] to-[#FFB020] px-3 py-1 text-sm font-black italic tracking-wide text-white shadow-lg ring-2 ring-white" style={{ animation: "ua-new .6s .5s cubic-bezier(.2,1.5,.4,1) both" }}>
                    <StarIcon size={14} color="#FFF3C4" />NEW
                  </span>
                )}
                <p className="text-xs text-zinc-800">คะแนนรอบนี้</p>
                <p className="text-7xl font-semibold leading-none tabular-nums tracking-tight">{shownScore}</p>
              </div>

              <div className="relative mt-2">
                {ptsFly && savedPts > 0 && (
                  <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10 -ml-10 -mt-4 flex h-8 w-20 items-center justify-center gap-1 rounded-full bg-[#FFD66B] text-sm font-black tabular-nums text-[#8A5A00] shadow-lg ring-2 ring-white" style={{ opacity: 0, animation: "ua-fly .75s cubic-bezier(.5,0,.8,.4) both" }}>
                    <StarIcon size={14} color="#8A5A00" />+{savedPts}
                  </span>
                )}
                {ptsLand && savedPts > 0 &&
                  [[-86, -26], [-58, -44], [-24, -50], [24, -50], [58, -44], [86, -26], [-70, 20], [70, 20]].map(([dx, dy], i) => (
                    <span key={i} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10 -ml-2.5 -mt-2.5" style={{ opacity: 0, animation: `ua-burst .7s ${i * 0.02}s ease-out both`, "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}>
                      <StarIcon size={20} color={i % 2 ? "#6EC6FF" : "#FFC400"} />
                    </span>
                  ))}
                <div key={ptsLand ? "land" : "wait"} className="rounded-2xl bg-white/70 px-4 py-2 text-sm" style={ptsLand ? { animation: "ua-bump .4s ease-out" } : undefined}>
                  <p className="font-medium">
                    แต้มสะสมที่ได้ <b className="inline-block min-w-[1.5ch] text-2xl tabular-nums text-[#E5502A]">{shownPts}</b> / {MAX_SAVE}
                  </p>
                  <p className="text-xs text-zinc-500">{nt ? `อีก ${nt[0] - g.score} คะแนน จะได้ ${nt[1]} แต้ม` : "ถึงเกณฑ์สูงสุดแล้ว! 🏆"}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-[#6EC6FF]/45 py-3">
                  <p className="text-xl font-semibold tabular-nums">{Math.max(0, Math.round(-g.bestY / UNIT))} ม.</p>
                  <p className="text-xs text-zinc-600">ความสูงสูงสุด</p>
                </div>
                <div className="rounded-2xl bg-[#FFD23F]/55 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.perfects}</p>
                  <p className="text-xs text-zinc-600">PERFECT (ครั้ง)</p>
                </div>
                <div className="rounded-2xl bg-[#FF9A6B]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.bestStreak > 0 ? `×${1 + Math.min(9, g.bestStreak)}` : "-"}</p>
                  <p className="text-xs text-zinc-600">ตัวคูณสูงสุด</p>
                </div>
                <div className="rounded-2xl bg-[#9DB4F2]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.jumps}</p>
                  <p className="text-xs text-zinc-600">กระโดดทั้งหมด (ครั้ง)</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">สถิติสูงสุด {record}</p>
              <p className="h-4 text-xs text-zinc-500" role="status">{saveText[saveState]}</p>
              <button onClick={() => setRules(true)} className="mt-1 text-xs font-medium text-[#E5502A] underline underline-offset-2">ดูเกณฑ์แต้มสะสม</button>
              <button onClick={beginRound} className={`${BTN_MAIN} mt-3`}>เล่นอีกครั้ง</button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={goMenu} className={BTN_SUB}>เมนู</button>
                <Link href="/rank" className={BTN_SUB}>อันดับ</Link>
                <Link href="/" className={BTN_SUB}>หน้าหลัก</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== หน้าวิธีเล่น ===== */}
      {showHow && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1E2A4A]/50 p-4" onClick={() => setHow(false)}>
          <div role="dialog" aria-modal="true" aria-label="วิธีเล่น" className="relative flex max-h-[90%] w-full max-w-sm flex-col rounded-[2rem] bg-gradient-to-b from-[#EAF6FF] via-[#FFF8E6] to-white px-5 pb-4 pt-6 shadow-2xl ring-4 ring-white" style={{ animation: "ua-rise .3s cubic-bezier(.2,.8,.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-center text-xl font-black tracking-tight text-[#E5502A]">วิธีเล่น</h2>
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm leading-snug text-zinc-700">
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>ดึงแล้วปล่อย</b> ลากนิ้วถอยหลังเหมือนหนังสติ๊ก ยิ่งลากยาวยิ่งพุ่งแรง ตัวจะพุ่งไปทางตรงข้าม (คอม: ลากเมาส์ได้เหมือนกัน หรือ ← → เล็ง · ↑ ↓ ปรับแรง · Space กระโดด)</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>จังหวะแกว่ง</b> ตัวแกว่งอยู่ตลอด ปล่อยตอนแกว่งไปทางที่จะพุ่งจะได้แรงเสริม</li>
              <li className="rounded-2xl bg-[#FFF3C4]/80 px-3 py-2"><b>PERFECT</b> มือแตะวงขาวกลางหินพอดี ตัวคูณคะแนนเพิ่มทีละ 1 (สูงสุด ×10) จับก้อนใหม่ไม่ตรงวงตัวคูณรีเซ็ต</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>แรงเกาะ</b> ห้อยนานแรงจะหมด จับ PERFECT ได้แรงคืนมากกว่า หมดแล้วจะหลุดลงไป</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>ห่วงเชือก 3 ห่วง</b> ตกหลุดจอเสียหนึ่งห่วง แล้วเริ่มใหม่จากหินล่าสุด หมดห่วงจบเกม</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>ระวังอากาศ</b> 💨 ลมดันตัวให้เบี่ยง ❄️ หิมะทำให้เส้นเล็งสั้น 🌧️ ฝนทำให้หินลื่นและแรงเกาะหมดเร็ว ⛈️ พายุมีฟ้าผ่าทำให้ตัวสะดุ้ง</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>ตัวละคร</b> Max แรงเกาะลดช้ากว่าแต่พุ่งสั้นกว่าเล็กน้อย Minnie จับหินไว วงจับกว้างกว่า แต่แรงเกาะลดเร็ว</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>สัตว์เลี้ยง</b> เลือกได้ 6 ตัว 🐿️ กระรอกจับหินง่ายขึ้น 🐱 แมวแรงเกาะลดช้า 🐸 กบพุ่งไกลขึ้น 🐦 นกร่อนนานขึ้น 🐢 เต่าลมกระทบน้อยลง 10% 🦎 ตุ๊กแกหินร่วงทนนานและหินน้ำแข็งกินแรงน้อยลง</li>
              <li className="rounded-2xl bg-white/80 px-3 py-2"><b>หินพิเศษ</b> หินสีน้ำตาลร้าวจะร่วงหลังจับไม่นาน หินใสสีฟ้าลื่นและกินแรงเกาะ</li>
            </ul>
            <button onClick={() => setHow(false)} className={`${BTN_MAIN} mt-3 !h-12`}>{menu || over ? "ปิด" : "ปิดและเล่นต่อ"}</button>
          </div>
        </div>
      )}

      {/* ===== หน้าเกณฑ์แต้มสะสม ===== */}
      {showRules && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1E2A4A]/50 p-4 pt-10" onClick={() => setRules(false)}>
          <div role="dialog" aria-modal="true" aria-label="เกณฑ์แต้มสะสม" className="relative flex max-h-[88%] w-full max-w-sm flex-col rounded-[2rem] bg-gradient-to-b from-[#EAF6FF] via-[#FFF8E6] to-white px-4 pb-4 pt-12 shadow-2xl ring-4 ring-white" style={{ animation: "ua-rise .3s cubic-bezier(.2,.8,.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-9 left-1/2 flex h-[72px] w-[72px] -translate-x-1/2 items-center justify-center rounded-full bg-[#FFD66B] shadow-lg ring-4 ring-white">
              <StarIcon size={40} />
            </div>
            <h2 className="text-center text-xl font-black tracking-tight text-[#E5502A]">เกณฑ์แต้มสะสม</h2>
            <p className="mx-auto mt-1 max-w-[17rem] text-center text-xs leading-relaxed text-zinc-500">เล่นได้คะแนนเท่าไร ก็ได้แต้มสะสมตามขั้นนี้เลย (สูงสุด {MAX_SAVE} แต้มต่อรอบ)</p>
            <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {SCORE_TIERS.map(([min, pt], i) => {
                const nx = SCORE_TIERS[i + 1];
                const range = nx ? `${min.toLocaleString("en-US")} – ${(nx[0] - 1).toLocaleString("en-US")}` : `${min.toLocaleString("en-US")} ขึ้นไป`;
                const mine = over && g.score > 0 && pointsFor(g.score) === pt;
                const full = pt === MAX_SAVE;
                return (
                  <div key={min} className={`flex items-center justify-between rounded-full px-4 py-1.5 text-sm tabular-nums ring-1 ${mine ? "bg-[#FFD66B] font-bold ring-[#F5B93A]" : full ? "bg-[#FFE3D3] ring-[#FFB88F]" : "bg-white/80 ring-black/[.05]"}`}>
                    <span className="text-zinc-700">{range}{mine && <span className="ml-1 text-xs text-[#E5502A]">← คุณอยู่ตรงนี้</span>}</span>
                    <span className="flex items-center gap-1 font-bold text-[#E5502A]"><StarIcon size={16} color="#FFB800" />{pt}{full && <span className="text-[10px] font-semibold">เต็ม!</span>}</span>
                  </div>
                );
              })}
            </div>
            <ul className="mt-3 space-y-1 rounded-2xl bg-[#FFF3C4]/70 px-3 py-2 text-[11px] leading-snug text-[#8A5A00]">
              <li>⛰️ ได้คะแนน 0 = ไม่ได้แต้ม</li>
              <li>🧗 ผู้เล่นทั่วไปมักได้ 250–700 คะแนน (3–5 แต้ม)</li>
              <li>🎯 จับ PERFECT ติดกันให้ตัวคูณสูง คะแนนจะพุ่งเร็วมาก</li>
              <li>🔑 ต้องเข้าสู่ระบบจึงจะบันทึกแต้มเข้าบัญชี</li>
            </ul>
            <button onClick={() => setRules(false)} className={`${BTN_MAIN} mt-3 !h-12`}>{menu || over ? "ปิด" : "ปิดและเล่นต่อ"}</button>
          </div>
        </div>
      )}
    </div>
  );
}