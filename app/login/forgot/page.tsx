// app/login/forgot/page.tsx
"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { COMPANIES } from "../../components/departments";

/* ------------------------------------------------------------------ */
/*  ค่าคงที่                                                            */
/* ------------------------------------------------------------------ */

type Errors = Record<string, string | undefined>;

const RED = "#ff2a55";
const MUTED = "text-[#8fa6a1]";

const STEPS = ["ยืนยันตัวตน", "ตั้งรหัสผ่านใหม่"] as const;

/* ------------------------------------------------------------------ */
/*  พื้นหลังตัวหนังสือวิ่ง                                               */
/* ------------------------------------------------------------------ */

const STACK_WORD = "RESET";
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

const pageShell =
  "relative isolate min-h-[100dvh] overflow-x-clip bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white";

const field =
  "h-12 w-full border border-white/15 bg-black/40 px-5 text-base text-white outline-none transition-all placeholder:text-zinc-500 focus:border-[#17FFA2] focus:shadow-[0_0_18px_rgba(23,255,162,0.25)]";

/* ------------------------------------------------------------------ */
/*  ชิ้นส่วนเล็กๆ                                                        */
/* ------------------------------------------------------------------ */

function Btn({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const styles =
    variant === "solid"
      ? "bg-[#17FFA2] text-[#04110a] shadow-[0_0_22px_rgba(23,255,162,0.45)] hover:bg-[#6dffc6] hover:shadow-[0_0_34px_rgba(23,255,162,0.7)]"
      : "border border-[#17FFA2]/50 bg-[#17FFA2]/15 text-white hover:border-[#17FFA2] hover:bg-[#17FFA2] hover:text-[#04110a]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-fx relative inline-flex h-12 items-center justify-center overflow-hidden px-7 text-xs font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${styles} ${className}`}
    >
      <span className="btn-shine" aria-hidden="true" />
      <span className="relative inline-flex items-center gap-3">{children}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  hint,
  maxLength,
  autoComplete,
  autoFocus,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  trailing?: ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-white/85">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          style={error ? { borderColor: RED } : undefined}
          className={`${field} ${trailing ? "pr-20" : ""}`}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={msgId} role="alert" className="mt-1.5 text-[13px] text-[#ff7b94]">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className={`mt-1.5 text-xs ${MUTED}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ShowBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-10 px-3 text-xs font-bold uppercase text-[#8fa6a1] transition-colors hover:bg-white/10 hover:text-[#17FFA2]"
    >
      {show ? "ซ่อน" : "แสดง"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  FORGOT PASSWORD                                                    */
/* ------------------------------------------------------------------ */

export default function ForgotPassword() {
  const router = useRouter();
  const selectId = useId();

  const [step, setStep] = useState(0); // 0 = ยืนยันตัวตน, 1 = ตั้งรหัสใหม่
  const [username, setUsername] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const clearErr = (key: string) => setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));
  const edit = (key: string, set: (v: string) => void) => (v: string) => {
    set(v);
    clearErr(key);
  };

  /* ---------- ขั้น 1: ตรวจ username + บริษัท + รหัสพนักงาน ---------- */
  async function verify() {
    if (!username.trim() || !companyId || !employeeId.trim()) {
      setErrors({ form: "กรอกข้อมูลให้ครบทั้ง 3 ช่อง" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "verify",
          username: username.trim(),
          companyId,
          employeeId: employeeId.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setErrors({ form: data.error ?? "ข้อมูลไม่ถูกต้อง" });
        return;
      }
      setToken(data.token);
      setPassword("");
      setConfirm("");
      setStep(1);
    } catch {
      setErrors({ form: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  /* ---------- ขั้น 2: ตั้งรหัสผ่านใหม่ ---------- */
  async function reset() {
    const errs: Errors = {};
    if (!password) errs.password = "กรอกรหัสผ่านใหม่";
    else if (password.length < 6 || password.length > 72) errs.password = "รหัสผ่านต้องยาว 6-72 ตัวอักษร";
    if (!errs.password && confirm !== password) errs.confirm = "รหัสผ่านไม่ตรงกัน";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "reset", token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        code?: string;
        errors?: Errors;
      };
      if (res.ok && data.success) {
        router.push("/login?reset=1");
        return;
      }
      // token หมดอายุ / ใช้ไปแล้ว → กลับไปขั้น 1
      if (data.code === "bad_token") {
        setToken("");
        setStep(0);
        setErrors({ form: data.error ?? "หมดเวลา กรุณายืนยันตัวตนใหม่" });
        return;
      }
      if (data.errors) setErrors(data.errors);
      else setErrors({ form: data.error ?? "ตั้งรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } catch {
      setErrors({ form: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (step === 0) void verify();
    else void reset();
  };

  const backToStep0 = () => {
    if (busy) return;
    setToken("");
    setErrors({});
    setStep(0);
  };

  return (
    <div className={`${pageShell} flex items-center justify-center p-3 sm:p-4 md:p-6`}>
      <style>{STYLES}</style>
      <BackdropText />

      <div className="fx-rise w-full max-w-lg border border-[#17FFA2]/40 bg-[#0a1014]/95 p-6 backdrop-blur-sm sm:p-10">
        <span className="mb-5 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
        <h1 className="text-3xl font-bold uppercase leading-tight tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-4xl">
          ลืมรหัสผ่าน
        </h1>

        {/* ตัวบอกขั้นตอน */}
        <ol className="mt-6 flex items-center gap-3" aria-label="ขั้นตอนการรีเซ็ตรหัสผ่าน">
          {STEPS.map((label, i) => {
            const done = i < step;
            const cur = i === step;
            return (
              <li key={label} className="flex items-center gap-2" aria-current={cur ? "step" : undefined}>
                <span
                  className={`flex h-8 w-8 -skew-x-6 items-center justify-center text-sm font-bold tabular-nums transition-all ${
                    done || cur ? "bg-[#17FFA2] text-[#04110a]" : "border border-white/25 text-white/50"
                  } ${cur ? "ring-4 ring-[#17FFA2]/30 shadow-[0_0_18px_rgba(23,255,162,0.5)]" : ""}`}
                >
                  {done ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-xs font-semibold sm:text-sm ${cur ? "text-white" : done ? "text-white/80" : "text-white/40"}`}>{label}</span>
                {i < STEPS.length - 1 && <span aria-hidden className={`mx-1 h-0.5 w-6 sm:w-10 ${done ? "bg-[#17FFA2]" : "bg-white/15"}`} />}
              </li>
            );
          })}
        </ol>

        <form onSubmit={onSubmit} noValidate className="mt-6">
          {/* ---------------- ขั้น 1 ---------------- */}
          {step === 0 && (
            <>
              <p className={`text-sm ${MUTED}`}>กรอกข้อมูลที่ใช้ตอนสมัครให้ตรงกันทั้ง 3 อย่าง</p>
              <div className="mt-5 flex flex-col gap-4">
                <Field
                  label="Username"
                  value={username}
                  onChange={edit("username", setUsername)}
                  maxLength={20}
                  autoComplete="username"
                  placeholder="username ที่ตั้งตอนสมัคร"
                  autoFocus
                />

                <div>
                  <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-white/85">
                    บริษัท
                  </label>
                  <select
                    id={selectId}
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      clearErr("form");
                    }}
                    style={{ colorScheme: "dark" }}
                    className={`${field} [&>option]:bg-[#0a1014] ${companyId ? "text-white" : "text-zinc-500"}`}
                  >
                    <option value="">เลือกบริษัทของคุณ</option>
                    {COMPANIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="รหัสพนักงาน"
                  value={employeeId}
                  onChange={edit("employeeId", setEmployeeId)}
                  maxLength={20}
                  autoComplete="off"
                  placeholder="เช่น A12345"
                />
              </div>
            </>
          )}

          {/* ---------------- ขั้น 2 ---------------- */}
          {step === 1 && (
            <>
              <p className={`text-sm ${MUTED}`}>ยืนยันตัวตนสำเร็จ ตั้งรหัสผ่านใหม่ได้เลย (ต้องทำภายใน 10 นาที)</p>
              <div className="mt-5 flex flex-col gap-4">
                <Field
                  label="รหัสผ่านใหม่"
                  value={password}
                  onChange={edit("password", setPassword)}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  error={errors.password}
                  autoFocus
                  trailing={<ShowBtn show={show} onToggle={() => setShow((v) => !v)} />}
                />
                <Field
                  label="ยืนยันรหัสผ่านใหม่"
                  value={confirm}
                  onChange={edit("confirm", setConfirm)}
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  error={errors.confirm}
                />
              </div>
              <p className={`mt-3 text-xs ${MUTED}`}>เปลี่ยนรหัสแล้ว เครื่องอื่นที่ล็อกอินค้างอยู่จะถูกออกจากระบบ</p>
            </>
          )}

          {errors.form && (
            <p role="alert" style={{ borderColor: RED }} className="mt-4 border-l-4 bg-[#ff2a55]/10 px-4 py-3 text-sm text-[#ff7b94]">
              {errors.form}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            {step === 1 && (
              <Btn variant="outline" onClick={backToStep0} disabled={busy} className="h-14 shrink-0">
                ย้อนกลับ
              </Btn>
            )}
            <Btn type="submit" disabled={busy} className="h-14 flex-1">
              {step === 0 ? (busy ? "กำลังตรวจสอบ..." : "ถัดไป") : busy ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
            </Btn>
          </div>
        </form>

        <p className={`mt-6 text-sm ${MUTED}`}>
          จำรหัสผ่านได้แล้ว{" "}
          <Link href="/login" className="font-bold text-[#17FFA2] underline underline-offset-4 transition-colors hover:text-[#6dffc6]">
            กลับไปเข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}