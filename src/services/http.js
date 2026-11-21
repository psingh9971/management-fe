// Small fetch wrapper for the backend API.
// All requests go to `${API_BASE}${path}`. By default API_BASE is "/api", which the Vite dev
// server (vite.config.js) and nginx in production forward unchanged to the FastAPI backend, whose routes start with /api.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

let tokenGetter = () => null
let unauthorizedHandler = () => {}

export function configureHttp({ getToken, onUnauthorized }) {
  if (getToken) tokenGetter = getToken
  if (onUnauthorized) unauthorizedHandler = onUnauthorized
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function messageFrom(data, status) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  // FastAPI validation errors: [{ loc, msg, type }]
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ')
  if (status >= 500) return 'Server error. Please try again in a moment.'
  return `Request failed (${status})`
}

export async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const h = { Accept: 'application/json', ...headers }
  let payload = body
  if (body !== undefined && !(body instanceof FormData)) {
    h['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const token = auth ? tokenGetter() : null
  if (token) h.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(API_BASE + path, { method, headers: h, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && auth) unauthorizedHandler()
    throw new ApiError(messageFrom(data, res.status), res.status, data)
  }
  return data
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}
