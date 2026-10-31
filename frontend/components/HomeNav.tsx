"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function HomeNav() {
  const { user, logout } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);

  return (
    <header className="home-nav">
      <Link href="/" className="home-brand">
        <span className="home-brand-mark" aria-hidden="true" />
        HOME
      </Link>
      <div className="home-nav-right">
        {user ? (
          <>
            <span className="home-nav-link">{user.username}</span>
            <button type="button" className="home-nav-link" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button type="button" className="home-nav-link" onClick={() => setAuthMode("login")}>
              Login
            </button>
            <button type="button" className="home-nav-link" onClick={() => setAuthMode("register")}>
              Register
            </button>
          </>
        )}
      </div>
      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </header>
  );
}
