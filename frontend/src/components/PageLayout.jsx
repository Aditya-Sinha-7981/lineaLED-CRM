import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PageLayout({
  title,
  subtitle,
  backTo,
  backLabel = '← Back',
  role,
  children,
  headerRight,
  maxWidth = 'max-w-5xl',
}) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          {backTo && (
            <button
              onClick={() => navigate(backTo)}
              className="text-sm text-gray-300 hover:text-white shrink-0"
            >
              {backLabel}
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{title}</h1>
            {subtitle && <p className="text-sm text-gray-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {headerRight}
          {role && <span className="text-sm text-gray-400 hidden sm:inline">{role}</span>}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className={`p-6 ${maxWidth} mx-auto`}>{children}</main>
    </div>
  )
}
