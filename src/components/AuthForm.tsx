"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/actions";

type Labels = { email: string; password: string; login: string; register: string };

export function AuthForm({ mode, next, labels }: { mode: "login" | "register"; next: string; labels: Labels }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signIn : signUp,
    undefined,
  );

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          {labels.email}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-snow-dim">
          {state.error}
        </p>
      )}
      {state?.info && (
        <p role="status" className="text-sm font-medium text-neon">
          {state.info}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {mode === "login" ? labels.login : labels.register}
      </button>
    </form>
  );
}
