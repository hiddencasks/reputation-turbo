"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(login, { error: "", email: "" });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} key={state.email} className="mt-1 w-full rounded-md border border-line px-3 py-2.5" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-line px-3 py-2.5" />
      </div>
      {state.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
      <SubmitButton pendingText="Signing in…" className="inline-flex w-full items-center justify-center rounded-md bg-navy px-5 py-3 text-base font-semibold text-white hover:bg-navy-800">
        Sign in
      </SubmitButton>
    </form>
  );
}
