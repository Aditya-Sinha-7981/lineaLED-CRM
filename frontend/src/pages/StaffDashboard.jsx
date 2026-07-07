import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge'

const STATUSES = ['not_surveyed', 'quoted', 'needs_revision', 'approved', 'installed']

export default function StaffDashboard() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchSites()
  }, [filter])

  async function fetchSites() {
    setLoading(true)
    let query = supabase
      .from('sites')
      .select('*, boards(id)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (!error && data) {
      setSites(data)
    }
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Staff Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Staff</span>
          <button
            onClick={handleSignOut}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Sites</h2>
          <Link
            to="/login"
            className="text-sm text-orange-500 hover:underline"
          >
            Sign in as different role
          </Link>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === s
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
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
            <p className="text-gray-400">No sites found.</p>
            <p className="text-sm text-gray-300 mt-1">
              {filter === 'all' ? 'No sites assigned yet.' : `No ${filter.replace('_', ' ')} sites.`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Site</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Address</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => (
                  <tr key={site.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{site.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {site.address || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={site.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/staff/survey/${site.id}`}
                        className="text-orange-500 hover:underline text-sm"
                      >
                        {site.status === 'not_surveyed' ? 'Survey' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}