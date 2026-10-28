"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { validatePassword, validateUsername } from "@/lib/validation";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError =
      validateUsername(form.username) ?? validatePassword(form.password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(form.username.trim(), form.password);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <main className="auth-page">
      <div className="auth-card glass-panel glass-panel--glow">
        <div className="auth-heading">
          <span className="auth-eyebrow">ROVER LAB</span>
          <h1>Welcome back</h1>
          <p>Sign in to continue your mission.</p>
        </div>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              placeholder="e.g. rover_pilot"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={submitting}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="Your password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={submitting}
              required
            />
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to Rover Lab? <Link href="/register">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
