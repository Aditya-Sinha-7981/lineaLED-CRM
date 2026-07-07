import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SpecCard from '../components/SpecCard'
import StatusBadge from '../components/StatusBadge'

export default function BranchDetail() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [board, setBoard] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [siteId])

  async function fetchData() {
    setLoading(true)
    const { data: siteData } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (!siteData) { setLoading(false); return }
    setSite(siteData)

    const { data: boardData } = await supabase
      .from('boards')
      .select('*')
      .eq('site_id', siteId)
      .maybeSingle()

    setBoard(boardData)

    if (boardData) {
      const { data: estData } = await supabase
        .from('estimates')
        .select('*')
        .eq('board_id', boardData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setEstimate(estData)
    }

    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Branch not found.</div>
      </div>
    )
  }

  const price = estimate?.manual_price
    ? parseFloat(estimate.manual_price).toLocaleString('en-IN')
    : null

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/client')} className="text-sm text-gray-300 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">{site.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={site.status} />
          <button onClick={handleSignOut} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Address</p>
              <p className="font-medium">{site.address || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400">Status</p>
              <StatusBadge status={site.status} />
            </div>
            {price && (
              <div>
                <p className="text-gray-400">Quote Amount</p>
                <p className="font-bold text-orange-600 text-lg">₹{price}</p>
              </div>
            )}
            {estimate?.approval_token_used_at && (
              <div>
                <p className="text-gray-400">Acknowledged</p>
                <p className="font-medium text-green-600">Yes</p>
              </div>
            )}
          </div>
        </div>

        {board && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Board</h2>
              <img
                src={board.photo_url}
                alt="Board"
                className="max-w-full max-h-64 object-contain rounded-lg border mb-4"
                crossOrigin="anonymous"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="font-medium">{board.board_type === 'video_wall' ? 'Video Wall' : 'GSB Signage'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Dimensions</p>
                  <p className="font-medium">{board.width_ft} × {board.height_ft} ft</p>
                </div>
              </div>
            </div>

            <SpecCard spec={board.spec} boardType={board.board_type} />
          </>
        )}

        {!board && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-gray-400">Survey not yet completed for this branch.</p>
          </div>
        )}
      </main>
    </div>
  )
}