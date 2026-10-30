// app/components/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Profile = {
  userId?: string;
  name: string;
  avatar: string; // URL รูปโปรไฟล์ (ผู้ใช้เก่าอาจเป็น 'p1', 'p2', ...)
};

const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

// รูปสำเร็จรูป /img/p1.png - /img/p25.png
const PRESET_IDS = Array.from({ length: 25 }, (_, i) => `p${i + 1}`);
// "p03" / "3" / "p3" -> "p3" (ไม่ใช่รูปสำเร็จรูป -> "")
const presetOf = (v: string) => (/^p?\d{1,2}$/i.test(v) ? `p${Number(v.replace(/\D/g, ""))}` : "");

// แปลงค่า avatar เป็น src ที่ใช้ได้ (รองรับผู้ใช้เก่าที่เก็บเป็น p1-p25)
function avatarSrc(id: string): string {
  if (!id) return "";
  if (/^(https?:|\/|data:|blob:)/i.test(id)) return id;
  if (/^p?\d+$/i.test(id)) return `/img/p${id.replace(/\D/g, "")}.png`;
  return "";
}

export function Avatar({ id, size, name }: { id: string; size: string; name?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  const src = avatarSrc(id);

  if (!src || failed) {
    const initial = (Array.from((name ?? "").trim())[0] ?? "?").toUpperCase();
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0f1c1a] text-lg font-bold text-[#17FFA2] ${size}`}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-cover ${size}`}
    />
  );
}

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" aria-hidden className={`drop-shadow ${className}`}>
      <path d="M3 9l6 5 7-10 7 10 6-5-3 13H6L3 9z" fill="#F4D35E" stroke="#4A3B00" strokeWidth="1.5" strokeLinejoin="round" />
      {[[3, 9], [16, 4], [29, 9]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="2" fill="#F4D35E" stroke="#4A3B00" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือวิ่ง                                               */
/* ------------------------------------------------------------------ */

const STACK_WORD = "PLAYER";
const STACK_SOLID = "7 DAYS 7 GAMES";
const STACK_ROWS: ("ghost" | "outline" | "solid")[] = ["ghost", "outline", "outline", "solid", "outline", "outline", "ghost"];
const STACK_SECONDS = { ghost: 140, outline: 110, solid: 90 } as const;

function BackdropText() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 flex select-none flex-col justify-center overflow-hidden">
      {STACK_ROWS.map((kind, i) => {
        const solid = kind === "solid";
        const reverse = i % 2 !== 0;
        const text = solid ? STACK_SOLID : STACK_WORD;
        const tone = solid ? "text-[#17FFA2] opacity-[0.1]" : kind === "ghost" ? "txt-bg-outline opacity-50" : "txt-bg-outline";
        return (
          <div key={i} className="overflow-hidden whitespace-nowrap">
            <div
              className={`bg-marquee flex w-max font-bold uppercase leading-[0.9] text-[clamp(3rem,9vw,7.5rem)] ${tone}`}
              style={{ animationDuration: `${STACK_SECONDS[kind]}s`, animationDirection: reverse ? "reverse" : "normal" }}
            >
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

/* ------------------------------------------------------------------ */
/*  ชิ้นส่วนเล็กๆ                                                        */
/* ------------------------------------------------------------------ */

const STYLES = `
  button, a, [role="button"] { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
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

type BtnVariant = "solid" | "outline";

function Btn({
  children,
  onClick,
  variant = "solid",
  disabled = false,
  className = "",
  height = "h-14",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
  height?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] hover:shadow-[0_0_18px_rgba(23,255,162,0.3)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-fx relative inline-flex ${height} items-center justify-center overflow-hidden px-7 text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${styles} ${className}`}
    >
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ปิด"
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white outline-none transition-all hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a] focus-visible:ring-4 focus-visible:ring-[#17FFA2] active:scale-90"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function CardTitle({ id, htmlFor, children }: { id?: string; htmlFor?: string; children: React.ReactNode }) {
  const cls = "text-lg font-bold uppercase tracking-tight";
  return (
    <div className="flex items-center gap-3">
      <span className="h-6 w-2 -skew-x-12 bg-[#17FFA2] text-[#17FFA2] shadow-[0_0_12px_currentColor]" />
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cls}>{children}</label>
      ) : (
        <h2 id={id} className={cls}>{children}</h2>
      )}
    </div>
  );
}

// ถ่ายรูปโปรไฟล์: เปิดกล้องในกรอบวงกลม กดชัตเตอร์แล้วตัดเป็นสี่เหลี่ยมจัตุรัสกลางภาพ
function CameraCapture({ onCapture, onClose }: { onCapture: (f: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("เบราว์เซอร์นี้ไม่รองรับกล้อง");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) setErr("เปิดกล้องไม่ได้ ตรวจสอบสิทธิ์กล้องของเบราว์เซอร์ หรือเลือกรูปจากเครื่องแทน");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const size = Math.min(side, 800);
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size);
    c.toBlob(
      (b) => {
        if (!b) return;
        onCapture(new File([b], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="ถ่ายรูปโปรไฟล์" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 px-6 text-white">
      <p className="mb-5 text-center text-[15px] font-semibold text-white/90">จัดหน้าให้อยู่ในวงกลม</p>
      <div className="relative aspect-square w-[min(80vw,360px)] overflow-hidden rounded-full bg-[#0f1c1a] ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)]">
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />
        {!ready && !err && <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">กำลังเปิดกล้อง</span>}
      </div>
      {err && (
        <p role="alert" style={{ borderColor: RED }} className="mt-5 max-w-xs border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
          {err}
        </p>
      )}
      <div className="mt-8 flex w-full max-w-xs items-center justify-between">
        <button type="button" onClick={onClose} className="h-11 min-w-[84px] px-4 text-[15px] font-semibold text-white/80 hover:text-white">
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={snap}
          disabled={!ready || !!err}
          aria-label="ถ่ายรูป"
          className="h-[72px] w-[72px] rounded-full bg-white ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-black transition-transform active:scale-90 disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          className="h-11 min-w-[84px] px-4 text-[15px] font-semibold text-white/80 hover:text-white"
        >
          สลับกล้อง
        </button>
      </div>
    </div>
  );
}

const pageShell =
  "relative isolate min-h-[100dvh] overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white";

/* ------------------------------------------------------------------ */
/*  PROFILE PAGE                                                       */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState(""); // รูปสำเร็จรูปที่เลือกใหม่
  const [savedCount, setSavedCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const [canCam, setCanCam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ได้มงกุฎเมื่ออยู่อันดับ 1 และมีคะแนนแล้ว
  const isTop = rank === 1 && (score ?? 0) > 0;

  useEffect(() => {
    setCanCam(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );

  useEffect(() => {
    async function loadData() {
      const localData = localStorage.getItem("profile");
      if (!localData) {
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(localData);
        const currentUserId: string | undefined = parsed.userId || parsed.id;

        const initialProfile: Profile = {
          userId: currentUserId,
          name: parsed.name || "ผู้เล่นใหม่",
          avatar: parsed.avatarId || parsed.avatar || "",
        };
        setProfile(initialProfile);
        setName(initialProfile.name);

        if (currentUserId) {
          const res = await fetch(`/api/user?userId=${encodeURIComponent(currentUserId)}`);
          const result = await res.json();
          if (result.success && result.data) {
            const fetchedProfile: Profile = {
              userId: currentUserId,
              name: result.data.name || initialProfile.name,
              avatar: result.data.avatar || result.data.avatarUrl || result.data.avatarId || initialProfile.avatar,
            };
            setProfile(fetchedProfile);
            setName(fetchedProfile.name);
            setSavedCount((result.data.savedEvents?.length || 0) + (result.data.savedGames?.length || 0));
          }

          // คำนวณอันดับ จากคะแนนรวมของทุกคน
          const rankRes = await fetch("/api/user");
          const rankResult = await rankRes.json();
          if (rankResult.success && Array.isArray(rankResult.data)) {
            const sorted = rankResult.data
              .map((u: any) => {
                const fromGames = Object.values(u.gameScores || {}).reduce(
                  (a: number, b: any) => a + (Number(b) || 0),
                  0
                ) as number;
                return { id: u.userId, score: Number(u.points) || fromGames };
              })
              .sort((a: any, b: any) => b.score - a.score);

            const idx = sorted.findIndex((u: any) => u.id === currentUserId);
            if (idx >= 0) {
              setRank(idx + 1);
              setScore(sorted[idx].score);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load profile data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const cleanName = name.trim();
  const valid = cleanName.length >= 2 && cleanName.length <= 20;
  const changed =
    !!profile &&
    (cleanName !== profile.name ||
      !!avatarFile ||
      (!!avatarPreset && avatarPreset !== presetOf(profile.avatar)));
  const shownAvatar = avatarPreview ?? (avatarPreset || profile?.avatar || "");

  const applyAvatar = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("ไฟล์ต้องเป็นรูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreset("");
    setAvatarPreview(URL.createObjectURL(file));
  };

  async function handleSave() {
    if (!profile || !profile.userId || !valid || saving) return;
    setSaving(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("userId", profile.userId);
      fd.append("name", cleanName);
      if (avatarFile) fd.append("avatar", avatarFile);
      else if (avatarPreset) fd.append("avatarPreset", avatarPreset);

      const res = await fetch("/api/user", { method: "PATCH", body: fd });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        setError(result.message || result.error || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
        return;
      }

      const avatar: string = result.data?.avatar || result.data?.avatarUrl || profile.avatar;
      localStorage.setItem(
        "profile",
        JSON.stringify({ userId: profile.userId, name: cleanName, avatar, avatarId: avatar })
      );
      window.dispatchEvent(new Event("storage"));
      router.back();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("profile");
    localStorage.removeItem("userId");
    window.dispatchEvent(new Event("storage"));
    // ล้าง session cookie ฝั่งเซิร์ฟเวอร์ (ถ้ามี route นี้)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  if (loading) {
    return (
      <div className={`${pageShell} flex items-center justify-center`}>
        <style>{STYLES}</style>
        <BackdropText />
        <p className={`animate-pulse text-sm font-bold uppercase tracking-wider ${MUTED}`}>กำลังโหลด...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`${pageShell} flex items-center justify-center px-6`}>
        <style>{STYLES}</style>
        <BackdropText />
        <div className="fx-rise w-full max-w-md border border-[#17FFA2]/40 bg-[#0a1014]/90 p-8 text-center shadow-[10px_10px_0_0_#ff2a55] backdrop-blur-sm">
          <span className="mx-auto mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
          <h1 className="text-2xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)]">ยังไม่ได้เข้าสู่ระบบ</h1>
          <p className={`mt-2 text-sm ${MUTED}`}>กรุณาเข้าสู่ระบบก่อนแก้ไขโปรไฟล์</p>
          <Btn onClick={() => router.push("/login")} className="mt-6">
            ไปที่หน้าเข้าสู่ระบบ
          </Btn>
        </div>
      </div>
    );
  }

  const stats: [string, string][] = [
    [score === null ? "–" : String(score), "คะแนนรวม"],
    [rank === null ? "–" : `#${rank}`, "อันดับ"],
    [String(savedCount), "โปรด"],
  ];

  return (
    <div className={pageShell}>
      <style>{STYLES}</style>
      <BackdropText />

      <div className="mx-auto max-w-5xl px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
        <div className="fx-rise flex items-end justify-between gap-4">
          <div>
            <span className="mb-4 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-3xl font-bold uppercase leading-tight tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-5xl">
              โปรไฟล์ของฉัน
            </h1>
          </div>
          <CloseBtn onClick={() => router.back()} />
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-[360px_1fr] lg:items-start">
          {/* ===== การ์ดตัวอย่างโปรไฟล์ (แสดงผลสดตามที่แก้) ===== */}
          <section
            className="fx-rise relative overflow-hidden border border-[#17FFA2]/40 p-6 sm:p-8 lg:sticky lg:top-6"
            style={{
              animationDelay: "80ms",
              background: isTop
                ? "radial-gradient(circle at 85% 0%, #F4D35E55, transparent 55%), linear-gradient(160deg, rgba(23,255,162,0.22), #0a1014 75%)"
                : "radial-gradient(circle at 85% 0%, rgba(23,255,162,0.22), transparent 55%), linear-gradient(160deg, #0f1c1a, #0a1014 75%)",
            }}
          >
            <span aria-hidden className="pointer-events-none absolute -right-3 -top-4 select-none text-[9rem] font-bold leading-none text-black/30">
              {isTop ? "#1" : "▦"}
            </span>

            <div className="relative flex items-center gap-5 lg:flex-col lg:gap-0 lg:text-center">
              <div className="relative shrink-0 lg:pt-8">
                {isTop && <Crown className="absolute -top-7 left-1/2 w-12 -translate-x-1/2 -rotate-6 lg:top-0 lg:w-14" />}
                <Avatar
                  key={shownAvatar}
                  id={shownAvatar}
                  name={cleanName}
                  size="h-24 w-24 ring-4 ring-[#17FFA2] shadow-[0_0_28px_rgba(23,255,162,0.5)] sm:h-28 sm:w-28 lg:h-36 lg:w-36"
                />
              </div>
              <div className="min-w-0 lg:mt-5">
                <p className="truncate text-2xl font-bold uppercase tracking-tight sm:text-3xl">{cleanName || "ชื่อของคุณ"}</p>
                <p className={`mt-1 text-sm ${isTop ? "text-[#F4D35E]" : MUTED}`}>
                  {isTop ? "ผู้นำอันดับ 1 ตอนนี้" : "ผู้เล่นใน 7 Days 7 Games"}
                </p>
              </div>
            </div>

            <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map(([n, label]) => (
                <div key={label} className="border border-white/10 bg-black/40 px-2 py-4 text-center">
                  <dd className="text-xl font-bold tabular-nums text-[#17FFA2] [text-shadow:0_0_22px_rgba(23,255,162,0.55)] sm:text-2xl">{n}</dd>
                  <dt className={`mt-0.5 text-xs ${MUTED}`}>{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          {/* ===== ฟอร์มแก้ไข ===== */}
          <div className="flex flex-col gap-5">
            <section className="fx-rise border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-6 backdrop-blur-sm sm:p-8" style={{ animationDelay: "160ms" }}>
              <CardTitle htmlFor="pname">ชื่อที่แสดง</CardTitle>
              <div className="relative mt-4">
                <input
                  id="pname"
                  autoComplete="nickname"
                  enterKeyHint="done"
                  value={name}
                  maxLength={20}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อที่จะแสดงบนอันดับ"
                  className="h-14 w-full border border-white/15 bg-black/40 pl-5 pr-16 text-base text-white outline-none transition-all placeholder:text-zinc-500 focus:border-[#17FFA2] focus:shadow-[0_0_18px_rgba(23,255,162,0.25)]"
                />
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs tabular-nums text-zinc-500">
                  {cleanName.length}/20
                </span>
              </div>
              <p className="mt-3 text-sm" style={{ color: valid ? "#8fa6a1" : RED }}>
                {valid ? "ชื่อนี้จะแสดงบนอันดับให้ผู้เล่นคนอื่นเห็น" : "ชื่อต้องยาว 2-20 ตัวอักษร"}
              </p>
            </section>

            <section className="fx-rise border-l-4 border-[#17FFA2] bg-[#0a1014]/90 p-6 backdrop-blur-sm sm:p-8" style={{ animationDelay: "240ms" }}>
              <CardTitle id="avatar-label">รูปโปรไฟล์</CardTitle>
              <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    applyAvatar(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="เลือกรูปโปรไฟล์"
                  className="group relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#17FFA2]/50 bg-black/40 transition-all hover:border-[#17FFA2] hover:shadow-[0_0_24px_rgba(23,255,162,0.35)] active:scale-95"
                >
                  {shownAvatar && avatarSrc(shownAvatar) ? (
                    <Avatar id={shownAvatar} name={cleanName} size="h-full w-full" />
                  ) : (
                    <span className="flex flex-col items-center text-[13px] text-[#8fa6a1] group-hover:text-[#17FFA2]">
                      <svg className="mb-1 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      เลือกรูป
                    </span>
                  )}
                </button>

                <div className="flex flex-col items-center gap-3 sm:items-start">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {canCam && (
                      <Btn onClick={() => setCamOpen(true)} height="h-11" className="px-5">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
                          <circle cx="12" cy="13" r="3.5" />
                        </svg>
                        ถ่ายรูป
                      </Btn>
                    )}
                    <Btn variant="outline" onClick={() => fileInputRef.current?.click()} height="h-11" className="px-5">
                      เลือกรูปจากเครื่อง
                    </Btn>
                  </div>
                  <p className={`text-xs ${MUTED}`}>
                    {avatarFile || avatarPreset ? "เลือกรูปใหม่แล้ว กด บันทึกการเปลี่ยนแปลง เพื่อใช้รูปนี้" : "ไฟล์ไม่เกิน 5MB"}
                  </p>
                </div>
              </div>

              <p className={`mb-3 mt-8 text-sm ${MUTED}`}>หรือเลือกรูปที่มีให้</p>
              <div
                role="radiogroup"
                aria-labelledby="avatar-label"
                className="grid max-h-60 grid-cols-5 gap-3 overflow-y-auto border border-white/15 bg-black/40 p-3 sm:grid-cols-7 lg:grid-cols-5 xl:grid-cols-7"
              >
                {PRESET_IDS.map((id) => {
                  const on = !avatarFile && (avatarPreset ? avatarPreset === id : presetOf(profile.avatar) === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`รูปโปรไฟล์ ${id}`}
                      onClick={() => {
                        setAvatarPreset(id);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setError("");
                      }}
                      className={`rounded-full outline-none transition-all duration-150 focus-visible:ring-4 focus-visible:ring-[#17FFA2] ${
                        on
                          ? "scale-105 ring-4 ring-[#17FFA2] ring-offset-2 ring-offset-[#0a1014] shadow-[0_0_24px_rgba(23,255,162,0.6)]"
                          : "opacity-70 hover:scale-105 hover:opacity-100"
                      }`}
                    >
                      <Avatar id={id} name={id} size="aspect-square w-full" />
                    </button>
                  );
                })}
              </div>
            </section>

            {error && (
              <p role="alert" style={{ borderColor: RED }} className="border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== แถบปุ่มด้านล่าง ===== */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#05080a] from-60% to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-3">
          <Btn variant="outline" onClick={handleLogout} disabled={saving} className="shrink-0">
            ออกจากระบบ
          </Btn>
          <Btn onClick={handleSave} disabled={!valid || !changed || saving} className="flex-1">
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Btn>
        </div>
      </div>

      {camOpen && (
        <CameraCapture
          onClose={() => setCamOpen(false)}
          onCapture={(f) => {
            applyAvatar(f);
            setCamOpen(false);
          }}
        />
      )}
    </div>
  );
}