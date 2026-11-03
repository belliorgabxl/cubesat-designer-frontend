import type {
  Design,
  DesignPayload,
  Evaluation,
  Frame,
  MissionType,
  Module,
  Placements,
  Simulation,
  User,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BACKEND_DOWN = "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่า Django รันอยู่ที่พอร์ต 8000";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function csrfToken(): Promise<string> {
  const existing = readCookie("csrftoken");
  if (existing) return existing;
  await fetch("/api/csrf/", { credentials: "include" });
  return readCookie("csrftoken") ?? "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["X-CSRFToken"] = await csrfToken();
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(BACKEND_DOWN, 0);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = (data ?? {}) as { error?: string; details?: string[] };
    const fallback = response.status >= 500 ? BACKEND_DOWN : `คำขอไม่สำเร็จ (HTTP ${response.status})`;
    throw new ApiError(failure.error ?? fallback, response.status, failure.details ?? []);
  }
  return data as T;
}

export interface EvaluateInput {
  frame: number;
  mission_type: MissionType;
  altitude_km: number;
  placements: Placements;
}

export const api = {
  me: () => request<{ user: User | null }>("/auth/me/"),
  register: (username: string, password: string, email: string) =>
    request<{ user: User }>("/auth/register/", { method: "POST", body: { username, password, email } }),
  login: (username: string, password: string) =>
    request<{ user: User }>("/auth/login/", { method: "POST", body: { username, password } }),
  logout: () => request<unknown>("/auth/logout/", { method: "POST" }),

  frames: () => request<{ frames: Frame[] }>("/frames/"),
  modules: () => request<{ modules: Module[] }>("/modules/"),

  evaluate: (input: EvaluateInput, signal?: AbortSignal) =>
    request<Evaluation>("/evaluate/", { method: "POST", body: input, signal }),
  simulate: (altitude_km: number, placements: Placements, signal?: AbortSignal) =>
    request<Simulation>("/simulate/", { method: "POST", body: { altitude_km, placements }, signal }),

  myDesigns: () => request<{ designs: Design[] }>("/designs/"),
  createDesign: (payload: DesignPayload) =>
    request<{ design: Design }>("/designs/", { method: "POST", body: payload }),
  getDesign: (id: number | string) => request<{ design: Design }>(`/designs/${id}/`),
  updateDesign: (id: number, payload: Partial<DesignPayload>) =>
    request<{ design: Design }>(`/designs/${id}/`, { method: "PUT", body: payload }),
  deleteDesign: (id: number) => request<unknown>(`/designs/${id}/`, { method: "DELETE" }),

  gallery: () => request<{ designs: Design[] }>("/gallery/"),
  shared: (slug: string) => request<{ design: Design }>(`/shared/${encodeURIComponent(slug)}/`),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details.length ? `${error.message}: ${error.details.join(" · ")}` : error.message;
  }
  return "เกิดข้อผิดพลาดที่ไม่คาดคิด";
}
