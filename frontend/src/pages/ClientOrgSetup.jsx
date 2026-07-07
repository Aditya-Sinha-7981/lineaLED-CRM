import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CsvImportModal from '../components/CsvImportModal'

async function createAuthUserWithProfile({ email, password, role, clientOrgId }) {
  const { data: { session: adminSession } } = await supabase.auth.getSession()
  if (!adminSession) throw new Error('Admin session expired. Please log in again.')

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })

  // signUp replaces the active session — restore admin immediately
  const { error: restoreErr } = await supabase.auth.setSession({
    access_token: adminSession.access_token,
    refresh_token: adminSession.refresh_token,
  })
  if (restoreErr) throw new Error('Could not restore admin session. Please sign in again.')

  if (authErr) throw new Error(authErr.message)
  if (!authData?.user) throw new Error('Could not create user. Check email and password.')

  if (!authData.user.identities?.length) {
    throw new Error(
      `Email "${email}" is already registered. Use a different email, or add a profile for the existing account in Supabase.`
    )
  }

  const profilePayload = {
    user_id: authData.user.id,
    role,
    name: email.split('@')[0],
  }
  if (role === 'client_user') {
    if (!clientOrgId) throw new Error('Select an organization before creating a client user.')
    profilePayload.client_org_id = clientOrgId
  }

  const { error: profileErr } = await supabase.from('profiles').insert(profilePayload)
  if (profileErr) {
    if (profileErr.message.includes('profiles_user_id_fkey')) {
      throw new Error(`Email "${email}" is already registered but has no profile yet. Create the profile manually in Supabase.`)
    }
    if (profileErr.code === '23505') {
      throw new Error(`A profile for "${email}" already exists.`)
    }
    throw new Error(profileErr.message)
  }

  return authData.user
}

export default function ClientOrgSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPassword, setClientPassword] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingOrgs, setExistingOrgs] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [existingProjects, setExistingProjects] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(null)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [editingOrgId, setEditingOrgId] = useState(null)
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    refreshData()
  }, [])

  async function refreshData() {
    const [{ data: orgs }, { data: projects }, { data: staff }] = await Promise.all([
      supabase.from('client_orgs').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
      supabase.from('profiles').select('user_id, name').eq('role', 'staff').order('name'),
    ])
    setExistingOrgs(orgs || [])
    setAllProjects(projects || [])
    setStaffUsers(staff || [])
    if (staff?.length && !selectedStaffId) setSelectedStaffId(staff[0].user_id)
  }

  async function fetchProjects(orgId) {
    if (!orgId) { setExistingProjects([]); return }
    const { data } = await supabase.from('projects').select('*').eq('client_org_id', orgId).order('name')
    setExistingProjects(data || [])
  }

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function handleCreateOrg() {
    if (!selectedOrgId && !orgName.trim()) { setError('Select an org or enter a new org name.'); return }
    setSaving(true)
    clearMessages()
    try {
      let orgId = selectedOrgId
      if (!orgId && orgName.trim()) {
        const { data, error: err } = await supabase.from('client_orgs').insert({ name: orgName.trim() }).select().single()
        if (err) throw new Error(err.message)
        orgId = data.id
        setOrgName('')
        await refreshData()
        setSelectedOrgId(orgId)
      }
      await fetchProjects(orgId)
      setStep(2)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleCreateProject() {
    if (!selectedOrgId) { setError('No org selected. Go back to Step 1.'); return }
    if (!projectName.trim() && !selectedProjectId) { setError('Select a project or enter a new project name.'); return }
    setSaving(true)
    clearMessages()
    try {
      let projId = selectedProjectId
      if (!projId && projectName.trim()) {
        const { data, error: err } = await supabase
          .from('projects')
          .insert({ name: projectName.trim(), client_org_id: selectedOrgId })
          .select()
          .single()
        if (err) throw new Error(err.message)
        projId = data.id
        setProjectName('')
        await refreshData()
        await fetchProjects(selectedOrgId)
        setSelectedProjectId(projId)
      }
      setStep(3)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleCreateClientUser() {
    if (!selectedOrgId) { setError('Complete Step 1 and select an organization first.'); return }
    if (!clientEmail.trim() || !clientPassword.trim()) { setError('Email and password are required.'); return }
    if (clientPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true)
    clearMessages()
    try {
      await createAuthUserWithProfile({
        email: clientEmail.trim(),
        password: clientPassword,
        role: 'client_user',
        clientOrgId: selectedOrgId,
      })
      setSuccess(`Client user ${clientEmail} created. They can log in at /login.`)
      setClientEmail('')
      setClientPassword('')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleCreateStaff() {
    if (!staffEmail.trim() || !staffPassword.trim()) { setError('Email and password are required.'); return }
    if (staffPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true)
    clearMessages()
    try {
      await createAuthUserWithProfile({
        email: staffEmail.trim(),
        password: staffPassword,
        role: 'staff',
      })
      setSuccess(`Staff user ${staffEmail} created. They can log in at /login.`)
      setStaffEmail('')
      setStaffPassword('')
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleAssignSitesToStaff() {
    if (!selectedProjectId) { setError('Select or create a project first.'); return }
    if (!selectedStaffId) { setError('Select a staff user first.'); return }
    setSaving(true)
    clearMessages()
    try {
      const { data: unassigned } = await supabase
        .from('sites')
        .select('id')
        .eq('project_id', selectedProjectId)
        .is('assigned_staff_id', null)

      if (!unassigned?.length) {
        setError('All sites in this project are already assigned.')
        setSaving(false)
        return
      }

      const updates = unassigned.map(s =>
        supabase.from('sites').update({ assigned_staff_id: selectedStaffId }).eq('id', s.id)
      )
      const results = await Promise.all(updates)
      const failed = results.find(r => r.error)
      if (failed?.error) throw new Error(failed.error.message)

      setSuccess(`${unassigned.length} site(s) assigned to staff.`)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleRenameOrg(orgId) {
    if (!editName.trim()) { setError('Name cannot be empty.'); return }
    setSaving(true)
    clearMessages()
    try {
      const { error: err } = await supabase.from('client_orgs').update({ name: editName.trim() }).eq('id', orgId)
      if (err) throw new Error(err.message)
      setEditingOrgId(null)
      setEditName('')
      await refreshData()
      if (selectedOrgId === orgId) await fetchProjects(orgId)
      setSuccess('Organization renamed.')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleRenameProject(projectId) {
    if (!editName.trim()) { setError('Name cannot be empty.'); return }
    setSaving(true)
    clearMessages()
    try {
      const { error: err } = await supabase.from('projects').update({ name: editName.trim() }).eq('id', projectId)
      if (err) throw new Error(err.message)
      setEditingProjectId(null)
      setEditName('')
      await refreshData()
      if (selectedOrgId) await fetchProjects(selectedOrgId)
      setSuccess('Project renamed.')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleDeleteOrg(orgId, orgNameLabel) {
    const childProjects = allProjects.filter(p => p.client_org_id === orgId)
    if (childProjects.length > 0) {
      setError(`Cannot delete "${orgNameLabel}" — it has ${childProjects.length} project(s). Delete those projects first.`)
      return
    }
    if (!window.confirm(`Delete organization "${orgNameLabel}"? This cannot be undone.`)) return
    setSaving(true)
    clearMessages()
    try {
      const { error: err } = await supabase.from('client_orgs').delete().eq('id', orgId)
      if (err) throw new Error(err.message)
      if (selectedOrgId === orgId) {
        setSelectedOrgId(null)
        setSelectedProjectId(null)
        setExistingProjects([])
        setStep(1)
      }
      await refreshData()
      setSuccess(`Organization "${orgNameLabel}" deleted.`)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleDeleteProject(projectId, projectNameLabel) {
    const { count } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (count > 0) {
      setError(`Cannot delete "${projectNameLabel}" — it has ${count} site(s). Remove sites first.`)
      return
    }
    if (!window.confirm(`Delete project "${projectNameLabel}"? This cannot be undone.`)) return
    setSaving(true)
    clearMessages()
    try {
      const { error: err } = await supabase.from('projects').delete().eq('id', projectId)
      if (err) throw new Error(err.message)
      if (selectedProjectId === projectId) setSelectedProjectId(null)
      await refreshData()
      if (selectedOrgId) await fetchProjects(selectedOrgId)
      setSuccess(`Project "${projectNameLabel}" deleted.`)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  function handleOrgSelectChange(val) {
    const id = val || null
    setSelectedOrgId(id)
    setSelectedProjectId(null)
    setProjectName('')
    clearMessages()
    if (id) fetchProjects(id)
    else setExistingProjects([])
  }

  const selectedProject = allProjects.find(p => p.id === selectedProjectId)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-300 hover:text-white">← Back</button>
          <h1 className="text-lg font-bold">Setup</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Sign Out</button>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Step 1 — Organization</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select
              value={selectedOrgId || ''}
              onChange={e => handleOrgSelectChange(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select existing org…</option>
              {existingOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Or create new org name…"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleCreateOrg}
            disabled={saving}
            className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 px-4 py-2 rounded-lg text-sm font-medium w-full"
          >
            {saving ? '…' : selectedOrgId || orgName.trim() ? (selectedOrgId && !orgName.trim() ? 'Next Step →' : 'Create Org & Continue →') : 'Select or enter org name'}
          </button>
        </div>

        {step >= 2 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Step 2 — Project</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select
                value={selectedProjectId || ''}
                onChange={e => { setSelectedProjectId(e.target.value || null); clearMessages() }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select existing project…</option>
                {existingProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Or create new project name…"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                disabled={saving}
                className="flex-1 bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? '…' : selectedProjectId || projectName.trim() ? (selectedProjectId && !projectName.trim() ? 'Next Step →' : 'Create Project & Continue →') : 'Select or enter project name'}
              </button>
              {selectedProjectId && (
                <button
                  onClick={() => setShowCsvImport(true)}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
                >
                  Import CSV
                </button>
              )}
            </div>
            {selectedProject && (
              <p className="text-xs text-gray-400 mt-2">Selected: {selectedProject.name}</p>
            )}
          </div>
        )}

        {step >= 3 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Step 3 — Create Users</h2>
            {!selectedOrgId && (
              <p className="text-sm text-amber-600 mb-3">Select an organization in Step 1 before creating client users.</p>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-600">Client User</h3>
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={clientPassword} onChange={e => setClientPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleCreateClientUser} disabled={saving || !selectedOrgId} className="w-full bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm">Create Client User</button>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-600">Staff</h3>
                <input value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={staffPassword} onChange={e => setStaffPassword(e.target.value)} placeholder="Password (min 6 chars)" type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleCreateStaff} disabled={saving} className="w-full bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm">Create Staff User</button>
              </div>
            </div>
          </div>
        )}

        {step >= 2 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Assign Sites to Staff</h2>
            <p className="text-sm text-gray-400 mb-3">Assigns every unassigned site in the selected project to the chosen staff user.</p>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
            >
              <option value="">Select staff user…</option>
              {staffUsers.map(s => (
                <option key={s.user_id} value={s.user_id}>{s.name || s.user_id.slice(0, 8)}</option>
              ))}
            </select>
            <button
              onClick={handleAssignSitesToStaff}
              disabled={saving || !selectedProjectId || !selectedStaffId}
              className="bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
            >
              {saving ? '…' : 'Assign Unassigned Sites →'}
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">Manage Orgs &amp; Projects</h2>
          {existingOrgs.length === 0 ? (
            <p className="text-sm text-gray-400">No organizations yet.</p>
          ) : (
            <div className="space-y-3">
              {existingOrgs.map(org => (
                <div key={org.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    {editingOrgId === org.id ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <button onClick={() => handleRenameOrg(org.id)} className="text-xs text-orange-500">Save</button>
                        <button onClick={() => { setEditingOrgId(null); setEditName('') }} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-gray-800">{org.name}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingOrgId(org.id); setEditName(org.name); clearMessages() }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteOrg(org.id, org.name)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {allProjects.filter(p => p.client_org_id === org.id).map(proj => (
                    <div key={proj.id} className="flex items-center justify-between ml-3 mt-1 gap-2">
                      {editingProjectId === proj.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            autoFocus
                          />
                          <button onClick={() => handleRenameProject(proj.id)} className="text-xs text-orange-500">Save</button>
                          <button onClick={() => { setEditingProjectId(null); setEditName('') }} className="text-xs text-gray-400">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500">→ {proj.name}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingProjectId(proj.id); setEditName(proj.name); clearMessages() }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteProject(proj.id, proj.name)}
                              className="text-xs text-red-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCsvImport && selectedProjectId && (
        <CsvImportModal
          projectId={selectedProjectId}
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => { setShowCsvImport(false); setSuccess('CSV import complete. Assign sites to staff if needed.') }}
        />
      )}
    </div>
  )
}
