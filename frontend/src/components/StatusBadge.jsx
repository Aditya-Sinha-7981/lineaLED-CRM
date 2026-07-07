const STATUS_CONFIG = {
  not_surveyed:  { label: 'Not Surveyed',  bg: 'bg-gray-100', text: 'text-gray-600' },
  quoted:        { label: 'Quoted',         bg: 'bg-blue-100',   text: 'text-blue-700' },
  needs_revision: { label: 'Needs Revision', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved:      { label: 'Approved',      bg: 'bg-green-100',  text: 'text-green-700' },
  installed:     { label: 'Installed',     bg: 'bg-emerald-100',text: 'text-emerald-700'},
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}