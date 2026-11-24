// Auth API
//   GET  /tenants/current (public)         -> { id, name, slug, domain }
//   POST /auth/login  { tenant_id, username, password } -> { access_token, token_type, expires_in }
//   GET  /auth/me     (Bearer token)         -> UserOut
import { http } from './http'

// The backend resolves the tenant from the request's host (subdomain) so the login page
// can show its name and send its id with the login request.
export function fetchCurrentTenant() {
  return http.get('/tenants/current', { auth: false })
}

export function login(tenantId, username, password) {
  return http.post('/auth/login', { tenant_id: tenantId, username, password }, { auth: false })
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
