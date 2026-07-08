const STYLES = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
}

export default function AlertBanner({ type = 'info', children, onDismiss }) {
  return (
    <div className={`px-4 py-3 rounded-lg text-sm border flex items-start justify-between gap-3 ${STYLES[type]}`}>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      )}
    </div>
  )
}
