const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export const EDGE_BASE = `${SUPABASE_URL}/functions/v1`

export function approveTokenUrl(token) {
  return `${EDGE_BASE}/approve-token/${token}`
}

export function approveAndNotifyUrl() {
  return `${EDGE_BASE}/approve-and-notify`
}
