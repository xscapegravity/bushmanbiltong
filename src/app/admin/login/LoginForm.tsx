"use client";

import { useFormState } from "react-dom";
import { loginAction } from "./actions";

type LoginState = { error: string | null };

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="admin-form">
      {state.error && (
        <p className="error-text" role="alert">
          {state.error}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="admin-actions">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
