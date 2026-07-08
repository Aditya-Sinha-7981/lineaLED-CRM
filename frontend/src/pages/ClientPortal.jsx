import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProgressRollup from '../components/ProgressRollup'
import StatusBadge from '../components/StatusBadge'

export default function ClientPortal() {
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [projectFilter, setProjectFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_org_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.client_org_id) { setLoading(false); return }

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('client_org_id', profile.client_org_id)
      .order('name')

    const projectList = projectsData || []
    setProjects(projectList)

    if (projectList.length === 0) { setLoading(false); return }

    const projectIds = projectList.map(p => p.id)
    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    setSites(sitesData || [])
    setLoading(false)
  }

  const filteredSites = projectFilter === 'all'
    ? sites
    : sites.filter(s => s.project_id === projectFilter)

  const installed = filteredSites.filter(s => s.status === 'installed').length
  const total = filteredSites.length
  const activeProject = projects.find(p => p.id === projectFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Client Portal</h1>
          <p className="text-sm text-gray-400">
            {projectFilter === 'all' ? 'All projects' : activeProject?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Client</span>
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {projects.length > 1 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by project</label>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All projects ({sites.length} branches)</option>
              {projects.map(p => {
                const count = sites.filter(s => s.project_id === p.id).length
                return (
                  <option key={p.id} value={p.id}>{p.name} ({count} branches)</option>
                )
              })}
            </select>
          </div>
        )}

        <ProgressRollup installed={installed} total={total} />

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">All Branches</h2>
          {filteredSites.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <p className="text-gray-400">No branches found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Branch</th>
                    {projectFilter === 'all' && projects.length > 1 && (
                      <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Project</th>
                    )}
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Address</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map(site => (
                    <tr key={site.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{site.name}</td>
                      {projectFilter === 'all' && projects.length > 1 && (
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          {projects.find(p => p.id === site.project_id)?.name || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{site.address || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={site.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/client/site/${site.id}`} className="text-orange-500 hover:underline text-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
