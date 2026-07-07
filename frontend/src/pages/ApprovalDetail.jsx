import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SpecCard from '../components/SpecCard'
import AnnotatedPhoto from '../components/AnnotatedPhoto'
import { approveAndNotifyUrl } from '../lib/edgeFunctions'

export default function ApprovalDetail() {
  const { estimateId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [board, setBoard] = useState(null)
  const [site, setSite] = useState(null)
  const [clientOrg, setClientOrg] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [estimateId])

  async function fetchData() {
    setLoading(true)
    const { data: est } = await supabase
      .from('estimates')
      .select('*, boards(*, sites(*, projects(*, client_orgs(*))))')
      .eq('id', estimateId)
      .single()

    if (est) {
      setEstimate(est)
      setBoard(est.boards)
      setSite(est.boards?.sites)
      setClientOrg(est.boards?.sites?.projects?.client_orgs)
    }
    setLoading(false)
  }

  async function handleApproveSend() {
    if (sending) return
    setSending(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(approveAndNotifyUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ estimate_id: estimateId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Approval failed')
      }

      navigate('/admin')
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  async function handleNeedsRevision() {
    if (sending) return
    setSending(true)
    setError('')
    try {
      const { error: estErr } = await supabase
        .from('estimates')
        .update({ status: 'needs_revision' })
        .eq('id', estimateId)
      if (estErr) throw estErr

      if (site) {
        const { error: siteErr } = await supabase
          .from('sites')
          .update({ status: 'needs_revision' })
          .eq('id', site.id)
        if (siteErr) throw siteErr
      }

      navigate('/admin')
    } catch (err) {
      setError(err.message)
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Estimate not found.</div>
      </div>
    )
  }

  const price = estimate.manual_price
    ? parseFloat(estimate.manual_price).toLocaleString('en-IN')
    : null

  const alreadyApproved = estimate.status === 'approved'

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-300 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">Quote Approval</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
          Sign Out
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              alreadyApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {alreadyApproved ? 'Approved' : 'Pending Approval'}
            </span>
            {estimate.approval_token_used_at && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                Client Acknowledged
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-2">{site?.name || 'Unknown Site'}</h2>
          <p className="text-gray-500 text-sm mt-1">{site?.address || ''} — {clientOrg?.name || ''}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Board Photo</h3>
          <AnnotatedPhoto photoUrl={board?.photo_url} annotation={board?.annotation} />
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-gray-400">Type</p>
              <p className="font-medium">{board?.board_type === 'video_wall' ? 'Video Wall' : 'GSB Signage'}</p>
            </div>
            <div>
              <p className="text-gray-400">Dimensions</p>
              <p className="font-medium">{board?.width_ft} × {board?.height_ft} ft</p>
            </div>
            <div>
              <p className="text-gray-400">Price</p>
              <p className="font-medium text-orange-600">{price ? `₹${price}` : '—'}</p>
            </div>
          </div>
          {estimate.pdf_url && (
            <a
              href={estimate.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-orange-500 hover:underline"
            >
              View PDF Quote →
            </a>
          )}
        </div>

        <SpecCard spec={board?.spec} boardType={board?.board_type} />

        {!alreadyApproved && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Approval Action</h3>
            <p className="text-sm text-gray-400 mb-4">
              "Approve &amp; Send" sends an acknowledgment email to the client, then marks the quote and site as approved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleApproveSend}
                disabled={sending}
                className="flex-1 bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 py-3 rounded-xl text-sm font-semibold"
              >
                {sending ? 'Sending…' : 'Approve & Send'}
              </button>
              <button
                onClick={handleNeedsRevision}
                disabled={sending}
                className="px-6 bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 py-3 rounded-xl text-sm"
              >
                Needs Revision
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
