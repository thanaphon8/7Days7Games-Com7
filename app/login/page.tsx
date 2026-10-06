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

const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

type Piece = { id: number; dx: number; dy: number; rot: number; color: string; shape: string; w: number; h: number; delay: number; fall: number; dur: number };
type Burst = { key: number; x: number; y: number; pieces: Piece[] };

// คอนเฟตตีโทนนีออนให้เข้ากับธีม
const CONFETTI_COLORS = ["#17FFA2", "#ff2a55", "#F4D35E", "#FFFFFF", "#6dffc6"];
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
        className={`flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-900 ${size}`}
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

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือซ้อนๆ วิ่งช้าๆ ตลอดเวลา (เหมือนหน้าหลัก)          */
/* ------------------------------------------------------------------ */

const STACK_WORD = "LOGIN";
const STACK_SOLID = "7 DAYS 7 GAMES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
// ยิ่งตัวเลขมาก ยิ่งวิ่งช้า (วินาทีต่อหนึ่งรอบ)
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex select-none flex-col justify-center overflow-hidden"
    >
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "txt-bg-outline opacity-50" : "txt-bg-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`bg-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
              style={{
                animationDuration: `${STACK_SECONDS[kind]}s`,
                animationDirection: reverse ? "reverse" : "normal",
              }}
            >
              {/* ซ้ำสองชุดเท่ากัน เพื่อให้วนต่อกันเนียนไม่มีรอยต่อ */}
              {[0, 1].map((g) => (
                <div key={g} className="flex shrink-0 gap-[0.45em] pr-[0.45em]">
                  {Array.from({ length: solid ? 3 : 5 }).map((_, j) => (
                    <span key={j}>{text}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STYLES = `
  .txt-bg-outline { color: transparent; -webkit-text-stroke: 1.5px rgba(23,255,162,.13); }
  @keyframes bg-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .bg-marquee { animation: bg-marquee linear infinite; will-change: transform; }
  .btn-shine { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%); transform: translateX(-120%); transition: transform .6s ease; pointer-events: none; }
  .btn-fx:hover .btn-shine { transform: translateX(120%); }
  @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  .fx-rise { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }
  @media (prefers-reduced-motion: reduce) {
    .bg-marquee, .fx-rise { animation: none !important; }
  }
`;

const pageShell =
  "relative isolate min-h-screen bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white";

// ปุ่มเอียงแบบ esport
function Btn({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-fx relative inline-flex h-12 items-center justify-center overflow-hidden bg-[#17FFA2] px-7 text-xs font-bold uppercase tracking-wider text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] transition-all hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-flex items-center gap-3">{children}</span>
    </button>
  );
}

function CardTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-6 w-2 -skew-x-12 bg-[#17FFA2] text-[#17FFA2] shadow-[0_0_12px_currentColor]" />
      <h2 id={id} className="text-lg font-bold uppercase tracking-tight">{children}</h2>
    </div>
  );
}

const field =
  "h-12 w-full border border-white/15 bg-black/40 px-5 text-base text-white outline-none transition-all placeholder:text-zinc-500 focus:border-[#17FFA2] focus:shadow-[0_0_18px_rgba(23,255,162,0.25)]";

/* ------------------------------------------------------------------ */
/*  LOGIN                                                              */
/* ------------------------------------------------------------------ */

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
      <div className={`${pageShell} px-4 pb-32 pt-4 sm:px-6 sm:pt-8`}>
        <style>{STYLES}</style>
        <BackdropText />
        <div className="mx-auto max-w-3xl">
          {/* การ์ดหัว แสดงรูปที่เลือกอยู่ */}
          <header
            className="fx-rise relative flex items-center gap-5 overflow-hidden border border-[#17FFA2]/40 p-6 shadow-[10px_10px_0_0_#ff2a55] sm:gap-8 sm:p-10"
            style={{ background: "radial-gradient(circle at 90% 0%, rgba(23,255,162,0.22), transparent 55%), linear-gradient(160deg, #0f1c1a, #0a1014 75%)" }}
          >
            <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 select-none text-[9rem] font-bold leading-none text-black/30">▦</span>
            <Avatar id={activeAvatar} size="relative h-20 w-20 ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)] sm:h-28 sm:w-28" />
            <div className="relative min-w-0">
              <span className="mb-3 block h-1.5 w-12 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
              <p className="text-sm text-[#17FFA2]">สมัครสำเร็จแล้ว</p>
              <h1 className="mt-1 text-2xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-4xl">เลือก Avatar ของคุณ</h1>
              <p className={`mt-1 truncate text-sm ${MUTED}`}>รูปนี้จะแสดงข้างชื่อ {name} บนอันดับ</p>
            </div>
          </header>

          <section
            className="fx-rise mt-4 border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-5 backdrop-blur-sm sm:mt-5 sm:p-8"
            style={{ animationDelay: "100ms" }}
          >
            <CardTitle id="avatar-label">รูปโปรไฟล์</CardTitle>
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
                    className={`rounded-full outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-[#17FFA2] ${
                      on
                        ? "scale-105 ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-[#0a1014] shadow-[0_0_24px_rgba(23,255,162,0.6)]"
                        : "opacity-70 hover:scale-105 hover:opacity-100"
                    }`}
                  >
                    <Avatar id={id} size="aspect-square w-full" />
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <label htmlFor="custom-avatar" className={`block text-sm font-medium ${MUTED}`}>
                หรือระบุ URL รูปภาพโปรไฟล์ของคุณเอง
              </label>
              <input
                id="custom-avatar"
                type="url"
                placeholder="https://example.com/my-avatar.png"
                value={customAvatar}
                onChange={(e) => setCustomAvatar(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#05080a] from-60% to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
          <Btn onClick={confirmAvatar} disabled={busy} className="h-14 w-full max-w-sm">
            <Avatar id={activeAvatar} size="h-8 w-8 ring-2 ring-[#04110a]/60" />
            {busy ? "กำลังบันทึก..." : "ใช้รูปนี้"}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageShell} flex items-center justify-center p-3 sm:p-4 md:p-6`}>
      <style>{STYLES}</style>
      <BackdropText />
      <ConfettiLayer bursts={bursts} />
      <div className="fx-rise grid w-full max-w-5xl overflow-hidden border border-[#17FFA2]/40 shadow-[10px_10px_0_0_#ff2a55] md:min-h-[640px] md:grid-cols-2">
        {/* ===== ฝั่งซ้าย: แบรนด์ (บนมือถือเป็นหัวแบบกะทัดรัด) ===== */}
        <aside
          className="relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8 md:gap-12 md:p-10"
          style={{ background: "radial-gradient(circle at 100% 0%, rgba(23,255,162,0.28), transparent 55%), linear-gradient(160deg, #0f1c1a, #05080a 85%)" }}
        >
          {/* glyph ใหญ่จางๆ ตกแต่งพื้นหลัง */}
          <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-4 select-none text-[14rem] font-bold leading-none text-black/30">▦</span>

          <Link href="/" aria-label="กลับหน้าแรก" className="relative flex w-fit items-center bg-white px-3 py-1.5">
            <Image src="/img/com7logo.png" alt="COM7" width={120} height={36} priority className="h-9 w-auto" />
          </Link>
          <div className="relative">
            <span className="mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-4xl font-bold uppercase leading-[1.05] tracking-tight [text-shadow:0_0_30px_rgba(23,255,162,0.35)] sm:text-5xl md:text-7xl">
              7 Days
              <br />
              7 Games
            </h1>
            <p className={`mt-3 max-w-xs text-sm leading-6 md:mt-5 md:text-base md:leading-7 ${MUTED}`}>
              สมัครครั้งเดียว เล่นได้ทุกเกม แต้มของคุณจะถูกบันทึกและขึ้นอันดับอัตโนมัติ
            </p>
          </div>
          <div className="relative hidden gap-2 md:flex" aria-hidden>
            {["#17FFA2", "#ff2a55", "#F4D35E", "#FFFFFF"].map((c, i) => (
              <span key={i} style={{ backgroundColor: c }} className="h-10 w-10 -skew-x-12" />
            ))}
          </div>
        </aside>

        {/* ===== ฝั่งขวา: ฟอร์ม ===== */}
        <main className="flex flex-col justify-center bg-[#0a1014]/95 p-6 backdrop-blur-sm sm:p-8 md:p-12">
          {step === "form" && (
            <>
              <div role="tablist" className="flex w-fit gap-2">
                {(
                  [
                    ["in", "เข้าสู่ระบบ"],
                    ["up", "สมัครเข้าร่วม"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`btn-fx relative overflow-hidden px-5 py-2.5 text-xs font-bold uppercase tracking-wider outline-none transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 ${
                      mode === m
                        ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)]"
                        : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a]"
                    }`}
                  >
                    <span className="btn-shine" aria-hidden="true" />
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-3xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)]">
                {mode === "in" ? "ยินดีต้อนรับกลับ" : "เริ่มเล่นใน 1 นาที"}
              </h2>
              <p className={`mt-2 text-sm ${MUTED}`}>
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
                    className="absolute right-2 top-1/2 h-8 -translate-y-1/2 px-3 text-xs font-bold uppercase text-[#8fa6a1] transition-colors hover:bg-white/10 hover:text-[#17FFA2]"
                  >
                    {show ? "ซ่อน" : "แสดง"}
                  </button>
                </div>

                {error && (
                  <p
                    role="alert"
                    style={{ borderColor: RED }}
                    className="border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]"
                  >
                    {error}
                  </p>
                )}

                <Btn type="submit" disabled={busy} className="mt-2 w-full">
                  {busy ? "กำลังดำเนินการ..." : mode === "in" ? "เข้าสู่ระบบ" : "สมัครและไปต่อ"}
                </Btn>
              </form>

              <p className={`mt-6 text-sm ${MUTED}`}>
                {mode === "in" ? "ยังไม่มีบัญชี " : "มีบัญชีอยู่แล้ว "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "in" ? "up" : "in")}
                  className="font-bold text-[#17FFA2] underline underline-offset-4 transition-colors hover:text-[#6dffc6]"
                >
                  {mode === "in" ? "สมัครเข้าร่วม" : "เข้าสู่ระบบ"}
                </button>
              </p>
            </>
          )}

          {step === "welcome" && (
            <div className="flex flex-col items-start">
              <Avatar
                id={customAvatar.trim() ? customAvatar.trim() : avatar}
                size="h-28 w-28 text-6xl ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)]"
              />
              <span className="mt-8 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
              <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-4xl">ยินดีต้อนรับ {name}</h2>
              <p className={`mt-3 max-w-sm text-base leading-7 ${MUTED}`}>
                บัญชีพร้อมแล้ว ลองเล่นเกมแรกเพื่อเริ่มสะสมแต้ม แล้วดูว่าคุณอยู่อันดับไหน
              </p>
              <Btn onClick={() => router.push("/")} className="mt-8 w-full sm:w-56">
                เริ่มเล่นเลย
              </Btn>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}