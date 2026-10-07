"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

const GAME_ID = "thinkfast";
const TOTAL = 10; // จำนวนข้อต่อรอบ
const TIME_PER_Q = 20; // วินาทีต่อข้อ
const POINT_PER_CORRECT = 1; // ตอบถูก 1 ข้อ = 1 คะแนน (เต็ม TOTAL คะแนน)
const STAR_AT = [4, 7, 9]; // คะแนนที่ต้องได้ 1 / 2 / 3 ดาว

type Raw = { tag: string; q: string; options: string[]; explain: string }; // options[0] คือคำตอบที่ถูก
type Question = { tag: string; q: string; options: string[]; answer: number; explain: string };
type Fx = { id: number; kind: "win" | "lose" | "timeout"; gain: number; praise: string };

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

const PRAISE = ["เก่งมาก!", "เยี่ยมไปเลย!", "สมองไวสุดๆ", "ไม่โดนหลอกง่ายๆ เลยนะ", "คิดได้เฉียบขาด!", "สุดยอด!", "ฉลาดมาก!", "ผ่านกับดักไปได้!", "ตาถึงจริงๆ", "ยอดเยี่ยม!"];
const LOSE_MSG = ["โดนหลอกซะแล้ว", "เกือบไปแล้วนะ", "กับดักข้อนี้ร้ายนะ", "อุ๊ย คิดเร็วไปหน่อย"];
const TIMEOUT_MSG = "หมดเวลา สมองค้างเหรอ";

function rating(correct: number) {
  if (correct >= 9) return "สมองไม่เคยโดนหลอก";
  if (correct >= 7) return "ฉลาดแกมกวน";
  if (correct >= 4) return "โดนหลอกพอประมาณ";
  return "โดนหลอกจนหมดตัว";
}

// ===== พื้นหลังลอยๆ (ตำแหน่งตายตัว กัน hydration mismatch) =====
const GLYPHS = [
  { c: "?", l: "6%", t: "14%", s: 6, d: 0, du: 9 },
  { c: "!", l: "86%", t: "10%", s: 5, d: 1.2, du: 11 },
  { c: "∴", l: "14%", t: "72%", s: 8, d: 0.6, du: 13 },
  { c: "?", l: "78%", t: "66%", s: 9, d: 2, du: 10 },
  { c: "!", l: "46%", t: "6%", s: 4, d: 3, du: 12 },
  { c: "∴", l: "92%", t: "40%", s: 6, d: 1.8, du: 14 },
  { c: "?", l: "3%", t: "44%", s: 5, d: 2.6, du: 9 },
  { c: "!", l: "58%", t: "84%", s: 7, d: 0.3, du: 11 },
  { c: "∴", l: "30%", t: "30%", s: 4, d: 3.6, du: 15 },
  { c: "?", l: "68%", t: "26%", s: 4, d: 1, du: 12 },
];

const CONFETTI_COLORS = ["#F4D35E", "#B7CBB0", "#FFFFFF", "#4A2412", "#F4A58A", "#FF6B6B"];

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

function Star({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 24 24" className="h-14 w-14" style={{ animation: `tf-star .55s ${delay}s cubic-bezier(.2,1.4,.4,1) both` }} aria-hidden>
      <path d="M12 2l2.9 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.5 21.7l1.8-7.3L1.6 9.5l7.5-.6z" fill={on ? "#F4D35E" : "#E4E4E7"} strokeLinejoin="round" />
    </svg>
  );
}

const BTN_MAIN = "h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50";
const BTN_SUB = "inline-flex h-12 w-full items-center justify-center rounded-full border border-black/[.08] text-sm font-medium transition-colors hover:bg-black/[.04]";

export default function ThinkFastPage() {
  const [phase, setPhase] = useState<"intro" | "play" | "end">("intro");
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null); // -1 = หมดเวลา
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [results, setResults] = useState<boolean[]>([]); // ผลรายข้อ ใช้โชว์ในหน้าสรุป
  const [times, setTimes] = useState<number[]>([]); // เวลาที่ใช้ต่อข้อ (วินาที)
  const lastPraise = useRef(-1);
  const [fx, setFx] = useState<Fx | null>(null); // เอฟเฟกต์ของข้อปัจจุบัน
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");
  const [gameTotal, setGameTotal] = useState<number | null>(null); // แต้มสะสมของเกมนี้ทั้งหมด
  const savedRound = useRef(false); // กันบันทึกซ้ำในรอบเดียว (แต้มสะสมถ้าบันทึกซ้ำจะบวกเบิ้ล)
  const [player, setPlayer] = useState<Player | null>(null); // บัญชีที่เริ่มเล่นรอบนี้
  const [dims, setDims] = useState({ w: 360, h: 640 });
  const [natH, setNatH] = useState(640);
  const sumRef = useRef<HTMLDivElement>(null);
  const explRef = useRef<HTMLDivElement>(null);

  function start() {
    setPlayer(getStoredPlayer()); // จดบัญชีตอนเริ่มเล่น ไม่ไปอ่านใหม่ตอนจบเกม
    setQs(buildRound());
    setIdx(0);
    setPicked(null);
    setTimeLeft(TIME_PER_Q);
    setScore(0);
    setCorrect(0);
    setResults([]);
    setTimes([]);
    setFx(null);
    setGameTotal(null);
    savedRound.current = false;
    setSaveState("idle");
    setPhase("play");
  }

  function pickPraise() {
    let n = 0;
    do {
      n = Math.floor(Math.random() * PRAISE.length);
    } while (n === lastPraise.current);
    lastPraise.current = n;
    return PRAISE[n];
  }

  function choose(i: number) {
    if (phase !== "play" || picked !== null) return;
    setPicked(i);
    setTimes((t) => [...t, TIME_PER_Q - timeLeft]);
    if (i === qs[idx].answer) {
      setScore((s) => s + POINT_PER_CORRECT);
      setCorrect((c) => c + 1);
      setResults((r) => [...r, true]);
      setFx({ id: Date.now(), kind: "win", gain: POINT_PER_CORRECT, praise: pickPraise() });
    } else {
      setResults((r) => [...r, false]);
      setFx({ id: Date.now(), kind: "lose", gain: 0, praise: "" });
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
      setTimes((t) => [...t, TIME_PER_Q]);
      setResults((r) => [...r, false]);
      setFx({ id: Date.now(), kind: "timeout", gain: 0, praise: "" });
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, picked, timeLeft]);

  // ขนาดจอ ใช้ย่อหน้าสรุปผลให้พอดีจอโดยไม่ต้องเลื่อน
  useEffect(() => {
    const calc = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setDims({ w: Math.floor(window.innerWidth), h: Math.floor(vh) });
    };
    calc();
    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  // offsetHeight ไม่ถูกกระทบจาก transform: scale จึงได้ความสูงเต็มของเนื้อหา
  useEffect(() => {
    if (phase === "end" && sumRef.current) setNatH(sumRef.current.offsetHeight);
  });

  // เฉลยโผล่ใต้จอบนมือถือ ให้เลื่อนมาให้เห็นอัตโนมัติ
  useEffect(() => {
    if (picked !== null) explRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [picked]);

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
  const stars = STAR_AT.filter((s) => score >= s).length;
  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  // ===== เลย์เอาต์หน้าสรุป: จอกว้าง = 2 คอลัมน์, มือถือ = คอลัมน์เดียวย่อให้พอดีจอ =====
  const wide = dims.w >= 900 && dims.h >= 560;
  const sumW = wide ? 900 : 340;
  const sumScale = Math.min((dims.h * 0.92) / natH, (dims.w * 0.94) / sumW, wide ? 1.2 : 1.35);

  const sumHeader = (
    <div className="text-center">
      <span className="inline-block rounded-full bg-zinc-100 px-4 py-1 text-sm font-medium text-zinc-600">จบเกมแล้ว!</span>
      <div className="mt-4 flex items-end justify-center gap-1">
        {STAR_AT.map((_, i) => (
          <div key={i} className={i === 1 ? "-translate-y-2" : ""}>
            <Star on={i < stars} delay={0.3 + i * 0.22} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-sm font-medium text-zinc-500">{rating(correct)}</p>
    </div>
  );

  const sumScore = (
    <div className="rounded-3xl bg-[#F4D35E] px-4 py-5 text-center text-[#4A3B00]">
      <p className="text-xs opacity-70">คะแนนรอบนี้</p>
      <p className={`font-semibold leading-none tabular-nums tracking-tight ${wide ? "text-8xl" : "text-7xl"}`}>
        {score}
        <span className="ml-1 text-2xl font-medium opacity-70">/{TOTAL}</span>
      </p>
      <p className="mt-2 text-xs opacity-70">ตอบถูก 1 ข้อ = 1 คะแนน</p>
    </div>
  );

  const sumResults = (
    <div className="rounded-3xl bg-white px-3 py-3 shadow-sm ring-1 ring-black/5">
      <p className="mb-2 text-center text-xs text-zinc-500">ผลรายข้อ</p>
      <div className="flex justify-center gap-1">
        {Array.from({ length: TOTAL }, (_, i) => {
          const r = results[i];
          return (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-zinc-900 ${r ? "bg-[#B7CBB0]" : "bg-[#F4A58A]"}`}
              aria-label={`ข้อ ${i + 1} ${r ? "ถูก" : "ผิด"}`}
            >
              {r ? "✓" : "✕"}
            </span>
          );
        })}
      </div>
    </div>
  );

  const sumStats = (
    <div className="grid grid-cols-3 gap-2 text-center text-sm">
      <div className="rounded-2xl bg-[#B7CBB0]/60 py-3">
        <p className="text-xl font-semibold tabular-nums">{correct}/{TOTAL}</p>
        <p className="text-xs text-zinc-600">ตอบถูก</p>
      </div>
      <div className="rounded-2xl bg-[#A8B5E8]/50 py-3">
        <p className="text-xl font-semibold tabular-nums">{avgTime.toFixed(1)} วิ</p>
        <p className="text-xs text-zinc-600">เฉลี่ยต่อข้อ</p>
      </div>
      <div className="rounded-2xl bg-[#F4A58A]/50 py-3">
        <p className="text-xl font-semibold tabular-nums">{gameTotal !== null ? gameTotal.toLocaleString() : "–"}</p>
        <p className="text-xs text-zinc-600">คะแนนสะสม</p>
      </div>
    </div>
  );

  const sumFooter = (
    <div className="text-center">
      <p className="min-h-4 text-xs text-zinc-500" aria-live="polite">
        {saveState === "saving" && "กำลังบันทึกคะแนน..."}
        {saveState === "saved" && `สะสม +${score} คะแนนให้บัญชี ${player?.name} แล้ว`}
        {saveState === "guest" && (
          <>
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4">เข้าสู่ระบบ</Link> เพื่อบันทึกคะแนนเข้าอันดับ
          </>
        )}
        {saveState === "error" && `บันทึกคะแนนไม่สำเร็จ${saveErr ? `: ${saveErr}` : ""}`}
      </p>
      <button onClick={start} disabled={lockNav} className={`${BTN_MAIN} mt-3`}>
        เล่นอีกครั้ง
      </button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/rank" className={`${BTN_SUB}${lockCls}`} {...lockProps}>
          ดูอันดับ
        </Link>
        <Link href="/" className={`${BTN_SUB}${lockCls}`} {...lockProps}>
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );

  return (
    <div className={`relative flex min-h-[100dvh] flex-col items-center font-sans text-zinc-900 ${playing ? "bg-[#F4A58A]" : "bg-white"}`}>
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
        @keyframes flash { 0% { opacity: .65; } 100% { opacity: 0; } }
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
        @keyframes panic { 0%,100% { opacity: .15; } 50% { opacity: .5; } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 0 0 rgba(183,203,176,.0); } 50% { box-shadow: 0 0 0 10px rgba(183,203,176,.55); } }
        @keyframes bgshift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
        @keyframes tf-star { 0% { transform: scale(0) rotate(-25deg); opacity: 0 } 70% { transform: scale(1.2) rotate(6deg); opacity: 1 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .rise, .fx-burst, .fx-float, .fx-flash, .fx-shake, .fx-pop, .fx-ring, .fx-drift, .fx-panic, .fx-glow, .fx-bg, .tf-anim, .tf-anim * { animation: none !important; }
          .fx-burst, .fx-float { display: none; }
        }
        .fx-burst { animation: burst 1100ms cubic-bezier(.15,.7,.3,1) both; }
        .fx-float { animation: floatUp 1300ms cubic-bezier(.2,.8,.2,1) both; }
        .fx-flash { animation: flash 700ms ease-out both; }
        .fx-shake { animation: shake 450ms ease-in-out both; }
        .fx-pop { animation: pop 420ms cubic-bezier(.2,.9,.3,1.4) both; }
        .fx-ring { animation: ring 700ms ease-out both; }
        .fx-drift { animation: drift var(--du, 10s) ease-in-out var(--dl, 0s) infinite; }
        .fx-panic { animation: panic 800ms ease-in-out infinite; }
        .fx-glow { animation: glow 900ms ease-in-out 2; }
        .fx-bg { background-size: 200% 200%; animation: bgshift 14s ease-in-out infinite alternate; }
      `}</style>

      {/* ===== พื้นหลังเต็มจอ (เฉพาะตอนเล่น) ===== */}
      {playing && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div
            className="fx-bg absolute inset-0"
            style={{ backgroundImage: "linear-gradient(135deg, #F4A58A 0%, #F7B9A0 35%, #F4C7A8 60%, #F4A58A 100%)" }}
          />
          {GLYPHS.map((g, i) => (
            <span
              key={i}
              className="fx-drift absolute select-none font-light leading-none text-[#4A2412] opacity-[.12]"
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
          {panic && <div className="fx-panic absolute inset-0" style={{ boxShadow: "inset 0 0 160px 30px rgba(229,72,77,.85)" }} />}
          {/* วาบสีตามผลคำตอบ */}
          {fx && (
            <div
              key={fx.id}
              className="fx-flash absolute inset-0"
              style={{ backgroundColor: fx.kind === "win" ? "#B7CBB0" : fx.kind === "lose" ? "#E5484D" : "#71717A" }}
            />
          )}
        </div>
      )}

      {/* ===== เอฟเฟกต์ตอบถูก: คอนเฟตติ + คะแนนลอยขึ้น ===== */}
      {playing && fx?.kind === "win" && (
        <>
          <Burst key={`b${fx.id}`} count={30} />
          <div aria-hidden className="pointer-events-none fixed left-1/2 top-[38%] z-40">
            <span className="fx-ring absolute -left-24 -top-24 block h-48 w-48 rounded-full border-4 border-white" />
          </div>
          <div key={`f${fx.id}`} aria-hidden className="fx-float pointer-events-none fixed left-1/2 top-[34%] z-50 text-center">
            <p
              className="text-7xl font-black tabular-nums tracking-tight text-white md:text-8xl"
              style={{ textShadow: "0 4px 0 #4A2412, 0 0 28px rgba(244,211,94,.9)" }}
            >
              +{fx.gain}
            </p>
            <p className="mt-1 whitespace-nowrap text-2xl font-bold text-[#4A2412] sm:text-3xl" style={{ textShadow: "0 2px 0 rgba(255,255,255,.7)" }}>
              {fx.praise}
            </p>
          </div>
        </>
      )}

      {/* ตอบผิด / หมดเวลา: ข้อความสั้นๆ เด้งกลางจอ */}
      {playing && fx && fx.kind !== "win" && (
        <div key={`l${fx.id}`} aria-hidden className="fx-float pointer-events-none fixed left-1/2 top-[34%] z-50 text-center">
          <p className="text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl" style={{ textShadow: "0 4px 0 #4A2412" }}>
            {fx.kind === "lose" ? "✕ พลาด" : "⏱ หมดเวลา"}
          </p>
        </div>
      )}

      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-6">
        <Link href="/" aria-label="COM7 หน้าแรก" className={`flex items-center${lockCls}`} {...lockProps}>
          <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-8 w-auto origin-left scale-[1.8] sm:h-9 sm:scale-[2.1]" />
        </Link>
        <Link
          href="/"
          className={`flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors sm:h-10 sm:px-5 ${playing ? "border-[#4A2412]/20 bg-white/40 hover:bg-white/70" : "border-black/[.08] hover:bg-black/[.04]"}${lockCls}`}
          {...lockProps}
        >
          กลับหน้าแรก
        </Link>
      </header>

      <main className="relative z-10 w-full max-w-3xl px-4 pb-10 sm:px-6 sm:pb-24 lg:max-w-5xl">
        {/* ===== หน้าเริ่มเกม ===== */}
        {phase === "intro" && (
          <div className="rise grid gap-4 lg:grid-cols-2 lg:items-stretch" style={{ animation: "rise 500ms both cubic-bezier(.2,.8,.2,1)" }}>
            <section className="relative overflow-hidden rounded-[2rem] bg-[#F4A58A] p-6 text-[#4A2412] sm:p-8 md:p-12 lg:flex lg:flex-col lg:justify-center">
              <span aria-hidden className="absolute -right-4 -top-10 text-[10rem] font-light leading-none opacity-20 sm:text-[12rem] md:text-[16rem]">∴</span>
              <p className="relative text-sm opacity-70">ตรรกะ · ประมาณ 3 นาที</p>
              <h1 className="relative mt-2 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">ตอบปัญหาเชาว์</h1>
              <p className="relative mt-5 max-w-md text-base leading-7 opacity-80 sm:text-lg sm:leading-8">
                {TOTAL} ข้อ คำถามกวนๆ ที่ฟังเผินๆ ง่ายนิดเดียว แต่ตอบเร็วเมื่อไรก็โดนหลอกเมื่อนั้น อ่านดีๆ แล้วลองดูว่าคุณจะรอดกี่ข้อ
              </p>
              <button
                onClick={start}
                className="relative mt-8 h-14 w-full rounded-full bg-[#4A2412] px-8 text-base font-medium text-white transition-opacity hover:opacity-85 sm:w-auto"
              >
                เริ่มเล่น
              </button>
            </section>

            <section className="rounded-[2rem] bg-zinc-50 p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight">กติกา</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {[
                  `สุ่มคำถามกวนๆ ${TOTAL} ข้อจากคลังทั้งหมด ${BANK.length} ข้อ แต่ละข้อมี 4 ตัวเลือกและเวลา ${TIME_PER_Q} วินาที`,
                  "คำตอบที่ดูชัดเจนที่สุดมักเป็นกับดัก อ่านโจทย์ให้ดี",
                  `ตอบถูกได้ ${POINT_PER_CORRECT} คะแนนต่อข้อ เต็ม ${TOTAL} คะแนน (ไม่มีโบนัสความเร็ว แต่ต้องตอบให้ทันเวลา)`,
                  "ตอบถูกทุกข้อจะมีคำชมและเอฟเฟกต์ฉลองให้",
                  "ตอบผิดหรือหมดเวลาไม่ได้คะแนน แต่จะเฉลยให้ทุกข้อ",
                  "กดปุ่ม 1–4 บนคีย์บอร์ดเพื่อเลือกคำตอบ และกด Enter เพื่อไปข้อถัดไป",
                  "คะแนนของทุกรอบที่เล่นจบจะสะสมเข้าคะแนนรวมของคุณ ยิ่งเล่นยิ่งเพิ่ม",
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
          <div className={`mt-1 ${fx?.kind === "lose" ? "fx-shake" : ""}`}>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <p className="rounded-full bg-white/60 px-3 py-2 text-xs text-[#4A2412] sm:px-4 sm:text-sm">
                ข้อ <span className="font-semibold tabular-nums">{idx + 1}</span> / {TOTAL}
              </p>

              <p
                key={score}
                className={`rounded-full bg-white/80 px-3 py-2 text-xs font-semibold tabular-nums text-[#4A2412] sm:px-4 sm:text-sm ${score > 0 ? "fx-pop" : ""}`}
              >
                {score}/{TOTAL} <span className="font-medium opacity-60">คะแนน</span>
              </p>
            </div>

            <div className="mt-3 flex gap-1.5 sm:mt-4" aria-hidden>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${i < idx ? "bg-[#4A2412]" : i === idx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>

            {/* มือถือ: เรียงบนลงล่าง / คอม: โจทย์ซ้าย ตัวเลือกขวา */}
            <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
              <div
                key={idx}
                className="rise relative rounded-[1.75rem] bg-[#4A2412] p-5 text-[#FFF3EC] shadow-[0_20px_50px_-20px_rgba(74,36,18,.7)] sm:rounded-[2rem] sm:p-8 lg:min-h-[22rem] lg:p-10"
                style={{ animation: "rise 400ms both cubic-bezier(.2,.8,.2,1)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full bg-[#F4A58A] px-3 py-1 text-xs font-semibold text-[#4A2412]">{q.tag}</span>
                  <span
                    className={`flex items-center gap-2 text-sm font-semibold tabular-nums ${panic ? "text-[#FF8A8E]" : ""}`}
                    role="timer"
                    aria-label={`เหลือเวลา ${timeLeft} วินาที`}
                  >
                    {timeLeft} วิ
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                      backgroundColor: timeLeft <= 5 ? "#E5484D" : "#F4A58A",
                      transition: "width 1s linear, background-color 300ms",
                    }}
                  />
                </div>
                <h1 className="mt-5 text-xl font-semibold leading-snug tracking-tight sm:mt-6 sm:text-2xl lg:text-3xl">{q.q}</h1>
              </div>

              <ol className="flex flex-col gap-2.5 sm:gap-3">
                {q.options.map((opt, i) => {
                  const isAns = revealed && i === q.answer;
                  const isWrongPick = revealed && i === picked && i !== q.answer;
                  const state = !revealed
                    ? "bg-white/90 hover:-translate-y-0.5 hover:bg-white active:scale-[.98]"
                    : isAns
                      ? "scale-[1.02] bg-[#B7CBB0] text-[#1F3D1A]"
                      : isWrongPick
                        ? "bg-[#E5484D] text-white"
                        : "bg-white/40 opacity-60";
                  return (
                    <li key={i}>
                      <button
                        onClick={() => choose(i)}
                        disabled={revealed}
                        className={`flex w-full items-center gap-3 rounded-3xl p-2 pr-4 text-left text-base font-medium outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-blue-400 sm:gap-4 sm:rounded-full sm:p-3 sm:pr-6 sm:text-lg ${state} ${isAns ? "fx-glow" : ""} ${revealed ? "cursor-default" : ""}`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-zinc-900 ring-1 ring-black/5 sm:h-12 sm:w-12">{i + 1}</span>
                        <span className="flex-1">{opt}</span>
                        {isAns && <span aria-hidden className="fx-pop text-xl">✓</span>}
                        {isWrongPick && <span aria-hidden className="fx-pop text-xl">✕</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {revealed && (
                <div
                  ref={explRef}
                  aria-live="polite"
                  className="rise rounded-[1.75rem] bg-white/90 p-5 backdrop-blur sm:rounded-[2rem] sm:p-6 md:p-8 lg:col-span-2"
                  style={{ animation: "rise 300ms both cubic-bezier(.2,.8,.2,1)" }}
                >
                  <p className="text-lg font-semibold tracking-tight sm:text-xl">
                    {picked === -1
                      ? TIMEOUT_MSG
                      : isRight
                        ? `${fx?.praise || "เก่งมาก!"} +${POINT_PER_CORRECT} คะแนน`
                        : LOSE_MSG[idx % LOSE_MSG.length]}
                  </p>
                  <p className="mt-2 text-base leading-7 text-zinc-600">{q.explain}</p>
                  <button
                    onClick={next}
                    className="mt-5 h-12 w-full rounded-full bg-[#4A2412] px-6 text-sm font-medium text-white transition-colors hover:opacity-85 sm:mt-6 sm:w-auto"
                  >
                    {idx + 1 >= TOTAL ? "ดูผลคะแนน" : "ข้อถัดไป"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== สรุปผล (เต็มจอ ย่อให้พอดีมือถือ / 2 คอลัมน์บนคอม) ===== */}
      {phase === "end" && (
        <>
          {correct >= 7 && <Burst count={60} power={1.5} />}
          <div className="tf-anim fixed inset-0 z-30 flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#F7E9A8] via-white to-white">
            <div style={{ width: sumW, height: natH, transform: `scale(${sumScale})` }} className="shrink-0">
              <div ref={sumRef} style={{ animation: "rise .45s cubic-bezier(.2,.8,.2,1) both" }}>
                {wide ? (
                  <div className="grid grid-cols-2 items-center gap-10">
                    <div className="flex flex-col gap-4">
                      {sumHeader}
                      {sumScore}
                      {sumResults}
                    </div>
                    <div className="flex flex-col gap-3">
                      {sumStats}
                      {sumFooter}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {sumHeader}
                    {sumScore}
                    {sumResults}
                    {sumStats}
                    {sumFooter}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}