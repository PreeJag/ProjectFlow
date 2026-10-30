const API_BASE =
  (import.meta.env["VITE_API_URL"] as string | undefined) || "http://localhost:5001/api";

const TOKEN_KEY = "projectflow_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

async function request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const url = typeof input === "string" && input.startsWith("http") ? input : `${API_BASE}${input}`;
  return fetch(url, { ...init, headers });
}

export async function api<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await request(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || `Request failed ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export default { getToken, setToken, removeToken, api, request, API_BASE };
