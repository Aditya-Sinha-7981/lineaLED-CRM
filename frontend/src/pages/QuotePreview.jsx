import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SpecCard from '../components/SpecCard'
import AnnotatedPhoto from '../components/AnnotatedPhoto'
import { generateEstimatePdf, uploadPdf, htmlToCanvas, canvasToPdfBlob } from '../lib/pdfGenerator'

export default function QuotePreview() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const printRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [board, setBoard] = useState(null)
  const [site, setSite] = useState(null)
  const [manualPrice, setManualPrice] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [boardId])

  async function fetchData() {
    setLoading(true)
    const { data: boardData } = await supabase
      .from('boards')
      .select('*, sites(*)')
      .eq('id', boardId)
      .single()

    if (!boardData) {
      setLoading(false)
      return
    }

    setBoard(boardData)
    setSite(boardData.sites)

    const { data: estData } = await supabase
      .from('estimates')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (estData) {
      setEstimate(estData)
      setManualPrice(estData.manual_price?.toString() || '')
      setPdfUrl(estData.pdf_url || '')
    }
    setLoading(false)
  }

  async function savePriceIfNeeded(estId) {
    if (!manualPrice) return
    await supabase
      .from('estimates')
      .update({ manual_price: parseFloat(manualPrice) })
      .eq('id', estId)
  }

  async function handleGeneratePdf() {
    if (!printRef.current) return
    setGenerating(true)
    try {
      const siteName = site?.name || 'Quote'
      await generateEstimatePdf({
        element: printRef.current,
        filename: `Quote_${siteName.replace(/\s+/g, '_')}`,
      })
    } catch (err) {
      setError('PDF generation failed: ' + err.message)
    }
    setGenerating(false)
  }

  async function handleSendForApproval() {
    if (estimate?.status === 'pending_approval') {
      setError('This quote is already pending approval.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let est = estimate

      if (!est && board) {
        const { data: newEst, error: createError } = await supabase
          .from('estimates')
          .insert({ board_id: board.id, spec_snapshot: board.spec || {}, status: 'draft' })
          .select()
          .single()
        if (createError) throw createError
        est = newEst
        setEstimate(est)
      }

      await savePriceIfNeeded(est.id)

      if (!pdfUrl && printRef.current) {
        const canvas = await htmlToCanvas(printRef.current)
        const blob = canvasToPdfBlob(canvas)
        const uploadedUrl = await uploadPdf(blob, est.id)
        setPdfUrl(uploadedUrl)
        await supabase.from('estimates').update({ pdf_url: uploadedUrl }).eq('id', est.id)
      }

      const { error: updateError } = await supabase
        .from('estimates')
        .update({
          status: 'pending_approval',
          manual_price: manualPrice ? parseFloat(manualPrice) : null,
          spec_snapshot: board.spec || {},
        })
        .eq('id', est.id)

      if (updateError) throw updateError

      navigate('/staff')
    } catch (err) {
      setError(err.message || 'Failed to send for approval.')
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

  if (!board || !site) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Quote not found.</div>
      </div>
    )
  }

  const price = manualPrice ? parseFloat(manualPrice).toLocaleString('en-IN') : null
  const isPending = estimate?.status === 'pending_approval'

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/staff')} className="text-sm text-gray-300 hover:text-white">
            ← Back
          </button>
          <h1 className="text-lg font-bold">Quote Preview</h1>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
          Sign Out
        </button>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {isPending && (
          <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-lg text-sm border border-yellow-200">
            This quote is pending admin approval.
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Quote Amount</h3>
          <p className="text-xs text-gray-400 mb-3">
            Enter the quote amount manually — no automatic calculation is applied.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-gray-500 text-lg font-medium">₹</span>
            <input
              type="number"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              disabled={isPending}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-lg max-w-xs disabled:bg-gray-50"
              placeholder="Enter amount"
            />
          </div>
          <p className="text-xs text-gray-400">
            Estimate ID: <span className="font-mono text-gray-500">{estimate?.id?.slice(0, 8).toUpperCase() || '—'}</span>
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleGeneratePdf}
            disabled={generating}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
          >
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
          {!isPending && (
            <button
              onClick={handleSendForApproval}
              disabled={saving}
              className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 px-4 py-2 rounded-lg text-sm font-medium"
            >
              {saving ? 'Sending…' : 'Send for Approval'}
            </button>
          )}
        </div>

        <div ref={printRef} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ width: 1100 }}>
          <div className="bg-gray-900 text-white px-8 py-6 flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold tracking-tight">Signage Quote</div>
              <div className="text-gray-400 text-sm mt-1">Generated via CRM</div>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div>Ref: {estimate?.id?.slice(0, 8).toUpperCase() || '—'}</div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-orange-500 mb-1">{site.name}</div>
              <div className="text-gray-500 text-sm">{site.address || 'No address'}</div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-2">
                <AnnotatedPhoto
                  photoUrl={board.photo_url}
                  annotation={board.annotation}
                />
              </div>
              <div className="text-sm">
                <div className="mb-3">
                  <p className="text-gray-400 text-xs uppercase font-medium">Board Type</p>
                  <p className="font-medium">{board.board_type === 'video_wall' ? 'Video Wall' : 'GSB Signage'}</p>
                </div>
                <div className="mb-3">
                  <p className="text-gray-400 text-xs uppercase font-medium">Dimensions</p>
                  <p className="font-medium">{board.width_ft} × {board.height_ft} ft</p>
                </div>
                <div className="mb-3">
                  <p className="text-gray-400 text-xs uppercase font-medium">Board Area</p>
                  <p className="font-medium">{(board.width_ft * board.height_ft).toFixed(2)} sq ft</p>
                </div>
                {price && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-gray-400 text-xs uppercase font-medium">Quote Amount</p>
                    <p className="text-2xl font-bold text-orange-600">₹{price}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <SpecCard spec={board.spec} boardType={board.board_type} />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
              This estimate is system-generated. Final pricing and technical specifications are subject to validation.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
