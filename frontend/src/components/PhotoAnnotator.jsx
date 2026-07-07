import { useRef, useState, useEffect } from 'react'

export default function PhotoAnnotator({ photoUrl, annotation, onAnnotationChange, disabled }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState(null)
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    function draw() {
      if (!img.complete) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (annotation) {
        const { x_pct, y_pct, w_pct, h_pct } = annotation
        const x = (x_pct / 100) * canvas.width
        const y = (y_pct / 100) * canvas.height
        const w = (w_pct / 100) * canvas.width
        const h = (h_pct / 100) * canvas.height
        ctx.strokeStyle = '#f90'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.strokeRect(x, y, w, h)
        ctx.fillStyle = 'rgba(255,153,0,0.15)'
        ctx.fillRect(x, y, w, h)
      }

      if (drawing && start && current) {
        const x = Math.min(start.x, current.x)
        const y = Math.min(start.y, current.y)
        const w = Math.abs(current.x - start.x)
        const h = Math.abs(current.y - start.y)
        ctx.strokeStyle = '#f90'
        ctx.lineWidth = 2
        ctx.setLineDash([])
        ctx.strokeRect(x, y, w, h)
        ctx.fillStyle = 'rgba(255,153,0,0.15)'
        ctx.fillRect(x, y, w, h)
      }
    }

    img.addEventListener('load', draw)
    window.addEventListener('resize', draw)

    if (img.complete) {
      draw()
    }

    return () => {
      img.removeEventListener('load', draw)
      window.removeEventListener('resize', draw)
    }
  }, [drawing, start, current, annotation])

  function getCanvasCoords(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handleMouseDown(e) {
    if (disabled) return
    const coords = getCanvasCoords(e)
    setStart(coords)
    setCurrent(coords)
    setDrawing(true)
  }

  function handleMouseMove(e) {
    if (!drawing || disabled) return
    setCurrent(getCanvasCoords(e))
  }

  function handleMouseUp() {
    if (!drawing || !start || !current || disabled) {
      setDrawing(false)
      return
    }

    const canvas = canvasRef.current
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const w = Math.abs(current.x - start.x)
    const h = Math.abs(current.y - start.y)

    if (w < 5 || h < 5) {
      setDrawing(false)
      return
    }

    onAnnotationChange({
      x_pct: parseFloat(((x / canvas.width) * 100).toFixed(2)),
      y_pct: parseFloat(((y / canvas.height) * 100).toFixed(2)),
      w_pct: parseFloat(((w / canvas.width) * 100).toFixed(2)),
      h_pct: parseFloat(((h / canvas.height) * 100).toFixed(2)),
    })

    setDrawing(false)
  }

  return (
    <div className="relative" ref={containerRef} style={{ maxHeight: 400 }}>
      <img
        ref={imgRef}
        src={photoUrl}
        alt="Survey"
        className="max-w-full max-h-96 object-contain mx-auto"
        crossOrigin="anonymous"
        style={{ display: 'block' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full max-w-full max-h-96 cursor-crosshair"
        style={{ maxHeight: 384 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {!annotation && !drawing && (
        <p className="text-center text-xs text-gray-400 mt-2">
          {disabled ? 'No board area marked' : 'Click and drag to mark the board area'}
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