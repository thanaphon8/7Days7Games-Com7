// ข้อมูลอันดับตัวอย่าง (เรียงจากคะแนนมากไปน้อย) ใช้ร่วมกันทั้งหน้าหลักและหน้า /rank
// TODO: เปลี่ยนเป็นข้อมูลจริงจากระบบ แล้วคงรูปแบบ Player ไว้
export type Player = {
  name: string;
  score: number; // แต้มรวม = คะแนนสูงสุดของแต่ละเกมมารวมกัน
  games: number; // จำนวนเกมที่เล่น
  avatar: string; // รหัสรูปโปรไฟล์ ตรงกับ public/img/avatars/{avatar}.png
};

export const RANKING: Player[] = [
  { name: "ณัฐ", score: 3420, games: 4, avatar: "05" },
  { name: "มินท์", score: 3180, games: 4, avatar: "12" },
  { name: "ปิ่น", score: 2960, games: 3, avatar: "03" },
  { name: "เบนซ์", score: 2740, games: 4, avatar: "18" },
  { name: "ฟ้า", score: 2510, games: 3, avatar: "08" },
  { name: "โอ๊ต", score: 2380, games: 3, avatar: "21" },
  { name: "แพร", score: 2210, games: 2, avatar: "14" },
  { name: "บอส", score: 1980, games: 3, avatar: "02" },
  { name: "เฟิร์น", score: 1760, games: 2, avatar: "25" },
  { name: "ภูมิ", score: 1540, games: 2, avatar: "10" },
];