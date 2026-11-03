"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

/** Only same-site paths, so a crafted ?next= link cannot send people to another site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/my-designs";
}

const INPUT_CLASS = "mt-1 w-full rounded-md border border-line bg-deck px-3 py-2 text-sm";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const next = safeNext(params.get("next"));

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      const { user } = isLogin ? await api.login(username, password) : await api.register(username, password, email);
      setUser(user);
      router.push(next);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.details.length ? error.details : [error.message]);
      } else {
        setErrors(["เกิดข้อผิดพลาดที่ไม่คาดคิด"]);
      }
      setSubmitting(false);
    }
  }

  const otherHref = `${isLogin ? "/register" : "/login"}?next=${encodeURIComponent(next)}`;

  return (
    <main className="starfield flex flex-1 items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-line bg-panel p-6">
        <h1 className="text-xl font-semibold">{isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</h1>
        <p className="mt-1 text-sm text-ink-dim">
          {isLogin ? "เพื่อบันทึกและแชร์แบบดาวเทียมของคุณ" : "สร้างบัญชีเพื่อเก็บแบบดาวเทียมของคุณ"}
        </p>

        <div className="mt-5 space-y-3">
          <label className="block text-sm">
            ชื่อผู้ใช้
            <input
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          {!isLogin && (
            <label className="block text-sm">
              อีเมล <span className="text-ink-faint">(ไม่บังคับ)</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          )}
          <label className="block text-sm">
            รหัสผ่าน
            <input
              required
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        {errors.length > 0 && (
          <ul role="alert" className="mt-3 space-y-1 text-sm text-bad">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <Button type="submit" variant="primary" disabled={submitting} className="mt-5 w-full py-2">
          {submitting ? "กำลังดำเนินการ…" : isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </Button>

        <p className="mt-4 text-center text-sm text-ink-dim">
          {isLogin ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
          <Link href={otherHref} className="text-signal hover:underline">
            {isLogin ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Link>
        </p>
      </form>
    </main>
  );
}
