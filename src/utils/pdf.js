// Turns a rendered document into an A4 PDF download.
// Every element matching `pageSelector` inside `root` becomes exactly one A4 page (shrunk to fit if it overflows).
const A4 = { w: 210, h: 297 } // mm

export async function downloadPdf(root, filename, { pageSelector = '.ol-page' } = {}) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  if (document.fonts?.ready) await document.fonts.ready

  // The on-screen preview is scaled down with a CSS transform. html2canvas measures the crop box on the
  // element it is given, so capturing the scaled preview (even if un-scaled in onclone) yields blank pages.
  // Render from an unscaled off-screen copy instead.
  const stage = document.createElement('div')
  stage.setAttribute('aria-hidden', 'true')
  stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;pointer-events:none;'
  const copy = root.cloneNode(true)
  for (const el of [copy, ...copy.querySelectorAll('[data-pdf-unscale]')]) {
    el.style.transform = 'none'
    el.style.width = 'auto'
    el.style.height = 'auto'
  }
  stage.appendChild(copy)
  document.body.appendChild(stage)

  try {
    await waitForImages(stage)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
    await renderPages(pdf, html2canvas, [...stage.querySelectorAll(pageSelector)])
    pdf.save(filename)
  } finally {
    stage.remove()
  }
}

function waitForImages(el) {
  return Promise.all(
    [...el.querySelectorAll('img')].map((img) =>
      img.complete
        ? null
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true })
            img.addEventListener('error', r, { once: true })
          }),
    ),
  )
}

async function renderPages(pdf, html2canvas, pages) {
  let first = true
  for (const page of pages) {
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Each document page is exactly one PDF page. If its content runs taller than A4, shrink it to fit
    // (centred horizontally) rather than spilling the footer onto an extra page.
    let w = A4.w
    let h = (canvas.height * A4.w) / canvas.width
    if (h > A4.h) {
      w = (A4.w * A4.h) / h
      h = A4.h
    }
    if (!first) pdf.addPage()
    first = false
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (A4.w - w) / 2, 0, w, h)
  }
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
