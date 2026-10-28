"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ApiError,
  getCurrentUser,
  login as apiLogin,
  register as apiRegister,
  type AuthUser,
} from "@/lib/api";

type AuthSession = {
  token: string;
  user: AuthUser;
};

const STORAGE_KEY = "roverlab:session";
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedSession: AuthSession | null = null;
let validatedToken: string | null = null;

function readSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedSession;
  }

  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as AuthSession) : null;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      !parsed.user ||
      typeof parsed.user.id !== "number" ||
      typeof parsed.user.username !== "string"
    ) {
      cachedSession = null;
    } else {
      cachedSession = parsed;
    }
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getServerSnapshot(): AuthSession | null {
  return null;
}

function persistSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  cachedRaw = undefined;
  emit();
}

export function useAuth() {
  const session = useSyncExternalStore(subscribe, readSession, getServerSnapshot);
  const token = session?.token ?? null;
  const user = session?.user ?? null;

  useEffect(() => {
    if (!token || validatedToken === token) {
      return;
    }

    validatedToken = token;
    let cancelled = false;

    getCurrentUser(token)
      .then((freshUser) => {
        if (cancelled) {
          return;
        }
        const current = readSession();
        if (
          current &&
          current.token === token &&
          (current.user.id !== freshUser.id ||
            current.user.username !== freshUser.username)
        ) {
          persistSession({ token, user: freshUser });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        validatedToken = null;
        if (error instanceof ApiError && error.status === 401) {
          persistSession(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    const nextSession = { token: result.access_token, user: result.user };
    validatedToken = nextSession.token;
    persistSession(nextSession);
    return result.user;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const result = await apiRegister(username, password);
    const nextSession = { token: result.access_token, user: result.user };
    validatedToken = nextSession.token;
    persistSession(nextSession);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    validatedToken = null;
    persistSession(null);
  }, []);

  return { user, token, loading: false, login, register, logout };
}
