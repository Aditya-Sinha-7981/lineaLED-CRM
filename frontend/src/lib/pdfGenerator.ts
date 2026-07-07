import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { supabase } from './supabaseClient'

export async function htmlToCanvas(element) {
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
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

  const { data } = supabase.storage
    .from('estimates-pdf')
    .getPublicUrl(path)

  return data.publicUrl
}