import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { calculateVideoWallSpec, calculateGsbSignageSpec, MS, CD } from '../lib/calculations'
import StatusBadge from '../components/StatusBadge'
import PhotoAnnotator from '../components/PhotoAnnotator'
import SpecCard from '../components/SpecCard'

const PITCH_ORDER = ['P1.25', 'P1.5', 'P1.8', 'P2', 'P2.5', 'P3', 'P4', 'P6', 'P10 RGB']

function getAvailablePitches(env, boardType) {
  if (boardType !== 'video_wall') return []
  const cabTypes = CD[env]
  if (!cabTypes) return []
  const pitches = new Set()
  Object.values(cabTypes).forEach(c => c.p.forEach(p => pitches.add(p)))
  return PITCH_ORDER.filter(p => pitches.has(p))
}

function getCabinetTypes(env, pitch) {
  if (!env || !pitch || !CD[env]) return []
  return Object.entries(CD[env])
    .filter(([, c]) => c.p.includes(pitch))
    .map(([name]) => name)
}

export default function SurveyScreen() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [boardType, setBoardType] = useState('video_wall')
  const [environment, setEnvironment] = useState('')
  const [pixelPitch, setPixelPitch] = useState('')
  const [cabinetType, setCabinetType] = useState('')
  const [widthFt, setWidthFt] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [widthUnit, setWidthUnit] = useState('ft')
  const [heightUnit, setHeightUnit] = useState('ft')

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [annotation, setAnnotation] = useState(null)
  const [existingBoard, setExistingBoard] = useState(null)
  const [spec, setSpec] = useState(null)

  useEffect(() => {
    fetchSite()
  }, [siteId])

  async function fetchSite() {
    setLoading(true)
    const [{ data: siteData }, { data: boardData }] = await Promise.all([
      supabase.from('sites').select('*').eq('id', siteId).single(),
      supabase.from('boards').select('*').eq('site_id', siteId).maybeSingle(),
    ])

    setSite(siteData)
    setExistingBoard(boardData)

    if (boardData) {
      setBoardType(boardData.board_type || 'video_wall')
      setWidthFt(boardData.width_ft?.toString() || '')
      setHeightFt(boardData.height_ft?.toString() || '')
      setAnnotation(boardData.annotation || null)
      if (boardData.photo_url) {
        setPhotoUrl(boardData.photo_url)
      }
      if (boardData.spec) {
        setSpec(boardData.spec)
      }
      if (boardData.board_type === 'video_wall' && boardData.spec) {
        setEnvironment(boardData.spec._env || '')
        setPixelPitch(boardData.spec._pitch || '')
        setCabinetType(boardData.spec._cab || '')
      }
    }

    setLoading(false)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    setPhotoUrl(url)
    setAnnotation(null)
    setSpec(null)
  }

  function handleEnvironmentChange(val) {
    setEnvironment(val)
    setPixelPitch('')
    setCabinetType('')
  }

  function handlePitchChange(val) {
    setPixelPitch(val)
    setCabinetType('')
  }

  function handleCalculate() {
    if (!widthFt || !heightFt) return

    const w = parseFloat(widthFt)
    const h = parseFloat(heightFt)
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return

    let result
    if (boardType === 'video_wall') {
      if (!environment || !pixelPitch || !cabinetType) return
      result = calculateVideoWallSpec({ environment, pixelPitch, widthFt: w, heightFt: h, cabinetType })
      result._env = environment
      result._pitch = pixelPitch
      result._cab = cabinetType
    } else {
      result = calculateGsbSignageSpec({ widthFt: w, heightFt: h, widthUnit, heightUnit })
    }
    setSpec(result)
  }

  async function handleSubmit() {
    if (!spec || !annotation) {
      setError('Please mark the board area and calculate the spec first.')
      return
    }
    if (!photoFile && !existingBoard) {
      setError('Please upload a survey photo.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let finalPhotoUrl = photoUrl

      if (photoFile) {
        const path = `${siteId}/survey.jpg`
        const { error: uploadError } = await supabase.storage
          .from('site-photos')
          .upload(path, photoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('site-photos')
          .getPublicUrl(path)
        finalPhotoUrl = urlData.publicUrl
      }

      const boardPayload = {
        site_id: siteId,
        board_type: boardType,
        photo_url: finalPhotoUrl,
        annotation,
        width_ft: parseFloat(widthFt),
        height_ft: parseFloat(heightFt),
        spec,
      }

      let board
      if (existingBoard) {
        const { data, error: boardError } = await supabase
          .from('boards')
          .update(boardPayload)
          .eq('id', existingBoard.id)
          .select()
          .single()
        if (boardError) throw new Error(`boards update: ${boardError.message}`)
        board = data
      } else {
        const { data, error: boardError } = await supabase
          .from('boards')
          .insert(boardPayload)
          .select()
          .single()
        if (boardError) throw new Error(`boards insert: ${boardError.message}`)
        board = data
      }

      const { error: estimateError } = await supabase
        .from('estimates')
        .insert({
          board_id: board.id,
          spec_snapshot: spec,
          status: 'draft',
        })
      if (estimateError) throw new Error(`estimates insert: ${estimateError.message}`)

      const { error: siteUpdateError } = await supabase
        .from('sites')
        .update({ status: 'quoted' })
        .eq('id', siteId)
      if (siteUpdateError) throw new Error(`sites update: ${siteUpdateError.message}`)

      navigate(`/staff/quote/${board.id}`)
    } catch (err) {
      setError(err.message || 'Failed to save survey.')
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

  const availablePitches = getAvailablePitches(environment, boardType)
  const availableCabinets = getCabinetTypes(environment, pixelPitch)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/staff')} className="text-sm text-gray-300 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">Survey: {site.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={site.status} />
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Step 1 — Survey Photo</h2>
            {existingBoard && (
              <span className="text-xs text-gray-400">Editing existing survey</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors"
          >
            <div className="text-4xl mb-2">📷</div>
            <p className="text-sm text-gray-500">
              {photoPreview ? 'Click to replace photo' : 'Click to upload survey photo'}
            </p>
          </button>
        </div>

        {photoUrl && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Step 2 — Mark Board Area</h2>
            <PhotoAnnotator
              photoUrl={photoUrl}
              annotation={annotation}
              onAnnotationChange={setAnnotation}
              disabled={!photoUrl}
            />
          </div>
        )}

        {annotation && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Step 3 — Board Details</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Board Type</label>
              <div className="flex gap-3">
                {['video_wall', 'gsb_signage'].map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setBoardType(type)
                      setSpec(null)
                      setEnvironment('')
                      setPixelPitch('')
                      setCabinetType('')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      boardType === type
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'video_wall' ? 'Video Wall' : 'GSB Signage'}
                  </button>
                ))}
              </div>
            </div>

            {boardType === 'video_wall' && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                    <select
                      value={environment}
                      onChange={e => handleEnvironmentChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select…</option>
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pixel Pitch</label>
                    <select
                      value={pixelPitch}
                      onChange={e => handlePitchChange(e.target.value)}
                      disabled={!environment}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                    >
                      <option value="">Select…</option>
                      {availablePitches.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cabinet Type</label>
                    <select
                      value={cabinetType}
                      onChange={e => setCabinetType(e.target.value)}
                      disabled={!pixelPitch}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                    >
                      <option value="">Select…</option>
                      {availableCabinets.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={widthFt}
                        onChange={e => { setWidthFt(e.target.value); setSpec(null) }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm"
                        placeholder="e.g. 8"
                        min="0.1"
                      />
                      <select
                        value={widthUnit}
                        onChange={e => { setWidthUnit(e.target.value); setSpec(null) }}
                        className="px-2 border-l-0 border border-gray-300 rounded-r-lg text-sm bg-gray-50"
                      >
                        <option value="ft">ft</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={heightFt}
                        onChange={e => { setHeightFt(e.target.value); setSpec(null) }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm"
                        placeholder="e.g. 4.5"
                        min="0.1"
                      />
                      <select
                        value={heightUnit}
                        onChange={e => { setHeightUnit(e.target.value); setSpec(null) }}
                        className="px-2 border-l-0 border border-gray-300 rounded-r-lg text-sm bg-gray-50"
                      >
                        <option value="ft">ft</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {boardType === 'gsb_signage' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={widthFt}
                      onChange={e => { setWidthFt(e.target.value); setSpec(null) }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm"
                      placeholder="e.g. 408"
                      min="0.1"
                    />
                    <select
                      value={widthUnit}
                      onChange={e => { setWidthUnit(e.target.value); setSpec(null) }}
                      className="px-2 border-l-0 border border-gray-300 rounded-r-lg text-sm bg-gray-50"
                    >
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={heightFt}
                      onChange={e => { setHeightFt(e.target.value); setSpec(null) }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm"
                      placeholder="e.g. 36"
                      min="0.1"
                    />
                    <select
                      value={heightUnit}
                      onChange={e => { setHeightUnit(e.target.value); setSpec(null) }}
                      className="px-2 border-l-0 border border-gray-300 rounded-r-lg text-sm bg-gray-50"
                    >
                      <option value="in">in</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={
                !widthFt || !heightFt ||
                (boardType === 'video_wall' && (!environment || !pixelPitch || !cabinetType))
              }
              className="w-full bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Calculate Spec
            </button>

            {spec && (
              <div className="mt-4">
                <SpecCard spec={spec} boardType={boardType} />
              </div>
            )}
          </div>
        )}

        {spec && (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save Survey & Generate Quote →'}
          </button>
        )}
      </main>
    </div>
  )
}