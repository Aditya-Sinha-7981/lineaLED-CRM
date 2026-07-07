import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ClientPortal() {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Client Portal</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Client</span>
          <button
            onClick={handleSignOut}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Project Progress</h2>
        <p className="text-gray-500">Client portal will appear here.</p>
        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
          <Link to="/login" className="text-orange-500 text-sm hover:underline">Sign in as different role</Link>
        </div>
      </main>
    </div>
  )
}