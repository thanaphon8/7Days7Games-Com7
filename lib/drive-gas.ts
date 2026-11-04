// lib/drive-gas.ts
// อัปโหลด/ลบรูปโปรไฟล์บน Google Drive ผ่าน Google Apps Script
// env: GOOGLE_APPS_SCRIPT_URL (ลงท้าย /exec), GOOGLE_APPS_SCRIPT_SECRET (ตรงกับ SECRET ใน Script properties)

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TIMEOUT_MS = 25_000;

type GasReply = { success?: boolean; fileId?: string; imageUrl?: string; error?: string };

export type UploadResult = { ok: true; url: string; fileId: string } | { ok: false; reason: string };

async function callGas(payload: Record<string, unknown>): Promise<{ ok: true; data: GasReply } | { ok: false; reason: string }> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url) return { ok: false, reason: "ยังไม่ได้ตั้งค่า GOOGLE_APPS_SCRIPT_URL" };
  if (!secret) return { ok: false, reason: "ยังไม่ได้ตั้งค่า GOOGLE_APPS_SCRIPT_SECRET" };
  try {
    const res = await fetch(url, {
      method: "POST",
      // text/plain กัน CORS preflight ที่ Apps Script ไม่รองรับ
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({ ...payload, secret }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let data: GasReply;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("apps script: ตอบไม่ใช่ JSON", res.status, text.slice(0, 200));
      return { ok: false, reason: "Apps Script ไม่ได้ตอบเป็น JSON (เช็กว่า deploy แบบ Anyone และใช้ URL ที่ลงท้าย /exec)" };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("apps script: เรียกไม่สำเร็จ", e);
    return { ok: false, reason: "เรียก Apps Script ไม่สำเร็จ" };
  }
}

export async function uploadAvatar(file: File, username: string): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) return { ok: false, reason: "รองรับเฉพาะ jpeg/png/webp/gif" };
  const fileBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const r = await callGas({
    action: "upload",
    fileBase64,
    fileName: `avatar_${username}_${Date.now()}.${ext}`,
    fileType: file.type,
  });
  if (!r.ok) return r;
  if (!r.data.success || !r.data.imageUrl || !r.data.fileId) {
    console.error("apps script upload ไม่สำเร็จ", r.data);
    return { ok: false, reason: r.data.error || "Apps Script ตอบว่าไม่สำเร็จ" };
  }
  return { ok: true, url: r.data.imageUrl, fileId: r.data.fileId };
}

// ลบรูปบน Drive (best effort: พลาดแล้วแค่ log ไม่ throw)
export async function deleteAvatar(fileId: string | undefined | null): Promise<void> {
  if (!fileId) return;
  const r = await callGas({ action: "delete", fileId });
  if (!r.ok) console.error("apps script delete ล้มเหลว:", r.reason);
  else if (!r.data.success) console.error("apps script delete ไม่สำเร็จ", r.data.error);
}