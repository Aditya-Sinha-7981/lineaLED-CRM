import { useEffect, useState } from 'react'
import { approveTokenUrl } from '../lib/edgeFunctions'

export default function ApprovalLanding() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    const pathParts = window.location.pathname.split('/')
    const token = pathParts[pathParts.length - 1]
    if (!token) {
      setStatus('invalid')
      return
    }

    fetch(approveTokenUrl(token), { method: 'GET' })
      .then(res => {
        if (!res.ok) { if (!cancelled) setStatus('invalid'); return null }
        return res.text()
      })
      .then(html => {
        if (cancelled) return
        if (html && html.toLowerCase().includes('acknowledged')) {
          setStatus('ok')
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => { if (!cancelled) setStatus('invalid') })

    return () => { cancelled = true }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Processing…</div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl p-8 shadow-md max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Already Used</h1>
          <p className="text-gray-500 text-sm">
            This link has already been used or is no longer valid. If you have questions, please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl p-8 shadow-md max-w-md text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Quote Acknowledged</h1>
        <p className="text-gray-500 text-sm">
          Thank you — your acknowledgment has been recorded. The team will be in touch shortly.
        </p>
      </div>
    </div>
  )
}
