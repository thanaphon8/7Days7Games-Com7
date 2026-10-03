import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const client = await clientPromise;
    // 🔴 เปลี่ยนจุดนี้จาก "com7_game" เป็น "7days7games"
    const db = client.db("7days7games");

    if (userId) {
      const user = await db.collection("users").findOne({ userId });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "ไม่พบผู้ใช้งาน" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: user });
    }

    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    return NextResponse.json(
      { success: true, data: users },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, avatarId, savedEvents, gameScores, gameKey, score } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ userId" }, { status: 400 });
    }

    const client = await clientPromise;
    // 🔴 เปลี่ยนจุดนี้จาก "com7_game" เป็น "7days7games"
    const db = client.db("7days7games");

    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (name !== undefined) updateFields.name = name;
    if (avatarId !== undefined) updateFields.avatarId = avatarId;
    if (savedEvents !== undefined) updateFields.savedEvents = savedEvents;

    if (gameScores && typeof gameScores === "object") {
      for (const [key, val] of Object.entries(gameScores)) {
        updateFields[`gameScores.${key}`] = val;
      }
    }

    if (gameKey && typeof score === "number") {
      updateFields[`gameScores.${gameKey}`] = score;
    }

    const result = await db.collection("users").findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { returnDocument: "after", upsert: true }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}