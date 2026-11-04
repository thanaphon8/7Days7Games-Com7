// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "../../../../lib/mongodb";
import { createSession } from "../../../../lib/auth";
import { validateOrg } from "../../../components/branches";
import { uploadAvatar, deleteAvatar } from "../../../../lib/drive-gas";

// รูปสำเร็จรูป p1-p25 (ตรงกับ /img/p1.png - /img/p25.png)
const PRESET_RE = /^p([1-9]|1\d|2[0-5])$/;
// หน้าเว็บย่อรูปก่อนส่งแล้ว (~100KB) กันไฟล์ใหญ่ผิดปกติที่ฝั่งเซิร์ฟเวอร์อีกชั้น
const MAX_AVATAR = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const nicknameRaw = formData.get("nickname");
    const usernameRaw = formData.get("username");
    const employeeIdRaw = formData.get("employeeId");
    const passwordRaw = formData.get("password");
    const companyRaw = formData.get("companyId");
    const departmentRaw = formData.get("departmentId");
    const branchRaw = formData.get("branchId");
    const avatarFile = formData.get("avatar") as File | null;
    const presetRaw = formData.get("avatarPreset");
    let avatarPreset =
      typeof presetRaw === "string" && PRESET_RE.test(presetRaw) ? presetRaw : "";

    const nickname =
      typeof nicknameRaw === "string" ? nicknameRaw.trim().slice(0, 20) : "";
    const display =
      typeof usernameRaw === "string" ? usernameRaw.trim() : "";
    // รหัสพนักงานเก็บเป็นตัวพิมพ์ใหญ่ a12345 กับ A12345 นับเป็นรหัสเดียวกัน
    const employeeId =
      typeof employeeIdRaw === "string"
        ? employeeIdRaw.trim().toUpperCase()
        : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";
    const companyId =
      typeof companyRaw === "string" && /^\d{1,3}$/.test(companyRaw)
        ? Number(companyRaw)
        : null;
    // แผนก/สาขาไม่บังคับที่ระดับ parse (validateOrg ตรวจกติกาตามบริษัทให้)
    const departmentId =
      typeof departmentRaw === "string" && /^\d{1,4}$/.test(departmentRaw)
        ? Number(departmentRaw)
        : null;
    const branchId =
      typeof branchRaw === "string" && /^\d{1,5}$/.test(branchRaw)
        ? Number(branchRaw)
        : null;

    const errors: Record<string, string> = {};
    if (!nickname) errors.nickname = "กรอกชื่อเล่น";
    if (!/^[A-Za-z0-9_]{3,20}$/.test(display))
      errors.username = "3-20 ตัว ใช้ a-z 0-9 และ _ เท่านั้น";
    if (!/^[A-Z0-9]{3,20}$/.test(employeeId))
      errors.employeeId = "รหัสพนักงาน 3-20 ตัว ใช้ a-z 0-9 เท่านั้น";
    if (password.length < 6 || password.length > 72)
      errors.password = "รหัสผ่านต้องยาว 6-72 ตัวอักษร";
    if (!companyId) errors.companyId = "เลือกบริษัท";
    else Object.assign(errors, validateOrg(companyId, departmentId, branchId));
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    let avatarUrl = "";
    let driveFileId = "";

    // มีรูปโปรไฟล์ → อัปโหลดขึ้น Google Drive ผ่าน Apps Script (lib/drive-gas.ts)
    // อัปโหลดไม่สำเร็จ = สมัครต่อได้โดยไม่มีรูป (เหมือนเดิม)
    if (avatarFile && avatarFile.size > 0) {
      if (avatarFile.size > MAX_AVATAR) {
        console.error("avatar upload: ไฟล์ใหญ่เกิน", avatarFile.size);
      } else {
        const up = await uploadAvatar(avatarFile, display.toLowerCase());
        if (up.ok) {
          avatarUrl = up.url;
          driveFileId = up.fileId;
        } else {
          console.error("avatar upload ไม่สำเร็จ:", up.reason);
        }
      }
    }

    // อัปโหลดรูปเองสำเร็จ = ใช้รูปนั้น (ไม่ใช้รูปสำเร็จรูป)
    if (avatarUrl) avatarPreset = "";

    const db = await getDb();

    // ตรวจรหัสพนักงานซ้ำในบริษัทเดียวกันก่อน (กันซ้ำจริงอีกชั้นด้วย unique index ดู catch ด้านล่าง)
    if (await db.collection("users").findOne({ companyId, employeeId })) {
      await deleteAvatar(driveFileId); // สมัครไม่ผ่าน: ลบรูปที่เพิ่งอัปโหลด กันไฟล์ค้างบน Drive
      return NextResponse.json(
        { errors: { employeeId: "รหัสพนักงานนี้ถูกใช้แล้วในบริษัทนี้" } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const r = await db.collection("users").insertOne({
        username: display.toLowerCase(),
        display,
        employeeId,
        nickname,
        passwordHash,
        avatarUrl,
        avatarPreset,
        driveFileId,
        companyId,
        departmentId,
        branchId,
        points: 0,
        gameScores: {},
        createdAt: new Date(),
      });

      await createSession(r.insertedId);

      return NextResponse.json(
        {
          user: {
            userId: display.toLowerCase(), // ใช้เป็น id ฝั่งหน้าเว็บ
            name: nickname,
            username: display,
            employeeId,
            avatarUrl,
            avatarPreset,
            avatar: avatarUrl || avatarPreset,
            avatarId: avatarUrl || avatarPreset,
            points: 0,
            companyId,
            departmentId,
            branchId,
          },
        },
        { status: 201 }
      );
    } catch (e) {
      await deleteAvatar(driveFileId); // insert ไม่สำเร็จ: ลบรูปที่เพิ่งอัปโหลด
      if ((e as { code?: number }).code === 11000) {
        // แยกว่าชนที่รหัสพนักงานหรือ username
        const key = (e as { keyPattern?: Record<string, unknown> }).keyPattern;
        return NextResponse.json(
          {
            errors: key?.employeeId
              ? { employeeId: "รหัสพนักงานนี้ถูกใช้แล้วในบริษัทนี้" }
              : { username: "username นี้ถูกใช้แล้ว" },
          },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (e) {
    console.error("register failed", e);
    return NextResponse.json({ error: "เซิร์ฟเวอร์ผิดพลาด" }, { status: 500 });
  }
}