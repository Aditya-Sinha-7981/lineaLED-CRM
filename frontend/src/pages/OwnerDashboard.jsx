import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge'

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const [pendingEstimates, setPendingEstimates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    setLoading(true)
    const { data } = await supabase
      .from('estimates')
      .select('*, boards(*, sites(name, address))')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })

    if (data) setPendingEstimates(data)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Admin</span>
          <button onClick={handleSignOut} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Pending Approvals</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : pendingEstimates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500">No pending approvals. All caught up.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
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
                {pendingEstimates.map(est => (
                  <tr key={est.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {est.boards?.sites?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {est.boards?.sites?.address || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={est.boards?.sites?.status || 'quoted'} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/approval/${est.id}`}
                        className="text-orange-500 hover:underline text-sm font-medium"
                      >
                        Review &amp; Approve →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingEstimates.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Total Sites</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">—</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Installed</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">—</p>
          </div>
        </div>
      </main>
    </div>
  )
}