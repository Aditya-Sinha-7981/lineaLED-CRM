import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { supabase } from './supabaseClient'

function waitForImages(doc) {
  const images = doc.querySelectorAll('img')
  return Promise.all(
    Array.from(images).map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = resolve
        setTimeout(resolve, 3000)
      })
    })
  )
}

export async function htmlToCanvas(element) {
  await waitForImages(element)
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
  })
}

export function canvasToPdfBlob(canvas, filename) {
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
  if (filename) pdf.save(`${filename}.pdf`)
  return pdf.output('blob')
}

export async function generateEstimatePdf({ element, filename }) {
  const canvas = await htmlToCanvas(element)
  canvasToPdfBlob(canvas, filename)
}

export async function uploadPdf(blob, estimateId) {
  const path = `${estimateId}.pdf`
  const { error } = await supabase.storage
    .from('estimates-pdf')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })

  if (error) throw error

  const { data: signed, error: signError } = await supabase.storage
    .from('estimates-pdf')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  if (!signError && signed?.signedUrl) return signed.signedUrl

  const { data } = supabase.storage.from('estimates-pdf').getPublicUrl(path)
  return data.publicUrl
}
