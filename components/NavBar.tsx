"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/store/auth";

const LINKS = [
  { href: "/builder", label: "ออกแบบ" },
  { href: "/gallery", label: "แกลเลอรี" },
  { href: "/my-designs", label: "แบบของฉัน" },
];

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const refresh = useAuthStore((state) => state.refresh);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-13 shrink-0 items-center gap-2 sm:gap-4 border-b border-line bg-deck/90 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span aria-hidden className="grid size-5 grid-cols-2 gap-px rounded-[3px] border border-solar/70 p-px">
          <span className="bg-solar/80" />
          <span className="bg-solar/30" />
          <span className="bg-solar/30" />
          <span className="bg-solar/80" />
        </span>
        <span className="hidden sm:inline">CubeSat Designer</span>
      </Link>

      <nav className="flex items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-1.5 py-1.5 whitespace-nowrap transition-colors sm:px-2.5 ${
                active ? "bg-raised text-ink" : "text-ink-dim hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1 text-xs whitespace-nowrap sm:gap-2 sm:text-sm">
        {status === "ready" &&
          (user ? (
            <>
              <span className="hidden font-mono text-xs text-ink-dim sm:inline">{user.username}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md px-1.5 py-1.5 text-ink-dim transition-colors hover:text-ink sm:px-2.5"
              >
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-1.5 py-1.5 text-ink-dim transition-colors hover:text-ink sm:px-2.5">
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="hidden rounded-md bg-solar px-3 py-1.5 font-medium text-void transition-colors hover:bg-solar-deep sm:inline"
              >
                สมัครสมาชิก
              </Link>
            </>
          ))}
      </div>
    </header>
  );
}
