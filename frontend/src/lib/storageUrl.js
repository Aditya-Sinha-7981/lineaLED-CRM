import { supabase } from './supabaseClient'

export function pathFromStorageUrl(url, bucket) {
  if (!url || typeof url !== 'string') return null
  if (!url.startsWith('http')) return url

  try {
    const parsed = new URL(url)
    const markers = [
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ]
    for (const marker of markers) {
      const idx = parsed.pathname.indexOf(marker)
      if (idx >= 0) return decodeURIComponent(parsed.pathname.slice(idx + marker.length))
    }
  } catch {
    return null
  }
  return null
}

export async function getStorageDisplayUrl(bucket, urlOrPath) {
  if (!urlOrPath) return null

  const path = pathFromStorageUrl(urlOrPath, bucket) || (
    !urlOrPath.startsWith('http') ? urlOrPath : null
  )

  if (path) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
    if (!error && data?.signedUrl) return data.signedUrl
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
    return pub.publicUrl
  }

  return urlOrPath
}
