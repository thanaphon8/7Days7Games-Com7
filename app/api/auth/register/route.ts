import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });
    }

    // สร้าง userId แบบสุ่ม หรือใช้รูปแบบตามต้องการ
    const userId = `user_${Date.now()}`;

    const user = await User.create({
      userId,
      email,
      password, // หมายเหตุ: ในระบบ Production แนะนำให้ใช้ bcrypt ในการ Hash รหัสผ่าน
      name,
      avatarId: '01',
      savedEvents: [],
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}