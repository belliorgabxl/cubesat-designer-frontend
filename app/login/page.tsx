import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "เข้าสู่ระบบ — CubeSat Designer" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
