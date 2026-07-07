import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['not_surveyed', 'quoted', 'needs_revision', 'approved', 'installed']

function getSiteAction(site) {
  const boardId = site.boards?.[0]?.id || site.boards?.id
  if (site.status === 'not_surveyed') return { label: 'Survey', to: `/staff/survey/${site.id}` }
  if (site.status === 'needs_revision') return { label: 'Revise Survey', to: `/staff/survey/${site.id}` }
  if (boardId && (site.status === 'quoted' || site.status === 'approved' || site.status === 'installed')) {
    if (site.status === 'quoted') return { label: 'View Quote', to: `/staff/quote/${boardId}` }
    return { label: 'View', to: `/staff/survey/${site.id}` }
  }
  return { label: 'View', to: `/staff/survey/${site.id}` }
}

function CreateSiteModal({ projectId, staffId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Site name is required.'); return }
    if (!projectId) { setError('No project available. Ask admin to set up a project first.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('sites').insert({
      project_id: projectId,
      name: name.trim(),
      address: address.trim() || null,
      status: 'not_surveyed',
      assigned_staff_id: staffId || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Add Single Site</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Surat – Ring Road Branch" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional address" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 px-4 py-2 rounded-lg text-sm font-medium">
            {saving ? 'Creating…' : 'Create Site'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StaffDashboard() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAddSite, setShowAddSite] = useState(false)
  const [staffId, setStaffId] = useState(null)
  const [projectId, setProjectId] = useState(null)

  useEffect(() => {
    fetchSites()
    fetchDefaultProject()
  }, [filter])

  async function fetchDefaultProject() {
    const { data } = await supabase.from('projects').select('id').limit(1).maybeSingle()
    if (data?.id) setProjectId(data.id)
  }

  async function fetchSites() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    setStaffId(user.id)

    let query = supabase
      .from('sites')
      .select('*, boards(id)')
      .eq('assigned_staff_id', user.id)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (!error && data) {
      setSites(data)
      if (data.length > 0) {
        const { data: proj } = await supabase
          .from('sites')
          .select('project_id')
          .eq('id', data[0].id)
          .single()
        setProjectId(proj?.project_id || null)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Staff Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Staff</span>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Assigned Sites</h2>
          <button
            onClick={() => setShowAddSite(true)}
            className="bg-orange-500 text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            + Add Site
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === s ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : sites.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-400">No assigned sites found.</p>
            <p className="text-sm text-gray-300 mt-1">
              Ask your admin to assign sites via Setup, or add a single site yourself.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Site</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Address</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => {
                  const action = getSiteAction(site)
                  return (
                    <tr key={site.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{site.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{site.address || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={site.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={action.to} className="text-orange-500 hover:underline text-sm">
                          {action.label}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Link to="/login" className="text-sm text-orange-500 hover:underline">
            Sign in as different role
          </Link>
        </div>
      </main>

      {showAddSite && (
        <CreateSiteModal
          projectId={projectId}
          staffId={staffId}
          onClose={() => setShowAddSite(false)}
          onSuccess={fetchSites}
        />
      )}
    </div>
  )
}
