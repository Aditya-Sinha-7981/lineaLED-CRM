import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'quotes@aaditya-sinha.xyz'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return jsonResponse({ error: 'Caller is not an admin' }, 403)
  }

  let estimateId: string
  try {
    const body = await req.json()
    estimateId = body.estimate_id
    if (!estimateId) throw new Error('missing estimate_id')
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const { data: estimate, error: estError } = await supabase
    .from('estimates')
    .select('*, boards(site_id, sites(*, projects(*, client_orgs(*))))')
    .eq('id', estimateId)
    .single()

  if (estError || !estimate) {
    return jsonResponse({ error: 'Estimate not found' }, 404)
  }

  if (estimate.status !== 'pending_approval') {
    return jsonResponse({ error: 'Estimate is not pending approval' }, 400)
  }

  const site = estimate.boards?.sites
  const clientOrg = site?.projects?.client_orgs
  const previousSiteStatus = site?.status || 'quoted'

  if (!site || !clientOrg) {
    return jsonResponse({ error: 'Estimate not found' }, 404)
  }

  const { data: clientProfiles, error: clientProfilesError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('role', 'client_user')
    .eq('client_org_id', clientOrg.id)
    .limit(1)

  const clientProfile = clientProfiles?.[0]
  if (clientProfilesError || !clientProfile) {
    return jsonResponse({ error: 'No client user found for this organization' }, 404)
  }

  const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(clientProfile.user_id)

  if (authUserError || !authUser?.user?.email) {
    return jsonResponse({ error: 'Client user email not found' }, 404)
  }

  const clientEmail = authUser.user.email
  const approvalToken = crypto.randomUUID()

  const approveUrl = `${FRONTEND_URL}/approve/${approvalToken}`

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a1a; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Your quote is ready</h1>
      </div>
      <div style="background: #fafafa; padding: 24px; border: 1px solid #e5e5e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #333; font-size: 16px;">Hello,</p>
        <p style="color: #333; font-size: 16px;">
          Your signage quote for <strong>${site.name}</strong> has been approved. Please review and acknowledge by clicking the button below.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${approveUrl}" style="display: inline-block; background: #f90; color: #1a1a1a; font-weight: bold; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Acknowledge Quote
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">This link is valid for a one-time acknowledgment.</p>
      </div>
    </div>
  `

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: clientEmail,
      subject: 'Your signage quote is ready',
      html: emailHtml,
    }),
  })

  if (!resendRes.ok) {
    const errText = await resendRes.text()
    console.error('Resend error:', errText)
    return jsonResponse({ error: 'Email failed to send' }, 500)
  }

  const { error: updateError } = await supabase
    .from('estimates')
    .update({
      status: 'approved',
      approval_token: approvalToken,
    })
    .eq('id', estimateId)

  if (updateError) {
    return jsonResponse({ error: 'Failed to update estimate' }, 500)
  }

  const { error: siteUpdateError } = await supabase
    .from('sites')
    .update({ status: 'approved' })
    .eq('id', site.id)

  if (siteUpdateError) {
    await supabase
      .from('estimates')
      .update({ status: 'pending_approval', approval_token: null })
      .eq('id', estimateId)
    await supabase
      .from('sites')
      .update({ status: previousSiteStatus })
      .eq('id', site.id)
    return jsonResponse({ error: 'Failed to update site' }, 500)
  }

  return jsonResponse({ success: true, approval_token: approvalToken })
})
