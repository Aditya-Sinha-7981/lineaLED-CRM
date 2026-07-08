import { useState, useEffect } from 'react'
import { getStorageDisplayUrl } from '../lib/storageUrl'

export default function StorageImage({ bucket, src, alt, className, crossOrigin = 'anonymous' }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    if (!src) { setUrl(null); return }

    getStorageDisplayUrl(bucket, src).then(resolved => {
      if (!cancelled) setUrl(resolved)
    })
    return () => { cancelled = true }
  }, [bucket, src])

  if (!src || failed) {
    return (
      <div className={`bg-gray-100 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm p-8 ${className || ''}`}>
        {failed ? 'Image unavailable' : 'No image'}
      </div>
    )
  }

  if (!url) {
    return <div className={`bg-gray-100 animate-pulse rounded-lg h-48 ${className || ''}`} />
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      crossOrigin={crossOrigin}
      onError={() => setFailed(true)}
    />
  )
}
