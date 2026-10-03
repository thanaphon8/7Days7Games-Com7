"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// สร้างรายการ ID รูปภาพ p1 ถึง p25
const AVATAR_IDS = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];

function Avatar({ id, size }: { id: string; size: string }) {
  const [failed, setFailed] = useState(false);

  // ตัด path ส่วนเกินออกให้เหลือแค่ชื่อ ID เช่น "/img/avatars/p18.png" -> "p18"
  const cleanId = (id || "p1").split("/").pop()?.replace(".png", "") || "p1";

  useEffect(() => {
    setFailed(false);
  }, [cleanId]);

  const numId = Number(cleanId.replace(/\D/g, "")) || 1;

  if (failed) {
    return (
      <span
        style={{
          backgroundColor: FALLBACK_BG[(numId - 1) % FALLBACK_BG.length],
        }}
        className={`flex shrink-0 items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
      >
        {cleanId.toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={`/img/${cleanId}.png`}
      alt=""
      width={216}
      height={216}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${size}`}
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("p1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !name) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: email,
          name,
          avatarId: selectedAvatar,
          avatar: selectedAvatar,
        }),
      });

      const result = await res.json();

      if (result.success) {
        const profileData = {
          userId: email,
          name,
          avatarId: selectedAvatar,
          avatar: selectedAvatar,
        };
        localStorage.setItem("profile", JSON.stringify(profileData));

        window.dispatchEvent(new Event("storage"));
        router.push("/");
      } else {
        setError(result.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-zinc-900">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-black/5 md:p-10">
        <div className="flex flex-col items-center text-center">
          <Link href="/">
            <Image
              src="/img/com7logo.png"
              alt="COM7"
              width={120}
              height={36}
              priority
              className="h-9 w-auto origin-center scale-[1.8]"
            />
          </Link>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">สมัครเข้าร่วมกิจกรรม</h1>
          <p className="mt-2 text-sm text-zinc-500">
            กรอกข้อมูลเพื่อสร้างบัญชีและสะสมคะแนนแข่งกับเพื่อนๆ
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          {/* เลือก รูป Avatar */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              เลือกรูปประจำตัว (Avatar)
            </label>
            <div
              role="radiogroup"
              aria-label="รูปโปรไฟล์"
              className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1"
            >
              {AVATAR_IDS.map((id) => {
                const on = selectedAvatar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`รูปโปรไฟล์ ${id}`}
                    onClick={() => setSelectedAvatar(id)}
                    className={`rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                      on
                        ? "scale-105 shadow-md ring-4 ring-[#2B7FFF]"
                        : "hover:scale-105"
                    }`}
                  >
                    <Avatar id={id} size="aspect-square w-full" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">ชื่อแสดงบนอันดับ</label>
            <input
              type="text"
              required
              placeholder="เช่น Somchai_COM7"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">อีเมลบริษัท</label>
            <input
              type="email"
              required
              placeholder="your.name@com7.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">รหัสผ่าน</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none transition-colors focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 w-full rounded-full bg-zinc-900 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "กำลังลงทะเบียน..." : "สมัครสมาชิก"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}