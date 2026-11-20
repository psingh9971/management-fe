// Turns a rendered document into an A4 PDF download.
// Every element matching `pageSelector` inside `root` becomes one (or more, if it overflows) A4 page.
const A4 = { w: 210, h: 297 } // mm

export async function downloadPdf(root, filename, { pageSelector = '.ol-page' } = {}) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  if (document.fonts?.ready) await document.fonts.ready

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pages = [...root.querySelectorAll(pageSelector)]
  let first = true

  for (const page of pages) {
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // The on-screen preview is scaled down to fit; render the copy at true size.
      onclone: (doc) => {
        doc.querySelectorAll('[data-pdf-unscale]').forEach((el) => {
          el.style.transform = 'none'
          el.style.width = 'auto'
          el.style.height = 'auto'
        })
      },
    })

    // Slice pages taller than A4 into several PDF pages.
    const pxPerPage = Math.floor((canvas.width * A4.h) / A4.w)
    for (let y = 0; y < canvas.height; y += pxPerPage) {
      const sliceH = Math.min(pxPerPage, canvas.height - y)
      if (sliceH < 8) break // ignore rounding slivers
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = sliceH
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
      if (!first) pdf.addPage()
      first = false
      pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4.w, (sliceH * A4.w) / canvas.width)
    }
  }

  pdf.save(filename)
}

// Prints only the element marked with .ol-print-target (see OfferLetterDocument.vue print styles).
export function printDocument() {
  document.body.classList.add('ol-printing')
  const done = () => {
    document.body.classList.remove('ol-printing')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}
