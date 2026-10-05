"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "in" | "up";
type Step = "form" | "avatar" | "welcome";

const AVATAR_COUNT = 25;
// เปลี่ยนรูปแบบ ID ให้ตรงกับชื่อไฟล์จริง p1 - p25
const AVATAR_IDS = Array.from({ length: AVATAR_COUNT }, (_, i) => `p${i + 1}`);
const FALLBACK_BG = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A"];

type Piece = { id: number; dx: number; dy: number; rot: number; color: string; shape: string; w: number; h: number; delay: number; fall: number; dur: number };
type Burst = { key: number; x: number; y: number; pieces: Piece[] };

const CONFETTI_COLORS = ["#F4D35E", "#A8B5E8", "#B7CBB0", "#F4A58A", "#E8895F"];
const SHAPES: Record<string, React.CSSProperties> = {
  circle: { borderRadius: "50%" },
  rect: { borderRadius: 2 },
  pill: { borderRadius: 999 },
  tri: { clipPath: "polygon(50% 0, 0 100%, 100% 100%)" },
  star: { clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" },
};

function getAvatarSrc(idOrUrl: string) {
  if (!idOrUrl) return "/img/p1.png";
  if (idOrUrl.startsWith("http") || idOrUrl.startsWith("/") || idOrUrl.startsWith("data:")) {
    return idOrUrl;
  }
  // ดึงเฉพาะตัวเลขออกมา เช่น "01", "p1", "1" -> ชี้ไปที่ /img/p1.png
  const num = idOrUrl.replace(/\D/g, "") || "1";
  return `/img/p${num}.png`;
}

function makePieces(n: number, angle: number, spread: number, vmin: number, vmax: number, fall: number): Piece[] {
  const names = Object.keys(SHAPES);
  return Array.from({ length: n }, (_, id) => {
    const a = angle + (Math.random() - 0.5) * spread;
    const speed = vmin + Math.random() * (vmax - vmin);
    const shape = names[Math.floor(Math.random() * names.length)];
    const size = 8 + Math.random() * 8;
    return {
      id,
      dx: Math.cos(a) * speed,
      dy: Math.sin(a) * speed,
      rot: (Math.random() - 0.5) * 900,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape,
      w: size,
      h: shape === "rect" ? size * 0.55 : shape === "pill" ? size * 0.45 : size,
      delay: Math.random() * 120,
      fall,
      dur: 1700 + Math.random() * 700,
    };
  });
}

function ConfettiLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <>
      <style>{`@keyframes confetti-pop {
        0% { transform: translate(0,0) rotate(0) scale(.3); opacity: 1; }
        45% { transform: translate(var(--dx), var(--dy)) rotate(calc(var(--rot) * .5)) scale(1); opacity: 1; }
        100% { transform: translate(calc(var(--dx) * 1.25), calc(var(--dy) + var(--fall))) rotate(var(--rot)) scale(.9); opacity: 0; }
      }`}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {bursts.map((b) => (
          <div key={b.key} className="absolute" style={{ left: b.x, top: b.y }}>
            {b.pieces.map((p) => (
              <span
                key={p.id}
                className="absolute"
                style={
                  {
                    width: p.w,
                    height: p.h,
                    marginLeft: -p.w / 2,
                    marginTop: -p.h / 2,
                    backgroundColor: p.color,
                    ...SHAPES[p.shape],
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--rot": `${p.rot}deg`,
                    "--fall": `${p.fall}px`,
                    animation: `confetti-pop ${p.dur}ms cubic-bezier(.15,.7,.3,1) ${p.delay}ms forwards`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Avatar({ id, size }: { id: string; size: string }) {
  const [failed, setFailed] = useState(false);
  const src = getAvatarSrc(id);

  useEffect(() => {
    setFailed(false);
  }, [id]);

  if (failed) {
    const num = Number(id.replace(/\D/g, ""));
    const bg = isNaN(num) || num === 0 ? FALLBACK_BG[0] : FALLBACK_BG[(num - 1) % 4];
    return (
      <span
        style={{ backgroundColor: bg }}
        className={`flex shrink-0 items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
      >
        {id.length <= 3 ? id.toUpperCase() : id.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={216}
      height={216}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${size}`}
    />
  );
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [step, setStep] = useState<Step>("form");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("p1");
  const [customAvatar, setCustomAvatar] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (window.location.hash === "#signup") setMode("up");
  }, []);

  useEffect(() => {
    if (step !== "welcome") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const fire = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mk = (x: number, deg: number): Burst => ({
        key: Date.now() + Math.random(),
        x,
        y: h,
        pieces: makePieces(45, (deg * Math.PI) / 180, 0.7, 320, 620, h * 0.9),
      });
      const group = [mk(0, -62), mk(w, -118)];
      setBursts((b) => [...b, ...group]);
      timers.push(setTimeout(() => setBursts((b) => b.filter((x) => !group.includes(x))), 3000));
    };
    timers.push(setTimeout(fire, 250), setTimeout(fire, 800));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up" && name.trim().length < 2) return setError("กรอกชื่อที่จะแสดงบนอันดับ อย่างน้อย 2 ตัวอักษร");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("รูปแบบอีเมลไม่ถูกต้อง");
    if (password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    setError("");
    setBusy(true);

    try {
      if (mode === "in") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ API /api/auth/login");
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        }

        const profileData = {
          userId: data.data.userId || data.data.id || data.data._id,
          name: data.data.name || name,
          avatar: data.data.avatarId || data.data.avatar || "p1",
          avatarId: data.data.avatarId || data.data.avatar || "p1",
          email: data.data.email || email,
        };

        localStorage.setItem("profile", JSON.stringify(profileData));
        localStorage.setItem("userId", profileData.userId);
        window.dispatchEvent(new Event("storage"));
        router.push("/");
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ API /api/auth/register");
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "สมัครสมาชิกไม่สำเร็จ");
        }

        const uId = data.data.userId || data.data.id || data.data._id;
        setUserId(uId);
        localStorage.setItem("userId", uId);
        setStep("avatar");
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAvatar() {
    setBusy(true);
    const selectedAvatar = customAvatar.trim() ? customAvatar.trim() : avatar;
    const updatedProfile = { userId, name, avatarId: selectedAvatar, avatar: selectedAvatar, email };

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          avatarId: selectedAvatar,
          name,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const savedData = {
          ...data.data,
          userId: data.data.userId || userId,
          avatar: data.data.avatarId || selectedAvatar,
          avatarId: data.data.avatarId || selectedAvatar,
        };
        localStorage.setItem("profile", JSON.stringify(savedData));
      } else {
        localStorage.setItem("profile", JSON.stringify(updatedProfile));
      }
    } catch (err) {
      console.error("Failed to update avatar via API:", err);
      localStorage.setItem("profile", JSON.stringify(updatedProfile));
    } finally {
      localStorage.setItem("userId", userId);
      window.dispatchEvent(new Event("storage"));
      setBusy(false);
      setStep("welcome");
    }
  }

  // ===== ขั้นเลือก Avatar =====
  if (step === "avatar") {
    const activeAvatar = customAvatar.trim() ? customAvatar.trim() : avatar;

    return (
      <div className="min-h-screen bg-zinc-50 px-4 pb-32 pt-4 font-sans text-zinc-900 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          {/* การ์ดหัวสีพาสเทล แสดงรูปที่เลือกอยู่ */}
          <header className="relative flex items-center gap-5 overflow-hidden rounded-[2rem] bg-[#A8B5E8] p-6 text-[#1F2A5C] sm:gap-8 sm:p-10">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F4D35E] opacity-70" />
            <span aria-hidden className="pointer-events-none absolute -bottom-14 right-16 h-32 w-32 rounded-full bg-[#F4A58A] opacity-60" />
            <Avatar id={activeAvatar} size="relative h-20 w-20 ring-4 ring-white sm:h-28 sm:w-28" />
            <div className="relative min-w-0">
              <p className="text-sm opacity-70">สมัครสำเร็จแล้ว</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">เลือก Avatar ของคุณ</h1>
              <p className="mt-1 truncate text-sm opacity-70">รูปนี้จะแสดงข้างชื่อ {name} บนอันดับ</p>
            </div>
          </header>

          <section className="mt-4 rounded-[2rem] bg-white p-5 ring-1 ring-black/5 sm:mt-5 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#9CC593]" />
              <h2 id="avatar-label" className="text-lg font-semibold tracking-tight">รูปโปรไฟล์</h2>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="avatar-label"
              className="mt-5 grid grid-cols-5 gap-3 p-1 sm:grid-cols-7 sm:gap-4 md:grid-cols-9"
            >
              {AVATAR_IDS.map((id) => {
                const on = !customAvatar && avatar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`รูปโปรไฟล์ ${id}`}
                    onClick={() => {
                      setAvatar(id);
                      setCustomAvatar("");
                    }}
                    className={`rounded-full outline-none transition-transform duration-150 focus-visible:ring-4 focus-visible:ring-blue-400 ${
                      on ? "scale-105 shadow-lg ring-4 ring-zinc-900 ring-offset-2" : "hover:scale-105"
                    }`}
                  >
                    <Avatar id={id} size="aspect-square w-full" />
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-6">
              <label htmlFor="custom-avatar" className="block text-sm font-medium text-zinc-700">
                หรือระบุ URL รูปภาพโปรไฟล์ของคุณเอง
              </label>
              <input
                id="custom-avatar"
                type="url"
                placeholder="https://example.com/my-avatar.png"
                value={customAvatar}
                onChange={(e) => setCustomAvatar(e.target.value)}
                className="mt-2 h-12 w-full rounded-full border border-black/[.08] bg-zinc-50 px-5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white"
              />
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
          <button
            onClick={confirmAvatar}
            disabled={busy}
            className="flex h-14 w-full max-w-sm items-center justify-center gap-3 rounded-full bg-zinc-900 text-base font-medium text-white shadow-lg transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <Avatar id={activeAvatar} size="h-8 w-8 ring-2 ring-white/70" />
            {busy ? "กำลังบันทึก..." : "ใช้รูปนี้"}
          </button>
        </div>
      </div>
    );
  }

  const field =
    "h-12 w-full rounded-full border border-black/[.08] bg-zinc-50 px-5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white";
  const primary =
    "flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white outline-none transition-colors hover:bg-zinc-700 focus-visible:ring-4 focus-visible:ring-blue-400 disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-3 font-sans text-zinc-900 sm:p-4 md:p-6">
      <ConfettiLayer bursts={bursts} />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] ring-1 ring-black/5 md:min-h-[640px] md:grid-cols-2">
        {/* ===== ฝั่งซ้าย: แบรนด์ (บนมือถือเป็นหัวแบบกะทัดรัด) ===== */}
        <aside className="relative flex flex-col justify-between gap-6 overflow-hidden bg-[#F4A58A] p-6 text-[#4A2412] sm:p-8 md:gap-12 md:p-10">
          {/* วงกลมตกแต่ง */}
          <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#F4D35E] opacity-70 md:-right-20 md:top-1/3 md:h-64 md:w-64" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 hidden h-48 w-48 rounded-full bg-[#A8B5E8] opacity-60 md:block" />

          <Link href="/" aria-label="กลับหน้าแรก" className="relative flex w-fit items-center">
            <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto" />
          </Link>
          <div className="relative">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
              7 Days
              <br />
              7 Games
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 opacity-70 md:mt-5 md:text-base md:leading-7">
              สมัครครั้งเดียว เล่นได้ทุกเกม แต้มของคุณจะถูกบันทึกและขึ้นอันดับอัตโนมัติ
            </p>
          </div>
          <div className="relative hidden gap-2 md:flex" aria-hidden>
            {["#F4D35E", "#A8B5E8", "#B7CBB0", "#FFFFFF"].map((c, i) => (
              <span key={i} style={{ backgroundColor: c }} className={`h-10 w-10 ${i % 2 === 0 ? "rounded-full" : "rounded-xl"}`} />
            ))}
          </div>
        </aside>

        {/* ===== ฝั่งขวา: ฟอร์ม ===== */}
        <main className="flex flex-col justify-center bg-white p-6 sm:p-8 md:p-12">
          {step === "form" && (
            <>
              <div role="tablist" className="flex w-fit rounded-full bg-zinc-100 p-1">
                {(
                  [
                    ["in", "เข้าสู่ระบบ"],
                    ["up", "สมัครเข้าร่วม"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`h-10 rounded-full px-5 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-blue-400 ${
                      mode === m ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-3xl font-semibold tracking-tight">
                {mode === "in" ? "ยินดีต้อนรับกลับ" : "เริ่มเล่นใน 1 นาที"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {mode === "in" ? "เข้าสู่ระบบเพื่อเล่นต่อและดูอันดับของคุณ" : "ใช้อีเมลบริษัทและตั้งชื่อที่จะแสดงบนอันดับ"}
              </p>

              <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-3">
                {mode === "up" && (
                  <input
                    className={field}
                    placeholder="ชื่อที่แสดง"
                    aria-label="ชื่อที่แสดง"
                    autoComplete="nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <input
                  className={field}
                  type="email"
                  placeholder="อีเมล"
                  aria-label="อีเมล"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="relative">
                  <input
                    className={`${field} pr-20`}
                    type={show ? "text" : "password"}
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    aria-label="รหัสผ่าน"
                    autoComplete={mode === "in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-full px-3 text-xs font-medium text-zinc-500 hover:bg-black/[.05] hover:text-zinc-900"
                  >
                    {show ? "ซ่อน" : "แสดง"}
                  </button>
                </div>

                {error && (
                  <p role="alert" className="rounded-2xl bg-[#F4A58A]/25 px-4 py-3 text-sm text-[#4A2412]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className={`${primary} mt-2`}>
                  {busy ? "กำลังดำเนินการ..." : mode === "in" ? "เข้าสู่ระบบ" : "สมัครและไปต่อ"}
                </button>
              </form>

              <p className="mt-6 text-sm text-zinc-500">
                {mode === "in" ? "ยังไม่มีบัญชี " : "มีบัญชีอยู่แล้ว "}
                <button onClick={() => switchMode(mode === "in" ? "up" : "in")} className="font-medium text-zinc-900 underline underline-offset-4">
                  {mode === "in" ? "สมัครเข้าร่วม" : "เข้าสู่ระบบ"}
                </button>
              </p>
            </>
          )}

          {step === "welcome" && (
            <div className="flex flex-col items-start">
              <Avatar id={customAvatar.trim() ? customAvatar.trim() : avatar} size="h-28 w-28 text-6xl ring-4 ring-[#F4D35E]" />
              <h2 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">ยินดีต้อนรับ {name}</h2>
              <p className="mt-3 max-w-sm text-base leading-7 text-zinc-500">
                บัญชีพร้อมแล้ว ลองเล่นเกมแรกเพื่อเริ่มสะสมแต้ม แล้วดูว่าคุณอยู่อันดับไหน
              </p>
              <button onClick={() => router.push("/")} className={`${primary} mt-8 sm:w-56`}>
                เริ่มเล่นเลย
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}