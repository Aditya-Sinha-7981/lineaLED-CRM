import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StatusBadge from '../components/StatusBadge'
import StorageImage from '../components/StorageImage'

export default function InstallScreen() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [site, setSite] = useState(null)
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [finalPhotoFile, setFinalPhotoFile] = useState(null)
  const [finalPhotoPreview, setFinalPhotoPreview] = useState(null)
  const [finalPhotoUrl, setFinalPhotoUrl] = useState('')

  useEffect(() => {
    fetchData()
  }, [siteId])

  async function fetchData() {
    setLoading(true)
    const { data: siteData } = await supabase.from('sites').select('*').eq('id', siteId).single()
    if (!siteData) { setLoading(false); return }
    setSite(siteData)

    const { data: boardData } = await supabase.from('boards').select('*').eq('site_id', siteId).maybeSingle()
    setBoard(boardData)
    if (boardData?.final_photo_url) setFinalPhotoUrl(boardData.final_photo_url)

    setLoading(false)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFinalPhotoFile(file)
    const url = URL.createObjectURL(file)
    setFinalPhotoPreview(url)
    setFinalPhotoUrl(url)
  }

  async function handleMarkInstalled() {
    if (!finalPhotoFile && !finalPhotoUrl) {
      setError('Please upload a final installation photo.')
      return
    }
    if (site?.status !== 'approved') {
      setError('Only approved sites can be marked as installed.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let storedUrl = finalPhotoUrl

      if (finalPhotoFile) {
        const path = `${siteId}/installed.jpg`
        const { error: uploadError } = await supabase.storage
          .from('install-photos')
          .upload(path, finalPhotoFile, { upsert: true })
        if (uploadError) throw uploadError

        storedUrl = path
      }

      if (board) {
        await supabase.from('boards').update({ final_photo_url: storedUrl }).eq('id', board.id)
      }

      await supabase.from('sites').update({ status: 'installed' }).eq('id', siteId)

      navigate('/staff')
    } catch (err) {
      setError(err.message || 'Failed to mark as installed.')
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
          <button onClick={() => navigate('/staff')} className="text-sm text-gray-300 hover:text-white">← Back</button>
          <h1 className="text-lg font-bold">Mark Installed</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={site.status} />
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Sign Out</button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1">{site.name}</h2>
          <p className="text-sm text-gray-500">{site.address || 'No address'}</p>
        </div>

        {site.status !== 'approved' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            Only sites with <strong>Approved</strong> status can be marked as installed. This site is currently: <StatusBadge status={site.status} />
          </div>
        )}

        {board?.photo_url && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Survey Photo (for reference)</h3>
            <img src={board.photo_url} alt="Survey" className="max-w-full max-h-48 object-contain rounded-lg border" crossOrigin="anonymous" />
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Final Installation Photo *</h3>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors"
          >
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-500">
              {finalPhotoPreview ? 'Click to replace photo' : 'Click to upload final installation photo'}
            </p>
          </button>
          {(finalPhotoPreview || (site.status === 'installed' && finalPhotoUrl)) && (
            <div className="mt-4">
              {finalPhotoPreview ? (
                <img
                  src={finalPhotoPreview}
                  alt="Final"
                  className="max-w-full max-h-64 object-contain rounded-lg border"
                  crossOrigin="anonymous"
                />
              ) : (
                <StorageImage
                  bucket="install-photos"
                  src={finalPhotoUrl}
                  alt="Installed"
                  className="max-w-full max-h-64 object-contain rounded-lg border"
                />
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <button
          onClick={handleMarkInstalled}
          disabled={saving || site.status !== 'approved'}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Mark as Installed ✓'}
        </button>
      </main>
    </div>
  )
}