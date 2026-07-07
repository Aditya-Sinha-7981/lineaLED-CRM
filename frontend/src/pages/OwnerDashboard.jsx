import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function OwnerDashboard() {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Admin</span>
          <button
            onClick={handleSignOut}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Pending Approval</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">—</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Total Sites</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">—</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-400">Installed</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">—</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-400 mb-2">Quick links</p>
          <div className="flex gap-4 flex-wrap">
            <Link to="/login" className="text-orange-500 text-sm hover:underline">Sign in as different role</Link>
          </div>
        </div>
      </main>
    </div>
  )
}