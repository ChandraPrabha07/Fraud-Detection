const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** FastAPI returns either {detail: string} or {detail: [{msg, loc}]} for validation errors. */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string; loc?: unknown[] }) => [d.loc?.slice(1).join("."), d.msg].filter(Boolean).join(": "))
        .join("; ");
    }
  }
  return fallback;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // Only declare a JSON body when there is one: a Content-Type on GETs forces a CORS preflight.
    const headers = init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers;
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(`Cannot reach the API at ${API_BASE_URL}. Is the backend running?`, null);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, `Request failed (${response.status})`), response.status);
  }
  return body as T;
}

export const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal });

export const post = <T>(path: string, payload: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(payload) });
