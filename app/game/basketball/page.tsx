"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* =========================================================
   Basketball — ฟิสิกส์ 3 มิติ (หน่วยเมตร) วาดลง canvas ด้วยกล้อง perspective
   ========================================================= */

// ===== โลกของเกม =====
const G = 9.8;
const DURATION = 60;
const BASE_POINTS = 10;
const SWISH_BONUS = 5;
const BANK_BONUS = 3;
const MAX_MULT = 10;
const FIRE_STREAK = 3;
const TIME_BONUS_EVERY = 5; // ยิงเข้าติดกันทุก ๆ 5 ลูก ได้เวลาเพิ่ม
const TIME_BONUS = 3;
const MADE_PER_LEVEL = 5;
const MAX_LEVEL = 5;
const BALL_R = 0.12;
const RIM_R = 0.36; // ห่วงใหญ่ขึ้นเล็กน้อยให้ยิงเข้าง่าย
const TUBE = 0.02;
const HOOP_Y = 3.05;
const HOOP_Z = 4.0;
const BOARD_Z = HOOP_Z + RIM_R + 0.1;
const BOARD_HW = 0.9;
const BOARD_BOT = HOOP_Y - 0.15;
const BOARD_TOP = BOARD_BOT + 1.05;
const CAM = { x: 0, y: 1.6, z: -1.3 };
const BASELINE_Z = 5.6;
const WALL_Z = 7.6;
const GAME_ID = "basketball";
// ห่วงขยับซ้าย-ขวาตามเลเวล (index = level-1)
const LV_AMP = [0, 0.25, 0.4, 0.5, 0.6];
const LV_W = [0, 1.0, 1.2, 1.4, 1.6];
const FONT = 'ui-sans-serif, system-ui, "Noto Sans Thai", sans-serif';

// คะแนนที่ต้องทำให้ได้ 1 / 2 / 3 ดาว ในหน้าสรุป
const STAR_AT = [80, 250, 500];
const RANKS = ["ซ้อมต่ออีกนิด", "ตัวสำรอง", "ตัวจริง", "ซูเปอร์สตาร์"];

type Skin = { base: string; shade: string; line: string };
const SKIN: Skin = { base: "#FFA03C", shade: "#F4601A", line: "#6E2A0A" };
const PALETTE = ["#A8B5E8", "#F4A58A", "#9CC593", "#F4D35E", "#B7CBB0"];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ===== เสียง (สังเคราะห์ด้วย WebAudio ไม่ต้องใช้ไฟล์) =====
let actx: AudioContext | null = null;
let muted = false;
function audio() {
  if (typeof window === "undefined") return null;
  if (!actx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (C) actx = new C();
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, to?: number, delay = 0) {
  const a = audio();
  if (!a || muted) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gn.gain.setValueAtTime(vol, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn);
  gn.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function noise(dur: number, vol: number, f0: number, f1: number) {
  const a = audio();
  if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(f0, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur);
  f.Q.value = 0.9;
  const gn = a.createGain();
  gn.gain.value = vol;
  src.connect(f);
  f.connect(gn);
  gn.connect(a.destination);
  src.start();
}
const sfx = {
  swish: () => noise(0.4, 0.5, 2800, 1100),
  rim: (v: number) => {
    const k = clamp(v / 6, 0.15, 1);
    tone(820, 0.22, "triangle", 0.16 * k);
    tone(1230, 0.16, "sine", 0.09 * k);
  },
  board: (v: number) => {
    const k = clamp(v / 6, 0.2, 1);
    tone(150, 0.14, "sine", 0.3 * k, 80);
    noise(0.06, 0.12 * k, 900, 400);
  },
  bounce: (v: number) => tone(130, 0.12, "sine", 0.32 * clamp(v / 7, 0.1, 1), 65),
  score: (fire: boolean) => {
    tone(523, 0.12, "triangle", 0.16);
    tone(659, 0.14, "triangle", 0.16, undefined, 0.09);
    if (fire) tone(880, 0.2, "triangle", 0.16, undefined, 0.18);
  },
  whoosh: () => noise(0.5, 0.35, 400, 2400),
  buzzer: () => tone(190, 0.8, "sawtooth", 0.22),
  tick: () => tone(880, 0.06, "sine", 0.12),
  throw: () => noise(0.18, 0.18, 600, 1800),
};

// ===== ชนิดข้อมูล =====
type View = { w: number; h: number; F: number; hy: number; cx: number };
type Pt = { x: number; y: number; t: number };
type Ball = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  R: number[]; // เมทริกซ์การหมุนของลูก
  wx: number; wy: number; wz: number;
  state: "idle" | "drag" | "flying" | "dead";
  age: number; rimHits: number; board: boolean; scored: boolean; resolved: boolean;
  floorHits: number; rimCd: number; spawnT: number;
  homeX: number; homeY: number; homeZ: number;
  offX: number; offY: number; deadT: number;
  trail: { x: number; y: number; r: number }[];
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; kind: 0 | 1; color: string };
type Pop = { x: number; y: number; z: number; text: string; title: string; life: number; color: string; sp?: boolean; big?: boolean };
type Game = {
  ball: Ball; dead: Ball[];
  score: number; streak: number; best: number; made: number; shots: number; swishes: number;
  timeLeft: number; ended: boolean; t: number; level: number;
  amp: number; w: number; phase: number; hoopX: number;
  netSwing: number; hoopFlash: number; shake: number; crowd: number; fire: number;
  particles: Particle[]; pops: Pop[]; pts: Pt[];
  liveSx: number; liveSy: number; gaugeV: number; gaugeA: number; hint: string; hintT: number; lastSec: number;
};
type Phase = "ready" | "playing" | "over";
type SaveState = "idle" | "saving" | "saved" | "guest" | "error";

// ===== เมทริกซ์หมุนลูกบอล =====
function spinR(R: number[], wx: number, wy: number, wz: number, dt: number) {
  const w = Math.hypot(wx, wy, wz);
  if (w < 1e-6) return;
  const a = w * dt, kx = wx / w, ky = wy / w, kz = wz / w;
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  const d = [
    t * kx * kx + c, t * kx * ky - s * kz, t * kx * kz + s * ky,
    t * kx * ky + s * kz, t * ky * ky + c, t * ky * kz - s * kx,
    t * kx * kz - s * ky, t * ky * kz + s * kx, t * kz * kz + c,
  ];
  const out = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) out[i * 3 + j] = d[i * 3] * R[j] + d[i * 3 + 1] * R[3 + j] + d[i * 3 + 2] * R[6 + j];
  for (let i = 0; i < 9; i++) R[i] = out[i];
}

function newBall(): Ball {
  const b: Ball = {
    x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, R: [1, 0, 0, 0, 1, 0, 0, 0, 1], wx: 0, wy: 0, wz: 0,
    state: "idle", age: 0, rimHits: 0, board: false, scored: false, resolved: false, floorHits: 0, rimCd: 0, spawnT: 0,
    homeX: rand(-1.1, 1.1), homeY: 1.0, homeZ: rand(0, 0.7), offX: 0, offY: 0, deadT: 0, trail: [],
  };
  b.x = b.homeX; b.y = b.homeY; b.z = b.homeZ;
  spinR(b.R, rand(-1, 1), rand(-1, 1), rand(-1, 1), rand(0, 6));
  return b;
}

function newGame(): Game {
  const ball = newBall();
  ball.homeX = 0; ball.x = 0;
  return {
    ball, dead: [], score: 0, streak: 0, best: 0, made: 0, shots: 0, swishes: 0,
    timeLeft: DURATION, ended: false, t: 0, level: 1, amp: 0, w: 0, phase: 0, hoopX: 0,
    netSwing: 0, hoopFlash: 0, shake: 0, crowd: 0, fire: 0, particles: [], pops: [], pts: [],
    liveSx: 0, liveSy: 0, gaugeV: 0.8, gaugeA: 0, hint: "", hintT: 0, lastSec: DURATION,
  };
}

// ===== กล้อง =====
// F ผูกกับทั้งความสูงและความกว้าง เพื่อให้จอแนวตั้งที่ยาว ๆ ยังเห็นฉากครบ
function makeView(w: number, h: number): View {
  return { w, h, F: Math.min(0.95 * h, 1.5 * w), hy: 0.5 * h, cx: w / 2 };
}

function proj(v: View, x: number, y: number, z: number) {
  const dz = Math.max(0.05, z - CAM.z);
  const s = v.F / dz;
  return { x: v.cx + (x - CAM.x) * s, y: v.hy - (y - CAM.y) * s, s };
}

// ===== คำนวณวิถีการยิง (ช่วยเล็งแบบนุ่ม ๆ ให้เล่นลื่น) =====
function solveShot(bx: number, by: number, bz: number, tx: number) {
  const dx = tx - bx, dz = HOOP_Z - bz, D = Math.hypot(dx, dz), dy = HOOP_Y - by;
  let th = 0.94;
  for (let i = 0; i < 7; i++) {
    const den = 2 * Math.cos(th) ** 2 * (D * Math.tan(th) - dy);
    if (den > 0.2) {
      const v2 = (G * D * D) / den;
      const apex = (v2 * Math.sin(2 * th)) / (2 * G);
      if (apex < D * 0.9) return { v: Math.sqrt(v2), th, yaw: Math.atan2(dx, dz), D };
    }
    th += 0.08;
  }
  return { v: 8, th: 1.1, yaw: Math.atan2(dx, dz), D };
}

function computeLaunch(b: Ball, hoopAt: (dt: number) => number, sx: number, sy: number) {
  let sol = solveShot(b.x, b.y, b.z, hoopAt(0));
  for (let i = 0; i < 2; i++) {
    const t = sol.D / (sol.v * Math.cos(sol.th));
    sol = solveShot(b.x, b.y, b.z, hoopAt(t * 0.6)); // เผื่อห่วงที่กำลังขยับ
  }
  // ความแรงของการสะบัด = ปรับเพิ่ม/ลดจากแรงที่พอดี
  const p = clamp(1 + (sy - 2.4) * 0.025, 0.85, 1.15);
  const dev = Math.atan2(sx, Math.max(sy, 0.5)) * 0.25;
  const yaw = sol.yaw + dev;
  const v = sol.v * p, vh = v * Math.cos(sol.th);
  return { vx: vh * Math.sin(yaw), vy: v * Math.sin(sol.th), vz: vh * Math.cos(yaw), dev };
}

function flick(pts: Pt[], now: number, h: number) {
  const win = pts.filter((p) => now - p.t <= 110);
  if (win.length < 2) return { sx: 0, sy: 0 };
  const a = win[0], e = win[win.length - 1];
  const dt = Math.max(0.03, (now - a.t) / 1000);
  return { sx: (e.x - a.x) / dt / h, sy: -(e.y - a.y) / dt / h };
}

/* =========================================================
   การวาด
   ========================================================= */
// ลายร่องลูกบาส (ออกแบบให้ไม่มีเส้นไหนซ้อนทับหรือมาบรรจบกัน)
//  - เส้นรอบวงนอน 1 เส้น และเส้นตั้งผ่านกลางลูก 1 เส้น ตัดกันที่กึ่งกลางเพียงจุดเดียว
//  - เส้นโค้งซ้าย/ขวาอย่างละ 1 เส้น เป็นวงกลมเล็กที่ห่างจากเส้นตั้งและห่างจากกันเอง
//    จึงไม่ไปรวมกันที่ขั้วลูกเหมือนเดิม
const SEAMS: number[][][] = (() => {
  const N = 48;
  const ring = (f: (a: number) => number[]) => {
    const c: number[][] = [];
    for (let i = 0; i <= N; i++) c.push(f((i / N) * Math.PI * 2));
    return c;
  };
  const out: number[][][] = [
    ring((a) => [Math.cos(a), 0, Math.sin(a)]), // เส้นรอบวงนอน
    ring((a) => [0, Math.cos(a), Math.sin(a)]), // เส้นตั้ง
  ];
  const dl = (25 * Math.PI) / 180; // เอียงศูนย์กลางไปด้านหลังลูก
  const rho = (62 * Math.PI) / 180; // รัศมีเชิงมุมของเส้นโค้ง (น้อยกว่า 65° จึงไม่แตะเส้นตั้ง)
  for (const sx of [-1, 1]) {
    const cx = sx * Math.cos(dl), cz = Math.sin(dl);
    out.push(
      ring((a) => [
        Math.cos(rho) * cx - Math.sin(rho) * cz * Math.sin(a),
        Math.sin(rho) * Math.cos(a),
        Math.cos(rho) * cz + Math.sin(rho) * cx * Math.sin(a),
      ])
    );
  }
  return out;
})();

const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// วาดเส้นทึบทีละช่วง (ไม่ใช้ความโปร่งใส เส้นเลยไม่เป็นเม็ด/ไม่ดูซ้อนกันตรงรอยต่อ)
// ตรงกลางลูกสีเข้มและหนา ใกล้ขอบลูกสีจางลงและเรียวลง ให้ดูเป็นร่องบนผิวทรงกลม
function drawSeams(ctx: CanvasRenderingContext2D, cx: number, cy: number, rs: number, R: number[], skin: Skin) {
  const A = hexRgb(skin.shade), B = hexRgb(skin.line);
  const lw = Math.max(1, rs * 0.06);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const line of SEAMS) {
    let prev: { X: number; Y: number; pz: number } | null = null;
    for (const q of line) {
      const px = R[0] * q[0] + R[1] * q[1] + R[2] * q[2];
      const py = R[3] * q[0] + R[4] * q[1] + R[5] * q[2];
      const pz = R[6] * q[0] + R[7] * q[1] + R[8] * q[2];
      const cur = { X: cx + px * rs, Y: cy - py * rs, pz };
      if (prev && pz < 0.02 && prev.pz < 0.02) {
        const f = clamp(-(pz + prev.pz) / 2, 0, 1); // 1 = หันตรงเข้าหากล้อง, 0 = ที่ขอบลูก
        if (f > 0.04) {
          const t = 0.8 * Math.pow(f, 0.6);
          ctx.strokeStyle = `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
          ctx.lineWidth = lw * (0.45 + 0.55 * f);
          ctx.beginPath();
          ctx.moveTo(prev.X, prev.Y);
          ctx.lineTo(cur.X, cur.Y);
          ctx.stroke();
        }
      }
      prev = cur;
    }
  }
}

function drawBallObj(ctx: CanvasRenderingContext2D, v: View, b: Ball, skin: Skin, g: Game) {
  const p = proj(v, b.x, b.y, b.z);
  let rs = BALL_R * p.s;
  const fade = b.state === "dead" ? clamp((2.0 - b.deadT) / 0.5, 0, 1) : 1;
  if (fade <= 0) return;
  if (b.state === "idle") {
    const k = clamp(b.spawnT / 0.3, 0, 1);
    rs *= 1 - (1 - k) * (1 - k) * 0.75;
  } else if (b.state === "drag") rs *= 1.06;
  rs = Math.max(1, rs);
  const isActive = b === g.ball;
  const onFire = isActive && g.fire > 0.05;

  ctx.save();
  ctx.globalAlpha = fade;
  // รอยทางลูกบอล
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i];
    ctx.globalAlpha = fade * 0.16 * (i / b.trail.length);
    ctx.fillStyle = skin.base;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * (0.5 + 0.5 * (i / b.trail.length)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = fade;
  if (onFire) {
    ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(p.x, p.y, rs * 0.4, p.x, p.y, rs * 2.7);
    gl.addColorStop(0, `rgba(255,150,40,${0.55 * g.fire})`);
    gl.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rs * 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, rs, 0, Math.PI * 2);
  const gr = ctx.createRadialGradient(p.x - rs * 0.35, p.y - rs * 0.4, rs * 0.1, p.x, p.y, rs);
  gr.addColorStop(0, skin.base);
  gr.addColorStop(1, skin.shade);
  ctx.fillStyle = gr;
  ctx.fill();
  drawSeams(ctx, p.x, p.y, rs, b.R, skin);
  const sh = ctx.createRadialGradient(p.x - rs * 0.4, p.y - rs * 0.45, rs * 0.05, p.x, p.y, rs * 1.05);
  sh.addColorStop(0, "rgba(255,255,255,0.35)");
  sh.addColorStop(0.5, "rgba(255,255,255,0)");
  sh.addColorStop(1, "rgba(120,30,0,0.16)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rs, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D, v: View, b: Ball) {
  const p = proj(v, b.x, 0, b.z);
  const rs = BALL_R * p.s;
  const fade = b.state === "dead" ? clamp((2.0 - b.deadT) / 0.5, 0, 1) : 1;
  ctx.fillStyle = `rgba(60,40,20,${(0.28 / (1 + b.y * 0.9)) * fade})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rs * (1 + b.y * 0.15), rs * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, v: View, g: Game) {
  const { w, h } = v;
  const wallB = proj(v, 0, 0, WALL_Z).y;
  const wg = ctx.createLinearGradient(0, 0, 0, wallB);
  wg.addColorStop(0, "#DDE3F8");
  wg.addColorStop(1, "#F3F1FB");
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, w, wallB);
  ctx.fillStyle = "rgba(168,181,232,0.18)";
  for (let i = 0; i < w; i += 64) ctx.fillRect(i, 0, 32, wallB);

  // ผู้ชม (กระโดดดีใจเมื่อยิงเข้า)
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < w / 30 + 1; i++) {
      const x = (i + 0.5 * row) * 30;
      const bob = g.crowd * Math.abs(Math.sin(g.t * 11 + i * 1.7)) * 10;
      const y = wallB - 6 - row * 15 - bob;
      ctx.fillStyle = PALETTE[(i * 7 + row * 3) % 5];
      ctx.globalAlpha = row === 0 ? 0.95 : 0.7;
      ctx.beginPath();
      ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 11, 12, 0, Math.PI, 0);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // พื้นสนาม
  const fg = ctx.createLinearGradient(0, wallB, 0, h);
  fg.addColorStop(0, "#E9C99E");
  fg.addColorStop(1, "#F6DDB6");
  ctx.fillStyle = fg;
  ctx.fillRect(0, wallB, w, h - wallB);
  ctx.strokeStyle = "rgba(120,80,40,0.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -9; x <= 9; x += 0.75) {
    const a = proj(v, x, 0, WALL_Z), b = proj(v, x, 0, -1.0);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  // ใต้แป้น (key)
  const k = [proj(v, -2.45, 0, -1), proj(v, 2.45, 0, -1), proj(v, 2.45, 0, BASELINE_Z), proj(v, -2.45, 0, BASELINE_Z)];
  ctx.fillStyle = "rgba(244,165,138,0.5)";
  ctx.beginPath();
  k.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const bl1 = proj(v, -12, 0, BASELINE_Z), bl2 = proj(v, 12, 0, BASELINE_Z);
  ctx.beginPath();
  ctx.moveTo(bl1.x, bl1.y);
  ctx.lineTo(bl2.x, bl2.y);
  ctx.stroke();

  // โหมดติดไฟ: หรี่ฉากหลังให้ไฟเด่น
  if (g.fire > 0.01) {
    ctx.fillStyle = `rgba(25,12,40,${0.4 * g.fire})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawBoard(ctx: CanvasRenderingContext2D, v: View, g: Game) {
  const hx = g.hoopX;
  const pole0 = proj(v, hx, BOARD_BOT, BOARD_Z + 0.05);
  const pole1 = proj(v, hx, 0, BOARD_Z + 0.9);
  ctx.strokeStyle = "#52525B";
  ctx.lineWidth = Math.max(4, 0.07 * pole0.s);
  ctx.beginPath();
  ctx.moveTo(pole0.x, pole0.y);
  ctx.lineTo(pole1.x, pole1.y);
  ctx.stroke();
  // ตัวยึดห่วงกับแป้น
  const r0 = proj(v, hx, HOOP_Y, HOOP_Z + RIM_R), r1 = proj(v, hx, HOOP_Y, BOARD_Z);
  ctx.strokeStyle = "#3F3F46";
  ctx.lineWidth = Math.max(3, 0.05 * r0.s);
  ctx.beginPath();
  ctx.moveTo(r0.x, r0.y);
  ctx.lineTo(r1.x, r1.y);
  ctx.stroke();
  const c = [
    proj(v, hx - BOARD_HW, BOARD_BOT, BOARD_Z), proj(v, hx + BOARD_HW, BOARD_BOT, BOARD_Z),
    proj(v, hx + BOARD_HW, BOARD_TOP, BOARD_Z), proj(v, hx - BOARD_HW, BOARD_TOP, BOARD_Z),
  ];
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "#27272A";
  ctx.lineWidth = Math.max(2, 0.025 * c[0].s);
  ctx.lineJoin = "round";
  ctx.beginPath();
  c.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const i0 = proj(v, hx - 0.3, HOOP_Y - 0.1, BOARD_Z), i1 = proj(v, hx + 0.3, HOOP_Y + 0.35, BOARD_Z);
  ctx.strokeStyle = "#F4A58A";
  ctx.lineWidth = Math.max(2, 0.02 * c[0].s);
  ctx.strokeRect(i0.x, i1.y, i1.x - i0.x, i0.y - i1.y);
}

function drawRim(ctx: CanvasRenderingContext2D, v: View, g: Game, back: boolean) {
  const hx = g.hoopX;
  const s = proj(v, hx, HOOP_Y, HOOP_Z).s;
  const lw = Math.max(3, 2 * TUBE * s * 1.3);
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const phi = (back ? 0 : Math.PI) + (i / 28) * Math.PI;
      const q = proj(v, hx + RIM_R * Math.cos(phi), HOOP_Y, HOOP_Z + RIM_R * Math.sin(phi));
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    }
  };
  ctx.lineCap = "round";
  ctx.lineWidth = lw;
  ctx.strokeStyle = "#E8643C";
  path();
  ctx.stroke();
  const glow = Math.max(g.hoopFlash, g.fire > 0.5 ? 0.35 * g.fire : 0);
  if (glow > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,170,60,${0.7 * glow})`;
    ctx.lineWidth = lw * 3.2;
    path();
    ctx.stroke();
    ctx.restore();
  }
}

type NetPt = { x: number; y: number; z: number };
const NET_K = 6;
const NET_N = 12;
function buildNet(g: Game, balls: Ball[]): NetPt[][] {
  const rows: NetPt[][] = [];
  for (let k = 0; k <= NET_K; k++) {
    const kk = k / NET_K;
    const rad = RIM_R * (1 - 0.45 * Math.pow(kk, 0.9));
    const y = HOOP_Y - kk * 0.45;
    const sway = g.netSwing * Math.sin(g.t * 15 - k * 0.8) * 0.05 * kk;
    const row: NetPt[] = [];
    for (let i = 0; i < NET_N; i++) {
      const phi = ((i + 0.5 * (k & 1)) / NET_N) * Math.PI * 2;
      let px = g.hoopX + rad * Math.cos(phi) + sway;
      let pz = HOOP_Z + rad * Math.sin(phi);
      for (const b of balls) {
        const dyb = Math.abs(b.y - y);
        if (dyb < BALL_R + 0.1 && Math.hypot(b.x - g.hoopX, b.z - HOOP_Z) < RIM_R * 1.1) {
          const need = BALL_R + 0.03;
          let vx = px - b.x, vz = pz - b.z;
          let d = Math.hypot(vx, vz);
          if (d < 1e-4) { vx = 1; vz = 0; d = 1; }
          if (d < need) {
            const wgt = 1 - dyb / (BALL_R + 0.1);
            px += ((b.x + (vx / d) * need) - px) * wgt;
            pz += ((b.z + (vz / d) * need) - pz) * wgt;
          }
        }
      }
      row.push({ x: px, y, z: pz });
    }
    rows.push(row);
  }
  return rows;
}

function drawNet(ctx: CanvasRenderingContext2D, v: View, net: NetPt[][], front: boolean) {
  ctx.strokeStyle = front ? "rgba(63,63,70,0.65)" : "rgba(63,63,70,0.35)";
  ctx.lineWidth = front ? 1.6 : 1.2;
  ctx.beginPath();
  for (let k = 0; k < NET_K; k++) {
    for (let i = 0; i < NET_N; i++) {
      const a = net[k][i];
      for (const t of [net[k + 1][i], net[k + 1][(i + NET_N - 1) % NET_N]]) {
        if (((a.z + t.z) / 2 < HOOP_Z) !== front) continue;
        const pa = proj(v, a.x, a.y, a.z), pb = proj(v, t.x, t.y, t.z);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      }
    }
  }
  ctx.stroke();
}

function drawOverlayUI(ctx: CanvasRenderingContext2D, v: View, g: Game, playing: boolean) {
  const { w, h } = v;
  // ข้อความลอย
  for (const p of g.pops) {
    let X: number, Y: number;
    if (p.sp) { X = p.x * w; Y = p.y * h; }
    else { const q = proj(v, p.x, p.y, p.z); X = q.x; Y = q.y; }
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFFFFF";
    ctx.fillStyle = p.color;
    const fs = clamp(h * 0.065, 22, 46) * (p.big ? 1.35 : 1);
    if (p.title) {
      ctx.font = `800 ${fs * 0.5}px ${FONT}`;
      ctx.lineWidth = 5;
      ctx.strokeText(p.title, X, Y - fs * 0.95);
      ctx.fillText(p.title, X, Y - fs * 0.95);
    }
    ctx.font = `800 ${fs}px ${FONT}`;
    ctx.lineWidth = 7;
    ctx.strokeText(p.text, X, Y);
    ctx.fillText(p.text, X, Y);
    ctx.globalAlpha = 1;
  }

  const b = g.ball;
  if (playing && !g.ended) {
    // ตัวช่วยเล็ง + มาตรวัดแรง ขณะลากลูก
    if (b.state === "drag" && g.liveSy > 1.0) {
      const L = computeLaunch(b, (dt) => g.amp * Math.sin(g.phase + g.w * dt), g.liveSx, g.liveSy);
      for (let i = 1; i <= 9; i++) {
        const t = i * 0.05;
        const q = proj(v, b.x + L.vx * t, b.y + L.vy * t - 0.5 * G * t * t, b.z + L.vz * t);
        ctx.fillStyle = `rgba(39,39,42,${0.5 * (1 - i / 10)})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(2, 0.025 * q.s * (1 - i / 14)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // หลอดวัดแรง: ทรงแคปซูล ค่าเลื่อนนุ่ม ๆ และค่อย ๆ ปรากฏ/จางหาย
    if (g.gaugeA > 0.01) {
      const gx = 28, top = h * 0.5, bot = h * 0.88, hh = bot - top, tw = 12;
      const pill = (x: number, y: number, ww: number, hgt: number) => {
        const r = ww / 2;
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, Math.PI, 0);
        ctx.arc(x + r, y + hgt - r, r, 0, Math.PI);
        ctx.closePath();
      };
      const zy = (sv: number) => bot - clamp((sv - 0.8) / 3.8, 0, 1) * hh;
      const val = clamp(g.gaugeV, 0.8, 4.6);
      const inZone = val >= 2.0 && val <= 2.8;
      ctx.save();
      ctx.globalAlpha = g.gaugeA;
      // ราง
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      pill(gx - tw / 2, top, tw, hh);
      ctx.fill();
      // โซนแรงที่พอดี
      const zt = zy(2.8), zb = zy(2.0);
      ctx.fillStyle = "#9CC593";
      pill(gx - tw / 2, zt, tw, zb - zt);
      ctx.fill();
      // ระดับแรงปัจจุบัน (เติมจากล่างขึ้นบน)
      const my = zy(val);
      ctx.fillStyle = inZone ? "rgba(77,143,95,0.55)" : "rgba(39,39,42,0.16)";
      pill(gx - tw / 2, my, tw, bot - my);
      ctx.fill();
      // ปุ่มเลื่อน
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(gx, my, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = inZone ? "#4D8F5F" : "#27272A";
      ctx.beginPath();
      ctx.arc(gx, my, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#52525B";
      ctx.font = `600 11px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("แรง", gx, top - 10);
      ctx.restore();
    }
    // คำใบ้
    if (g.shots === 0 && b.state === "idle") {
      const bob = Math.sin(g.t * 4) * 8;
      const p = proj(v, b.x, b.y, b.z);
      ctx.strokeStyle = "rgba(39,39,42,0.45)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x - 18, p.y - BALL_R * p.s - 38 + bob);
      ctx.lineTo(p.x, p.y - BALL_R * p.s - 56 + bob);
      ctx.lineTo(p.x + 18, p.y - BALL_R * p.s - 38 + bob);
      ctx.stroke();
      ctx.fillStyle = "rgba(39,39,42,0.6)";
      ctx.font = `700 ${clamp(h * 0.03, 14, 18)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("ลากลูกแล้วสะบัดขึ้นไปทางห่วง", p.x, p.y - BALL_R * p.s - 70 + bob);
    }
  }
  if (g.hintT > 0) {
    ctx.globalAlpha = clamp(g.hintT * 2, 0, 1);
    ctx.fillStyle = "#27272A";
    ctx.font = `700 ${clamp(h * 0.032, 15, 20)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(g.hint, w / 2, h * 0.62);
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.globalCompositeOperation = "lighter";
  for (const p of g.particles) {
    if (p.kind !== 0) continue;
    const t = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = `hsla(${8 + 42 * t}, 100%, ${46 + 16 * t}%, ${t * 0.85})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.35 + t * 0.65)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (const p of g.particles) {
    if (p.kind !== 1) continue;
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
  }
  ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, v: View, g: Game, skin: Skin, playing: boolean) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake * 10, (Math.random() - 0.5) * g.shake * 10);
  drawBackground(ctx, v, g);
  const balls = [g.ball, ...g.dead];
  for (const b of balls) drawShadow(ctx, v, b);
  const net = buildNet(g, balls);
  const items: { z: number; fn: () => void }[] = [
    { z: BOARD_Z, fn: () => drawBoard(ctx, v, g) },
    { z: HOOP_Z + 0.2, fn: () => drawRim(ctx, v, g, true) },
    { z: HOOP_Z + 0.1, fn: () => drawNet(ctx, v, net, false) },
    { z: HOOP_Z - 0.1, fn: () => drawNet(ctx, v, net, true) },
    { z: HOOP_Z - 0.2, fn: () => drawRim(ctx, v, g, false) },
  ];
  for (const b of balls) items.push({ z: b.z, fn: () => drawBallObj(ctx, v, b, skin, g) });
  items.sort((a, b) => b.z - a.z);
  items.forEach((i) => i.fn());
  drawParticles(ctx, g);
  drawOverlayUI(ctx, v, g, playing);
  ctx.restore();
}

/* =========================================================
   ส่วนช่วยของหน้า UI
   ========================================================= */
// ตัวเลขวิ่งขึ้นไปหาคะแนนจริงตอนขึ้นหน้าสรุป
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
    <svg
      viewBox="0 0 24 24"
      className="h-14 w-14 sm:h-16 sm:w-16"
      style={{ animation: `bb-pop .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }}
      aria-hidden
    >
      <path
        d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z"
        fill={on ? "#F4D35E" : "#E4E4E7"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ข้อความไล่สีส้ม-เหลืองแบบเดียวกับตัวคูณ ×N ตอนติดไฟ (แยกชั้นแสงเรืองไว้ด้านหลัง และเว้นขอบกันตัวเอียงถูกตัด)
function FireText({ text, size }: { text: string; size: string }) {
  return (
    <div className="relative inline-block px-6 py-2">
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-xl ${size}`}
        style={{ animation: "bb-glow .5s ease-in-out infinite alternate" }}
      >
        {text}
      </span>
      <span className={`relative block bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text px-3 py-1 font-black italic leading-[1.05] tracking-tighter text-transparent ${size}`}>
        {text}
      </span>
    </div>
  );
}

const BTN_MAIN =
  "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85";
const BTN_SUB =
  "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";
// ปุ่มกลมลอยบนจอเกม (โหมดเต็มจอบนมือถือ)
const BTN_ROUND =
  "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm ring-1 ring-black/5 backdrop-blur transition-transform active:scale-95";

/* =========================================================
   หน้าเกม
   ========================================================= */
export default function BasketballPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<Game>(newGame());
  const phaseRef = useRef<Phase>("ready");
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [intro, setIntro] = useState<"ready" | "go" | null>("ready");
  const introTimers = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [hud, setHud] = useState({ score: 0, streak: 0, made: 0, shots: 0, best: 0, level: 1, swishes: 0 });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [record, setRecord] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  // โหลดค่าที่จำไว้
  useEffect(() => {
    try {
      setRecord(Number(localStorage.getItem("basketballBest")) || 0);
      if (localStorage.getItem("basketballMuted") === "1") {
        muted = true;
        setIsMuted(true);
      }
    } catch {}
  }, []);

  function toggleMute() {
    muted = !muted;
    setIsMuted(muted);
    try { localStorage.setItem("basketballMuted", muted ? "1" : "0"); } catch {}
  }

  // ===== บันทึกคะแนนรอบนี้ (บวกเข้าคะแนนสะสมฝั่ง API ด้วย $inc) =====
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
      // API ใช้ $inc อยู่แล้ว จึงส่งเฉพาะแต้มของรอบนี้ ห้ามส่งยอดรวมไป ไม่งั้นจะถูกบวกซ้ำ
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

  // เริ่มรอบใหม่: แสดง READY → GO!!! แล้วเริ่มจับเวลา
  function beginRound() {
    introTimers.current.forEach((t) => clearTimeout(t));
    introTimers.current = [];
    audio();
    gRef.current = newGame();
    phaseRef.current = "ready";
    setHud({ score: 0, streak: 0, made: 0, shots: 0, best: 0, level: 1, swishes: 0 });
    setTimeLeft(DURATION);
    setSaveState("idle");
    setNewRecord(false);
    setPhase("ready");
    setIntro("ready");
    introTimers.current.push(
      window.setTimeout(() => {
        phaseRef.current = "playing";
        setPhase("playing");
        setIntro("go");
        sfx.whoosh();
      }, 1300),
      window.setTimeout(() => setIntro(null), 2200)
    );
  }

  // ปรับขนาด canvas ให้เต็มหน้าจอทุกอุปกรณ์ (มือถือและคอม)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setDims({ w: Math.floor(vw), h: Math.floor(vh) });
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

  // ล็อกไม่ให้หน้าเว็บเลื่อนขณะอยู่ในเกม
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(dims.w * dpr);
    c.height = Math.round(dims.h * dpr);
    sizeRef.current = { w: dims.w, h: dims.h, dpr };
  }, [dims]);

  // คีย์ลัดบนคอม: Space/Enter = เริ่ม, M = เสียง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") toggleMute();
      if ((e.code === "Space" || e.code === "Enter") && phaseRef.current === "over") {
        if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
        e.preventDefault();
        beginRound();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เข้าหน้าแล้วเริ่ม READY → GO!!! อัตโนมัติ
  useEffect(() => {
    beginRound();
    return () => introTimers.current.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== ลูปเกมหลัก =====
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let view: View = makeView(1, 1);

    const syncHud = () => {
      const g = gRef.current;
      setHud({ score: g.score, streak: g.streak, made: g.made, shots: g.shots, best: g.best, level: g.level, swishes: g.swishes });
    };

    const retire = (g: Game, b: Ball) => {
      b.state = "dead";
      b.deadT = 0;
      g.dead.push(b);
      if (g.dead.length > 5) g.dead.shift();
      const nb = newBall();
      // ให้ลูกใหม่เกิดในกรอบที่มองเห็นเสมอ (จอแนวตั้งแคบกว่า)
      const lim = Math.min(1.1, (view.w * 0.36) / (view.F / (nb.homeZ - CAM.z)));
      nb.homeX = rand(-lim, lim);
      nb.x = nb.homeX;
      g.ball = nb;
    };

    const burst = (g: Game, fire: boolean) => {
      const p = proj(view, g.hoopX, HOOP_Y - 0.1, HOOP_Z);
      for (let i = 0; i < 28; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(90, 330) * (view.h / 640);
        g.particles.push({
          x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160 * (view.h / 640),
          life: rand(0.6, 1.1), max: 1.1, size: rand(5, 10),
          kind: fire ? 0 : 1, color: PALETTE[i % 5],
        });
      }
    };

    const scoreBasket = (g: Game, b: Ball) => {
      b.scored = true;
      b.resolved = true;
      const swish = b.rimHits === 0 && !b.board;
      const bank = b.board && b.rimHits === 0;
      g.streak += 1;
      g.best = Math.max(g.best, g.streak);
      g.made += 1;
      if (swish) g.swishes += 1;
      const mult = Math.min(MAX_MULT, g.streak);
      const pts = (BASE_POINTS + (swish ? SWISH_BONUS : bank ? BANK_BONUS : 0)) * mult;
      g.score += pts;
      g.hoopFlash = 1;
      g.netSwing = 1;
      g.crowd = 1;
      g.shake = 0.35;
      const hot = g.streak >= FIRE_STREAK;
      g.pops.push({
        x: g.hoopX, y: HOOP_Y + 0.5, z: HOOP_Z, life: 1.1,
        title: swish ? "SWISH!" : bank ? "BANK SHOT!" : "NICE!",
        text: `+${pts}${mult > 1 ? ` ×${mult}` : ""}`,
        color: hot ? "#E8643C" : "#27272A",
      });
      burst(g, hot);
      if (swish) sfx.swish();
      sfx.score(hot);
      if (g.streak === FIRE_STREAK) {
        g.pops.push({ x: 0.5, y: 0.42, z: 0, sp: true, big: true, life: 1.3, title: "", text: "🔥 ON FIRE!", color: "#E8643C" });
        sfx.whoosh();
      }
      if (!g.ended && g.streak % TIME_BONUS_EVERY === 0) {
        g.timeLeft += TIME_BONUS;
        g.lastSec = Math.ceil(g.timeLeft);
        setTimeLeft(g.lastSec);
        g.pops.push({ x: 0.5, y: 0.52, z: 0, sp: true, life: 1.2, title: "", text: `+${TIME_BONUS} วินาที`, color: "#4D7C3A" });
      }
      const lv = Math.min(MAX_LEVEL, 1 + Math.floor(g.made / MADE_PER_LEVEL));
      if (lv > g.level) {
        g.level = lv;
        g.pops.push({ x: 0.5, y: 0.32, z: 0, sp: true, big: true, life: 1.4, title: "LEVEL UP", text: `เลเวล ${lv}`, color: "#1F2A5C" });
      }
      syncHud();
      retire(g, b);
    };

    const missBall = (g: Game, b: Ball) => {
      b.resolved = true;
      if (g.streak > 0) {
        g.pops.push({ x: clamp(b.x, -1.5, 1.5), y: HOOP_Y - 0.4, z: HOOP_Z, life: 0.9, title: "", text: "พลาด", color: "#71717A" });
      }
      g.streak = 0;
      syncHud();
      retire(g, b);
    };

    // ฟิสิกส์ของลูกบาส: แรงโน้มถ่วง แรงต้านอากาศ ชนแป้น ชนขอบห่วง ชนพื้น และตาข่าย
    const physics = (g: Game, b: Ball, dt: number, active: boolean) => {
      const n = 8, h = dt / n;
      const hx = g.hoopX;
      for (let s = 0; s < n; s++) {
        const prevY = b.y;
        b.vy -= G * h;
        const k = 1 - 0.08 * h;
        b.vx *= k; b.vy *= k; b.vz *= k;
        b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
        b.rimCd = Math.max(0, b.rimCd - h);

        // แป้นหลัง
        if (b.vz > 0 && b.z + BALL_R > BOARD_Z && b.z - BALL_R < BOARD_Z + 0.06 &&
            Math.abs(b.x - hx) < BOARD_HW + 0.04 && b.y > BOARD_BOT - 0.04 && b.y < BOARD_TOP + 0.04) {
          const imp = b.vz;
          b.z = BOARD_Z - BALL_R;
          b.vz = -b.vz * 0.6;
          b.vx *= 0.93; b.vy *= 0.93;
          b.wx += rand(-3, 3);
          if (imp > 0.8) { sfx.board(imp); g.shake = Math.max(g.shake, Math.min(0.5, imp / 14)); }
          if (active) b.board = true;
        }

        // ขอบห่วง (จุดบนวงกลมที่ใกล้ลูกที่สุด เทียบกับทรงกลม)
        if (Math.abs(b.y - HOOP_Y) < BALL_R + TUBE + 0.02) {
          let hxv = b.x - hx, hzv = b.z - HOOP_Z;
          let d = Math.hypot(hxv, hzv);
          if (d < 1e-5) { hxv = 1; hzv = 0; d = 1; }
          const px = hx + (RIM_R * hxv) / d, pz = HOOP_Z + (RIM_R * hzv) / d;
          const dx = b.x - px, dy = b.y - HOOP_Y, dz = b.z - pz;
          const dist = Math.hypot(dx, dy, dz);
          const min = BALL_R + TUBE;
          if (dist < min && dist > 1e-6) {
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            b.x = px + nx * min; b.y = HOOP_Y + ny * min; b.z = pz + nz * min;
            const vn = b.vx * nx + b.vy * ny + b.vz * nz;
            if (vn < 0) {
              const e = 0.62;
              b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; b.vz -= (1 + e) * vn * nz;
              b.vx *= 0.96; b.vz *= 0.96;
              b.wx += rand(-6, 6); b.wz += rand(-6, 6);
              if (-vn > 0.7 && b.rimCd <= 0) {
                sfx.rim(-vn);
                b.rimCd = 0.1;
                if (active) b.rimHits += 1;
                g.netSwing = Math.max(g.netSwing, 0.3);
              }
            }
          }
        }

        // พื้น
        if (b.y < BALL_R && b.vy < 0) {
          const imp = -b.vy;
          b.y = BALL_R;
          b.vy = imp < 1 ? 0 : imp * 0.76;
          b.vx *= 0.92; b.vz *= 0.92;
          b.wx = b.vz / BALL_R; b.wz = -b.vx / BALL_R;
          b.floorHits += 1;
          if (imp > 1.2) sfx.bounce(imp);
        }
        if (b.y <= BALL_R + 0.002) { b.vx *= 1 - 1.2 * h; b.vz *= 1 - 1.2 * h; }

        // ตาข่ายหน่วงลูกให้ช้าลงและพาเข้ากลางห่วง
        const nd = Math.hypot(b.x - hx, b.z - HOOP_Z);
        if (b.y < HOOP_Y && b.y > HOOP_Y - 0.5 && nd < RIM_R * 0.95) {
          b.vx *= 1 - 4 * h; b.vz *= 1 - 4 * h; b.vy *= 1 - 1.3 * h;
          b.vx += -(b.x - hx) * 8 * h; b.vz += -(b.z - HOOP_Z) * 8 * h;
          if (Math.abs(b.vy) > 2) g.netSwing = Math.max(g.netSwing, 0.6);
        }

        // ตัดสินว่าเข้าห่วง: จุดศูนย์กลางลูกลอดระนาบห่วงจากบนลงล่าง
        if (active && !b.resolved && b.vy < 0 && prevY >= HOOP_Y && b.y < HOOP_Y &&
            Math.hypot(b.x - hx, b.z - HOOP_Z) < RIM_R - 0.02) {
          scoreBasket(g, b);
          return;
        }
      }
      spinR(b.R, b.wx, b.wy, b.wz, dt);
      b.wx *= 1 - 0.3 * dt; b.wy *= 1 - 0.3 * dt; b.wz *= 1 - 0.3 * dt;
    };

    const finish = () => {
      const g = gRef.current;
      if (phaseRef.current !== "playing") return;
      phaseRef.current = "over";
      g.timeLeft = 0;
      setTimeLeft(0);
      syncHud();
      let prev = 0;
      try { prev = Number(localStorage.getItem("basketballBest")) || 0; } catch {}
      if (g.score > prev) {
        try { localStorage.setItem("basketballBest", String(g.score)); } catch {}
        setRecord(g.score);
        setNewRecord(g.score > 0);
      } else setRecord(prev);
      setPhase("over");
      saveScore(g.score);
    };

    const update = (dt: number) => {
      const g = gRef.current;
      g.t += dt;
      const lv = clamp(g.level, 1, MAX_LEVEL);
      g.amp += (LV_AMP[lv - 1] - g.amp) * Math.min(1, dt);
      g.w += (LV_W[lv - 1] - g.w) * Math.min(1, dt);
      g.phase += g.w * dt;
      g.hoopX = g.amp * Math.sin(g.phase);
      g.netSwing = Math.max(0, g.netSwing - dt * 1.2);
      g.hoopFlash = Math.max(0, g.hoopFlash - dt * 2.2);
      g.shake = Math.max(0, g.shake - dt * 2.5);
      g.crowd = Math.max(0, g.crowd - dt * 0.9);
      g.fire += ((g.streak >= FIRE_STREAK && phaseRef.current === "playing" ? 1 : 0) - g.fire) * Math.min(1, dt * 4);
      g.hintT = Math.max(0, g.hintT - dt);
      g.gaugeA += ((g.ball.state === "drag" ? 1 : 0) - g.gaugeA) * Math.min(1, dt * 10);
      g.gaugeV += (clamp(g.liveSy, 0.8, 4.6) - g.gaugeV) * Math.min(1, dt * 14);

      // อนุภาค และข้อความลอย
      const grav = 1400 * (view.h / 640);
      for (const p of g.particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.kind === 1) p.vy += grav * dt;
      }
      g.particles = g.particles.filter((p) => p.life > 0).slice(-260);
      for (const p of g.pops) {
        p.life -= dt;
        if (p.sp) p.y -= 0.04 * dt;
        else p.y += 0.6 * dt;
      }
      g.pops = g.pops.filter((p) => p.life > 0);

      const playing = phaseRef.current === "playing";

      // นับถอยหลัง
      if (playing && !g.ended) {
        g.timeLeft -= dt;
        const sec = Math.max(0, Math.ceil(g.timeLeft));
        if (sec !== g.lastSec) {
          g.lastSec = sec;
          setTimeLeft(sec);
          if (sec > 0 && sec <= 5) sfx.tick();
        }
        if (g.timeLeft <= 0) {
          g.ended = true;
          g.timeLeft = 0;
          sfx.buzzer();
        }
      }

      // ลูกบาสหลัก
      const b = g.ball;
      if (b.state === "idle" || b.state === "drag") {
        b.spawnT += dt;
        if (b.state === "idle") {
          const k = Math.min(1, dt * 14);
          b.x += (b.homeX - b.x) * k;
          b.y += (b.homeY - b.y) * k;
          b.z = b.homeZ;
        } else {
          if (g.ended) b.state = "idle";
          const f = flick(g.pts, performance.now(), view.h);
          g.liveSx = f.sx; g.liveSy = f.sy;
        }
        b.wx += (0 - b.wx) * dt; b.wy += (0 - b.wy) * dt;
      } else if (b.state === "flying") {
        b.age += dt;
        physics(g, b, dt, true);
        if (g.ball === b && !b.resolved) {
          const p = proj(view, b.x, b.y, b.z);
          b.trail.push({ x: p.x, y: p.y, r: BALL_R * p.s });
          if (b.trail.length > 10) b.trail.shift();
          if ((b.vy < 0 && b.y < HOOP_Y - 0.2) || b.age > 5 || b.z > BOARD_Z + 4) missBall(g, b);
        }
      }

      // ไฟลุกรอบลูกบาส
      if (g.streak >= FIRE_STREAK && playing) {
        const cur = g.ball;
        const p = proj(view, cur.x, cur.y, cur.z);
        const r = BALL_R * p.s;
        const n = 3 + Math.min(4, g.streak - FIRE_STREAK);
        const ps = view.h / 640;
        for (let i = 0; i < n; i++) {
          g.particles.push({
            x: p.x + rand(-0.7, 0.7) * r, y: p.y + rand(-0.4, 0.5) * r,
            vx: rand(-30, 30) * ps, vy: -rand(50, 140) * ps,
            life: rand(0.35, 0.7), max: 0.7, size: r * rand(0.35, 0.8), kind: 0, color: "",
          });
        }
      }

      // ลูกที่ยิงไปแล้ว ยังกระเด้งต่อได้
      for (const d of g.dead) {
        physics(g, d, dt, false);
        d.deadT += dt;
      }
      g.dead = g.dead.filter((d) => d.deadT < 2.2);

      // หมดเวลา: รอให้ลูกที่กำลังลอยอยู่ตัดสินก่อนจึงจบเกม
      if (playing && g.ended && g.ball.state !== "flying") finish();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const { w, h, dpr } = sizeRef.current;
      if (w > 0) {
        view = makeView(w, h);
        update(dt);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        drawScene(ctx, view, gRef.current, SKIN, phaseRef.current === "playing");
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== การควบคุม: เมาส์ / นิ้ว =====
  function getView(): View {
    const { w, h } = sizeRef.current;
    return makeView(w, h);
  }
  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    return { x: ((e.clientX - rect.left) * w) / rect.width, y: ((e.clientY - rect.top) * h) / rect.height };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = gRef.current;
    const b = g.ball;
    if (phaseRef.current !== "playing" || g.ended || b.state !== "idle") return;
    const v = getView();
    const p = pos(e);
    const bp = proj(v, b.x, b.y, b.z);
    if (Math.hypot(p.x - bp.x, p.y - bp.y) > Math.max(70, BALL_R * bp.s * 2.8)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    b.state = "drag";
    b.offX = bp.x - p.x;
    b.offY = bp.y - p.y;
    g.pts = [{ x: p.x, y: p.y, t: performance.now() }];
    g.liveSx = 0; g.liveSy = 0;
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = gRef.current;
    const b = g.ball;
    if (b.state !== "drag") return;
    const v = getView();
    const p = pos(e);
    const sx = p.x + b.offX, sy = p.y + b.offY;
    const dz = b.z - CAM.z;
    b.x = clamp(CAM.x + ((sx - v.cx) * dz) / v.F, -1.8, 1.8);
    b.y = clamp(CAM.y - ((sy - v.hy) * dz) / v.F, 0.5, 2.0);
    const now = performance.now();
    g.pts.push({ x: p.x, y: p.y, t: now });
    g.pts = g.pts.filter((q) => now - q.t < 250);
  }

  function onUp(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.style.cursor = "grab";
    const g = gRef.current;
    const b = g.ball;
    if (b.state !== "drag") return;
    const v = getView();
    const f = flick(g.pts, performance.now(), v.h);
    g.pts = [];
    if (g.ended || f.sy < 1.1) {
      b.state = "idle";
      if (!g.ended) { g.hint = "สะบัดให้เร็วและแรงขึ้นอีกนิด!"; g.hintT = 1.2; }
      return;
    }
    const L = computeLaunch(b, (dt) => g.amp * Math.sin(g.phase + g.w * dt), f.sx, f.sy);
    b.vx = L.vx; b.vy = L.vy; b.vz = L.vz;
    b.wx = -rand(7, 10); b.wy = L.dev * 10; b.wz = 0;
    b.state = "flying";
    b.age = 0;
    b.trail = [];
    g.shots += 1;
    sfx.throw();
    setHud((h) => ({ ...h, shots: g.shots }));
  }

  // ===== ค่าที่ใช้แสดงผล =====
  const nextMult = Math.min(MAX_MULT, hud.streak + 1);
  const onFire = hud.streak >= FIRE_STREAK && phase === "playing";
  const timeLow = timeLeft <= 10 && phase === "playing";
  const over = phase === "over";
  const shownScore = useCountUp(hud.score, over);
  const stars = STAR_AT.filter((s) => hud.score >= s).length;
  const accuracy = hud.shots > 0 ? Math.round((hud.made / hud.shots) * 100) : 0;
  const saveText: Record<SaveState, string> = {
    idle: "",
    saving: "กำลังบันทึกแต้ม...",
    saved: `บวก ${hud.score} แต้มเข้าคะแนนสะสมของคุณแล้ว`,
    guest: "เข้าสู่ระบบเพื่อสะสมแต้มเข้าอันดับ",
    error: "บันทึกแต้มไม่สำเร็จ",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden overscroll-none bg-zinc-50 font-sans text-zinc-900" style={{ touchAction: "none" }}>
      <style>{`
        @keyframes bb-pop { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @keyframes bb-rise { from { opacity: 0; transform: translateY(20px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes bb-bump { 0% { transform: scale(1.35) } 100% { transform: scale(1) } }
        @keyframes bb-glow { 0% { opacity: .65; transform: scale(1) } 100% { opacity: 1; transform: scale(1.06) } }
        @keyframes bb-rise-fire { 0% { transform: translateY(14px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateY(-16px) scale(1.1); opacity: 0 } }
        @keyframes bb-intro { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes bb-go { 0% { transform: scale(.4); opacity: 0 } 25% { transform: scale(1.18); opacity: 1 } 65% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes bb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @media (prefers-reduced-motion: reduce) { .bb-anim, .bb-anim * { animation: none !important } }
      `}</style>

      <main className="h-full w-full">
        <div ref={wrapRef} className="flex h-full w-full items-center justify-center">
          <div className="relative overflow-hidden bg-zinc-50" style={{ width: dims.w, height: dims.h }}>
            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onContextMenu={(e) => e.preventDefault()}
              className="block touch-none select-none"
              style={{ width: dims.w, height: dims.h, cursor: "grab" }}
            />

            {/* HUD ขณะเล่น: ซ้อนบนจอเกม ไม่กินพื้นที่ (เว้นขอบ notch/แถบล่างของมือถือด้วย safe-area) */}
            {phase !== "over" && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
              >
                <div className="relative h-full w-full">
                  {/* หลอดเวลา มุมบนซ้าย */}
                  <div className="absolute left-3 top-3 w-36 sm:left-4 sm:top-4 sm:w-48">
                    <div className="rounded-2xl bg-white/90 px-3 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-zinc-500">เวลา</span>
                        <span className={`text-lg font-semibold leading-none tabular-nums ${timeLow ? "text-[#E8643C]" : "text-zinc-900"}`}>{timeLeft}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${timeLow ? "animate-pulse bg-[#F4806A]" : "bg-[#7FC8A9]"}`}
                          style={{ width: `${clamp(timeLeft / DURATION, 0, 1) * 100}%`, transition: "width 1s linear, background-color .3s" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ป้ายคะแนน มุมบนขวา */}
                  <div className="absolute right-3 top-3 flex flex-col items-end gap-1 sm:right-4 sm:top-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F4D35E] px-4 py-2 shadow-sm sm:px-5 sm:py-2.5">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" fill="#4A3700" aria-hidden>
                        <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" strokeLinejoin="round" />
                      </svg>
                      <span
                        key={hud.score}
                        className="text-2xl font-bold leading-none tabular-nums tracking-tight text-[#2E2300] sm:text-3xl"
                        style={{ animation: "bb-bump .35s ease-out" }}
                      >
                        {hud.score.toLocaleString("en-US")}
                      </span>
                    </div>
                    <span className="pr-2 text-xs font-semibold text-zinc-600" style={{ textShadow: "0 1px 0 rgba(255,255,255,.9)" }}>
                      เลเวล {hud.level}
                    </span>
                  </div>

                  {/* ตัวคูณคอมโบ มุมล่างขวา ไม่มีกรอบ ติดไฟเมื่อ onFire */}
                  <div className="absolute bottom-3 right-3 select-none text-right sm:bottom-5 sm:right-5">
                    <div className="relative inline-block px-4 pt-7">
                      {onFire && (
                        <>
                          {/* แสงเรืองด้านหลัง แยกเป็นอีกชั้น เพื่อไม่ให้ถูกตัดด้วยกรอบของตัวอักษร */}
                          <span
                            aria-hidden
                            className="absolute bottom-0 right-4 text-7xl font-black italic leading-[1.05] tracking-tighter text-[#FF7A1A] blur-md sm:text-8xl"
                            style={{ animation: "bb-glow .5s ease-in-out infinite alternate" }}
                          >
                            ×{nextMult}
                          </span>
                          <span className="absolute left-4 top-3 text-2xl" style={{ animation: "bb-rise-fire 1s ease-out infinite" }} aria-hidden>🔥</span>
                          <span className="absolute left-1/2 top-1 text-3xl" style={{ animation: "bb-rise-fire .85s .25s ease-out infinite" }} aria-hidden>🔥</span>
                          <span className="absolute right-5 top-3 text-2xl" style={{ animation: "bb-rise-fire 1.1s .5s ease-out infinite" }} aria-hidden>🔥</span>
                        </>
                      )}
                      <p
                        key={nextMult}
                        className={`relative px-3 py-1 text-7xl font-black italic leading-[1.05] tabular-nums tracking-tighter sm:text-8xl ${
                          onFire ? "bg-gradient-to-t from-[#FF4D2E] via-[#FF9A1F] to-[#FFE066] bg-clip-text text-transparent" : "text-zinc-900"
                        }`}
                        style={{
                          animation: "bb-bump .3s ease-out",
                          ...(onFire ? {} : { textShadow: "0 2px 0 rgba(255,255,255,.9), 0 0 12px rgba(255,255,255,.9)" }),
                        }}
                      >
                        ×{nextMult}
                      </p>
                    </div>
                    <p className={`-mt-1 pr-4 text-sm font-semibold ${onFire ? "text-[#FFB347]" : "text-zinc-500"}`}>
                      {onFire ? "ติดไฟ!" : `ติดกัน ${hud.streak}`}
                    </p>
                  </div>

                  {/* ปุ่มกลับ/เสียง ลอยมุมล่างซ้าย (กด M เพื่อเปิด/ปิดเสียงบนคอมได้) */}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <Link href="/#games" aria-label="กลับหน้าเกม" title="กลับ" className={BTN_ROUND}>←</Link>
                    <button onClick={toggleMute} aria-label={isMuted ? "เปิดเสียง" : "ปิดเสียง"} title="เปิด/ปิดเสียง (M)" className={BTN_ROUND}>
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* READY → GO!!! */}
            <div
              className={`pointer-events-none absolute inset-0 bg-[#190C28]/45 transition-opacity duration-500 ${intro === "ready" ? "opacity-100" : "opacity-0"}`}
            />
            {intro && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  key={intro}
                  style={{ animation: intro === "ready" ? "bb-intro .5s cubic-bezier(.2,1.3,.4,1) both" : "bb-go .9s ease-out both" }}
                >
                  <FireText
                    text={intro === "ready" ? "READY" : "GO!!!"}
                    size={intro === "ready" ? "text-6xl sm:text-8xl" : "text-7xl sm:text-9xl"}
                  />
                </div>
              </div>
            )}

            {/* ===== หน้าสรุปคะแนน: เต็มพอดีกรอบจอเกม ไม่ต้องเลื่อน (ย่อ/ขยายเนื้อหาตามขนาดกรอบ) ===== */}
            {over && (
              <div className="bb-anim absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7E9A8] via-white to-white">
                <div style={{ width: 340, transform: `scale(${Math.min((dims.h * 0.94) / 590, (dims.w * 0.94) / 340, 1.35)})` }} className="shrink-0">
                  <div className="text-center" style={{ animation: "bb-rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
                    <span className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${newRecord ? "bg-[#F4D35E]" : "bg-zinc-100 text-zinc-600"}`}>
                      {newRecord ? "🏆 สถิติใหม่!" : "หมดเวลา!"}
                    </span>

                    <div className="mt-4 flex items-end justify-center gap-1">
                      {STAR_AT.map((_, i) => (
                        <div key={i} className={i === 1 ? "-translate-y-2" : ""}>
                          <Star on={i < stars} delay={0.3 + i * 0.22} />
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-500">{RANKS[stars]}</p>

                    <div className="mt-4 rounded-3xl bg-[#F4D35E] px-4 py-5">
                      <p className="text-xs text-zinc-700">คะแนนรอบนี้</p>
                      <p className="text-7xl font-semibold leading-none tabular-nums tracking-tight">{shownScore}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl bg-[#B7CBB0]/60 py-3">
                        <p className="text-xl font-semibold tabular-nums">{hud.made}/{hud.shots}</p>
                        <p className="text-xs text-zinc-600">ลูกที่เข้า</p>
                      </div>
                      <div className="rounded-2xl bg-[#A8B5E8]/50 py-3">
                        <p className="text-xl font-semibold tabular-nums">{accuracy}%</p>
                        <p className="text-xs text-zinc-600">แม่นยำ</p>
                      </div>
                      <div className="rounded-2xl bg-[#F4A58A]/50 py-3">
                        <p className="text-xl font-semibold tabular-nums">{hud.swishes}</p>
                        <p className="text-xs text-zinc-600">SWISH</p>
                      </div>
                      <div className="rounded-2xl bg-[#F2994A]/40 py-3">
                        <p className="text-xl font-semibold tabular-nums">×{Math.min(MAX_MULT, hud.best)}</p>
                        <p className="text-xs text-zinc-600">คอมโบสูงสุด</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">สถิติสูงสุด {record}</p>
                    <p className="h-4 text-xs text-zinc-500">{saveText[saveState]}</p>

                    <button onClick={beginRound} className={`${BTN_MAIN} mt-4`}>เล่นอีกครั้ง</button>
                    <Link href="/rank" className={`${BTN_SUB} mt-3`}>ดูอันดับ</Link>
                    <Link href="/#games" className="mt-3 inline-block text-xs text-zinc-400 transition-colors hover:text-zinc-600">กลับหน้าหลัก</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}