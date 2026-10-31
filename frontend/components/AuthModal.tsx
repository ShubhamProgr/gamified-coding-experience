"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthContext";
import { validatePassword, validateUsername } from "@/lib/validation";

type AuthMode = "login" | "register";

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
};

export default function AuthModal({ mode, onClose }: AuthModalProps) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  const isRegister = currentMode === "register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError =
      validateUsername(username) ?? validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setCurrentMode(isRegister ? "login" : "register");
    setError(null);
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="auth-card auth-card--modal glass-panel glass-panel--glow">
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close authentication dialog"
        >
          ×
        </button>

        <div className="auth-heading">
          <span className="auth-eyebrow">ROVER LAB</span>
          <h1 id="auth-modal-title">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p>
            {isRegister
              ? "Join the mission and start coding your rover."
              : "Sign in to continue your mission."}
          </p>
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
              placeholder={isRegister ? "3-32 letters, numbers, or underscores" : "e.g. rover_pilot"}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting}
              required
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              required
            />
          </label>

          {isRegister && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
                required
              />
            </label>
          )}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New to Rover Lab?"}{" "}
          <button type="button" onClick={switchMode} disabled={submitting}>
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
