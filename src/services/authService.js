// Auth API
//   POST /auth/login  { username, password } -> { access_token, token_type, expires_in }
//   GET  /auth/me     (Bearer token)         -> UserOut
import { http } from './http'

export function login(username, password) {
  return http.post('/auth/login', { username, password }, { auth: false })
}

export function fetchMe() {
  return http.get('/auth/me')
}

// Map the API's UserOut to the shape the UI uses.
export function toUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    name: u.full_name || u.username,
    role: u.role,
    isSuperAdmin: !!u.is_super_admin,
    isActive: !!u.is_active,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
  }
}
