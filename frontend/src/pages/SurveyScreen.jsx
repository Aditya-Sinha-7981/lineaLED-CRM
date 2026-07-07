import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge'

export default function SurveyScreen() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSite()
  }, [siteId])

  async function fetchSite() {
    setLoading(true)
    const { data } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()
    setSite(data)
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
        <div className="text-gray-500">Site not found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/staff')}
            className="text-sm text-gray-300 hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold">Survey: {site.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={site.status} />
          <button
            onClick={handleSignOut}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 mb-4">Survey screen — photo upload, rectangle annotation, and dimension form will be built here in Step 5.</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Address</span>
              <p className="font-medium">{site.address || '—'}</p>
            </div>
            <div>
              <span className="text-gray-400">Status</span>
              <p className="font-medium"><StatusBadge status={site.status} /></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}