import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProgressRollup from '../components/ProgressRollup'
import StatusBadge from '../components/StatusBadge'

function OrgProgressRow({ org, projects }) {
  const allSites = projects.flatMap(p => p.sites || [])
  const installed = allSites.filter(s => s.status === 'installed').length
  const total = allSites.length
  const pct = total > 0 ? Math.round((installed / total) * 100) : 0

  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{org.name}</h3>
        <span className="text-sm text-gray-500">{installed} / {total} installed ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {projects.length === 0 ? (
        <p className="text-xs text-gray-400">No projects</p>
      ) : (
        <div className="space-y-2">
          {projects.map(proj => {
            const projSites = proj.sites || []
            const projInstalled = projSites.filter(s => s.status === 'installed').length
            return (
              <div key={proj.id} className="flex items-center justify-between text-sm pl-3 border-l-2 border-gray-100">
                <span className="text-gray-600">{proj.name}</span>
                <span className="text-gray-500">{projInstalled} / {projSites.length}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OwnerDashboard() {
  const [pendingEstimates, setPendingEstimates] = useState([])
  const [orgProgress, setOrgProgress] = useState([])
  const [totalInstalled, setTotalInstalled] = useState(0)
  const [totalSites, setTotalSites] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: pending }, { data: orgs }] = await Promise.all([
      supabase
        .from('estimates')
        .select('*, boards(*, sites(name, address))')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false }),
      supabase
        .from('client_orgs')
        .select('id, name, projects(id, name, sites(id, status))')
        .order('name'),
    ])

    if (pending) setPendingEstimates(pending)

    const orgList = orgs || []
    setOrgProgress(orgList)

    const allSites = orgList.flatMap(o => (o.projects || []).flatMap(p => p.sites || []))
    setTotalSites(allSites.length)
    setTotalInstalled(allSites.filter(s => s.status === 'installed').length)

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Admin</span>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Organization Progress</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading…</div>
          ) : orgProgress.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="text-gray-400">No organizations yet. Create one in Setup.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ProgressRollup installed={totalInstalled} total={totalSites} />
              <div className="grid gap-4">
                {orgProgress.map(org => (
                  <OrgProgressRow key={org.id} org={org} projects={org.projects || []} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Approvals</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading…</div>
          ) : pendingEstimates.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500">No pending approvals. All caught up.</p>
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
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingEstimates.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400 mb-2">Quick links</p>
            <div className="flex gap-4 flex-wrap">
              <Link to="/admin/setup" className="text-orange-500 text-sm hover:underline">Setup (Orgs / Users / Sites)</Link>
              <Link to="/login" className="text-orange-500 text-sm hover:underline">Sign in as different role</Link>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Installed (all orgs)</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalInstalled}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
