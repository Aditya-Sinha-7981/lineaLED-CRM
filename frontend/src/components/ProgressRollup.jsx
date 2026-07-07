export default function ProgressRollup({ installed, total }) {
  const pct = total > 0 ? Math.round((installed / total) * 100) : 0

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-sm text-gray-400">Overall Progress</p>
          <p className="text-3xl font-bold text-gray-900">{installed} <span className="text-gray-300 font-normal">/ {total}</span></p>
          <p className="text-sm text-gray-500">{pct}% installed</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Remaining</p>
          <p className="text-xl font-semibold text-orange-500">{total - installed}</p>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className="bg-orange-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}