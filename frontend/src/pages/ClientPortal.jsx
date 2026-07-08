import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PageLayout from '../components/PageLayout'
import EmptyState from '../components/EmptyState'
import ProgressRollup from '../components/ProgressRollup'
import StatusBadge from '../components/StatusBadge'

const STATUS_OPTIONS = ['all', 'not_surveyed', 'quoted', 'needs_revision', 'approved', 'installed']

export default function ClientPortal() {
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
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

  const filteredSites = useMemo(() => {
    let list = sites
    if (projectFilter !== 'all') list = list.filter(s => s.project_id === projectFilter)
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [sites, projectFilter, statusFilter, search])

  const rollupSites = projectFilter === 'all' ? sites : sites.filter(s => s.project_id === projectFilter)
  const installed = rollupSites.filter(s => s.status === 'installed').length
  const total = rollupSites.length
  const activeProject = projects.find(p => p.id === projectFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <PageLayout
      title="Client Portal"
      subtitle={projectFilter === 'all' ? 'All projects' : activeProject?.name}
      role="Client"
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search branches</label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or address…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            {projects.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All projects ({sites.length})</option>
                  {projects.map(p => {
                    const count = sites.filter(s => s.project_id === p.id).length
                    return <option key={p.id} value={p.id}>{p.name} ({count})</option>
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm capitalize"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <ProgressRollup installed={installed} total={total} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Branches</h2>
            <span className="text-sm text-gray-400">{filteredSites.length} shown</span>
          </div>

          {filteredSites.length === 0 ? (
            <EmptyState
              icon="🏢"
              title={sites.length === 0 ? 'No branches yet' : 'No matches'}
              description={
                sites.length === 0
                  ? 'Branches will appear here once your admin imports them.'
                  : 'Try a different search or filter.'
              }
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
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
      </div>
    </PageLayout>
  )
}
