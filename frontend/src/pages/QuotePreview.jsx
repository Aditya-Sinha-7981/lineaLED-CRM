import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SpecCard from '../components/SpecCard'

export default function QuotePreview() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [board, setBoard] = useState(null)
  const [site, setSite] = useState(null)
  const [manualPrice, setManualPrice] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [boardId])

  async function fetchData() {
    setLoading(true)
    const { data: boardData } = await supabase
      .from('boards')
      .select('*, sites(*)')
      .eq('id', boardId)
      .single()

    if (!boardData) {
      setLoading(false)
      return
    }

    setBoard(boardData)
    setSite(boardData.sites)

    const { data: estData } = await supabase
      .from('estimates')
      .select('*')
      .eq('board_id', boardId)
      .maybeSingle()

    if (estData) {
      setEstimate(estData)
      setManualPrice(estData.manual_price?.toString() || '')
    }
    setLoading(false)
  }

  async function handleSendForApproval() {
    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          status: 'pending_approval',
          manual_price: manualPrice ? parseFloat(manualPrice) : null,
        })
        .eq('id', estimate.id)

      if (updateError) throw updateError

      navigate('/staff')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!board || !site) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Quote not found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/staff')} className="text-sm text-gray-300 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">Quote Preview</h1>
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
          <h2 className="font-semibold text-gray-800 mb-4">{site.name}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>{site.address || 'No address'}</div>
            <div>Status: {site.status}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Board Photo</h2>
          <img
            src={board.photo_url}
            alt="Board"
            className="max-w-full max-h-64 object-contain rounded-lg"
            crossOrigin="anonymous"
          />
          <p className="text-xs text-gray-400 mt-2">
            {board.width_ft} × {board.height_ft} ft — {board.board_type}
          </p>
        </div>

        <SpecCard spec={board.spec} boardType={board.board_type} />

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Quote Price</h2>
          <p className="text-xs text-gray-400 mb-3">
            Price is entered manually — no automatic calculation is applied.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-lg">₹</span>
            <input
              type="number"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-lg"
              placeholder="Enter amount"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">PDF Generation</h2>
          <p className="text-sm text-gray-400 mb-3">
            PDF generation will be wired up in Step 7. For now, you can send for approval directly.
          </p>
          <p className="text-xs text-gray-300">PDF preview placeholder — see Step 7.</p>
        </div>

        <button
          onClick={handleSendForApproval}
          disabled={saving}
          className="w-full bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? 'Sending…' : 'Send for Approval'}
        </button>
      </main>
    </div>
  )
}