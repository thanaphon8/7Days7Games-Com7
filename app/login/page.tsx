"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "in" | "up";
type Step = "form" | "avatar" | "welcome";

// รูปโปรไฟล์: วางไฟล์ไว้ที่ public/img/avatars/01.png ... 25.png (เพิ่ม/ลดได้ที่ AVATAR_COUNT)
const AVATAR_COUNT = 25;
const AVATAR_IDS = Array.from({ length: AVATAR_COUNT }, (_, i) => String(i + 1).padStart(2, "0"));
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

// angle = ทิศที่ยิง (เรเดียน, ลบ = ขึ้นบน), spread = ความกว้างของลำ, vmin/vmax = ความแรง
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
  // ถ้ายังไม่มีไฟล์ภาพ จะแสดงวงกลมสีพร้อมเลขแทนชั่วคราว
  if (failed)
    return (
      <span
        style={{ backgroundColor: FALLBACK_BG[(Number(id) - 1) % 4] }}
        className={`flex items-center justify-center rounded-full font-light text-zinc-900 ${size}`}
      >
        {id}
      </span>
    );
  return (
    <Image
      src={`/img/avatars/${id}.png`}
      alt=""
      width={216}
      height={216}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover ${size}`}
    />
  );
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("01");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (window.location.hash === "#signup") setMode("up");
  }, []);

  // พลุกระดาษ: ยิงจากมุมล่างซ้ายและขวา เมื่อขึ้นหน้า Welcome
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
    // TODO: เชื่อมระบบสมัคร/เข้าสู่ระบบจริงตรงนี้ (ตอนนี้จำลองการโหลด)
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    if (mode === "in") {
      // TODO: ดึงชื่อ/รูปโปรไฟล์จากระบบจริง (ตอนนี้ถ้ายังไม่เคยมีโปรไฟล์ในเบราว์เซอร์ จะสร้างจากอีเมลให้ก่อน)
      try {
        if (!localStorage.getItem("profile")) localStorage.setItem("profile", JSON.stringify({ name: email.split("@")[0], avatar: "01" }));
      } catch {}
      router.push("/");
    }
    else setStep("avatar"); // สมัครเสร็จ ไปเลือกรูปโปรไฟล์ต่อ
  }

  function confirmAvatar() {
    // TODO: บันทึกรูปโปรไฟล์ลงระบบจริง (ตอนนี้เก็บไว้ในเบราว์เซอร์เพื่อให้หน้าอื่นอ่านต่อได้)
    try {
      localStorage.setItem("profile", JSON.stringify({ name, avatar }));
    } catch {}
    setStep("welcome");
  }

  // ===== ขั้นที่ 2: เลือกรูปโปรไฟล์ (เต็มหน้า) =====
  if (step === "avatar") {
    return (
      <div className="min-h-screen bg-[#E6E8EC] px-4 pb-28 pt-10 font-sans text-zinc-900">
        <h1 className="text-center text-xl font-semibold tracking-tight">เลือก Avatar ของคุณ</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">สมัครสำเร็จแล้ว รูปนี้จะแสดงข้างชื่อ {name} บนอันดับ</p>

        <div className="mx-auto mt-8 max-w-3xl rounded-[2rem] bg-white p-6 sm:p-10">
          <div role="radiogroup" aria-label="รูปโปรไฟล์" className="grid grid-cols-3 gap-5 sm:grid-cols-5 sm:gap-6">
            {AVATAR_IDS.map((id) => {
              const on = avatar === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={on}
                  aria-label={`รูปโปรไฟล์ ${id}`}
                  onClick={() => setAvatar(id)}
                  className={`rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                    on ? "scale-110 shadow-xl ring-4 ring-[#2B7FFF]" : "hover:scale-105"
                  }`}
                >
                  <Avatar id={id} size="aspect-square w-full" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#E6E8EC] via-[#E6E8EC]/90 to-transparent px-4 pb-6 pt-10">
          <button onClick={confirmAvatar} className="flex h-12 w-full max-w-xs items-center justify-center gap-3 rounded-full bg-zinc-900 text-sm font-medium text-white shadow-lg transition-colors hover:bg-zinc-700">
            <Avatar id={avatar} size="h-8 w-8" />
            ใช้รูปนี้
          </button>
        </div>
      </div>
    );
  }

  const field =
    "h-12 w-full rounded-full border border-black/[.08] bg-white px-5 text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900";
  const primary =
    "flex h-12 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 font-sans text-zinc-900 md:p-6">
      <ConfettiLayer bursts={bursts} />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] md:min-h-[640px] md:grid-cols-2">
        {/* ฝั่งแบรนด์ */}
        <aside className="flex flex-col justify-between gap-12 bg-[#F4A58A] p-8 text-[#4A2412] md:p-10">
          <Link href="/" aria-label="กลับหน้าแรก" className="flex w-fit items-center">
            <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto" />
          </Link>
          <div>
            <h1 className="text-6xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              7 Days
              <br />
              7 Games
            </h1>
            <p className="mt-5 max-w-xs text-base leading-7 opacity-70">
              สมัครครั้งเดียว เล่นได้ทุกเกม แต้มของคุณจะถูกบันทึกและขึ้นอันดับอัตโนมัติ
            </p>
          </div>
          <div className="flex gap-2" aria-hidden>
            {["#F4D35E", "#A8B5E8", "#B7CBB0", "#FFFFFF"].map((c, i) => (
              <span key={i} style={{ backgroundColor: c }} className={`h-10 w-10 ${i % 2 === 0 ? "rounded-full" : "rounded-xl"}`} />
            ))}
          </div>
        </aside>

        <main className="flex flex-col justify-center bg-zinc-50 p-8 md:p-12">
          {/* ===== ขั้นที่ 1: ฟอร์ม ===== */}
          {step === "form" && (
            <>
              <div role="tablist" className="flex w-fit rounded-full bg-white p-1 ring-1 ring-black/[.06]">
                {([["in", "เข้าสู่ระบบ"], ["up", "สมัครเข้าร่วม"]] as const).map(([m, label]) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`h-10 rounded-full px-5 text-sm font-medium transition-colors ${
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
                  <input className={field} placeholder="ชื่อที่แสดง" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} />
                )}
                <input className={field} type="email" placeholder="อีเมล" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="relative">
                  <input
                    className={`${field} pr-20`}
                    type={show ? "text" : "password"}
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
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
                  <p role="alert" className="rounded-2xl bg-[#F4A58A]/20 px-4 py-3 text-sm text-[#4A2412]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className={`${primary} mt-2`}>
                  {busy ? "กำลังดำเนินการ" : mode === "in" ? "เข้าสู่ระบบ" : "สมัครและไปต่อ"}
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

          {/* ===== ขั้นที่ 3: ต้อนรับ ===== */}
          {step === "welcome" && (
            <div className="flex flex-col items-start">
              <Avatar id={avatar} size="h-28 w-28 text-6xl" />
              <h2 className="mt-8 text-4xl font-semibold tracking-tight">ยินดีต้อนรับ {name}</h2>
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