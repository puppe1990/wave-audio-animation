const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const AUTH_COOKIE_NAME = "auth_token"

// ── Token helpers (localStorage + cookie) ──────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

function setCookie(value: string): void {
  if (typeof window === "undefined") return
  document.cookie = `${AUTH_COOKIE_NAME}=${value}; path=/; SameSite=Lax`
}

function deleteCookie(): void {
  if (typeof window === "undefined") return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("auth_token", token)
  setCookie(token)
}

function removeToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("auth_token")
  deleteCookie()
}

// ── Typed fetch wrapper ────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Only set Content-Type if it's not FormData (browser sets boundary)
  if (!(options?.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    removeToken()
    throw new ApiError("Unauthorized", 401)
  }

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = null
    }
    throw new ApiError(`API error: ${response.status}`, response.status, body)
  }

  // For responses with no content (e.g. 204)
  const contentType = response.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    return (await response.blob()) as T
  }

  return (await response.json()) as T
}

// ── Auth API ───────────────────────────────────────────────────────

interface RegisterResponse {
  id: string
  email: string
  name: string
  created_at: string
}

interface LoginResponse {
  access_token: string
  token_type: string
}

async function register(data: {
  name: string
  email: string
  password: string
}): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

async function login(data: {
  email: string
  password: string
}): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  })
  setToken(result.access_token)
  return result
}

// ── Exports API ────────────────────────────────────────────────────

interface CreateExportResponse {
  job_id: string
  status: string
}

interface JobStatus {
  id: string
  status: string
  progress: number
  error_message: string | null
  format: string
  style: string
  aspect_ratio: string
  created_at: string
}

async function createExport(formData: FormData): Promise<CreateExportResponse> {
  return apiFetch<CreateExportResponse>("/exports", {
    method: "POST",
    body: formData,
  })
}

async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/exports/${jobId}/status`)
}

async function downloadJob(jobId: string): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}/exports/${jobId}/download`, {
    headers,
  })

  if (!response.ok) {
    throw new ApiError(`Download failed: ${response.status}`, response.status)
  }

  const contentDisposition = response.headers.get("content-disposition")
  let filename = `waveform-${jobId}`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match?.[1]) {
      filename = match[1].replace(/['"]/g, "")
    }
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// ── Re-exports ─────────────────────────────────────────────────────

export {
  API_URL,
  getToken,
  setToken,
  removeToken,
  apiFetch,
  register,
  login,
  createExport,
  getJobStatus,
  downloadJob,
  ApiError,
}
