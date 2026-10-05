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

  const field =
    "mt-2 h-12 w-full rounded-full border border-black/[.08] bg-zinc-50 px-5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white";
  const label = "block pl-2 text-sm font-medium text-zinc-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-3 font-sans text-zinc-900 sm:p-4 md:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] ring-1 ring-black/5 md:grid-cols-[2fr_3fr]">
        {/* ===== ฝั่งซ้าย: แบรนด์ + ตัวอย่างโปรไฟล์ที่กำลังสร้าง ===== */}
        <aside className="relative overflow-hidden bg-[#A8B5E8] p-6 text-[#1F2A5C] sm:p-8 md:p-10">
          <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#F4D35E] opacity-70" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 hidden h-48 w-48 rounded-full bg-[#F4A58A] opacity-60 md:block" />

          <div className="relative flex h-full flex-col gap-6 md:sticky md:top-10 md:min-h-[480px] md:justify-between md:gap-12">
            <Link href="/" aria-label="กลับหน้าแรก" className="flex w-fit items-center">
              <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto" />
            </Link>

            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                สมัครเข้าร่วม
                <br />
                กิจกรรม
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-6 opacity-70 md:text-base md:leading-7">
                กรอกข้อมูลเพื่อสร้างบัญชีและสะสมคะแนนแข่งกับเพื่อนๆ
              </p>
            </div>

            {/* ตัวอย่างโปรไฟล์ อัปเดตสดตามที่กรอก */}
            <div className="flex items-center gap-4 rounded-3xl bg-white/70 p-4">
              <Avatar id={selectedAvatar} size="h-14 w-14 ring-2 ring-white md:h-16 md:w-16" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">{name.trim() || "ชื่อของคุณ"}</p>
                <p className="text-xs opacity-70">จะแสดงบนอันดับแบบนี้</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== ฝั่งขวา: ฟอร์ม ===== */}
        <main className="bg-white p-6 sm:p-8 md:p-12">
          {error && (
            <div role="alert" className="mb-6 rounded-2xl bg-[#F4A58A]/25 p-4 text-center text-sm font-medium text-[#4A2412]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* เลือก รูป Avatar */}
            <div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#9CC593]" />
                <p id="avatar-label" className="text-lg font-semibold tracking-tight">
                  เลือกรูปประจำตัว
                </p>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="avatar-label"
                className="mt-4 grid max-h-56 grid-cols-5 gap-3 overflow-y-auto rounded-3xl bg-zinc-50 p-3 sm:grid-cols-6 md:max-h-60"
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
                      className={`rounded-full outline-none transition-transform duration-150 focus-visible:ring-4 focus-visible:ring-blue-400 ${
                        on ? "scale-105 shadow-md ring-4 ring-zinc-900 ring-offset-2 ring-offset-zinc-50" : "hover:scale-105"
                      }`}
                    >
                      <Avatar id={id} size="aspect-square w-full" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className={label}>ชื่อแสดงบนอันดับ</label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="เช่น Somchai_COM7"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </div>

            <div>
              <label htmlFor="reg-email" className={label}>อีเมลบริษัท</label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="your.name@com7.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-pass" className={label}>รหัสผ่าน</label>
                <input
                  id="reg-pass"
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="reg-confirm" className={label}>ยืนยันรหัสผ่าน</label>
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={field}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-14 w-full rounded-full bg-zinc-900 text-base font-medium text-white outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-4 focus-visible:ring-blue-400 disabled:opacity-50"
            >
              {loading ? "กำลังลงทะเบียน..." : "สมัครสมาชิก"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="font-semibold text-zinc-900 underline underline-offset-4">
              เข้าสู่ระบบ
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}