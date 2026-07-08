export default function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-600 font-medium">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
