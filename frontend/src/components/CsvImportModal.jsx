import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabaseClient'

export default function CsvImportModal({ projectId, onClose, onSuccess }) {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((r, i) => ({
          line: i + 2,
          name: r.name?.trim() || '',
          address: r.address?.trim() || '',
          original: r,
        }))
        const errs = parsed.filter(r => !r.name).map(r => `Line ${r.line}: name is required`)
        setErrors(errs)
        setRows(parsed.filter(r => r.name))
      },
      error: (err) => setErrors([err.message]),
    })
  }

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    setResult(null)
    try {
      const insert = rows.map(r => ({
        project_id: projectId,
        name: r.name,
        address: r.address || null,
        status: 'not_surveyed',
      }))
      const { data, error } = await supabase.from('sites').insert(insert).select('id')
      if (error) throw error
      setResult({ count: data?.length || 0 })
      onSuccess?.()
    } catch (err) {
      setErrors([err.message])
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Import Sites from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">name</code> (required) and <code className="bg-gray-100 px-1 rounded">address</code> (optional).</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">
              Choose CSV File
            </button>
          </div>

          {rows.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{rows.length} rows ready to import</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500">#</th>
                      <th className="text-left px-3 py-2 text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 text-gray-500">Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-400">{r.line}</td>
                        <td className="px-3 py-1.5 font-medium">{r.name}</td>
                        <td className="px-3 py-1.5 text-gray-500">{r.address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50">…and {rows.length - 10} more</p>}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-xs max-h-32 overflow-y-auto">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {result && (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm">
              Successfully imported {result.count} sites.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button
            onClick={handleImport}
            disabled={importing || rows.length === 0 || errors.filter(e => !e.includes('Line')).length > 0}
            className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {importing ? 'Importing…' : `Import ${rows.length} Sites →`}
          </button>
        </div>
      </div>
    </div>
  )
}