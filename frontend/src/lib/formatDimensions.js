export function formatBoardDimensions(board) {
  if (!board) return '—'

  const w = board.width_ft
  const h = board.height_ft
  if (w == null || h == null) return '—'

  if (board.board_type === 'gsb_signage' && board.spec) {
    const wUnit = board.spec._widthUnit || 'in'
    const hUnit = board.spec._heightUnit || 'in'
    return `${w} ${wUnit} × ${h} ${hUnit}`
  }

  return `${w} × ${h} ft`
}

export function boardAreaSqFt(board) {
  if (!board?.width_ft || !board?.height_ft) return null
  if (board.board_type === 'gsb_signage') {
    const wUnit = board.spec?._widthUnit || 'in'
    const hUnit = board.spec?._heightUnit || 'in'
    const wFt = wUnit === 'in' ? board.width_ft / 12 : board.width_ft
    const hFt = hUnit === 'in' ? board.height_ft / 12 : board.height_ft
    return (wFt * hFt).toFixed(2)
  }
  return (board.width_ft * board.height_ft).toFixed(2)
}
