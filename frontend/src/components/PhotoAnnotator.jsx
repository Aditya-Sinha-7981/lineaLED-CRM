import { useRef, useState, useEffect, useCallback } from 'react'

export default function PhotoAnnotator({ photoUrl, annotation, onAnnotationChange, disabled }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const drawing = useRef(false)
  const startPos = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  const MIN_PCT = 2

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.offsetWidth
    const cssH = canvas.offsetHeight
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    setDims({ w: canvas.width, h: canvas.height })
  }, [])

  useEffect(() => {
    const img = imgRef.current
    const onLoad = () => fitCanvas()
    img.addEventListener('load', onLoad)
    if (img.complete) onLoad()
    return () => img.removeEventListener('load', onLoad)
  }, [photoUrl, fitCanvas])

  useEffect(() => {
    const handleResize = () => fitCanvas()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [fitCanvas])

  function getCanvasCoords(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return {
      x: Math.max(0, Math.min((e.clientX - rect.left) * dpr, canvas.width)),
      y: Math.max(0, Math.min((e.clientY - rect.top) * dpr, canvas.height)),
    }
  }

  function drawRect(x, y, w, h, fillAlpha, strokeAlpha) {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (annotation) {
      const { x_pct, y_pct, w_pct, h_pct } = annotation
      const ax = (x_pct / 100) * canvas.width
      const ay = (y_pct / 100) * canvas.height
      const aw = (w_pct / 100) * canvas.width
      const ah = (h_pct / 100) * canvas.height
      ctx.fillStyle = 'rgba(255,153,0,0.15)'
      ctx.fillRect(ax, ay, aw, ah)
      ctx.strokeStyle = '#f90'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(ax, ay, aw, ah)
    }

    if (x !== undefined && y !== undefined && w !== undefined && h !== undefined && w > 0 && h > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fillAlpha})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.clearRect(x, y, w, h)
      ctx.strokeStyle = '#f90'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(x, y, w, h)
    }
  }

  const handlePointerDown = (e) => {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    canvas.setPointerCapture(e.pointerId)
    const coords = getCanvasCoords(e)
    startPos.current = coords
    drawing.current = true
    drawRect(coords.x, coords.y, 0, 0, 0, 0)
  }

  const handlePointerMove = (e) => {
    if (!drawing.current || disabled) return
    const coords = getCanvasCoords(e)
    const sx = startPos.current.x
    const sy = startPos.current.y
    const x = Math.min(sx, coords.x)
    const y = Math.min(sy, coords.y)
    const w = Math.abs(coords.x - sx)
    const h = Math.abs(coords.y - sy)
    drawRect(x, y, w, h, 0.34, 1)
  }

  const handlePointerUp = (e) => {
    if (!drawing.current || disabled) return
    drawing.current = false
    const canvas = canvasRef.current
    canvas.releasePointerCapture(e.pointerId)
    const coords = getCanvasCoords(e)
    const sx = startPos.current.x
    const sy = startPos.current.y
    const x = Math.min(sx, coords.x)
    const y = Math.min(sy, coords.y)
    const w = Math.abs(coords.x - sx)
    const h = Math.abs(coords.y - sy)

    const minPx = (MIN_PCT / 100) * Math.min(canvas.width, canvas.height)

    if (w < minPx || h < minPx) {
      drawRect()
      return
    }

    onAnnotationChange({
      x_pct: parseFloat(((x / canvas.width) * 100).toFixed(2)),
      y_pct: parseFloat(((y / canvas.height) * 100).toFixed(2)),
      w_pct: parseFloat(((w / canvas.width) * 100).toFixed(2)),
      h_pct: parseFloat(((h / canvas.height) * 100).toFixed(2)),
    })
  }

  const handlePointerCancel = () => {
    drawing.current = false
    drawRect()
  }

  useEffect(() => {
    drawRect()
  }, [annotation])

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ maxHeight: 400, touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <img
        ref={imgRef}
        src={photoUrl}
        alt="Survey"
        className="max-w-full max-h-96 object-contain mx-auto block"
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full max-w-full max-h-96 cursor-crosshair"
        style={{ maxHeight: 384, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
      {!annotation && (
        <p className="text-center text-xs text-gray-400 mt-2">
          {disabled ? 'No board area marked' : 'Tap and drag to mark the board area'}
        </p>
      )}
      {annotation && (
        <p className="text-center text-xs text-orange-500 mt-2">
          Board area marked — drag to adjust
        </p>
      )}
    </div>
  )
}
