"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

const GAME_ID = "com7quiz";
const TIME_PER_Q = 15; // วินาทีต่อข้อ
const BASE_POINT = 100; // คะแนนพื้นฐานต่อข้อที่ตอบถูก
const BONUS_PER_SEC = 5; // โบนัสต่อวินาทีที่เหลือ

const GREEN = "#17FFA2";
const GREEN_MID = "#0FD98A";
const GREEN_DEEP = "#0AB373";
const INK = "#04110a";
const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

type Raw = { tag: string; q: string; options: string[]; explain: string }; // options[0] คือคำตอบที่ถูก
type Question = { tag: string; q: string; options: string[]; answer: number; explain: string };
type Fx = { id: number; kind: "win" | "lose" | "timeout"; gain: number };

// ===== คำถามเกี่ยวกับบริษัท COM7 (ตัวเลือกแรกของแต่ละข้อคือคำตอบที่ถูก ระบบจะสลับลำดับให้เอง) =====
// ที่มา: ควิซ "รู้จัก COM7 แค่ไหน?" (COM7 E-SPORT FUN DAY) ข้อมูลอ้างอิงจาก comseven.com
const BANK: Raw[] = [
  { tag: "ประวัติบริษัท", q: "COM7 เริ่มต้นจากร้านขายสินค้าไอทีที่ห้างไหน?", options: ["พันธุ์ทิพย์ พลาซ่า", "มาบุญครอง", "ฟอร์จูนทาวน์", "ซีคอนสแควร์"], explain: "COM7 เริ่มต้นจากร้านขายสินค้าไอทีในพันธุ์ทิพย์ พลาซ่า" },
  { tag: "ประวัติบริษัท", q: "ร้านแรกของ COM7 เปิดในปีไหน?", options: ["1996", "1992", "2000", "2004"], explain: "ร้านแรกของ COM7 เปิดในปี 1996" },
  { tag: "ประวัติบริษัท", q: "บริษัทจดทะเบียนก่อตั้งอย่างเป็นทางการวันที่เท่าไหร่?", options: ["27 ก.พ. 2004", "1 ม.ค. 2004", "7 ก.ค. 2007", "27 ก.พ. 1996"], explain: "บริษัทก่อตั้งอย่างเป็นทางการเมื่อวันที่ 27 กุมภาพันธ์ 2004" },
  { tag: "ประวัติบริษัท", q: "ตอนก่อตั้งบริษัท ธุรกิจหลักของ COM7 คืออะไร?", options: ["ค้าส่งสินค้าไอทีให้ร้านค้าทั่วประเทศ", "ร้านค้าปลีกในห้าง", "ศูนย์ซ่อม", "ขายออนไลน์"], explain: "ช่วงแรกของบริษัทเน้นค้าส่งสินค้าไอทีให้ร้านค้าทั่วประเทศ" },
  { tag: "ธุรกิจ", q: "ข้อไหน \"ไม่ใช่\" ธุรกิจของ COM7?", options: ["ผลิตสมาร์ตโฟนแบรนด์ของตัวเอง", "ขายปลีกสินค้าไอทีผ่านหน้าร้าน", "ขายสินค้าให้บริษัทและสถานศึกษา", "ศูนย์ซ่อมและบริการ"], explain: "COM7 เป็นผู้ค้าปลีก ไม่ได้ผลิตสมาร์ตโฟนเอง" },
  { tag: "ผู้บริหาร", q: "CEO ของ COM7 คือใคร?", options: ["คุณสุระ คณิตทวีกุล", "คุณณรงค์ ศรีวรรณวิทย์", "คุณคงศักดิ์ บรรณสถิตย์กุล", "คุณภาคภูมิ สตะรัต"], explain: "คุณสุระ คนิทวีกุล ดำรงตำแหน่งประธานเจ้าหน้าที่บริหาร (CEO)" },
  { tag: "บริการ", q: "\"iCare\" ให้บริการอะไร?", options: ["ศูนย์ซ่อมและบริการสินค้า Apple", "ประกันสุขภาพ", "ร้านขายแว่นตา", "แอปดูแลสัตว์เลี้ยง"], explain: "iCare คือศูนย์ซ่อมและบริการสินค้า Apple" },
  { tag: "บริษัทในเครือ", q: "บริษัทในเครือไหนดูแลร้าน \"TRUE by COM7\"?", options: ["Double 7", "Adept", "Prime Solution", "Novus Integration"], explain: "ร้าน TRUE by COM7 ดูแลโดยบริษัท ดับเบิ้ลเซเว่น จำกัด (Double 7)" },
  { tag: "บริษัทในเครือ", q: "\"See Know How\" (SKH) ในเครือ COM7 ทำอะไร?", options: ["ศูนย์เรียนรู้และอบรมพนักงานในเครือ", "ทำคอนเทนต์รีวิวสินค้า", "บริษัทที่ปรึกษา", "ร้านขายหนังสือ"], explain: "SKH คือศูนย์การเรียนรู้และอบรมพนักงานในเครือ COM7" },
  { tag: "บริษัทในเครือ", q: "บริษัท 4 Paws (โฟร์พอส์) ขายอะไร?", options: ["อาหารสัตว์เลี้ยงและอุปกรณ์", "รองเท้า", "อุปกรณ์กีฬา", "ของเล่นเด็ก"], explain: "4 Paws ทำธุรกิจอาหารและอุปกรณ์สำหรับสัตว์เลี้ยง" },
  { tag: "บริการ", q: "\"Ufund\" คืออะไร?", options: ["บริการผ่อนสินค้าไอทีให้นักศึกษา โดยไม่ต้องใช้บัตรเครดิต", "กองทุนสำรองเลี้ยงชีพ", "แอปลงทุนหุ้น", "ประกันมือถือ"], explain: "Ufund คือบริการผ่อนสินค้าไอทีสำหรับนักศึกษา โดยไม่ต้องใช้บัตรเครดิต" },
  { tag: "บริการ", q: "โครงการ Ufund เริ่มในปีไหน?", options: ["2020", "2015", "2018", "2023"], explain: "โครงการ Ufund เริ่มต้นในปี 2020" },
  { tag: "แบรนด์ร้าน", q: "ข้อไหน \"ไม่ใช่\" แบรนด์ร้านของ COM7?", options: ["Power Buy", "BaNANA", "Studio7", "KingKong Phone"], explain: "Power Buy ไม่ใช่แบรนด์ของ COM7" },
  { tag: "ธุรกิจใหม่", q: "ธุรกิจใหม่ข้อไหนที่ COM7 ขยายเข้าไปแล้ว?", options: ["ตัวแทนจำหน่ายรถไฟฟ้า (EV) และโซลาร์เซลล์", "สายการบิน", "โรงภาพยนตร์", "ร้านกาแฟ"], explain: "COM7 ขยายสู่ธุรกิจรถยนต์ไฟฟ้า (EV) และพลังงานแสงอาทิตย์ (โซลาร์เซลล์)" },
  { tag: "ตลาดหลักทรัพย์", q: "หุ้น COM7 ซื้อขายอยู่ในตลาดไหน?", options: ["ตลาดหลักทรัพย์แห่งประเทศไทย (SET)", "ตลาด mai", "NASDAQ (สหรัฐฯ)", "ตลาดหลักทรัพย์สิงคโปร์ (SGX)"], explain: "COM7 จดทะเบียนในตลาดหลักทรัพย์แห่งประเทศไทย (SET)" },
];

const TOTAL = BANK.length; // 15 ข้อ ออกครบทุกข้อทุกรอบ

type Player = { id: string; name: string };

// อ่านบัญชีที่ล็อกอินอยู่ ณ ตอนนี้ (ใช้ตอนกดเริ่มเล่น เพื่อจดว่าใครคือคนเล่นรอบนี้)
function getStoredPlayer(): Player | null {
  try {
    const v = localStorage.getItem("profile");
    if (!v) return null;
    const p = JSON.parse(v);
    const id = p?.userId || p?.id || p?._id;
    return id ? { id: String(id), name: p?.name || "ผู้เล่น" } : null;
  } catch {
    return null;
  }
}

// จดแต้มที่เพิ่มขึ้นจริงจากเกมนี้ไว้ ให้ Navbar แสดง +N ตรงกับที่ได้รับ
function addPendingGain(userId: string, gain: number) {
  try {
    const key = `scoreGain:${userId}`;
    localStorage.setItem(key, String((Number(localStorage.getItem(key)) || 0) + gain));
  } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// สลับลำดับข้อและลำดับตัวเลือกทุกรอบ (กันเพื่อนข้างๆ ลอกคำตอบ)
function buildRound(): Question[] {
  return shuffle(BANK).map((r) => {
    const options = shuffle(r.options);
    return { tag: r.tag, q: r.q, options, answer: options.indexOf(r.options[0]), explain: r.explain };
  });
}

const WIN_MSG = ["รู้จัก COM7 จริง!", "เลือดเขียวแท้", "แม่นมาก!", "ใช่เลย!"];
const LOSE_MSG = ["เกือบไปแล้วนะ", "ข้อนี้ต้องจำไว้", "พลาดนิดเดียว", "ไว้แก้มือรอบหน้า"];
const TIMEOUT_MSG = "หมดเวลาซะแล้ว";

function rating(correct: number) {
  if (correct >= 14) return "เลือดเขียว COM7 แท้ๆ";
  if (correct >= 10) return "รู้จัก COM7 ดีเยี่ยม";
  if (correct >= 6) return "เริ่มคุ้นเคยกับ COM7";
  return "ต้องไปเดินดูร้าน COM7 เพิ่มแล้ว";
}

// คำชมตามคอมโบ
function streakLabel(n: number) {
  if (n >= 8) return "COM7 เต็มสิบ!";
  if (n >= 5) return "ไฟลุกแล้ว!";
  if (n >= 2) return "คอมโบ";
  return "";
}

// ทำให้คำว่า "ไม่ใช่" ในโจทย์เด่นขึ้น กันอ่านพลาด
function renderQuestion(text: string) {
  return text.split(/(ไม่ใช่)/g).map((part, i) =>
    part === "ไม่ใช่" ? (
      <span key={i} className="mx-1 inline-block -skew-x-6 bg-[#ff2a55] px-2 text-white">
        ไม่ใช่
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ===== พื้นหลังลอยๆ (ตำแหน่งตายตัว กัน hydration mismatch) =====
const GLYPHS = [
  { c: "7", l: "6%", t: "14%", s: 7, d: 0, du: 9 },
  { c: "?", l: "86%", t: "10%", s: 5, d: 1.2, du: 11 },
  { c: "C7", l: "14%", t: "72%", s: 6, d: 0.6, du: 13 },
  { c: "7", l: "78%", t: "66%", s: 9, d: 2, du: 10 },
  { c: "✓", l: "46%", t: "6%", s: 4, d: 3, du: 12 },
  { c: "?", l: "92%", t: "40%", s: 6, d: 1.8, du: 14 },
  { c: "7", l: "3%", t: "44%", s: 5, d: 2.6, du: 9 },
  { c: "C7", l: "58%", t: "84%", s: 5, d: 0.3, du: 11 },
  { c: "?", l: "30%", t: "30%", s: 4, d: 3.6, du: 15 },
  { c: "✓", l: "68%", t: "26%", s: 4, d: 1, du: 12 },
];

const CONFETTI_COLORS = [GREEN, GREEN_MID, GREEN_DEEP, "#FFFFFF", "#F4D35E", "#B7F5DB"];

// ระเบิดคอนเฟตติตรงกลางจอ
function Burst({ count, power = 1 }: { count: number; power?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const dist = (140 + Math.random() * 220) * power;
        return {
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist - 80 * power,
          rot: Math.round(Math.random() * 720 - 360),
          w: 6 + Math.round(Math.random() * 8),
          h: 8 + Math.round(Math.random() * 10),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.round(Math.random() * 120),
          round: Math.random() > 0.6,
        };
      }),
    [count, power],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed left-1/2 top-[38%] z-40 h-0 w-0">
      {parts.map((p, i) => (
        <span
          key={i}
          className="fx-burst absolute block"
          style={
            {
              width: p.w,
              height: p.round ? p.w : p.h,
              backgroundColor: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ปุ่มเอียงแบบเดียวกับหน้าหลัก
const btnBase =
  "relative inline-flex min-h-[48px] items-center justify-center overflow-hidden px-7 py-3 text-sm font-bold uppercase tracking-wider transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50";
const btnSolid = `${btnBase} bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]`;
const btnOutline = `${btnBase} border border-[#17FFA2]/50 bg-[#17FFA2]/10 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a]`;

export default function Com7QuizPage() {
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = หมดเวลา
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<boolean[]>([]); // ผลรายข้อ ใช้โชว์ตอนจบ
  const [fx, setFx] = useState<Fx | null>(null); // เอฟเฟกต์ของข้อปัจจุบัน
  const [shown, setShown] = useState(0); // แต้มที่แสดง (นับขึ้นแบบแอนิเมชัน)
  const shownRef = useRef(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");
  const [gameTotal, setGameTotal] = useState<number | null>(null); // แต้มสะสมของเกมนี้ทั้งหมด
  const savedRound = useRef(false); // กันบันทึกซ้ำในรอบเดียว (แต้มสะสมถ้าบันทึกซ้ำจะบวกเบิ้ล)
  const explainRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<Player | null>(null); // บัญชีที่เริ่มเล่นรอบนี้

  function start() {
    setPlayer(getStoredPlayer()); // จดบัญชีตอนเริ่มเล่น ไม่ไปอ่านใหม่ตอนจบเกม
    setQs(buildRound());
    setIdx(0);
    setPicked(null);
    setTimeLeft(TIME_PER_Q);
    setScore(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setResults([]);
    setFx(null);
    shownRef.current = 0;
    setShown(0);
    setGameTotal(null);
    savedRound.current = false;
    setSaveState("idle");
    setPhase("play");
  }

  function choose(i: number) {
    if (phase !== "play" || picked !== null) return;
    setPicked(i);
    if (i === qs[idx].answer) {
      const gain = BASE_POINT + timeLeft * BONUS_PER_SEC;
      setScore((s) => s + gain);
      setCorrect((c) => c + 1);
      setResults((r) => [...r, true]);
      setStreak((s) => {
        const n = s + 1;
        setBestStreak((b) => Math.max(b, n));
        return n;
      });
      setFx({ id: Date.now(), kind: "win", gain });
    } else {
      setStreak(0);
      setResults((r) => [...r, false]);
      setFx({ id: Date.now(), kind: "lose", gain: 0 });
    }
  }

  function next() {
    if (idx + 1 >= TOTAL) {
      setPhase("end");
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
    setFx(null);
    setTimeLeft(TIME_PER_Q);
  }

  // นับเวลาถอยหลังต่อข้อ
  useEffect(() => {
    if (phase !== "play" || picked !== null) return;
    if (timeLeft <= 0) {
      setPicked(-1);
      setStreak(0);
      setResults((r) => [...r, false]);
      setFx({ id: Date.now(), kind: "timeout", gain: 0 });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, picked, timeLeft]);

  // มือถือ: ขึ้นข้อใหม่เลื่อนกลับบนสุด / เฉลยแล้วเลื่อนให้เห็นคำอธิบายและปุ่มถัดไป
  useEffect(() => {
    if (phase === "play") window.scrollTo({ top: 0 });
  }, [phase, idx]);
  useEffect(() => {
    if (picked !== null) explainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [picked]);

  // นับแต้มขึ้นแบบแอนิเมชัน
  useEffect(() => {
    const from = shownRef.current;
    const to = score;
    if (from === to) return;
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // คีย์ลัด: 1-4 เลือกคำตอบ, Enter ไปข้อถัดไป / เริ่มเล่น
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "intro" && e.key === "Enter") {
        e.preventDefault();
        return start();
      }
      if (phase !== "play") return;
      if (picked === null && ["1", "2", "3", "4"].includes(e.key)) choose(Number(e.key) - 1);
      else if (picked !== null && e.key === "Enter") {
        e.preventDefault(); // กันปุ่มที่โฟกัสอยู่ถูกกดซ้ำจนข้ามข้อ
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // บันทึกแต้มเมื่อจบเกม: แต้มของทุกรอบ "สะสม" บวกเข้าไปเรื่อยๆ
  // (บันทึกให้บัญชีที่เริ่มเล่น ไม่ใช่บัญชีที่ล็อกอินล่าสุดในเบราว์เซอร์)
  useEffect(() => {
    if (phase !== "end") return;
    if (!player) {
      setSaveState("guest");
      return;
    }
    if (savedRound.current) return;
    savedRound.current = true;

    (async () => {
      setSaveState("saving");
      try {
        // ส่งแค่แต้มของรอบนี้ ฝั่ง API จะ $inc เข้า gameScores.com7quiz ให้เอง (บวกสะสม ไม่ทับของเดิม)
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: player.id, gameKey: GAME_ID, score }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok || !result?.success) {
          throw new Error(result?.message || result?.error || `PATCH failed: ${res.status}`);
        }
        // แต้มสะสมของเกมนี้หลังบวกแล้ว (API ส่งเอกสารผู้ใช้ที่อัปเดตแล้วกลับมา)
        const total = Number(result.data?.gameScores?.[GAME_ID]);
        if (Number.isFinite(total)) setGameTotal(total);
        if (score > 0) addPendingGain(player.id, score); // ให้ Navbar โชว์ +N เท่ากับแต้มรอบนี้
        setSaveState("saved");
      } catch (err) {
        console.error("Failed to save score:", err);
        setSaveErr(err instanceof Error ? err.message : String(err));
        setSaveState("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const q = qs[idx];
  // ระหว่างบันทึกคะแนน ห้ามออกจากหน้า ไม่งั้นหน้าแรกจะโหลดคะแนนเก่ามาแสดง
  const lockNav = phase === "end" && (saveState === "idle" || saveState === "saving");
  const lockProps = {
    "aria-disabled": lockNav,
    onClick: (e: MouseEvent) => {
      if (lockNav) e.preventDefault();
    },
  };
  const lockCls = lockNav ? " pointer-events-none opacity-50" : "";
  const revealed = picked !== null;
  const isRight = revealed && q && picked === q.answer;
  const playing = phase === "play";
  const panic = playing && !revealed && timeLeft <= 5;

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col items-center overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes burst {
          0% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(.4); }
          70% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) + 120px)) rotate(var(--rot)) scale(1); }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translate(-50%, 20px) scale(.5); }
          18% { opacity: 1; transform: translate(-50%, -10px) scale(1.25); }
          35% { transform: translate(-50%, -20px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150px) scale(1); }
        }
        @keyframes flash { 0% { opacity: .5; } 100% { opacity: 0; } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-12px) rotate(-.6deg); }
          30% { transform: translateX(10px) rotate(.5deg); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(6px); }
          80% { transform: translateX(-3px); }
        }
        @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.22); } 100% { transform: scale(1); } }
        @keyframes ring { 0% { opacity: .9; transform: scale(.6); } 100% { opacity: 0; transform: scale(1.5); } }
        @keyframes drift {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-28px) rotate(8deg); }
        }
        @keyframes panic { 0%,100% { opacity: .15; } 50% { opacity: .55; } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 rgba(23,255,162,0); } 50% { box-shadow: 0 0 0 10px rgba(23,255,162,.35), 0 0 36px rgba(23,255,162,.7); } }
        @keyframes sweep { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .btn-fx .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
        .btn-fx:hover .btn-shine { transform: translateX(120%); }
        .fx-burst { animation: burst 1100ms cubic-bezier(.15,.7,.3,1) both; }
        .fx-float { animation: floatUp 1300ms cubic-bezier(.2,.8,.2,1) both; }
        .fx-flash { animation: flash 700ms ease-out both; }
        .fx-shake { animation: shake 450ms ease-in-out both; }
        .fx-pop { animation: pop 420ms cubic-bezier(.2,.9,.3,1.4) both; }
        .fx-ring { animation: ring 700ms ease-out both; }
        .fx-drift { animation: drift var(--du, 10s) ease-in-out var(--dl, 0s) infinite; }
        .fx-panic { animation: panic 800ms ease-in-out infinite; }
        .fx-glow { animation: glow 900ms ease-in-out 2; }
        .fx-sweep { animation: sweep 2.4s ease-in-out infinite; }
        .fx-marquee { animation: marquee 40s linear infinite; will-change: transform; }
        .txt-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.16); }
        @media (prefers-reduced-motion: reduce) {
          .rise, .fx-burst, .fx-float, .fx-flash, .fx-shake, .fx-pop, .fx-ring, .fx-drift, .fx-panic, .fx-glow, .fx-sweep, .fx-marquee { animation: none !important; }
          .fx-burst, .fx-float { display: none; }
        }
      `}</style>

      {/* ===== พื้นหลังเต็มจอ ===== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: playing
              ? "radial-gradient(circle at 85% 0%, rgba(23,255,162,0.22), transparent 50%), radial-gradient(circle at 0% 100%, rgba(15,217,138,0.16), transparent 45%)"
              : "radial-gradient(circle at 85% 0%, rgba(23,255,162,0.16), transparent 50%), radial-gradient(circle at 0% 100%, rgba(23,255,162,0.1), transparent 45%)",
          }}
        />
        {/* ตัวอักษรใหญ่จางๆ วิ่งช้าๆ ด้านหลัง */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden whitespace-nowrap">
          <div className="fx-marquee txt-outline flex w-max text-[clamp(6rem,22vw,16rem)] font-black uppercase leading-none">
            {[0, 1].map((g) => (
              <div key={g} className="flex shrink-0 gap-[0.4em] pr-[0.4em]">
                {Array.from({ length: 4 }).map((_, j) => (
                  <span key={j}>COM7 QUIZ</span>
                ))}
              </div>
            ))}
          </div>
        </div>
        {GLYPHS.map((g, i) => (
          <span
            key={i}
            className="fx-drift absolute select-none font-black leading-none text-[#17FFA2] opacity-[.07]"
            style={
              {
                left: g.l,
                top: g.t,
                fontSize: `${g.s}rem`,
                "--du": `${g.du}s`,
                "--dl": `${g.d}s`,
              } as React.CSSProperties
            }
          >
            {g.c}
          </span>
        ))}
        {/* เวลาใกล้หมด: ขอบจอกะพริบแดง */}
        {playing && panic && (
          <div className="fx-panic absolute inset-0" style={{ boxShadow: "inset 0 0 160px 30px rgba(255,42,85,.8)" }} />
        )}
        {/* วาบสีตามผลคำตอบ */}
        {playing && fx && (
          <div
            key={fx.id}
            className="fx-flash absolute inset-0"
            style={{ backgroundColor: fx.kind === "win" ? GREEN : fx.kind === "lose" ? RED : "#71717A" }}
          />
        )}
      </div>

      {/* ===== เอฟเฟกต์ตอบถูก: คอนเฟตติ + แต้มลอยขึ้น ===== */}
      {playing && fx?.kind === "win" && (
        <>
          <Burst key={`b${fx.id}`} count={fx.gain >= 160 ? 44 : 30} power={fx.gain >= 160 ? 1.2 : 1} />
          <div aria-hidden className="pointer-events-none fixed left-1/2 top-[38%] z-40">
            <span className="fx-ring absolute -left-24 -top-24 block h-48 w-48 rounded-full border-4 border-[#17FFA2]" />
          </div>
          <div key={`f${fx.id}`} aria-hidden className="fx-float pointer-events-none fixed left-1/2 top-[34%] z-50 text-center">
            <p
              className="text-6xl font-black tabular-nums tracking-tight text-[#17FFA2] sm:text-7xl md:text-8xl"
              style={{ textShadow: "0 4px 0 #04110a, 0 0 32px rgba(23,255,162,.9)" }}
            >
              +{fx.gain}
            </p>
            {streak >= 2 && (
              <p className="mt-1 text-xl font-bold text-white" style={{ textShadow: "0 2px 0 #04110a, 0 0 18px rgba(23,255,162,.8)" }}>
                {streakLabel(streak)} ×{streak}
              </p>
            )}
          </div>
        </>
      )}

      {/* ตอบผิด / หมดเวลา: ข้อความสั้นๆ เด้งกลางจอ */}
      {playing && fx && fx.kind !== "win" && (
        <div key={`l${fx.id}`} aria-hidden className="fx-float pointer-events-none fixed left-1/2 top-[34%] z-50 text-center">
          <p
            className="whitespace-nowrap text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl"
            style={{ textShadow: "0 4px 0 #ff2a55, 0 0 28px rgba(255,42,85,.7)" }}
          >
            {fx.kind === "lose" ? "✕ พลาด" : "⏱ หมดเวลา"}
          </p>
        </div>
      )}

      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        {/* โลโก้ขยายด้วย scale จึงไม่ดันส่วนอื่น (มือถือขยายน้อยกว่าเพื่อไม่ชนปุ่มกลับ) */}
        <Link href="/" aria-label="COM7 หน้าแรก" className={`flex items-center${lockCls}`} {...lockProps}>
          <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto origin-left scale-[1.7] sm:scale-[2.3]" />
        </Link>
        <Link
          href="/"
          className={`flex min-h-[44px] items-center border border-[#17FFA2]/50 bg-[#17FFA2]/10 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[#17FFA2] hover:text-[#04110a] sm:px-5 sm:text-sm${lockCls}`}
          {...lockProps}
        >
          กลับหน้าแรก
        </Link>
      </header>

      <main className="relative z-10 w-full max-w-3xl px-4 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-24">
        {/* ===== หน้าเริ่มเกม ===== */}
        {phase === "intro" && (
          <div className="rise" style={{ animation: "rise 500ms both cubic-bezier(.2,.8,.2,1)" }}>
            <section
              className="relative mt-4 overflow-hidden border border-[#17FFA2]/50 p-6 shadow-[6px_6px_0_0_#0AB373] sm:mt-6 sm:p-8 sm:shadow-[10px_10px_0_0_#0AB373] md:p-12"
              style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_MID} 55%, ${GREEN_DEEP} 100%)`, color: INK }}
            >
              <span aria-hidden className="absolute -right-4 -top-12 select-none text-[14rem] font-black leading-none opacity-[.16] md:text-[20rem]">7</span>
              <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(0,0,0,0.06)_18px_36px)]" />
              <p className="relative text-sm font-semibold opacity-75">ความรู้ · ประมาณ 3 นาที</p>
              <span className="relative mt-4 block h-1.5 w-16 -skew-x-12 bg-[#04110a]" />
              <h1 className="relative mt-4 text-4xl font-black uppercase leading-[1.1] tracking-tight sm:text-5xl md:text-7xl">
                รู้จัก COM7
                <br />
                แค่ไหน?
              </h1>
              <p className="relative mt-5 max-w-md text-base font-medium leading-7 opacity-85 sm:text-lg sm:leading-8">
                {TOTAL} ข้อ คำถามเกี่ยวกับบริษัทของเรา ตั้งแต่ร้านแรกจนถึงธุรกิจใหม่ ตอบให้ไวและแม่น แล้วดูว่าคุณเลือดเขียวแค่ไหน
              </p>
              <button onClick={start} className="btn-fx relative mt-8 inline-flex h-14 items-center overflow-hidden bg-[#04110a] px-9 text-base font-bold uppercase tracking-wider text-[#17FFA2] transition-all hover:bg-black hover:shadow-[0_0_30px_rgba(0,0,0,.5)] active:scale-95">
                <span className="btn-shine" aria-hidden="true" />
                <span className="relative">เริ่มเล่น</span>
              </button>
            </section>

            <section className="mt-4 grid grid-cols-3 gap-3">
              {[
                [`${TOTAL}`, "คำถาม"],
                [`${TIME_PER_Q} วิ`, "ต่อข้อ"],
                [`${(BASE_POINT + TIME_PER_Q * BONUS_PER_SEC) * TOTAL}`, "แต้มสูงสุด"],
              ].map(([n, l]) => (
                <div key={l} className="border border-white/10 bg-[#0a1014]/90 px-3 py-5 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_18px_rgba(23,255,162,0.5)] md:text-3xl">{n}</p>
                  <p className={`mt-1 text-sm ${MUTED}`}>{l}</p>
                </div>
              ))}
            </section>

            <section className="mt-4 border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-5 backdrop-blur-sm sm:p-8">
              <h2 className="text-xl font-bold uppercase tracking-wide">กติกา</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {[
                  `คำถามเกี่ยวกับ COM7 ทั้งหมด ${TOTAL} ข้อ แต่ละข้อมี 4 ตัวเลือกและเวลา ${TIME_PER_Q} วินาที`,
                  "ลำดับข้อและลำดับตัวเลือกถูกสุ่มใหม่ทุกรอบ",
                  `ตอบถูกได้ ${BASE_POINT} แต้ม บวกโบนัส ${BONUS_PER_SEC} แต้มต่อทุกวินาทีที่เหลือ`,
                  "ตอบถูกติดกันหลายข้อจะได้เอฟเฟกต์คอมโบสุดเดือด",
                  "ตอบผิดหรือหมดเวลาไม่ได้แต้ม แต่จะเฉลยให้ทุกข้อ",
                  "กดปุ่ม 1–4 บนคีย์บอร์ดเพื่อเลือกคำตอบ และกด Enter เพื่อไปข้อถัดไป",
                  "แต้มของทุกรอบที่เล่นจบจะสะสมเข้าคะแนนรวมของคุณ ยิ่งเล่นยิ่งเพิ่ม",
                ].map((r) => (
                  <li key={r} className="flex gap-3 text-base leading-7 text-white/75">
                    <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rotate-45 bg-[#17FFA2]" />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ===== กำลังเล่น ===== */}
        {phase === "play" && q && (
          <div className={`mt-2 ${fx?.kind === "lose" ? "fx-shake" : ""}`}>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <p className="whitespace-nowrap border border-white/15 bg-[#0a1014]/90 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">
                ข้อ <span className="font-bold tabular-nums text-[#17FFA2]">{idx + 1}</span> / {TOTAL}
              </p>

              {streak >= 2 && (
                <p key={streak} className="fx-pop min-w-0 -skew-x-6 truncate bg-[#17FFA2] px-3 py-1.5 text-xs font-black text-[#04110a] shadow-[0_0_18px_rgba(23,255,162,0.6)] sm:px-4 sm:py-2 sm:text-sm">
                  {streakLabel(streak)} ×{streak}
                </p>
              )}

              <p
                key={score}
                className={`whitespace-nowrap border border-[#17FFA2]/40 bg-[#0a1014]/90 px-3 py-1.5 text-xs font-bold tabular-nums text-[#17FFA2] sm:px-4 sm:py-2 sm:text-sm ${score > 0 ? "fx-pop" : ""}`}
              >
                {shown.toLocaleString()} <span className="font-medium text-white/50">แต้ม</span>
              </p>
            </div>

            <div className="mt-3 flex gap-0.5 sm:mt-4 sm:gap-1" aria-hidden>
              {Array.from({ length: TOTAL }).map((_, i) => {
                const done = i < idx || (i === idx && revealed);
                const ok = results[i];
                return (
                  <span
                    key={i}
                    className={`h-2 flex-1 -skew-x-12 transition-colors ${
                      done ? (ok ? "bg-[#17FFA2] shadow-[0_0_8px_#17FFA2]" : "bg-[#ff2a55]") : i === idx ? "bg-white" : "bg-white/15"
                    }`}
                  />
                );
              })}
            </div>

            <div
              key={idx}
              className="rise relative mt-4 overflow-hidden border border-[#17FFA2]/40 bg-[#0a1014]/95 p-5 shadow-[5px_5px_0_0_#0AB373] sm:mt-6 sm:p-8 sm:shadow-[8px_8px_0_0_#0AB373] md:p-10"
              style={{ animation: "rise 400ms both cubic-bezier(.2,.8,.2,1)" }}
            >
              <span aria-hidden className="pointer-events-none absolute -right-3 -top-8 select-none text-[9rem] font-black leading-none text-[#17FFA2] opacity-[.07]">7</span>
              <div className="relative flex items-center justify-between gap-4">
                <span className="-skew-x-6 bg-[#17FFA2] px-3 py-1 text-xs font-bold text-[#04110a]">{q.tag}</span>
                <span
                  className={`flex items-center gap-2 text-sm font-bold tabular-nums ${panic ? "text-[#ff6b86]" : "text-[#17FFA2]"}`}
                  role="timer"
                  aria-label={`เหลือเวลา ${timeLeft} วินาที`}
                >
                  {timeLeft} วิ
                </span>
              </div>
              <div className="relative mt-4 h-2 overflow-hidden bg-white/15" aria-hidden>
                <div
                  className="relative h-full"
                  style={{
                    width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                    backgroundColor: timeLeft <= 5 ? RED : GREEN,
                    boxShadow: `0 0 12px ${timeLeft <= 5 ? RED : GREEN}`,
                    transition: "width 1s linear, background-color 300ms",
                  }}
                >
                  {!revealed && <span className="fx-sweep absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />}
                </div>
              </div>
              <h1 className="relative mt-4 break-words text-xl font-bold leading-snug tracking-tight sm:mt-6 sm:text-2xl md:text-3xl">{renderQuestion(q.q)}</h1>
            </div>

            <ol className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:gap-3">
              {q.options.map((opt, i) => {
                const isAns = revealed && i === q.answer;
                const isWrongPick = revealed && i === picked && i !== q.answer;
                const state = !revealed
                  ? "border-white/15 bg-[#0a1014]/90 hover:-translate-y-0.5 hover:border-[#17FFA2] hover:bg-[#0f1a1f] hover:shadow-[0_0_22px_rgba(23,255,162,0.25)] active:scale-[.98]"
                  : isAns
                    ? "scale-[1.02] border-[#17FFA2] bg-[#17FFA2] text-[#04110a]"
                    : isWrongPick
                      ? "border-[#ff2a55] bg-[#ff2a55] text-white"
                      : "border-white/10 bg-[#0a1014]/60 opacity-50";
                return (
                  <li key={i}>
                    <button
                      onClick={() => choose(i)}
                      disabled={revealed}
                      className={`flex min-h-[56px] w-full items-center gap-3 border p-2.5 pr-4 text-left text-base font-medium leading-snug outline-none sm:gap-4 sm:p-3 sm:pr-6 sm:text-lg transition-all duration-200 focus-visible:ring-4 focus-visible:ring-[#17FFA2] ${state} ${isAns ? "fx-glow" : ""} ${revealed ? "cursor-default" : ""}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center text-base font-black sm:h-12 sm:w-12 ${
                          isAns ? "bg-[#04110a] text-[#17FFA2]" : isWrongPick ? "bg-white text-[#ff2a55]" : "bg-[#17FFA2]/15 text-[#17FFA2]"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isAns && <span aria-hidden className="fx-pop text-xl font-black">✓</span>}
                      {isWrongPick && <span aria-hidden className="fx-pop text-xl font-black">✕</span>}
                    </button>
                  </li>
                );
              })}
            </ol>

            {revealed && (
              <div
                ref={explainRef}
                aria-live="polite"
                className="rise mt-3 scroll-mb-4 border-l-4 bg-[#0a1014]/95 p-5 backdrop-blur sm:mt-4 sm:p-6 md:p-8"
                style={{ animation: "rise 300ms both cubic-bezier(.2,.8,.2,1)", borderColor: isRight ? GREEN : RED }}
              >
                <p className={`text-xl font-bold tracking-tight ${isRight ? "text-[#17FFA2]" : picked === -1 ? "text-white" : "text-[#ff6b86]"}`}>
                  {picked === -1
                    ? TIMEOUT_MSG
                    : isRight
                      ? `${WIN_MSG[idx % WIN_MSG.length]} +${fx?.gain ?? 0} แต้ม`
                      : LOSE_MSG[idx % LOSE_MSG.length]}
                </p>
                <p className="mt-2 text-base leading-7 text-white/75">{q.explain}</p>
                <button onClick={next} className={`btn-fx mt-5 w-full sm:mt-6 sm:w-auto ${btnSolid}`}>
                  <span className="btn-shine" aria-hidden="true" />
                  <span className="relative">{idx + 1 >= TOTAL ? "ดูผลคะแนน" : "ข้อถัดไป"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== สรุปผล ===== */}
        {phase === "end" && (
          <div className="rise" style={{ animation: "rise 500ms both cubic-bezier(.2,.8,.2,1)" }}>
            {correct >= 10 && <Burst count={60} power={1.5} />}

            <section
              className="relative mt-4 overflow-hidden border border-[#17FFA2]/50 p-6 text-center shadow-[6px_6px_0_0_#0AB373] sm:mt-6 sm:p-8 sm:shadow-[10px_10px_0_0_#0AB373] md:p-12"
              style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_MID} 55%, ${GREEN_DEEP} 100%)`, color: INK }}
            >
              <span aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,rgba(0,0,0,0.06)_18px_36px)]" />
              <p className="relative text-lg font-bold">{rating(correct)}</p>
              <p className="fx-pop relative mt-2 text-7xl font-black tabular-nums tracking-tight sm:text-8xl md:text-9xl">{score.toLocaleString()}</p>
              <p className="relative mt-1 text-sm font-semibold opacity-75">แต้มรอบนี้</p>
            </section>

            <section className="mt-4 grid grid-cols-3 gap-3">
              {[
                [`${correct}/${TOTAL}`, "ตอบถูก"],
                [`×${bestStreak}`, "คอมโบสูงสุด"],
                [gameTotal !== null ? gameTotal.toLocaleString() : "–", "แต้มสะสมเกมนี้"],
              ].map(([n, l]) => (
                <div key={l} className="border border-white/10 bg-[#0a1014]/90 px-2 py-5 text-center backdrop-blur-sm sm:px-3 sm:py-6">
                  <p className="text-2xl font-bold tabular-nums tracking-tight text-[#17FFA2] [text-shadow:0_0_18px_rgba(23,255,162,0.5)] sm:text-3xl md:text-4xl">{n}</p>
                  <p className={`mt-1 text-xs sm:text-sm ${MUTED}`}>{l}</p>
                </div>
              ))}
            </section>

            {/* ผลรายข้อ */}
            <section className="mt-4 border border-white/10 bg-[#0a1014]/90 p-5 backdrop-blur-sm">
              <p className={`text-sm ${MUTED}`}>ผลรายข้อ</p>
              <div className="mt-3 flex flex-wrap gap-2" aria-label="ผลรายข้อ">
                {qs.map((_, i) => (
                  <span
                    key={i}
                    className={`flex h-9 w-9 -skew-x-6 items-center justify-center text-xs font-black ${
                      results[i] ? "bg-[#17FFA2] text-[#04110a]" : "bg-[#ff2a55] text-white"
                    }`}
                    title={results[i] ? "ถูก" : "ผิด / หมดเวลา"}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </section>

            <p className={`mt-4 text-center text-sm ${MUTED}`} aria-live="polite">
              {saveState === "saving" && "กำลังบันทึกคะแนน..."}
              {saveState === "saved" && `สะสม +${score.toLocaleString()} แต้มให้บัญชี ${player?.name} เรียบร้อยแล้ว`}
              {saveState === "guest" && (
                <>
                  <Link href="/login" className="font-bold text-[#17FFA2] underline underline-offset-4">เข้าสู่ระบบ</Link> เพื่อบันทึกคะแนนเข้าอันดับ
                </>
              )}
              {saveState === "error" && `บันทึกคะแนนไม่สำเร็จ${saveErr ? `: ${saveErr}` : ""}`}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <button onClick={start} disabled={lockNav} className={`btn-fx col-span-2 ${btnSolid}`}>
                <span className="btn-shine" aria-hidden="true" />
                <span className="relative">เล่นอีกครั้ง</span>
              </button>
              <Link href="/rank" className={`btn-fx ${btnOutline}${lockCls}`} {...lockProps}>
                <span className="btn-shine" aria-hidden="true" />
                <span className="relative">ดูอันดับ</span>
              </Link>
              <Link href="/" className={`btn-fx ${btnOutline}${lockCls}`} {...lockProps}>
                <span className="btn-shine" aria-hidden="true" />
                <span className="relative">กลับหน้าแรก</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}