export type AuthUser = {
  id: number;
  username: string;
};

export type AuthSessionResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

type ApiErrorBody = {
  detail?:
    | string
    | Array<{
        msg?: string;
      }>;
};

const API_URL = (process.env.BACKEND_RENDER_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as
    | (T & ApiErrorBody)
    | null;

  if (!response.ok) {
    const detail = data?.detail;
    let message = "Something went wrong. Please try again.";

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((item) => item.msg?.replace(/^Value error,\s*/, ""))
        .filter(Boolean)
        .join(". ");
    }

    throw new ApiError(message || "Something went wrong. Please try again.", response.status);
  }

  return data as T;
}

export function login(username: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function register(username: string, password: string): Promise<AuthSessionResponse> {
  return request<AuthSessionResponse>("/auth/signup", {
    method: "POST",
    body: { username, password },
  });
}

export function getCurrentUser(token: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", { token });
}
