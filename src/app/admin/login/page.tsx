import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
        <Logo className="text-2xl" />
        <h1 className="mt-6 font-display text-2xl font-bold text-navy">Dashboard sign in</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
