"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export default function HomeNav() {
  const { user, logout } = useAuth();

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
            <Link href="/login" className="home-nav-link">
              Login
            </Link>
            <Link href="/register" className="home-nav-link">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
