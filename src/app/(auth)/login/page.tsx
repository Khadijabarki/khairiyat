import type { Metadata } from "next";
import { AuthForm, DemoButton } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in · Khairiyat" };

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="signin" />
      <DemoButton />
    </>
  );
}
