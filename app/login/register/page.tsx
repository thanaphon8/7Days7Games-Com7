// app/login/register/page.tsx
import { redirect } from "next/navigation";

// หน้าสมัครรวมอยู่ที่ /login แล้ว (แท็บ "สมัครเข้าร่วม")
export default function RegisterPage() {
  redirect("/login#signup");
}