"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAvatarSrc } from "../components/navbar/page";

/* ---------------- config ---------------- */

const GAME_NAMES: Record<string, string> = {
  upandup: "UP AND UP!",
  thinkfast: "ตอบปัญหาเชาว์",
  kickbattle: "Kick Battle",
  basketball: "Basketball",
  fruitiebubbly: "Fruitie Bubbly",
  com7quiz: "รู้จัก COM7 แค่ไหน?",
  itemjam: "Item Jam",
  dailyMission: "ภารกิจรายวัน",
};
const gameName = (k: string) => GAME_NAMES[k] ?? k;
const PAGE_SIZE = 20;
const MUTED = "text-[#8fa6a1]";

/* ---------------- types ---------------- */

type RawUser = {
  _id: string;
  username?: string;
  userId?: string;
  nickname?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  avatarUrl?: string;
  avatarPreset?: string;
  avatarId?: string;
  avatar?: string;
  points?: number;
  gameScores?: Record<string, number>;
  savedEvents?: string[];
  savedGames?: string[];
  banned?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Row = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  scores: Record<string, number>;
  games: number;
  total: number;
  banned: boolean;
  createdAt?: string;
  updatedAt?: string;
  raw: RawUser;
};

type SortKey = "rank" | "name" | "games" | "total" | "createdAt";

/* ---------------- helpers ---------------- */

function toRow(u: RawUser): Row {
  const scores: Record<string, number> = {};
  let sum = 0;
  let games = 0;
  for (const [k, v] of Object.entries(u.gameScores || {})) {
    const n = Number(v) || 0;
    if (n > 0) {
      scores[k] = n;
      sum += n;
      if (k !== "dailyMission") games += 1;
    }
  }
  // แต้มรวม: ใช้ points ถ้ามี ไม่งั้นใช้ผลรวมรายเกม (ตรงกับ /api/user และหน้า rank)
  const total = typeof u.points === "number" && u.points > 0 ? u.points : sum;
  return {
    id: String(u.username || u.userId || u._id),
    name: u.nickname || u.name || "(ไม่มีชื่อ)",
    email: u.email || u.employeeId || "",
    avatar: u.avatarUrl || u.avatarPreset || u.avatarId || u.avatar || "",
    scores,
    games,
    total,
    banned: !!u.banned,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    raw: u,
  };
}

const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtDate = (s?: string) => {
  if (!s) return "–";
  const d = new Date(s);
  return isNaN(+d) ? "–" : d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
};

function downloadCsv(rows: Row[]) {
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.scores)))).sort();
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["rank", "userId", "name", "email/employeeId", "games", "total", ...keys.map(gameName), "banned", "createdAt"];
  const lines = rows.map((r, i) =>
    [i + 1, r.id, r.name, r.email, r.games, r.total, ...keys.map((k) => r.scores[k] ?? 0), r.banned, r.createdAt ?? ""]
      .map(esc)
      .join(",")
  );
  const blob = new Blob(["\uFEFF" + [head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- small UI ---------------- */

const btn =
  "inline-flex min-h-[40px] items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const btnSolid = `${btn} bg-[#17FFA2] text-[#04110a] hover:bg-[#6dffc6]`;
const btnGhost = `${btn} border border-[#17FFA2]/50 bg-[#17FFA2]/10 text-white hover:bg-[#17FFA2] hover:text-[#04110a]`;
const btnDanger = `${btn} border border-[#ff2a55]/60 bg-[#ff2a55]/15 text-white hover:bg-[#ff2a55]`;
const input =
  "w-full border border-white/15 bg-[#05080a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#17FFA2]";

function Avatar({ id, name, size = 36 }: { id: string; name?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  if (!id || failed) {
    const initial = (Array.from((name ?? "").trim())[0] ?? "?").toUpperCase();
    return (
      <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getAvatarSrc(id)}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function Stat({ label, value, tone = "#17FFA2" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-white/10 bg-[#0a1014]/90 p-5">
      <p className={`text-xs ${MUTED}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: tone, textShadow: `0 0 20px ${tone}66` }}>
        {value}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#05080a] bg-[linear-gradient(rgba(23,255,162,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(23,255,162,0.045)_1px,transparent_1px)] bg-[size:56px_56px] font-sans text-white">
      {children}
    </div>
  );
}

/* ---------------- login ---------------- */

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) onDone();
      else setErr((await res.json().catch(() => null))?.error || "เข้าสู่ระบบไม่สำเร็จ");
    } catch {
      setErr("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    setBusy(false);
  }

  return (
    <Shell>
      <div className="flex min-h-[100dvh] items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm border border-[#17FFA2]/40 bg-[#0a1014]/95 p-8 shadow-[10px_10px_0_0_#ff2a55]">
          <span className="mb-4 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
          <h1 className="text-3xl font-bold uppercase tracking-tight">Admin</h1>
          <p className={`mt-2 text-sm ${MUTED}`}>กรอกรหัสผ่านผู้ดูแลระบบ</p>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="รหัสผ่าน" className={`${input} mt-6`} />
          {err && <p className="mt-3 text-sm text-[#ff2a55]">{err}</p>}
          <button type="submit" disabled={busy || !pw} className={`${btnSolid} mt-6 w-full`}>
            {busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </Shell>
  );
}

/* ---------------- user detail modal ---------------- */

function UserModal({
  row,
  rank,
  onClose,
  onChanged,
}: {
  row: Row;
  rank: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const keys = useMemo(() => Array.from(new Set([...Object.keys(GAME_NAMES), ...Object.keys(row.scores)])), [row]);
  const [name, setName] = useState(row.name === "(ไม่มีชื่อ)" ? "" : row.name);
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, String(row.scores[k] ?? 0)]))
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const newTotal = keys.reduce((s, k) => s + Math.max(0, Number(scores[k]) || 0), 0);

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...body }),
      });
      const r = await res.json().catch(() => null);
      if (res.ok && r?.success) {
        setMsg(ok);
        onChanged();
      } else setMsg(r?.error || "บันทึกไม่สำเร็จ");
    } catch {
      setMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`ลบผู้ใช้ "${row.name}" ถาวร? ย้อนกลับไม่ได้`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      onChanged();
      onClose();
    } else setMsg("ลบไม่สำเร็จ");
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto border border-[#17FFA2]/40 bg-[#0a1014] p-6 shadow-[10px_10px_0_0_#ff2a55]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <Avatar id={row.avatar} name={row.name} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{row.name}</p>
            <p className={`truncate text-sm ${MUTED}`}>{row.email || "ไม่มีอีเมล / รหัสพนักงาน"}</p>
            <p className={`mt-1 break-all text-xs ${MUTED}`}>ID: {row.id}</p>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="h-10 w-10 shrink-0 text-2xl text-white/70 hover:text-white">
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["อันดับ", rank > 0 ? `#${rank}` : "–"],
            ["แต้มรวม", fmtNum(row.total)],
            ["เล่นแล้ว", `${row.games} เกม`],
            ["สถานะ", row.banned ? "ถูกแบน" : "ปกติ"],
          ].map(([l, v]) => (
            <div key={l} className="border border-white/10 bg-[#05080a] p-3">
              <p className={`text-xs ${MUTED}`}>{l}</p>
              <p className={`mt-1 text-lg font-bold ${l === "สถานะ" && row.banned ? "text-[#ff2a55]" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
        <p className={`mt-3 text-xs ${MUTED}`}>
          สมัคร: {fmtDate(row.createdAt)} · อัปเดตล่าสุด: {fmtDate(row.updatedAt)} · รายการโปรด: {(row.raw.savedEvents?.length ?? 0) + (row.raw.savedGames?.length ?? 0)}
        </p>

        <label className={`mt-6 block text-sm ${MUTED}`}>ชื่อที่แสดง (2-20 ตัวอักษร)</label>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className={`${input} mt-1`} />

        <p className={`mt-6 text-sm ${MUTED}`}>แต้มรายเกม (แก้ไขได้)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {keys.map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 border border-white/10 bg-[#05080a] px-3 py-2">
              <span className="truncate text-sm">{gameName(k)}</span>
              <input
                type="number"
                min={0}
                value={scores[k]}
                onChange={(e) => setScores((s) => ({ ...s, [k]: e.target.value }))}
                className="w-24 border border-white/15 bg-transparent px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-[#17FFA2]"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-right text-sm">
          รวมหลังแก้: <span className="font-bold tabular-nums text-[#17FFA2]">{fmtNum(newTotal)}</span>
        </p>

        {msg && <p className="mt-3 text-sm text-[#17FFA2]">{msg}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            disabled={busy}
            className={btnSolid}
            onClick={() =>
              patch(
                { name, gameScores: Object.fromEntries(keys.map((k) => [k, Math.max(0, Number(scores[k]) || 0)])) },
                "บันทึกแล้ว"
              )
            }
          >
            บันทึก
          </button>
          <button
            disabled={busy}
            className={btnGhost}
            onClick={() => {
              if (!confirm(`รีเซ็ตแต้มทั้งหมดของ "${row.name}" เป็น 0?`)) return;
              setScores(Object.fromEntries(keys.map((k) => [k, "0"])));
              patch({ gameScores: {} }, "รีเซ็ตแต้มแล้ว");
            }}
          >
            รีเซ็ตแต้ม
          </button>
          <button disabled={busy} className={btnGhost} onClick={() => patch({ banned: !row.banned }, row.banned ? "ปลดแบนแล้ว" : "แบนแล้ว")}>
            {row.banned ? "ปลดแบน" : "แบน"}
          </button>
          <button disabled={busy} className={`${btnDanger} ml-auto`} onClick={remove}>
            ลบผู้ใช้
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- game locks ---------------- */

function GameLocks({ onUnauthorized }: { onUnauthorized: () => void }) {
  const ids = useMemo(() => Object.keys(GAME_NAMES).filter((k) => k !== "dailyMission"), []);
  const [locked, setLocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/games", { cache: "no-store" });
        if (res.status === 401) return onUnauthorized();
        const r = await res.json();
        if (r.success && Array.isArray(r.locked)) setLocked(r.locked);
        else setError("โหลดสถานะล็อกไม่สำเร็จ");
      } catch {
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      }
      setLoading(false);
    })();
  }, [onUnauthorized]);

  async function toggle(id: string) {
    const next = !locked.includes(id);
    if (next && !confirm(`ล็อก "${gameName(id)}"? ผู้เล่นจะเข้าเล่นไม่ได้ทันที`)) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/games", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, locked: next }),
      });
      if (res.status === 401) return onUnauthorized();
      const r = await res.json().catch(() => null);
      if (res.ok && r?.success && Array.isArray(r.locked)) setLocked(r.locked);
      else setError("บันทึกไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    setBusyId(null);
  }

  return (
    <>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold uppercase tracking-tight">ล็อกเกม</h2>
        <span className={`text-sm ${MUTED}`}>
          {loading ? "กำลังโหลด..." : `ล็อกอยู่ ${locked.length} / ${ids.length} เกม`}
        </span>
      </div>
      <p className={`mt-1 text-sm ${MUTED}`}>เกมที่ล็อกจะแสดงเป็นรูปกุญแจ ไม่โชว์ปกและชื่อ และผู้เล่นเข้าเล่นไม่ได้</p>
      {error && <p className="mt-3 border border-[#ff2a55]/60 bg-[#ff2a55]/10 p-3 text-sm">{error}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id) => {
          const isLocked = locked.includes(id);
          return (
            <div
              key={id}
              className={`flex items-center justify-between gap-3 border p-4 ${
                isLocked ? "border-[#ff2a55]/60 bg-[#ff2a55]/10" : "border-white/10 bg-[#0a1014]/90"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{gameName(id)}</p>
                <p className={`mt-0.5 text-xs ${isLocked ? "text-[#ff2a55]" : "text-[#17FFA2]"}`}>
                  {isLocked ? "🔒 ล็อกอยู่" : "เปิดให้เล่น"}
                </p>
              </div>
              <button
                disabled={loading || busyId === id}
                aria-pressed={isLocked}
                onClick={() => toggle(id)}
                className={isLocked ? btnSolid : btnDanger}
              >
                {busyId === id ? "..." : isLocked ? "ปลดล็อก" : "ล็อก"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- dashboard ---------------- */

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "played" | "none" | "banned">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 401) return onLogout();
      const r = await res.json();
      if (r.success && Array.isArray(r.data)) setRows((r.data as RawUser[]).map(toRow));
      else setError("โหลดข้อมูลไม่สำเร็จ");
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    }
    setLoading(false);
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  // อันดับจากแต้มรวม (คงที่ ไม่ขึ้นกับตัวกรอง)
  const rankMap = useMemo(() => {
    const m = new Map<string, number>();
    [...rows].sort((a, b) => b.total - a.total).forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const players = rows.filter((r) => r.total > 0).length;
    const per: Record<string, { players: number; total: number; max: number }> = {};
    for (const r of rows)
      for (const [k, v] of Object.entries(r.scores)) {
        const p = (per[k] ||= { players: 0, total: 0, max: 0 });
        p.players += 1;
        p.total += v;
        p.max = Math.max(p.max, v);
      }
    const perGame = Object.entries(per)
      .map(([k, v]) => ({ key: k, ...v, avg: v.total / v.players }))
      .sort((a, b) => b.players - a.players);
    return { total, players, perGame, banned: rows.filter((r) => r.banned).length };
  }, [rows]);

  const view = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (filter === "played" && r.total <= 0) return false;
      if (filter === "none" && r.total > 0) return false;
      if (filter === "banned" && !r.banned) return false;
      return !kw || r.name.toLowerCase().includes(kw) || r.email.toLowerCase().includes(kw) || r.id.toLowerCase().includes(kw);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name, "th") * dir;
        case "games":
          return (a.games - b.games) * dir;
        case "total":
          return (a.total - b.total) * dir;
        case "createdAt":
          return ((+new Date(a.createdAt || 0)) - (+new Date(b.createdAt || 0))) * dir;
        default:
          return ((rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0)) * dir;
      }
    });
    return list;
  }, [rows, q, filter, sort, rankMap]);

  const pages = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const slice = view.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const opened = rows.find((r) => r.id === openId) ?? null;

  const th = (key: SortKey, label: string, cls = "") => (
    <th className={`px-3 py-3 text-left text-xs font-bold uppercase tracking-wider ${cls}`}>
      <button
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "rank" ? "asc" : "desc" }))}
        className="inline-flex items-center gap-1 hover:text-[#17FFA2]"
      >
        {label}
        <span className={sort.key === key ? "text-[#17FFA2]" : "opacity-30"}>{sort.key === key && sort.dir === "asc" ? "▲" : "▼"}</span>
      </button>
    </th>
  );

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    onLogout();
  }

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-4 block h-1.5 w-16 -skew-x-12 bg-[#17FFA2] shadow-[0_0_14px_#17FFA2]" />
            <h1 className="text-4xl font-bold uppercase tracking-tight [text-shadow:0_0_26px_rgba(23,255,162,0.35)] sm:text-5xl">Admin</h1>
            <p className={`mt-2 text-sm ${MUTED}`}>ดูข้อมูลผู้เข้าร่วมและแต้มทั้งหมด</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={load} disabled={loading}>
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
            <button className={btnGhost} onClick={() => downloadCsv(view)} disabled={view.length === 0}>
              Export CSV
            </button>
            <button className={btnDanger} onClick={logout}>
              ออกจากระบบ
            </button>
          </div>
        </div>

        {error && <p className="mt-6 border border-[#ff2a55]/60 bg-[#ff2a55]/10 p-3 text-sm">{error}</p>}

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="ผู้ลงทะเบียน" value={fmtNum(rows.length)} />
          <Stat label="ผู้ที่มีแต้ม" value={fmtNum(stats.players)} />
          <Stat label="แต้มรวมทั้งระบบ" value={fmtNum(stats.total)} />
          <Stat label="แต้มเฉลี่ย/ผู้เล่น" value={stats.players ? fmtNum(stats.total / stats.players) : "0"} />
          <Stat label="ถูกแบน" value={fmtNum(stats.banned)} tone="#ff2a55" />
        </div>

        <GameLocks onUnauthorized={onLogout} />

        {/* per game */}
        <h2 className="mt-12 text-xl font-bold uppercase tracking-tight">สถิติรายเกม</h2>
        <div className="mt-3 overflow-x-auto border border-white/10 bg-[#0a1014]/90">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-white/10 bg-black/30">
              <tr className={MUTED}>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase">เกม</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase">ผู้เล่น</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase">แต้มรวม</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase">เฉลี่ย</th>
                <th className="px-3 py-3 text-right text-xs font-bold uppercase">สูงสุด</th>
              </tr>
            </thead>
            <tbody>
              {stats.perGame.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-3 py-6 text-center ${MUTED}`}>
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              )}
              {stats.perGame.map((g) => (
                <tr key={g.key} className="border-b border-white/5 last:border-0">
                  <td className="px-3 py-3 font-semibold">{gameName(g.key)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtNum(g.players)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-[#17FFA2]">{fmtNum(g.total)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtNum(g.avg)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtNum(g.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* users */}
        <h2 className="mt-12 text-xl font-bold uppercase tracking-tight">รายชื่อผู้ใช้</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อ / รหัสพนักงาน / username"
            className={`${input} max-w-xs`}
          />
          {(
            [
              ["all", "ทั้งหมด"],
              ["played", "มีแต้ม"],
              ["none", "ยังไม่เล่น"],
              ["banned", "ถูกแบน"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => {
                setFilter(k);
                setPage(1);
              }}
              className={filter === k ? btnSolid : btnGhost}
            >
              {l}
            </button>
          ))}
          <span className={`ml-auto text-sm ${MUTED}`}>พบ {fmtNum(view.length)} คน</span>
        </div>

        <div className="mt-3 overflow-x-auto border border-white/10 bg-[#0a1014]/90">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-white/10 bg-black/30">
              <tr className={MUTED}>
                {th("rank", "#")}
                {th("name", "ผู้ใช้")}
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider">อีเมล / รหัสพนักงาน</th>
                {th("games", "เกม", "text-right")}
                {th("total", "แต้มรวม", "text-right")}
                {th("createdAt", "สมัครเมื่อ")}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className={`px-3 py-10 text-center ${MUTED}`}>
                    กำลังโหลด...
                  </td>
                </tr>
              )}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-3 py-10 text-center ${MUTED}`}>
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {slice.map((r) => (
                <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.04]">
                  <td className="px-3 py-3 tabular-nums">{r.total > 0 ? rankMap.get(r.id) : "–"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar id={r.avatar} name={r.name} />
                      <span className="max-w-[200px] truncate font-semibold">{r.name}</span>
                      {r.banned && <span className="border border-[#ff2a55] bg-[#ff2a55]/20 px-1.5 py-0.5 text-[10px] font-bold">BANNED</span>}
                    </div>
                  </td>
                  <td className={`max-w-[220px] truncate px-3 py-3 ${MUTED}`}>{r.email || "–"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.games}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-[#17FFA2]">{fmtNum(r.total)}</td>
                  <td className={`px-3 py-3 ${MUTED}`}>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button className={btnGhost} disabled={cur <= 1} onClick={() => setPage(cur - 1)}>
            ก่อนหน้า
          </button>
          <span className={`text-sm ${MUTED}`}>
            หน้า {cur} / {pages}
          </span>
          <button className={btnGhost} disabled={cur >= pages} onClick={() => setPage(cur + 1)}>
            ถัดไป
          </button>
        </div>
      </main>

      {opened && <UserModal key={opened.id} row={opened} rank={opened.total > 0 ? rankMap.get(opened.id) ?? 0 : 0} onClose={() => setOpenId(null)} onChanged={load} />}
    </Shell>
  );
}

/* ---------------- page ---------------- */

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => setAuthed(!!r.authed))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <Shell>
        <div className={`flex min-h-[100dvh] items-center justify-center text-sm ${MUTED}`}>กำลังโหลด...</div>
      </Shell>
    );
  }
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}