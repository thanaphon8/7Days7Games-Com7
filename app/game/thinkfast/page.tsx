"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const GAME_ID = "thinkfast";
const TOTAL = 10; // จำนวนข้อต่อรอบ
const TIME_PER_Q = 20; // วินาทีต่อข้อ
const BASE_POINT = 100; // คะแนนพื้นฐานต่อข้อที่ตอบถูก
const BONUS_PER_SEC = 5; // โบนัสต่อวินาทีที่เหลือ

type Raw = { tag: string; q: string; options: string[]; explain: string }; // options[0] คือคำตอบที่ถูก
type Question = { tag: string; q: string; options: string[]; answer: number; explain: string };

// ===== คลังคำถามกวนๆ (ตัวเลือกแรกของแต่ละข้อคือคำตอบที่ถูก ระบบจะสลับลำดับให้เอง) =====
const BANK: Raw[] = [
  { tag: "กับดัก", q: "ถ้าไก่ตัวผู้ไข่บนยอดหลังคา ไข่จะตกไปทางไหน", options: ["ไก่ตัวผู้ไม่ไข่ต่างหาก", "ตกทางซ้าย", "ตกทางขวา", "ค้างอยู่บนยอดหลังคา"], explain: "ไก่ตัวผู้ไม่ออกไข่ ไข่เลยไม่ตกไปไหนทั้งนั้น" },
  { tag: "กับดัก", q: "เครื่องบินตกตรงชายแดนไทยกับลาว ผู้รอดชีวิตควรถูกฝังที่ประเทศไหน", options: ["ไม่ต้องฝัง เพราะยังมีชีวิตอยู่", "ประเทศไทย", "ประเทศลาว", "ฝังตรงกลางชายแดน"], explain: "ผู้รอดชีวิตยังไม่ตาย ไม่มีใครฝังคนที่ยังมีชีวิตอยู่หรอก" },
  { tag: "กับดัก", q: "คุณกำลังวิ่งแข่ง แล้ววิ่งแซงคนที่อยู่อันดับ 2 ตอนนี้คุณอยู่อันดับที่เท่าไร", options: ["อันดับ 2", "อันดับ 1", "อันดับ 3", "อันดับ 4"], explain: "แซงคนที่ 2 ก็แค่เข้าไปแทนที่เขา เป็นที่ 2 ส่วนคนที่ 1 ยังวิ่งนำอยู่" },
  { tag: "กับดัก", q: "คุณขับรถบัส ป้ายแรกมีคนขึ้น 5 คน ป้ายที่สองลง 2 คนแล้วขึ้นมา 3 คน คนขับรถบัสอายุเท่าไร", options: ["เท่ากับอายุของคุณเอง", "6 ปี", "8 ปี", "คำนวณไม่ได้"], explain: "ก็คุณนั่นแหละคือคนขับ ตัวเลขผู้โดยสารเป็นแค่ตัวหลอก" },
  { tag: "กับดัก", q: "ถ้ามีไม้ขีดไฟ 1 ก้าน แล้วเดินเข้าห้องมืดที่มีตะเกียงน้ำมัน เทียนไข และเตาผิง คุณจะจุดอะไรก่อน", options: ["ไม้ขีดไฟ", "ตะเกียงน้ำมัน", "เทียนไข", "เตาผิง"], explain: "ถ้าไม่จุดไม้ขีดไฟก่อน ก็จุดอย่างอื่นไม่ได้" },
  { tag: "กับดัก", q: "หมอให้ยา 3 เม็ด สั่งให้กินทุก 30 นาที จะกินยาหมดภายในกี่นาที", options: ["60 นาที", "90 นาที", "30 นาที", "120 นาที"], explain: "กินเม็ดแรกทันที (นาทีที่ 0) เม็ดสองนาทีที่ 30 เม็ดสามนาทีที่ 60" },
  { tag: "กับดัก", q: "ตอนนี้เที่ยงคืนและฝนกำลังตก อีก 72 ชั่วโมงข้างหน้าจะมีแดดออกไหม", options: ["ไม่มี เพราะจะเป็นเที่ยงคืนอีกรอบ", "มีแน่นอน", "ขึ้นอยู่กับฤดูกาล", "ฝนจะตกต่อเนื่อง"], explain: "72 ชั่วโมงคือ 3 วันพอดี เวลาจะวนกลับมาเป็นเที่ยงคืนอีกครั้ง แดดไม่มีทางออก" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ยิ่งเช็ดให้ของแห้ง ตัวมันยิ่งเปียก", options: ["ผ้าเช็ดตัว", "กระดาษทิชชู", "ไดร์เป่าผม", "ฟองน้ำแห้ง"], explain: "ผ้าเช็ดตัวซับน้ำไว้เอง ยิ่งใช้เช็ดก็ยิ่งเปียก" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ยิ่งเอาออก ยิ่งใหญ่ขึ้น", options: ["หลุม", "ผ้า", "ฟองสบู่", "ก้อนหิน"], explain: "ขุดดินออกเท่าไหร่ หลุมก็ยิ่งกว้างขึ้นเท่านั้น" },
  { tag: "ปริศนา", q: "อะไรเอ่ย พอพูดชื่อมันออกมา มันก็หายไปทันที", options: ["ความเงียบ", "เงา", "หมอก", "น้ำแข็ง"], explain: "แค่เปล่งเสียงพูดว่า \"ความเงียบ\" ความเงียบก็ถูกทำลายไปแล้ว" },
  { tag: "ปริศนา", q: "แม่ของน้องเมษามีลูกสาว 4 คน ชื่อ มกรา กุมภา มีนา และคนสุดท้ายชื่ออะไร", options: ["เมษา", "พฤษภา", "มิถุนา", "สิงหา"], explain: "ก็บอกอยู่ว่าเป็นแม่ของน้องเมษา ลูกคนที่ 4 เลยชื่อเมษานั่นเอง" },
  { tag: "ปริศนา", q: "คุณมีแอปเปิล 6 ผล แล้วหยิบออกไป 4 ผล ตอนนี้คุณมีแอปเปิลกี่ผล", options: ["4 ผล", "2 ผล", "6 ผล", "10 ผล"], explain: "คุณหยิบไป 4 ผล แปลว่าคุณถือแอปเปิลอยู่ 4 ผล (ไม่ใช่ 2 ผลที่เหลืออยู่)" },
  { tag: "ปริศนา", q: "ปีหนึ่งมีกี่เดือนที่มี 28 วัน", options: ["12 เดือน", "1 เดือน", "2 เดือน", "11 เดือน"], explain: "ทุกเดือนมีอย่างน้อย 28 วัน จึงตอบได้ว่าทั้ง 12 เดือน" },
  { tag: "คณิตกวนๆ", q: "นาฬิกาตีบอกเวลา 6 ครั้งใช้เวลา 5 วินาที ถ้าตี 12 ครั้งจะใช้กี่วินาที", options: ["11 วินาที", "10 วินาที", "12 วินาที", "24 วินาที"], explain: "ให้นับช่วงห่างระหว่างเสียง 6 ครั้งมี 5 ช่วง ช่วงละ 1 วินาที ดังนั้น 12 ครั้งมี 11 ช่วง ใช้ 11 วินาที" },
  { tag: "คณิตกวนๆ", q: "9 + 9 × 0 + 1 = ?", options: ["10", "1", "19", "0"], explain: "คูณก่อนบวก 9 × 0 = 0 เลยเหลือ 9 + 0 + 1 = 10" },
  { tag: "คณิตกวนๆ", q: "แมว 3 ตัวจับหนู 3 ตัวใน 3 นาที แมว 100 ตัวจับหนู 100 ตัวใช้กี่นาที", options: ["3 นาที", "1 นาที", "33 นาที", "100 นาที"], explain: "แมวหนึ่งตัวจับหนูหนึ่งตัวใช้ 3 นาที แมว 100 ตัวก็จับหนู 100 ตัวพร้อมกันได้ใน 3 นาทีเท่าเดิม" },
  { tag: "คณิตกวนๆ", q: "ปากกากับยางลบราคารวมกัน 11 บาท ปากกาแพงกว่ายางลบ 10 บาท ยางลบราคาเท่าไร", options: ["50 สตางค์", "1 บาท", "10 สตางค์", "5 บาท"], explain: "ยางลบ 50 สตางค์ ปากกา 10 บาท 50 สตางค์ รวมกัน 11 บาท และต่างกัน 10 บาทพอดี" },
  { tag: "คณิตกวนๆ", q: "บัวในสระโตเป็นสองเท่าทุกวัน ถ้าใช้เวลา 48 วันบัวเต็มสระ บัวเต็มครึ่งสระเมื่อวันที่เท่าไร", options: ["วันที่ 47", "วันที่ 24", "วันที่ 46", "วันที่ 36"], explain: "บัวเพิ่มเป็นสองเท่าทุกวัน ถ้าวันที่ 48 เต็มสระ ก่อนหน้านั้นหนึ่งวันจึงเต็มครึ่งสระ" },
  { tag: "คณิตกวนๆ", q: "มีเหรียญสองเหรียญรวมกัน 11 บาท เหรียญหนึ่งไม่ใช่เหรียญ 10 บาท เหรียญทั้งสองคือเหรียญอะไร", options: ["10 บาทกับ 1 บาท", "5 บาทกับ 5 บาท", "10 บาทกับ 2 บาท", "เป็นไปไม่ได้"], explain: "บอกแค่ว่า \"เหรียญหนึ่ง\" ไม่ใช่ 10 บาท (คือเหรียญ 1 บาท) แต่อีกเหรียญเป็น 10 บาทได้" },
  // ----- เพิ่มชุดที่ 2 -----
  { tag: "กับดัก", q: "บนต้นไม้มีนก 10 ตัว นายพรานยิงตก 1 ตัว บนต้นไม้เหลือนกกี่ตัว", options: ["0 ตัว", "9 ตัว", "1 ตัว", "10 ตัว"], explain: "พอได้ยินเสียงปืน นกที่เหลือก็ตกใจบินหนีไปหมด บนต้นไม้เลยไม่เหลือสักตัว" },
  { tag: "กับดัก", q: "ผู้ชายคนหนึ่งแต่งงานกับผู้หญิง 20 คนในหมู่บ้านเดียวกัน ไม่ผิดกฎหมายและไม่เคยหย่า เป็นไปได้อย่างไร", options: ["เขาเป็นผู้ประกอบพิธีแต่งงานให้คนอื่น", "เขาแต่งงานทีละคนแล้วหย่า", "เขาเป็นคนรวยมาก", "เขาเปลี่ยนชื่อ 20 ครั้ง"], explain: "เขาแค่เป็นคนทำพิธีแต่งงานให้ผู้หญิงเหล่านั้นกับคนอื่น ไม่ได้แต่งเองสักคน" },
  { tag: "กับดัก", q: "ฉันไม่มีพี่น้อง แต่พ่อของผู้ชายคนนั้นเป็นลูกชายของพ่อฉัน ผู้ชายคนนั้นคือใคร", options: ["ลูกชายของฉัน", "ตัวฉันเอง", "พ่อของฉัน", "ลุงของฉัน"], explain: "ลูกชายของพ่อฉันที่ไม่ใช่พี่น้อง ก็คือตัวฉันเอง ดังนั้นพ่อของผู้ชายคนนั้นคือฉัน เขาจึงเป็นลูกชายของฉัน" },
  { tag: "กับดัก", q: "พ่อสองคนกับลูกสองคนไปซื้อส้มกินคนละ 1 ผลพอดี แต่ซื้อมาแค่ 3 ผล เป็นไปได้อย่างไร", options: ["มีแค่ 3 คน คือ ปู่ พ่อ และลูก", "มีคนหนึ่งอดกิน", "มีคนหนึ่งแบ่งครึ่ง", "คนขายให้เกิน"], explain: "ปู่กับพ่อคือ 'พ่อ 2 คน' ส่วนพ่อกับลูกคือ 'ลูก 2 คน' โดยพ่อถูกนับซ้ำสองบทบาท จึงมีแค่ 3 คน" },
  { tag: "กับดัก", q: "เด็กสองคนเกิดวันเดียวกัน แม่คนเดียวกัน แต่ไม่ใช่ฝาแฝด เป็นไปได้อย่างไร", options: ["เป็นแฝดสามหรือมากกว่านั้น", "คนหนึ่งเกิดก่อนเที่ยงคืน", "แม่มีสองคน", "เป็นไปไม่ได้"], explain: "พวกเขาเป็นแฝดสาม (หรือมากกว่า) จึงไม่ใช่ 'ฝาแฝด' ที่แปลว่าสองคน แต่เกิดวันเดียวกันจากแม่คนเดียวกันจริงๆ" },
  { tag: "กับดัก", q: "ถ้า 'พรุ่งนี้ของเมื่อวานนี้' คือวันศุกร์ แล้ววันนี้คือวันอะไร", options: ["วันศุกร์", "วันพฤหัสบดี", "วันเสาร์", "วันพุธ"], explain: "พรุ่งนี้ของเมื่อวาน ก็คือวันนี้นั่นเอง วันนี้จึงเป็นวันศุกร์" },
  { tag: "ปริศนา", q: "อะไรเอ่ย คุณเป็นเจ้าของ แต่คนอื่นเอาไปใช้บ่อยกว่าคุณเสียอีก", options: ["ชื่อของคุณ", "รถของคุณ", "บ้านของคุณ", "แปรงสีฟันของคุณ"], explain: "ชื่อเป็นของคุณ แต่คนอื่นเรียกมันบ่อยกว่าที่คุณเรียกตัวเองเสมอ" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ยิ่งมีมาก ยิ่งมองเห็นน้อย", options: ["ความมืด", "แสงสว่าง", "เพื่อน", "หน้าต่าง"], explain: "ความมืดยิ่งมากเท่าไหร่ เรายิ่งมองเห็นอะไรได้น้อยลง" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ไม่มีชีวิตแต่โตได้ ต้องใช้อากาศหายใจ และพอโดนน้ำก็ตาย", options: ["ไฟ", "ต้นไม้", "ก้อนหิน", "เมฆ"], explain: "ไฟลุกลามขยายตัวได้ ต้องการออกซิเจน และน้ำทำให้มันดับ" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ยิ่งเดินไปไกล ยิ่งทิ้งไว้ข้างหลังเยอะ", options: ["รอยเท้า", "เงินในกระเป๋า", "ความเหนื่อย", "แสงแดด"], explain: "ยิ่งก้าวเดินไปไกล ก็ยิ่งมีรอยเท้าทอดยาวอยู่ข้างหลังเรา" },
  { tag: "ปริศนา", q: "อะไรเอ่ย มีมือแต่ไม่มีนิ้ว มีหน้าแต่ไม่มีตา", options: ["นาฬิกา", "หุ่นยนต์", "ถุงมือ", "ตุ๊กตาล้มลุก"], explain: "นาฬิกามีเข็มเหมือนมือ มีหน้าปัดเหมือนหน้า แต่ไม่มีนิ้วและไม่มีตา" },
  { tag: "ปริศนา", q: "อะไรเอ่ย ขึ้นได้อย่างเดียว ไม่เคยลง", options: ["อายุ", "ลิฟต์", "ราคาหุ้น", "ธงชาติ"], explain: "อายุมีแต่เพิ่มขึ้นทุกปี ไม่มีทางลดลง" },
  { tag: "ปริศนา", q: "อะไรเอ่ย หลับตาก็เห็น ลืมตาก็หาย", options: ["ความฝัน", "เงา", "แสงไฟ", "กระจก"], explain: "ความฝันเกิดตอนเราหลับตา พอลืมตาตื่นมันก็หายไป" },
  { tag: "คณิตกวนๆ", q: "ต้มไข่ 1 ฟองให้สุกใช้เวลา 5 นาที ถ้าต้มไข่ 10 ฟองพร้อมกันในหม้อใบใหญ่ จะใช้กี่นาที", options: ["5 นาที", "10 นาที", "50 นาที", "15 นาที"], explain: "ต้มพร้อมกันในหม้อเดียว ไข่ทุกฟองสุกในเวลาเท่าเดิม คือ 5 นาที" },
  { tag: "คณิตกวนๆ", q: "ถ้าวันนี้เป็นวันจันทร์ อีก 100 วันข้างหน้าจะเป็นวันอะไร", options: ["วันพุธ", "วันจันทร์", "วันอังคาร", "วันพฤหัสบดี"], explain: "100 หารด้วย 7 เหลือเศษ 2 จึงเลื่อนจากวันจันทร์ไปอีก 2 วัน เป็นวันพุธ" },
  { tag: "คณิตกวนๆ", q: "5 + 5 ÷ 5 + 5 = ?", options: ["11", "7", "6", "15"], explain: "หารก่อนบวก 5 ÷ 5 = 1 แล้ว 5 + 1 + 5 = 11" },
  { tag: "คณิตกวนๆ", q: "คุณลบเลข 5 ออกจากเลข 25 ได้กี่ครั้ง", options: ["ครั้งเดียว เพราะหลังจากนั้นมันไม่ใช่ 25 แล้ว", "5 ครั้ง", "4 ครั้ง", "25 ครั้ง"], explain: "ลบครั้งแรกแล้วเหลือ 20 หลังจากนั้นก็ไม่ใช่เลข 25 อีกแล้ว จึงลบ 5 ออกจาก 25 ได้ครั้งเดียว" },
];

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

function buildRound(): Question[] {
  return shuffle(BANK)
    .slice(0, TOTAL)
    .map((r) => {
      const options = shuffle(r.options);
      return { tag: r.tag, q: r.q, options, answer: options.indexOf(r.options[0]), explain: r.explain };
    });
}

const WIN_MSG = ["ไม่โดนหลอก!", "สมองไวมาก", "เฉียบ!", "ผ่านกับดักไปได้"];
const LOSE_MSG = ["โดนหลอกซะแล้ว", "เกือบไปแล้วนะ", "กับดักข้อนี้ร้ายนะ", "อุ๊ย คิดเร็วไปหน่อย"];
const TIMEOUT_MSG = "หมดเวลา สมองค้างเหรอ";

function rating(correct: number) {
  if (correct >= 9) return "สมองไม่เคยโดนหลอก";
  if (correct >= 7) return "ฉลาดแกมกวน";
  if (correct >= 4) return "โดนหลอกพอประมาณ";
  return "โดนหลอกจนหมดตัว";
}

export default function ThinkFastPage() {
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = หมดเวลา
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");
  const [gameTotal, setGameTotal] = useState<number | null>(null); // แต้มสะสมของเกมนี้ทั้งหมด
  const savedRound = useRef(false); // กันบันทึกซ้ำในรอบเดียว (แต้มสะสมถ้าบันทึกซ้ำจะบวกเบิ้ล)
  const [player, setPlayer] = useState<Player | null>(null); // บัญชีที่เริ่มเล่นรอบนี้

  function start() {
    setPlayer(getStoredPlayer()); // จดบัญชีตอนเริ่มเล่น ไม่ไปอ่านใหม่ตอนจบเกม
    setQs(buildRound());
    setIdx(0);
    setPicked(null);
    setTimeLeft(TIME_PER_Q);
    setScore(0);
    setCorrect(0);
    setGameTotal(null);
    savedRound.current = false;
    setSaveState("idle");
    setPhase("play");
  }

  function choose(i: number) {
    if (phase !== "play" || picked !== null) return;
    setPicked(i);
    if (i === qs[idx].answer) {
      setScore((s) => s + BASE_POINT + timeLeft * BONUS_PER_SEC);
      setCorrect((c) => c + 1);
    }
  }

  function next() {
    if (idx + 1 >= TOTAL) {
      setPhase("end");
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
    setTimeLeft(TIME_PER_Q);
  }

  // นับเวลาถอยหลังต่อข้อ
  useEffect(() => {
    if (phase !== "play" || picked !== null) return;
    if (timeLeft <= 0) {
      setPicked(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, picked, timeLeft]);

  // คีย์ลัด: 1-4 เลือกคำตอบ, Enter ไปข้อถัดไป / เริ่มเล่น
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "intro" && e.key === "Enter") return start();
      if (phase !== "play") return;
      if (picked === null && ["1", "2", "3", "4"].includes(e.key)) choose(Number(e.key) - 1);
      else if (picked !== null && e.key === "Enter") next();
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
        // ส่งแค่แต้มของรอบนี้ ฝั่ง API จะ $inc เข้า gameScores.thinkfast ให้เอง (บวกสะสม ไม่ทับของเดิม)
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
  const gained = BASE_POINT + timeLeft * BONUS_PER_SEC;

  return (
    <div className="flex min-h-screen flex-col items-center bg-white font-sans text-zinc-900">
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none !important; } }
      `}</style>

      <header className="flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="COM7 หน้าแรก" className={`flex items-center${lockCls}`} {...lockProps}>
          <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto origin-left scale-[2.1]" />
        </Link>
        <Link href="/" className={`flex h-10 items-center rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04]${lockCls}`} {...lockProps}>
          กลับหน้าแรก
        </Link>
      </header>

      <main className="w-full max-w-3xl px-6 pb-24">
        {/* ===== หน้าเริ่มเกม ===== */}
        {phase === "intro" && (
          <div className="rise" style={{ animation: "rise 500ms both cubic-bezier(.2,.8,.2,1)" }}>
            <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-[#F4A58A] p-8 text-[#4A2412] md:p-12">
              <span aria-hidden className="absolute -right-4 -top-10 text-[12rem] font-light leading-none opacity-20 md:text-[16rem]">∴</span>
              <p className="relative text-sm opacity-70">ตรรกะ · ประมาณ 3 นาที</p>
              <h1 className="relative mt-2 text-6xl font-semibold leading-[1.05] tracking-tight md:text-7xl">ตอบปัญหาเชาว์</h1>
              <p className="relative mt-5 max-w-md text-lg leading-8 opacity-80">
                {TOTAL} ข้อ คำถามกวนๆ ที่ฟังเผินๆ ง่ายนิดเดียว แต่ตอบเร็วเมื่อไรก็โดนหลอกเมื่อนั้น อ่านดีๆ แล้วลองดูว่าคุณจะรอดกี่ข้อ
              </p>
              <button
                onClick={start}
                className="relative mt-8 h-14 rounded-full bg-[#4A2412] px-8 text-base font-medium text-white transition-opacity hover:opacity-85"
              >
                เริ่มเล่น
              </button>
            </section>

            <section className="mt-4 rounded-[2rem] bg-zinc-50 p-8">
              <h2 className="text-xl font-semibold tracking-tight">กติกา</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {[
                  `สุ่มคำถามกวนๆ ${TOTAL} ข้อจากคลังทั้งหมด ${BANK.length} ข้อ แต่ละข้อมี 4 ตัวเลือกและเวลา ${TIME_PER_Q} วินาที`,
                  "คำตอบที่ดูชัดเจนที่สุดมักเป็นกับดัก อ่านโจทย์ให้ดี",
                  `ตอบถูกได้ ${BASE_POINT} แต้ม บวกโบนัส ${BONUS_PER_SEC} แต้มต่อทุกวินาทีที่เหลือ`,
                  "ตอบผิดหรือหมดเวลาไม่ได้แต้ม แต่จะเฉลยให้ทุกข้อ",
                  "กดปุ่ม 1–4 บนคีย์บอร์ดเพื่อเลือกคำตอบ และกด Enter เพื่อไปข้อถัดไป",
                  "แต้มของทุกรอบที่เล่นจบจะสะสมเข้าคะแนนรวมของคุณ ยิ่งเล่นยิ่งเพิ่ม",
                ].map((r) => (
                  <li key={r} className="flex gap-3 text-base leading-7 text-zinc-600">
                    <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F4A58A]" />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ===== กำลังเล่น ===== */}
        {phase === "play" && q && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                ข้อ <span className="font-semibold text-zinc-900 tabular-nums">{idx + 1}</span> / {TOTAL}
              </p>
              <p className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium tabular-nums">
                {score.toLocaleString()} <span className="text-zinc-500">แต้ม</span>
              </p>
            </div>

            <div className="mt-4 flex gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < idx ? "bg-[#F4A58A]" : i === idx ? "bg-zinc-900" : "bg-zinc-100"}`} />
              ))}
            </div>

            <div
              key={idx}
              className="rise relative mt-6 rounded-[2rem] bg-[#F4A58A] p-8 text-[#4A2412] md:p-10"
              style={{ animation: "rise 400ms both cubic-bezier(.2,.8,.2,1)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">{q.tag}</span>
                <span className="flex items-center gap-2 text-sm font-semibold tabular-nums" role="timer" aria-label={`เหลือเวลา ${timeLeft} วินาที`}>
                  {timeLeft} วิ
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/50" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                    backgroundColor: timeLeft <= 5 ? "#E5484D" : "#4A2412",
                    transition: "width 1s linear, background-color 300ms",
                  }}
                />
              </div>
              <h1 className="mt-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">{q.q}</h1>
            </div>

            <ol className="mt-4 flex flex-col gap-3">
              {q.options.map((opt, i) => {
                const state = !revealed
                  ? "bg-zinc-50 hover:bg-zinc-100"
                  : i === q.answer
                    ? "bg-[#B7CBB0] text-[#1F3D1A]"
                    : i === picked
                      ? "bg-[#E5484D] text-white"
                      : "bg-zinc-50 opacity-50";
                return (
                  <li key={i}>
                    <button
                      onClick={() => choose(i)}
                      disabled={revealed}
                      className={`flex w-full items-center gap-4 rounded-full p-3 pr-6 text-left text-lg font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-blue-400 ${state} ${revealed ? "cursor-default" : ""}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-zinc-900 ring-1 ring-black/5">{i + 1}</span>
                      <span className="flex-1">{opt}</span>
                      {revealed && i === q.answer && <span aria-hidden className="text-xl">✓</span>}
                      {revealed && i === picked && i !== q.answer && <span aria-hidden className="text-xl">✕</span>}
                    </button>
                  </li>
                );
              })}
            </ol>

            {revealed && (
              <div aria-live="polite" className="rise mt-4 rounded-[2rem] bg-zinc-50 p-6 md:p-8" style={{ animation: "rise 300ms both cubic-bezier(.2,.8,.2,1)" }}>
                <p className="text-xl font-semibold tracking-tight">
                  {picked === -1
                    ? TIMEOUT_MSG
                    : isRight
                      ? `${WIN_MSG[idx % WIN_MSG.length]} +${gained} แต้ม`
                      : LOSE_MSG[idx % LOSE_MSG.length]}
                </p>
                <p className="mt-2 text-base leading-7 text-zinc-600">{q.explain}</p>
                <button
                  onClick={next}
                  className="mt-6 h-12 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                >
                  {idx + 1 >= TOTAL ? "ดูผลคะแนน" : "ข้อถัดไป"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== สรุปผล ===== */}
        {phase === "end" && (
          <div className="rise" style={{ animation: "rise 500ms both cubic-bezier(.2,.8,.2,1)" }}>
            <section className="mt-6 rounded-[2rem] bg-[#F4D35E] p-8 text-center text-[#4A3B00] md:p-12">
              <p className="text-sm opacity-70">{rating(correct)}</p>
              <p className="mt-2 text-8xl font-semibold tabular-nums tracking-tight md:text-9xl">{score.toLocaleString()}</p>
              <p className="mt-1 text-sm opacity-70">แต้มรอบนี้</p>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-zinc-50 px-5 py-6 text-center">
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{correct}/{TOTAL}</p>
                <p className="mt-1 text-sm text-zinc-500">ตอบถูก</p>
              </div>
              <div className="rounded-3xl bg-zinc-50 px-5 py-6 text-center">
                <p className="text-4xl font-semibold tabular-nums tracking-tight">{gameTotal !== null ? gameTotal.toLocaleString() : "–"}</p>
                <p className="mt-1 text-sm text-zinc-500">แต้มสะสมของเกมนี้</p>
              </div>
            </section>

            <p className="mt-4 text-center text-sm text-zinc-500" aria-live="polite">
              {saveState === "saving" && "กำลังบันทึกคะแนน..."}
              {saveState === "saved" && `สะสม +${score.toLocaleString()} แต้มให้บัญชี ${player?.name} เรียบร้อยแล้ว`}
              {saveState === "guest" && (
                <>
                  <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">เข้าสู่ระบบ</Link> เพื่อบันทึกคะแนนเข้าอันดับ
                </>
              )}
              {saveState === "error" && `บันทึกคะแนนไม่สำเร็จ${saveErr ? `: ${saveErr}` : ""}`}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={start}
                disabled={lockNav}
                className="h-12 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                เล่นอีกครั้ง
              </button>
              <Link href="/rank" className={`inline-flex h-12 items-center rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04]${lockCls}`} {...lockProps}>
                ดูอันดับ
              </Link>
              <Link href="/" className={`inline-flex h-12 items-center rounded-full border border-black/[.08] px-6 text-sm font-medium transition-colors hover:bg-black/[.04]${lockCls}`} {...lockProps}>
                กลับหน้าแรก
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}