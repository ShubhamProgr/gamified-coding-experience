"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { validatePassword, validateUsername } from "@/lib/validation";

interface SignupForm {
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<SignupForm>({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, register } = useAuth();
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
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await register(form.username.trim(), form.password);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
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
          <h1>Create your account</h1>
          <p>Join the mission and start coding your rover.</p>
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
              placeholder="3-32 letters, numbers, or underscores"
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={submitting}
              required
            />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              disabled={submitting}
              required
            />
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
