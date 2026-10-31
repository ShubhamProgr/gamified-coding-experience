export type AuthUser = {
  id: number;
  username: string;
};

export type AuthSessionResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type MarsAdventureSave = {
  resources: {
    cuprion: number;
    pythorium: number;
    javium: number;
  };
  last_location: {
    col: number;
    row: number;
    facing: "FRONT" | "BACK" | "RIGHT" | "LEFT";
  };
  last_code: string;
  game_state: {
    currentRound?: number;
    starsEarned?: number[];
    cumulativeMinerals?: number;
    persistentBattery?: number;
    buildings?: Array<{
      id: string;
      type: "charging_station";
      col: number;
      row: number;
    }>;
    language?: "python" | "java" | "cpp";
    deposits?: Record<string, MineralDeposit>;
    drilledHoles?: Array<{ col: number; row: number; count: number }>;
    unlockedSkills?: string[];
    skillMinerals?: Record<string, number>;
    hasSeenTour?: boolean;
  };
};

type ApiErrorBody = {
  detail?: string | Array<{ msg?: string }>;
};

const configuredApiUrl = (process.env.BACKEND_RENDER_URL ?? "").trim().replace(/\/+$/, "");
const LOCAL_API_URLS = new Set(["http://localhost:8000", "http://127.0.0.1:8000"]);
const PRODUCTION_API_URL = "https://mars-rover-backend.onrender.com";

function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const isLocalFrontend =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocalFrontend && LOCAL_API_URLS.has(configuredApiUrl)) {
      return PRODUCTION_API_URL;
    }
  }
  return configuredApiUrl || (typeof window !== "undefined" && !LOCAL_API_URLS.has(configuredApiUrl)
    ? PRODUCTION_API_URL
    : "http://localhost:8000");
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  token?: string;
  keepalive?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, keepalive = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as (T & ApiErrorBody) | null;
  if (!response.ok) {
    const detail = data?.detail;
    let message = "Something went wrong. Please try again.";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) {
      message = detail.map((item) => item.msg?.replace(/^Value error,\s*/, "")).filter(Boolean).join(". ");
    }
    throw new ApiError(message || "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}

export { request as apiRequest };

export function login(username: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>("/auth/login", { method: "POST", body: { username, password } });
}

export function register(username: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>("/auth/signup", { method: "POST", body: { username, password } });
}

export function getCurrentUser(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", { token });
}

export function getMarsAdventureSave(token: string): Promise<MarsAdventureSave> {
  return request<MarsAdventureSave>("/games/mars-adventure/save", { token });
}

export function saveMarsAdventure(
  token: string,
  save: MarsAdventureSave,
  options: { keepalive?: boolean } = {}
): Promise<MarsAdventureSave> {
  return request<MarsAdventureSave>("/games/mars-adventure/save", {
    method: "PUT",
    token,
    body: save,
    keepalive: options.keepalive,
  });
}
import type { MineralDeposit } from "@/components/Canvas/minerals";
