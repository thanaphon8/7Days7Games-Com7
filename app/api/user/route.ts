import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const client = await clientPromise;
    const db = client.db("7days7games");

    if (userId) {
      // ซ่อน password เพื่อความปลอดภัย
      const user = await db
        .collection("users")
        .findOne({ userId }, { projection: { password: 0 } });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "ไม่พบผู้ใช้งาน" },
          { status: 404 }
        );
      }

      // แนบฟิลด์ avatar เพื่อให้ตรงกับโครงสร้างฝั่ง Client
      const formattedUser = {
        ...user,
        avatar: user.avatarId || user.avatar || "01",
      };

      return NextResponse.json({ success: true, data: formattedUser });
    }

    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    const formattedUsers = users.map((u) => ({
      ...u,
      avatar: u.avatarId || u.avatar || "01",
    }));

    return NextResponse.json(
      { success: true, data: formattedUsers },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
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
    const { userId, name, avatarId, avatar, savedEvents, gameScores, gameKey, score } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("7days7games");

    const updateFields: Record<string, any> = { updatedAt: new Date() };
    const incFields: Record<string, any> = {};

    if (name !== undefined) updateFields.name = name;

    // บันทึกทั้ง avatarId และ avatar
    const selectedAvatar = avatarId || avatar;
    if (selectedAvatar !== undefined) {
      updateFields.avatarId = selectedAvatar;
      updateFields.avatar = selectedAvatar;
    }

    if (savedEvents !== undefined) updateFields.savedEvents = savedEvents;

    if (gameScores && typeof gameScores === "object") {
      for (const [key, val] of Object.entries(gameScores)) {
        if (typeof val === "number") {
          incFields[`gameScores.${key}`] = val;
        }
      }
    }

    if (gameKey && typeof score === "number") {
      incFields[`gameScores.${gameKey}`] = score;
    }

    const updateQuery: Record<string, any> = { $set: updateFields };
    if (Object.keys(incFields).length > 0) {
      updateQuery.$inc = incFields;
    }

    const result = await db.collection("users").findOneAndUpdate(
      { userId },
      updateQuery,
      { returnDocument: "after", upsert: true }
    );

    // ป้องกัน TypeScript Error (ts18047) โดยตรวจสอบค่านัยสำคัญก่อนดึง property
    const updatedDoc = result ? ("value" in result && result.value ? result.value : result) : {};

    return NextResponse.json({
      success: true,
      data: {
        ...updatedDoc,
        avatarId: updatedDoc?.avatarId || selectedAvatar,
        avatar: updatedDoc?.avatar || selectedAvatar,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}