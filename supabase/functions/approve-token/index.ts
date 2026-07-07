import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html', ...CORS_HEADERS },
  })
}

const HTML_OK = (msg) => htmlResponse(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Quote Acknowledged</title>
<style>body{font-family:Arial,sans-serif;max-width:500px;margin:60px auto;padding:20px;text-align:center}
.card{background:#fafafa;border:1px solid #e5e5e0;border-radius:12px;padding:32px}
h1{color:#1a1a1a;font-size:22px;margin:0 0 16px}p{color:#555;font-size:15px;line-height:1.6;margin:0}
</style></head><body><div class="card"><h1>Quote Acknowledged</h1><p>${msg}</p></div></body></html>`)

const HTML_INVALID = () => htmlResponse(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invalid Link</title>
<style>body{font-family:Arial,sans-serif;max-width:500px;margin:60px auto;padding:20px;text-align:center}
.card{background:#fafafa;border:1px solid #e5e5e0;border-radius:12px;padding:32px}
h1{color:#1a1a1a;font-size:22px;margin:0 0 16px}p{color:#555;font-size:15px;line-height:1.6;margin:0}
</style></head><body><div class="card"><h1>Link Invalid or Already Used</h1><p>This link has already been used or is no longer valid.</p></div></body></html>`)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const token = parts[parts.length - 1]

  if (!token || token === 'approve-token') return HTML_INVALID()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('id, approval_token, approval_token_used_at')
    .eq('approval_token', token)
    .single()

  if (error || !estimate) return HTML_INVALID()
  if (estimate.approval_token_used_at) return HTML_INVALID()

  const { data: updated, error: updateError } = await supabase
    .from('estimates')
    .update({ approval_token_used_at: new Date().toISOString() })
    .eq('id', estimate.id)
    .is('approval_token_used_at', null)
    .select('id')
    .maybeSingle()

  if (updateError || !updated) return HTML_INVALID()

  return HTML_OK('Thank you — your acknowledgment has been recorded.')
})
