"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";

/* =========================================================
  Fruitie Bubbly — ปล่อยผลไม้ลงโหล ผลไม้ชนิดเดียวกันชนกันจะรวมร่างเป็นผลไม้ใหญ่ขึ้น
  ไปให้ถึงแตงโม! อย่าให้ผลไม้กองสูงเกินเส้นประนานเกินไป
  วิธีเล่น: แตะ/ลากเพื่อเล็ง แล้วปล่อยนิ้ว (หรือคลิกเมาส์) เพื่อทิ้งผลไม้
            คอม: ← → เลื่อนเล็ง, Space/Enter ทิ้งผลไม้, M = เสียง

  ฟิสิกส์เขียนเอง (วงกลม + แรงเสียดทาน) ไม่ต้องติดตั้งไลบรารีเพิ่ม
  - ฟิสิกส์ก้าวเวลาคงที่ 180 Hz + เก็บเศษเวลา + interpolate ตอนวาด → ลื่นทุกอัตราเฟรม (60/120/144 Hz)
  - ผลไม้นุ่มเด้ง: สปริง squash & stretch ตอนกระทบ + สปริงเด้งตอนเกิดใหม่
  - หมุนเฉพาะตอนกลิ้ง พอนิ่งแล้วหยุดสนิท (ระบบ rest)
  - วาดผลไม้จาก sprite ที่แคชไว้ (ไม่ใช้ shadowBlur ทุกเฟรม) และไม่สร้าง object ใหม่ในลูป
  ========================================================= */

// ===== ตั้งค่าเกม (ปรับสมดุลได้ที่นี่) =====
const GAME_ID = "fruitiebubbly"; // key ที่ใช้บวกแต้มเข้า gameScores
const SAVE_RATIO = 0.1; // คะแนนในเกม × ค่านี้ = แต้มที่บวกเข้าคะแนนสะสม (ขั้นต่ำ 1 ถ้าเล่นได้คะแนน)
const W = 360; // ความกว้างภายในโหล (หน่วยในเกม)
const H = 480; // ความสูงโหล (รวมพื้นที่ด้านบนไว้เล็ง)
const PAD = 12; // ขอบรอบโหลที่ canvas เผื่อไว้วาดผนัง
const JAR_TOP = 64; // ขอบบนของผนังโหล
const LINE_Y = 108; // เส้นอันตราย: ผลไม้ที่นิ่งแล้วค้างเหนือเส้นนี้นานเกินกำหนด = จบเกม
const DROP_Y = 50; // ความสูงที่ผลไม้ถูกปล่อย
const GRAVITY = 1000; // แรงโน้มถ่วง (ยิ่งน้อยผลไม้ยิ่งร่วงช้า)
const SLIP = 340; // แรงลื่นไถลออกข้างเมื่อผลไม้วางทับกันตรงๆ (ยิ่งมากยิ่งไหลออกง่าย)
const STEP = 1 / 180; // ก้าวฟิสิกส์คงที่ (วินาที)
const MAX_STEPS = 24; // กันเฟรมค้างแล้วฟิสิกส์ไล่ไม่ทัน
const ITER = 4; // รอบแก้การชนต่อ 1 ก้าว
const DROP_CD = 0.5; // เวลารอก่อนปล่อยลูกถัดไป (วินาที)
const DANGER_LIMIT = 2.4; // ค้างเหนือเส้นสะสมเกินนี้ = จบเกม (วินาที)
const COMBO_WIN = 1.3; // รวมร่างต่อกันภายในเวลานี้ = คอมโบ (วินาที)
const MAX_PARTS = 140; // จำกัดจำนวนอนุภาคกันกระตุก
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const CHEERS = ["น่ารักสุดๆ!", "เก่งมาก!", "ฟินเลย!", "ปุ๊กปิ๊ก!", "สุดยอด!"];
const CONFETTI = ["💖", "✨", "⭐", "🫧", "🎀", "💫", "🌸"];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// ผลไม้ 11 ระดับ: r = รัศมี (หน่วยในเกม) — ปล่อยได้เฉพาะ 5 ระดับแรก
const FRUITS = [
  { e: "🍒", n: "เชอร์รี่", c: "#FF8E8E", r: 16 },
  { e: "🍓", n: "สตรอว์เบอร์รี่", c: "#FF9EC0", r: 22 },
  { e: "🍇", n: "องุ่น", c: "#D9BDF5", r: 28 },
  { e: "🍊", n: "ส้ม", c: "#FFB874", r: 35 },
  { e: "🍋", n: "มะนาว", c: "#FFE27A", r: 43 },
  { e: "🍎", n: "แอปเปิ้ล", c: "#FF9F86", r: 52 },
  { e: "🍐", n: "ลูกแพร์", c: "#B9E39A", r: 63 },
  { e: "🍑", n: "พีช", c: "#FFC2B0", r: 75 },
  { e: "🍍", n: "สับปะรด", c: "#F5D27A", r: 88 },
  { e: "🍈", n: "เมลอน", c: "#97D58C", r: 102 },
  { e: "🍉", n: "แตงโม", c: "#7FD6C0", r: 118 },
];
const MAX_LV = FRUITS.length - 1;
const POINTS = (lv: number) => ((lv + 1) * (lv + 2)) / 2; // คะแนนตอนรวมร่างเป็นระดับ lv
const WATERMELON_BONUS = 150; // แตงโม 2 ลูกชนกัน = หายไปพร้อมโบนัส

function randLevel() {
  const r = Math.random();
  if (r < 0.34) return 0;
  if (r < 0.64) return 1;
  if (r < 0.84) return 2;
  if (r < 0.94) return 3;
  return 4;
}

// ===== ดาวและคำชมตอนจบเกม (อิงคะแนน) =====
const starsFor = (score: number) => (score >= 900 ? 3 : score >= 400 ? 2 : score >= 100 ? 1 : 0);
const RANKS: Record<number, string> = { 0: "ลองใหม่อีกนิด", 1: "มือใหม่หัดควั้น", 2: "เริ่มเก่งแล้วนะ", 3: "เจ้าแห่งผลไม้" };
const PRAISES = [
  "สุดยอดไปเลย! สวนผลไม้ต้องยกให้คุณ 🏆",
  "เก่งมากกก! รวมร่างได้ลื่นสุดๆ 🎀",
  "ยอดเยี่ยม! ผลไม้ทุกลูกมีความสุขเลย 💖",
  "เทพการรวมร่างตัวจริง! ✨",
  "เก่งจนผลไม้ปรบมือให้เลย! 👏",
];

// ===== เสียง ASMR (สังเคราะห์ด้วย WebAudio นุ่มๆ มีเอคโค่เบาๆ ไม่ต้องใช้ไฟล์) =====
let actx: AudioContext | null = null;
let bus: GainNode | null = null;
let send: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let lastThud = 0;
function audio() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (C) {
      actx = new C();
      bus = actx.createGain();
      bus.gain.value = 0.9;
      bus.connect(actx.destination);
      const echo = actx.createDelay(0.5);
      echo.delayTime.value = 0.19;
      const fb = actx.createGain();
      fb.gain.value = 0.38;
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      send = actx.createGain();
      send.gain.value = 0.35;
      send.connect(echo);
      echo.connect(lp);
      lp.connect(fb);
      fb.connect(echo);
      lp.connect(bus);
    }
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
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
  if (send) gn.connect(send);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
// แชร์ noise buffer เดียวทั้งเกม (ไม่สร้างใหม่ทุกครั้ง ลด GC ตอนเสียงถี่ๆ)
function noise(dur: number, vol: number, f0: number, f1: number) {
  const a = audio();
  const out = bus;
  if (!a || !out || muted) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
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
// โน้ตไล่ขึ้นตามระดับผลไม้ (เพนทาโทนิก)
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
const sfx = {
  drop: () => tone(520, 0.12, "sine", 0.14, 760), // บลู้บตอนปล่อย
  thud: (v: number) => {
    tone(230, 0.14, "sine", 0.09 + v * 0.12, 110); // ก๊อกนุ่มๆ ตอนกระทบ
    noise(0.05, 0.03 + v * 0.05, 1500, 500);
  },
  merge: (lv: number, combo: number) => {
    const k = Math.pow(2, (clamp(combo - 1, 0, 6) * 2) / 12);
    const f = SCALE[clamp(lv, 0, SCALE.length - 1)] * k;
    noise(0.1, 0.12, 2400, 700);
    tone(f, 0.45, "sine", 0.16);
    tone(f * 2, 0.5, "sine", 0.07, undefined, 0.06);
    tone(f / 2, 0.3, "triangle", 0.08);
  },
  big: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.5, "triangle", 0.12, undefined, i * 0.07)),
  sparkle: () => [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, 0.3, "sine", 0.05, undefined, i * 0.055)),
  warn: () => tone(330, 0.12, "triangle", 0.1, 260),
  whoosh: () => noise(0.5, 0.3, 400, 2400),
  buzzer: () => tone(220, 0.7, "triangle", 0.18, 120),
};

// ===== ชนิดข้อมูล =====
type Phase = "intro" | "playing" | "over";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";
type F = {
  id: number; x: number; y: number; px: number; py: number; // px,py = ตำแหน่งก้าวก่อนหน้า (ไว้ interpolate)
  vx: number; vy: number; a: number; w: number; lv: number; age: number;
  rest: number; c: boolean; // rest = เวลาที่นิ่งสะสม, c = กำลังสัมผัสอะไรอยู่
  s: number; sv: number; sa: number; // สปริง squash: ค่า, ความเร็ว, ทิศของแรงกระแทก
  p: number; pv: number; // สปริงขนาด (เด้งตอนเกิดใหม่)
  merging: boolean;
  bias: number; // ทิศที่จะไหลออกเมื่อวางทับกันตรงเป๊ะ (-1 ซ้าย / 1 ขวา)
};
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; e: string; size: number; rot: number; vr: number };
type Tx = { x: number; y: number; text: string; life: number; max: number; color: string; size: number };
type Rg = { x: number; y: number; r: number; life: number; max: number; color: string };
type G = {
  round: number; phase: Phase; fruits: F[]; nextId: number;
  score: number; drops: number; merges: number; combo: number; bestCombo: number;
  lastMergeT: number; simT: number; maxLv: number;
  cur: number; next: number; cool: number; aimX: number; aimT: number;
  danger: number; dangerOn: boolean; shake: number; warnT: number; clock: number; alpha: number;
  parts: P[]; texts: Tx[]; rings: Rg[];
};

// เริ่มต้นไม่สุ่ม (กัน hydration ไม่ตรงกัน) แล้วค่อยสุ่มตอนเริ่มรอบ
function newG(round: number): G {
  return {
    round, phase: "intro", fruits: [], nextId: 0,
    score: 0, drops: 0, merges: 0, combo: 0, bestCombo: 0,
    lastMergeT: -1e9, simT: 0, maxLv: 0,
    cur: 0, next: 0, cool: 0, aimX: W / 2, aimT: W / 2,
    danger: 0, dangerOn: false, shake: 0, warnT: 0, clock: 0, alpha: 1,
    parts: [], texts: [], rings: [],
  };
}

function mkFruit(cur: G, x: number, y: number, lv: number): F {
  return {
    id: ++cur.nextId, x, y, px: x, py: y, vx: 0, vy: 0, a: 0, w: 0, lv, age: 0,
    rest: 0, c: false, s: 0, sv: 0, sa: 0, p: 0, pv: 0, merging: false,
    bias: Math.random() < 0.5 ? -1 : 1,
  };
}

/* =========================================================
  ฟิสิกส์ (วงกลม + แรงเสียดทาน + สปริงนุ่มเด้ง)
  ========================================================= */
// กระแทกแล้วผลไม้ยุบตัวตามทิศแรง แล้วเด้งกลับด้วยสปริง
function squish(f: F, ang: number, v: number) {
  if (v < 70) return;
  const k = clamp(v / 260, 0.15, 1) * 3.8;
  if (k > Math.abs(f.sv) + Math.abs(f.s) * 19) f.sa = ang;
  f.sv += k;
}

const pairs: [F, F][] = []; // ใช้ซ้ำทุกก้าว ไม่สร้าง array ใหม่

// รวมร่าง: ลบ 2 ลูกเดิม สร้างลูกใหม่ระดับถัดไปตรงกลาง + เอฟเฟกต์ + คะแนน
function doMerge(cur: G, a: F, b: F) {
  const fs = cur.fruits;
  let n = 0;
  for (let i = 0; i < fs.length; i++) if (fs[i] !== a && fs[i] !== b) fs[n++] = fs[i];
  fs.length = n;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const lv = a.lv;
  cur.merges += 1;
  cur.combo = cur.simT - cur.lastMergeT < COMBO_WIN ? cur.combo + 1 : 1;
  cur.lastMergeT = cur.simT;
  cur.bestCombo = Math.max(cur.bestCombo, cur.combo);
  const col = FRUITS[lv].c;
  const room = MAX_PARTS - cur.parts.length;

  // แตงโมชนแตงโม: หายไปพร้อมโบนัสก้อนใหญ่
  if (lv >= MAX_LV) {
    const pts = WATERMELON_BONUS + (cur.combo - 1) * 3;
    cur.score += pts;
    cur.shake = 0.5;
    const cnt = Math.min(30, room);
    for (let i = 0; i < cnt; i++) {
      const ang = (i / 30) * Math.PI * 2;
      const sp = 180 + Math.random() * 280;
      cur.parts.push({ x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 160, life: 1.6, max: 1.6, e: i % 3 === 0 ? "🍉" : CONFETTI[i % CONFETTI.length], size: 24 + (i % 3) * 8, rot: 0, vr: (Math.random() - 0.5) * 8 });
    }
    cur.rings.push({ x: mx, y: my, r: FRUITS[lv].r, life: 0.9, max: 0.9, color: col });
    cur.rings.push({ x: mx, y: my, r: FRUITS[lv].r * 1.3, life: 1.1, max: 1.1, color: "#FFFFFF" });
    cur.texts.push({ x: mx, y: my - 20, text: `แตงโมสุดยอด! +${pts}`, life: 1.6, max: 1.6, color: "#C2457B", size: 30 });
    sfx.big();
    sfx.sparkle();
    return;
  }

  const nl = lv + 1;
  const pts = POINTS(nl) + (cur.combo - 1) * 3;
  cur.score += pts;
  cur.maxLv = Math.max(cur.maxLv, nl);
  const nf = mkFruit(cur, mx, my, nl);
  nf.vx = (a.vx + b.vx) / 2;
  nf.vy = (a.vy + b.vy) / 2 - 20;
  nf.age = 0.6;
  nf.p = -0.45; // เกิดมาตัวเล็กแล้วเด้งใหญ่ (สปริง overshoot)
  fs.push(nf);
  const nr = FRUITS[nl].r;
  // แรงกระแทกเล็กๆ ดันผลไม้รอบข้างให้ดูเด้งดึ๋ง
  for (let i = 0; i < fs.length - 1; i++) {
    const o = fs[i];
    const dx = o.x - mx;
    const dy = o.y - my;
    const d = Math.hypot(dx, dy) || 1;
    const reach = nr + FRUITS[o.lv].r + 26;
    if (d < reach) {
      const k = (1 - d / reach) * 150;
      o.vx += (dx / d) * k;
      o.vy += (dy / d) * k;
      o.rest = 0;
      squish(o, Math.atan2(dy, dx), k * 1.4);
    }
  }
  const cnt = Math.min(6 + nl, room);
  for (let i = 0; i < cnt; i++) {
    const ang = (i / cnt) * Math.PI * 2 + Math.random();
    const sp = 90 + Math.random() * 170;
    cur.parts.push({ x: mx, y: my, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 100, life: 0.9 + Math.random() * 0.4, max: 1.2, e: i % 4 === 0 ? FRUITS[nl].e : CONFETTI[i % CONFETTI.length], size: 15 + (i % 3) * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8 });
  }
  cur.rings.push({ x: mx, y: my, r: nr * 0.8, life: 0.55, max: 0.55, color: col });
  cur.texts.push({ x: mx, y: my - nr * 0.4, text: `+${pts}`, life: 0.9, max: 0.9, color: "#C2457B", size: 20 + Math.min(nl, 8) });
  if (cur.combo >= 2) {
    cur.texts.push({ x: W / 2, y: JAR_TOP + 72, text: `ติดกัน ×${cur.combo}!`, life: 1.1, max: 1.1, color: "#FF6FA3", size: 32 });
  } else if (nl >= 6) {
    cur.texts.push({ x: W / 2, y: JAR_TOP + 72, text: CHEERS[Math.floor(Math.random() * CHEERS.length)], life: 1.1, max: 1.1, color: "#FF6FA3", size: 30 });
  }
  if (nl >= 7) cur.shake = Math.max(cur.shake, 0.3);
  sfx.merge(nl, cur.combo);
  if (nl >= 8) sfx.big();
}

// 1 ก้าวของฟิสิกส์ (เวลาคงที่ STEP) — คืนค่าจำนวนครั้งที่รวมร่าง
function simulate(cur: G) {
  const h = STEP;
  const fs = cur.fruits;
  cur.simT += h;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    f.px = f.x;
    f.py = f.y;
    f.c = false;
    f.age += h;
    f.vy += GRAVITY * h;
    const damp = 1 - 0.35 * h;
    f.vx *= damp;
    f.vy *= damp;
    f.x += f.vx * h;
    f.y += f.vy * h;
    f.a += f.w * h;
    // สปริงนุ่มเด้ง: ยุบ/ยืด + ขนาดตอนเกิด
    f.sv += (-380 * f.s - 13 * f.sv) * h;
    f.s = clamp(f.s + f.sv * h, -0.3, 0.3);
    f.pv += (-300 * f.p - 12 * f.pv) * h;
    f.p += f.pv * h;
  }
  pairs.length = 0;
  let impact = 0;
  for (let it = 0; it < ITER; it++) {
    for (let i = 0; i < fs.length; i++) {
      const a = fs[i];
      if (a.merging) continue;
      const ra = FRUITS[a.lv].r;
      for (let j = i + 1; j < fs.length; j++) {
        const b = fs[j];
        if (b.merging) continue;
        const rb = FRUITS[b.lv].r;
        const min = ra + rb;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (a.lv === b.lv) {
          a.merging = true;
          b.merging = true;
          pairs.push([a, b]);
          break;
        }
        if (d < 0.0001) { dx = 0.01; dy = 0; d = 0.01; }
        a.c = true;
        b.c = true;
        const nx = dx / d;
        const ny = dy / d;
        // ผลไม้วางทับกันตรงๆ: ลูกที่อยู่บนลื่นไถลออกข้าง (ไม่ซ้อนเป็นแถวตรง)
        if (it === 0 && Math.abs(ny) > 0.85) {
          const up = b.y < a.y ? b : a;
          const lo = up === b ? a : b;
          const ax = Math.abs(nx);
          if (ax < 0.5) {
            const side = up.x - lo.x;
            const dir = Math.abs(side) > 0.4 ? Math.sign(side) : up.bias;
            up.vx += dir * SLIP * (1 - ax / 0.5) * h;
            up.rest = 0;
          }
        }
        const ma = ra * ra;
        const mb = rb * rb;
        const im = 1 / ma + 1 / mb;
        const ov = min - d;
        a.x -= nx * ov * 0.8 * (mb / (ma + mb));
        a.y -= ny * ov * 0.8 * (mb / (ma + mb));
        b.x += nx * ov * 0.8 * (ma / (ma + mb));
        b.y += ny * ov * 0.8 * (ma / (ma + mb));
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const e = -rv > 140 ? 0.22 : 0;
          const jn = (-(1 + e) * rv) / im;
          a.vx -= (jn * nx) / ma;
          a.vy -= (jn * ny) / ma;
          b.vx += (jn * nx) / mb;
          b.vy += (jn * ny) / mb;
          if (-rv > impact) impact = -rv;
          if (-rv > 70) {
            const ang = Math.atan2(ny, nx);
            squish(a, ang, -rv);
            squish(b, ang, -rv);
          }
          // แรงเสียดทาน (ทำให้ผลไม้กลิ้งและหมุนตามกัน)
          const tx = -ny;
          const ty = nx;
          const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - b.w * rb - a.w * ra;
          let jt = -vt / (3 / ma + 3 / mb);
          const lim = 0.22 * jn;
          jt = clamp(jt, -lim, lim);
          a.vx -= (jt * tx) / ma;
          a.vy -= (jt * ty) / ma;
          b.vx += (jt * tx) / mb;
          b.vy += (jt * ty) / mb;
          a.w -= (2 * jt) / (ma * ra);
          b.w -= (2 * jt) / (mb * rb);
        }
      }
    }
    // ผนังและพื้น
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      if (f.merging) continue;
      const r = FRUITS[f.lv].r;
      if (f.x < r) {
        f.x = r;
        f.c = true;
        if (f.vx < 0) { squish(f, 0, -f.vx); f.vx = f.vx < -150 ? -f.vx * 0.2 : 0; }
      } else if (f.x > W - r) {
        f.x = W - r;
        f.c = true;
        if (f.vx > 0) { squish(f, 0, f.vx); f.vx = f.vx > 150 ? -f.vx * 0.2 : 0; }
      }
      if (f.y > H - r) {
        f.y = H - r;
        f.c = true;
        if (f.vy > 0) {
          if (f.vy > impact) impact = f.vy;
          squish(f, Math.PI / 2, f.vy);
          f.vy = f.vy > 200 ? -f.vy * 0.28 : 0;
        }
        if (it === 0) {
          const vc = f.vx - f.w * r; // ความเร็วที่จุดสัมผัสพื้น → ทำให้กลิ้งจริง
          f.vx -= vc / 6;
          f.w += vc / (3 * r);
        }
      }
    }
  }
  // ความต้านการกลิ้ง + ระบบ rest: ช้าลงเรื่อยๆ แล้วนิ่งสนิท (หมุนเฉพาะตอนกลิ้ง)
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (f.merging) continue;
    if (f.c) {
      f.vx *= 1 - 1.1 * h;
      f.w *= 1 - 5 * h;
    } else {
      f.w *= 1 - 1.5 * h;
    }
    f.w = clamp(f.w, -14, 14);
    if (f.c && Math.abs(f.vx) + Math.abs(f.vy) < 6 && Math.abs(f.w) < 0.7) {
      f.rest += h;
      if (f.rest > 0.2) { f.vx = 0; f.vy = 0; f.w = 0; }
    } else {
      f.rest = 0;
    }
  }
  if (impact > 200) {
    const now = performance.now();
    if (now - lastThud > 70) {
      lastThud = now;
      sfx.thud(clamp(impact / 800, 0.2, 1));
    }
  }
  const merged = pairs.length;
  for (let i = 0; i < merged; i++) doMerge(cur, pairs[i][0], pairs[i][1]);
  return merged;
}

/* =========================================================
  วาด canvas (sprite แคช + interpolate)
  ========================================================= */
type View = { sc: number; cw: number; ch: number; k: number };
type Sprite = { body: HTMLCanvasElement; emoji: HTMLCanvasElement; half: number; es: number };

let sprites: Sprite[] = [];
let spriteK = 0;
const emojiCache = new Map<string, HTMLCanvasElement>();

// สร้างภาพผลไม้ล่วงหน้า (ตัวฟองสบู่พาสเทล + เงา + ประกาย / อีโมจิ) ใช้ซ้ำทุกเฟรม
function buildSprites(k: number) {
  spriteK = k;
  sprites = FRUITS.map((T) => {
    const r = T.r;
    const half = r * 1.4;
    const px = Math.ceil(half * 2 * k);
    const kk = px / (half * 2);
    const body = document.createElement("canvas");
    body.width = px;
    body.height = px;
    const c = body.getContext("2d") as CanvasRenderingContext2D;
    c.scale(kk, kk);
    c.translate(half, half);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.35, T.c);
    g.addColorStop(1, T.c);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = g;
    c.shadowColor = "rgba(60,60,110,.28)";
    c.shadowBlur = r * 0.28 * kk;
    c.shadowOffsetY = r * 0.1 * kk;
    c.fill();
    c.shadowColor = "transparent";
    c.beginPath();
    c.arc(0, 0, r - 1, 0.15 * Math.PI, 0.85 * Math.PI);
    c.lineWidth = Math.max(2, r * 0.1);
    c.strokeStyle = "rgba(0,0,0,.10)";
    c.stroke();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.lineWidth = Math.max(1.5, r * 0.05);
    c.strokeStyle = "rgba(255,255,255,.9)";
    c.stroke();
    c.beginPath();
    c.ellipse(-r * 0.42, -r * 0.5, r * 0.2, r * 0.1, -0.5, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,.75)";
    c.fill();

    const es = r * 1.6;
    const epx = Math.ceil(es * k);
    const ek = epx / es;
    const emoji = document.createElement("canvas");
    emoji.width = epx;
    emoji.height = epx;
    const ec = emoji.getContext("2d") as CanvasRenderingContext2D;
    ec.font = `${r * 1.2 * ek}px ${EMOJI_FONT}`;
    ec.textAlign = "center";
    ec.textBaseline = "middle";
    ec.fillText(T.e, epx / 2, epx / 2 + r * 0.05 * ek);
    return { body, emoji, half, es };
  });
}

function emojiImg(e: string) {
  let c = emojiCache.get(e);
  if (!c) {
    c = document.createElement("canvas");
    c.width = 72;
    c.height = 72;
    const x = c.getContext("2d") as CanvasRenderingContext2D;
    x.font = `54px ${EMOJI_FONT}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(e, 36, 38);
    emojiCache.set(e, c);
  }
  return c;
}

// s = ยุบตัว, sa = ทิศแรงกระแทก, sc = ขนาด, ang = มุมหมุนของอีโมจิ
function drawFruit(ctx: CanvasRenderingContext2D, lv: number, x: number, y: number, ang: number, sc: number, s: number, sa: number, alpha = 1) {
  const sp = sprites[lv];
  if (!sp || sc <= 0.02) return;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (sc !== 1) ctx.scale(sc, sc);
  if (s > 0.002 || s < -0.002) {
    ctx.rotate(sa);
    ctx.scale(1 - s * 0.9, 1 + s * 0.75);
    ctx.rotate(-sa);
  }
  ctx.drawImage(sp.body, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
  if (ang !== 0) ctx.rotate(ang);
  ctx.drawImage(sp.emoji, -sp.es / 2, -sp.es / 2, sp.es, sp.es);
  ctx.restore();
}

function jarPath(ctx: CanvasRenderingContext2D, close: boolean) {
  const R = 22;
  ctx.beginPath();
  ctx.moveTo(0, JAR_TOP);
  ctx.lineTo(0, H - R);
  ctx.quadraticCurveTo(0, H, R, H);
  ctx.lineTo(W - R, H);
  ctx.quadraticCurveTo(W, H, W, H - R);
  ctx.lineTo(W, JAR_TOP);
  if (close) ctx.closePath();
}

const easeBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function render(ctx: CanvasRenderingContext2D, g: G, v: View) {
  if (spriteK !== v.k || sprites.length === 0) buildSprites(v.k);
  ctx.clearRect(0, 0, v.cw, v.ch);
  ctx.save();
  const shk = g.shake;
  ctx.translate(PAD + (shk > 0 ? Math.sin(g.clock * 90) * shk * 12 : 0), shk > 0 ? Math.cos(g.clock * 70) * shk * 8 : 0);

  // พื้นหลังโหล (กระจกใส)
  jarPath(ctx, true);
  const bg = ctx.createLinearGradient(0, JAR_TOP, 0, H);
  bg.addColorStop(0, "rgba(255,255,255,.38)");
  bg.addColorStop(1, "rgba(222,230,250,.6)");
  ctx.fillStyle = bg;
  ctx.fill();

  // เส้นอันตราย
  const dz = clamp(g.danger / DANGER_LIMIT, 0, 1);
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = dz > 0.05 ? `rgba(255,77,109,${0.45 + dz * 0.55})` : "rgba(255,111,163,.45)";
  ctx.beginPath();
  ctx.moveTo(0, LINE_Y);
  ctx.lineTo(W, LINE_Y);
  ctx.stroke();
  ctx.restore();

  // ไกด์เล็ง + ผลไม้ที่กำลังจะปล่อย
  if (g.phase === "playing") {
    const r = FRUITS[g.cur].r;
    const ax = clamp(g.aimX, r, W - r);
    if (g.cool <= 0) {
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(194,69,123,.35)";
      ctx.beginPath();
      ctx.moveTo(ax, DROP_Y + r);
      ctx.lineTo(ax, H);
      ctx.stroke();
      ctx.restore();
      // หายใจเบาๆ ตอนรอปล่อย
      drawFruit(ctx, g.cur, ax, DROP_Y, 0, 1 + Math.sin(g.clock * 5) * 0.025, 0, 0);
    } else {
      const t = clamp(1 - g.cool / DROP_CD, 0, 1);
      drawFruit(ctx, g.cur, ax, DROP_Y, 0, easeBack(t), 0, 0, clamp(t * 2, 0, 1));
    }
  }

  // ผลไม้ทั้งหมด (interpolate ระหว่างก้าวฟิสิกส์ให้ลื่น)
  const al = g.alpha;
  for (let i = 0; i < g.fruits.length; i++) {
    const f = g.fruits[i];
    drawFruit(ctx, f.lv, f.px + (f.x - f.px) * al, f.py + (f.y - f.py) * al, f.a, 1 + f.p, f.s, f.sa);
  }

  // ผนังโหลด (ทับผลไม้ให้ดูเป็นกระจก)
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(0, 5);
  jarPath(ctx, false);
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#B9C1EA";
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  jarPath(ctx, false);
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(255,255,255,.96)";
  ctx.stroke();
  ctx.restore();
  // เงาสะท้อนบนกระจก
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.beginPath();
  ctx.ellipse(14, JAR_TOP + 100, 4, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, JAR_TOP + 200, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // วงแหวน / อนุภาค / ข้อความลอย
  for (let i = 0; i < g.rings.length; i++) {
    const rg = g.rings[i];
    const t = 1 - rg.life / rg.max;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, rg.r * (0.5 + t * 1.6), 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, 8 * (1 - t));
    ctx.strokeStyle = rg.color;
    ctx.stroke();
    ctx.restore();
  }
  for (let i = 0; i < g.parts.length; i++) {
    const p = g.parts[i];
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const sz = p.size * 1.3;
    ctx.drawImage(emojiImg(p.e), -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }
  for (let i = 0; i < g.texts.length; i++) {
    const t = g.texts[i];
    const k = 1 - t.life / t.max;
    ctx.save();
    ctx.globalAlpha = clamp(t.life / (t.max * 0.4), 0, 1);
    ctx.translate(t.x, t.y - k * 46);
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.4);
    ctx.scale(pop, pop);
    ctx.font = `900 ${t.size}px system-ui, "Noto Sans Thai", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.strokeText(t.text, 0, 0);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
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
    <svg viewBox="0 0 24 24" className="h-16 w-16" style={{ animation: `fb-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#FFD66B" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}

function PopText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span aria-hidden className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF8FB5] blur-xl ${size}`} style={{ animation: "fb-glow .6s ease-in-out infinite alternate" }}>
        {text}
      </span>
      <span className={`relative block bg-gradient-to-t from-[#FF6FA3] via-[#FFA36B] to-[#FFE27A] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`} style={{ filter: "drop-shadow(0 3px 0 rgba(255,255,255,.9))" }}>
        {text}
      </span>
    </div>
  );
}

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";
const BTN_ROUND = "pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm ring-1 ring-black/5 transition-transform active:scale-95";
const POP_SHADOW = "0 2px 0 #fff, 0 -2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 0 14px rgba(255,255,255,.9)";
const BUBBLES = [
  [6, 14, 70], [82, 10, 46], [14, 62, 38], [88, 58, 80], [48, 84, 52], [70, 32, 28],
];

/* =========================================================
  หน้าเกม
  ========================================================= */
export default function FruitieBubblyPage() {
  const gRef = useRef<G>(null as unknown as G);
  if (!gRef.current) gRef.current = newG(0);
  const g = gRef.current;
  const [, force] = useReducer((x: number) => x + 1, 0);

  const timers = useRef<number[]>([]);
  const roundRef = useRef(0);
  const recordRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ sc: 1, cw: W + PAD * 2, ch: H + PAD, k: 1 });
  const pressRef = useRef<number | null>(null);
  const keysRef = useRef({ l: false, r: false });

  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [intro, setIntro] = useState<"ready" | "go" | null>("ready");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedPts, setSavedPts] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [record, setRecord] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [praise, setPraise] = useState("");
  const sumRef = useRef<HTMLDivElement>(null);
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

  // โหลดค่าที่จำไว้
  useEffect(() => {
    try {
      recordRef.current = Number(localStorage.getItem("fruitiebubblyBest")) || 0;
      setRecord(recordRef.current);
      if (localStorage.getItem("fruitiebubblyMuted") === "1") {
        muted = true;
        setIsMuted(true);
      }
    } catch {}
  }, []);

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try { localStorage.setItem("fruitiebubblyMuted", muted ? "1" : "0"); } catch {}
  }

  // ===== บันทึกคะแนนรอบนี้ (API ใช้ $inc จึงส่งเฉพาะแต้มของรอบนี้) =====
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
  function beginRound() {
    clearTimers();
    audio();
    pressRef.current = null;
    roundRef.current += 1;
    const ng = newG(roundRef.current);
    ng.cur = randLevel();
    ng.next = randLevel();
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
      const c = gRef.current;
      if (c === ng) {
        c.phase = "playing";
        force();
      }
    }, 1300);
    later(() => setIntro(null), 2200);
  }

  function endGame() {
    const cur = gRef.current;
    if (cur.phase === "over") return;
    cur.phase = "over";
    pressRef.current = null;
    clearTimers();
    sfx.buzzer();
    const isNew = cur.score > recordRef.current && cur.score > 0;
    if (isNew) {
      recordRef.current = cur.score;
      try { localStorage.setItem("fruitiebubblyBest", String(cur.score)); } catch {}
    }
    setRecord(recordRef.current);
    setNewRecord(isNew);
    setPraise(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
    const pts = cur.score > 0 ? Math.max(1, Math.floor(cur.score * SAVE_RATIO)) : 0;
    setSavedPts(pts);
    saveScore(pts);
    force();
  }

  // ปล่อยผลไม้ลงโหล
  function drop() {
    const cur = gRef.current;
    if (cur.phase !== "playing" || cur.cool > 0) return;
    audio();
    const r = FRUITS[cur.cur].r;
    const f = mkFruit(cur, clamp(cur.aimX, r, W - r), DROP_Y, cur.cur);
    f.s = -0.1; // ยืดตัวเล็กน้อยตอนหลุดมือ แล้วสปริงกลับ
    f.sa = Math.PI / 2;
    f.vx = (Math.random() - 0.5) * 24; // สะบัดข้างนิดๆ ตอนหลุดมือ
    cur.fruits.push(f);
    cur.drops += 1;
    cur.cur = cur.next;
    cur.next = randLevel();
    cur.cool = DROP_CD;
    sfx.drop();
    force();
  }

  // ===== เล็ง/ปล่อย (เมาส์/นิ้ว ผ่าน Pointer Events) =====
  function aimFrom(clientX: number) {
    const cv = canvasRef.current;
    const cur = gRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const k = rect.width / viewRef.current.cw || 1;
    const r = FRUITS[cur.cur].r;
    cur.aimT = clamp((clientX - rect.left) / k - PAD, r, W - r);
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    const cur = gRef.current;
    if (cur.phase !== "playing" || e.button > 0) return;
    audio();
    pressRef.current = e.pointerId;
    aimFrom(e.clientX);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (gRef.current.phase !== "playing") return;
    if (e.pointerType === "mouse" || pressRef.current === e.pointerId) aimFrom(e.clientX);
  }
  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pressRef.current !== e.pointerId) return;
    pressRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    aimFrom(e.clientX);
    gRef.current.aimX = gRef.current.aimT; // ปล่อยตรงจุดที่นิ้วอยู่เลย ไม่ต้องรอสไลด์
    drop();
  }
  function onCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (pressRef.current === e.pointerId) pressRef.current = null;
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

  // คีย์ลัดบนคอม: ← → เล็ง, Space/Enter ปล่อยผลไม้ (หน้าสรุป = เล่นอีกครั้ง), M = เสียง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") toggleMute();
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.l = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.r = true;
      if (e.code === "Space" || e.code === "Enter") {
        if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
        const ph = gRef.current.phase;
        if (ph === "over") { e.preventDefault(); beginRound(); }
        else if (ph === "playing") { e.preventDefault(); if (!e.repeat) drop(); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.l = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.r = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ลูปหลัก: ฟิสิกส์ก้าวคงที่ + interpolate + วาด (ไม่ re-render React ทุกเฟรม)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const cur = gRef.current;
      let needRender = false;
      cur.clock += dt;

      if (cur.phase === "playing") {
        cur.cool = Math.max(0, cur.cool - dt);
        // เล็ง: คีย์บอร์ดเลื่อนเป้า แล้วผลไม้ตามเป้าอย่างนุ่มนวล
        const r = FRUITS[cur.cur].r;
        const dir = (keysRef.current.r ? 1 : 0) - (keysRef.current.l ? 1 : 0);
        if (dir) cur.aimT = clamp(cur.aimT + dir * 340 * dt, r, W - r);
        cur.aimT = clamp(cur.aimT, r, W - r);
        cur.aimX += (cur.aimT - cur.aimX) * (1 - Math.exp(-34 * dt));
        cur.aimX = clamp(cur.aimX, r, W - r);

        // ฟิสิกส์ก้าวคงที่ + เก็บเศษเวลา
        acc += dt;
        let steps = 0;
        let merged = 0;
        while (acc >= STEP) {
          merged += simulate(cur);
          acc -= STEP;
          if (++steps >= MAX_STEPS) { acc = 0; break; }
        }
        cur.alpha = acc / STEP;
        if (merged > 0) needRender = true;

        // เส้นอันตราย: ผลไม้ที่ลงมาแล้วแต่ยังค้างเหนือเส้น
        let over = false;
        for (let i = 0; i < cur.fruits.length; i++) {
          const f = cur.fruits[i];
          if (!f.merging && f.age > 1.2 && f.y - FRUITS[f.lv].r < LINE_Y) { over = true; break; }
        }
        cur.danger = over ? cur.danger + dt : Math.max(0, cur.danger - dt * 2);
        if (over) {
          cur.warnT -= dt;
          if (cur.warnT <= 0) { cur.warnT = 0.5; sfx.warn(); }
        }
        const on = cur.danger > 0.3;
        if (on !== cur.dangerOn) { cur.dangerOn = on; needRender = true; }
        if (cur.danger >= DANGER_LIMIT) endGame();
      } else {
        cur.alpha = 1;
        acc = 0;
      }

      // เอฟเฟกต์ (อัปเดตแบบ in-place ไม่สร้าง array ใหม่)
      if (cur.shake > 0) cur.shake = Math.max(0, cur.shake - dt);
      let n = 0;
      for (let i = 0; i < cur.parts.length; i++) {
        const p = cur.parts[i];
        p.vy += 700 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
        if (p.life > 0) cur.parts[n++] = p;
      }
      cur.parts.length = n;
      n = 0;
      for (let i = 0; i < cur.texts.length; i++) {
        const t = cur.texts[i];
        t.life -= dt;
        if (t.life > 0) cur.texts[n++] = t;
      }
      cur.texts.length = n;
      n = 0;
      for (let i = 0; i < cur.rings.length; i++) {
        const rg = cur.rings[i];
        rg.life -= dt;
        if (rg.life > 0) cur.rings[n++] = rg;
      }
      cur.rings.length = n;

      // วาด (ข้ามตอนหน้าสรุปเพราะซ่อนอยู่)
      const cv = canvasRef.current;
      if (cv && cur.phase !== "over") {
        const v = viewRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bw = Math.round(v.cw * v.sc * dpr);
        const bh = Math.round(v.ch * v.sc * dpr);
        if (cv.width !== bw || cv.height !== bh) {
          cv.width = bw;
          cv.height = bh;
        }
        const ctx = cv.getContext("2d");
        if (ctx) {
          const k = Math.round(v.sc * dpr * 20) / 20; // ปัดค่าให้แคช sprite ไม่ถูกสร้างใหม่ถี่ๆ
          ctx.setTransform(bw / v.cw, 0, 0, bh / v.ch, 0, 0);
          render(ctx, cur, { ...v, k });
        }
      }
      if (needRender) force();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เข้าหน้าแล้วเริ่ม READY → GO!!! อัตโนมัติ
  useEffect(() => {
    beginRound();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (g.phase === "over" && sumRef.current) setNatH(sumRef.current.offsetHeight);
  });

  // ===== ค่าที่ใช้แสดงผล =====
  const compact = dims.h < 500; // มือถือแนวนอน
  const wide = dims.w >= 640;
  const topPad = compact ? 66 : wide ? 112 : 86;
  const bottomPad = compact ? 62 : wide ? 100 : 68;
  const cw = W + PAD * 2;
  const ch = H + PAD;
  const sc = clamp(Math.min((dims.w - (wide ? 24 : 8)) / cw, (dims.h - topPad - bottomPad) / ch), 0.3, 2.4);
  viewRef.current = { sc, cw, ch, k: sc };
  const over = g.phase === "over";
  const playing = g.phase === "playing";
  const stars = starsFor(g.score);
  const shownScore = useCountUp(g.score, over);
  const showHint = g.drops < 3 && playing;
  // ลำดับผลไม้อยู่แถวล่างฝั่งขวา (มือถือ) / กึ่งกลาง (จอใหญ่)
  const ladderSize = wide ? 30 : clamp(Math.floor((dims.w - 24 - 108 - 12) / FRUITS.length) - 3, 12, 28);
  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${savedPts} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };

  return (
    <div className="fb-anim fixed inset-0 z-50 select-none overflow-hidden overscroll-none bg-gradient-to-b from-[#CDEFE4] via-[#FFF1E2] to-[#FFE3EE] font-sans text-zinc-900" style={{ touchAction: "manipulation" }}>
      <style>{`
        .fb-anim { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
        @keyframes fb-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes fb-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes fb-bump { 0% { transform: scale(1.3) } 100% { transform: scale(1) } }
        @keyframes fb-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes fb-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fb-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes fb-bob { from { transform: translateY(0) scale(1) } to { transform: translateY(-26px) scale(1.06) } }
        @keyframes fb-vignette { from { opacity: .25 } to { opacity: 1 } }
        @keyframes fb-hint { 0%, 100% { opacity: .65 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .fb-anim, .fb-anim * { animation: none !important } }
      `}</style>

      {/* ลูกโป่งฟองสบู่ลอยเบาๆ เป็นพื้นหลัง (animate เฉพาะ transform ให้ GPU จัดการ) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BUBBLES.map(([x, y, d], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/45 ring-1 ring-white/70"
            style={{ left: `${x}%`, top: `${y}%`, width: d, height: d, willChange: "transform", animation: `fb-bob ${6 + i}s ease-in-out ${i * 0.7}s infinite alternate` }}
          />
        ))}
      </div>

      {/* ===== กระดาน (รับการเล็ง/ปล่อยทั้งพื้นที่) ===== */}
      <main
        className="absolute inset-0 flex items-center justify-center"
        style={{
          paddingTop: topPad,
          paddingBottom: bottomPad,
          opacity: g.phase === "intro" ? 0 : 1,
          visibility: over ? "hidden" : "visible",
          zIndex: 0,
          touchAction: "none",
          cursor: playing ? "crosshair" : "default",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} aria-label="โหลผลไม้" style={{ width: cw * sc, height: ch * sc, display: "block" }} />
      </main>

      {/* เกือบแพ้: ขอบจอเรืองสีแดงชมพูเต้นเบาๆ (animate เฉพาะ opacity ไม่กิน paint) */}
      {g.dangerOn && !over && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(255,92,122,0) 55%, rgba(255,92,122,.55) 100%)", animation: "fb-vignette .6s ease-in-out infinite alternate" }}
        />
      )}

      {/* ===== HUD (ซ้อนบนจอ ไม่กินพื้นที่) ===== */}
      {!over && (
        <div className="pointer-events-none absolute inset-0" style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}>
          <div className="relative h-full w-full">
            {/* คะแนน มุมบนซ้าย */}
            <div className="absolute left-3 top-2 sm:left-4 sm:top-3">
              <p className="pl-1 text-sm font-bold tracking-wide text-[#C2457B]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.9)" }}>คะแนน</p>
              <p
                key={g.score}
                className={`-mt-1 px-1 font-black italic leading-[1.05] tabular-nums tracking-tighter bg-gradient-to-t from-[#FF6FA3] via-[#FFA36B] to-[#FFD66B] bg-clip-text text-transparent ${compact ? "text-4xl" : "text-5xl sm:text-7xl"}`}
                style={{ animation: "fb-bump .35s ease-out", filter: "drop-shadow(0 3px 0 rgba(255,255,255,.95))" }}
              >
                {g.score.toLocaleString("en-US")}
              </p>
              <p className="pl-1 text-xs font-semibold text-[#C2457B]" style={{ textShadow: POP_SHADOW }}>สถิติสูงสุด {record.toLocaleString("en-US")}</p>
            </div>

            {/* ผลไม้ถัดไป มุมบนขวา */}
            <div className="absolute right-3 top-2 flex flex-col items-center gap-0.5 sm:right-4 sm:top-4">
              <p className="text-sm font-bold text-[#C2457B]" style={{ textShadow: POP_SHADOW }}>ถัดไป</p>
              <div
                key={g.drops}
                className="flex items-center justify-center rounded-full shadow-md ring-2 ring-white"
                style={{
                  width: compact ? 42 : wide ? 62 : 52,
                  height: compact ? 42 : wide ? 62 : 52,
                  background: `radial-gradient(circle at 35% 30%, #fff, ${FRUITS[g.next].c} 60%)`,
                  fontSize: compact ? 22 : wide ? 34 : 28,
                  animation: "fb-bump .35s ease-out",
                }}
              >
                <span style={{ lineHeight: 1 }}>{FRUITS[g.next].e}</span>
              </div>
            </div>

            {/* คำใบ้ตรงกลางด้านบน */}
            {!compact && playing && (
              <div className="absolute inset-x-0 flex justify-center" style={{ top: wide ? topPad - 30 : topPad - 22 }}>
                <span
                  className="max-w-[44vw] text-center text-[11px] font-bold leading-tight text-[#C2457B] sm:max-w-[60vw] sm:text-sm"
                  style={{ textShadow: POP_SHADOW, animation: showHint ? "fb-hint 1.4s ease-in-out infinite" : undefined }}
                >
                  {showHint ? "แตะ/ลากเพื่อเล็ง ปล่อยนิ้วเพื่อทิ้ง ชนิดเดียวกันชนกันจะรวมร่าง!" : g.maxLv > 0 ? `ใหญ่สุด ${FRUITS[g.maxLv].e} ${FRUITS[g.maxLv].n}` : ""}
                </span>
              </div>
            )}

            {/* แถวล่าง: ปุ่มกลับ/เสียง (ซ้าย) + ลำดับวิวัฒนาการผลไม้ */}
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 sm:inset-x-5 sm:bottom-5">
              <div className="flex shrink-0 gap-2">
                <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ" className={BTN_ROUND}>←</Link>
                <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง (M)" className={BTN_ROUND}>
                  {isMuted ? "🔇" : "🔊"}
                </button>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-end sm:justify-center" style={{ gap: 3 }}>
                {FRUITS.map((f, i) => (
                  <span
                    key={i}
                    className="flex shrink-0 items-center justify-center rounded-full ring-1 ring-white"
                    style={{
                      width: ladderSize,
                      height: ladderSize,
                      background: f.c,
                      fontSize: ladderSize * 0.6,
                      opacity: i <= g.maxLv || i <= 4 ? 1 : 0.4,
                      transform: i === g.maxLv && g.maxLv > 0 ? "scale(1.18)" : undefined,
                      transition: "opacity .3s, transform .3s",
                    }}
                  >
                    <span style={{ lineHeight: 1 }}>{f.e}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* READY → GO!!! */}
      <div className={`pointer-events-none absolute inset-0 bg-[#3B1D3F]/35 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`} />
      {intro && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div key={intro} style={{ animation: intro === "ready" ? "fb-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "fb-go .9s ease-out both" }}>
            <PopText text={intro === "ready" ? "READY" : "GO!!!"} size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"} />
          </div>
        </div>
      )}

      {/* ===== หน้าสรุปคะแนน ===== */}
      {over && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#FFE0EC] via-white to-white">
          <div style={{ width: 340, height: natH, transform: `scale(${Math.min((dims.h * 0.9) / natH, (dims.w * 0.94) / 340, 1.35)})` }} className="shrink-0">
            <div ref={sumRef} className="text-center" style={{ animation: "fb-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
              <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#FFD66B]" : "bg-zinc-100 text-zinc-600"}`}>
                {newRecord ? "🏆 สถิติใหม่!" : "โหลเต็มแล้ว!"}
              </span>

              {/* ดาว 3 ดวง: คะแนน ≥100 = 1 ดาว, ≥400 = 2 ดาว, ≥900 = 3 ดาว */}
              <div className="mt-4 flex items-end justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={i === 1 ? "-translate-y-3" : ""}>
                    <Star on={i < stars} delay={0.3 + i * 0.22} />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-500">{RANKS[stars]}</p>
              {stars === 3 && praise && (
                <p className="mx-auto mt-2 max-w-[18rem] rounded-2xl bg-[#FFF3C4] px-3 py-2 text-sm font-semibold text-[#8A5A00]">{praise}</p>
              )}

              <div className="mt-4 rounded-3xl bg-[#FFD66B] px-4 py-5">
                <p className="text-xs text-zinc-700">คะแนนรอบนี้</p>
                <p className="text-7xl font-semibold leading-none tabular-nums tracking-tight">{shownScore}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-[#97D58C]/55 py-3">
                  <p className="text-xl font-semibold">{FRUITS[g.maxLv].e}</p>
                  <p className="text-xs text-zinc-600">ผลไม้ใหญ่สุด ({FRUITS[g.maxLv].n})</p>
                </div>
                <div className="rounded-2xl bg-[#9DB4F2]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.merges}</p>
                  <p className="text-xs text-zinc-600">รวมร่างทั้งหมด (ครั้ง)</p>
                </div>
                <div className="rounded-2xl bg-[#FF9EC0]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.bestCombo > 1 ? `×${g.bestCombo}` : "-"}</p>
                  <p className="text-xs text-zinc-600">คอมโบสูงสุด</p>
                </div>
                <div className="rounded-2xl bg-[#FFB874]/50 py-3">
                  <p className="text-xl font-semibold tabular-nums">{g.drops}</p>
                  <p className="text-xs text-zinc-600">ผลไม้ที่ปล่อย (ลูก)</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-500">สถิติสูงสุด {record}</p>
              <p className="h-4 text-xs text-zinc-500" role="status">{saveText[saveState]}</p>

              <button onClick={beginRound} className={`${BTN_MAIN} mt-4`}>เล่นอีกครั้ง</button>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href="/rank" className={BTN_SUB}>ดูอันดับ</Link>
                <Link href="/" className={BTN_SUB}>หน้าหลัก</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}