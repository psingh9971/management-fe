<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

// Draw (mouse / touch / pen) or upload a signature. v-model is a trimmed transparent PNG data URL, or ''.
const model = defineModel({ type: String, default: '' })

const INK = '#14264f' // matches the letter's navy
const MAX_W = 600 // stored signature width cap (keeps localStorage small)
const MAX_H = 200

const mode = ref(model.value ? 'saved' : 'draw') // 'saved' shows the current image; 'draw' shows the canvas
const canvas = ref(null)
const fileInput = ref(null)
const uploadError = ref('')
let ctx = null
let drawing = false
let hasInk = false
let last = null

function setupCanvas() {
  const c = canvas.value
  if (!c) return
  const ratio = window.devicePixelRatio || 1
  const { width, height } = c.getBoundingClientRect()
  c.width = Math.round(width * ratio)
  c.height = Math.round(height * ratio)
  ctx = c.getContext('2d')
  ctx.scale(ratio, ratio)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  hasInk = false
}

function point(e) {
  const r = canvas.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 }
}

function onDown(e) {
  if (!ctx) return
  e.preventDefault()
  canvas.value.setPointerCapture(e.pointerId)
  drawing = true
  last = point(e)
  ctx.beginPath()
  ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2)
  ctx.fill()
  hasInk = true
}

function onMove(e) {
  if (!drawing) return
  e.preventDefault()
  const pt = point(e)
  ctx.lineWidth = e.pointerType === 'pen' ? 1.2 + pt.p * 2 : 2.2
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  // Smooth with a quadratic curve through the midpoint.
  const mid = { x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2 }
  ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
  ctx.lineTo(pt.x, pt.y)
  ctx.stroke()
  last = pt
}

function onUp() {
  if (!drawing) return
  drawing = false
  commitCanvas()
}

// Crop the transparent margins and downscale, so the image sits tightly on the signature line.
function trimToDataUrl(source) {
  const sctx = source.getContext('2d')
  const { width, height } = source
  const data = sctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return ''
  const pad = 4
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const scale = Math.min(1, MAX_W / w, MAX_H / h)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(w * scale))
  out.height = Math.max(1, Math.round(h * scale))
  out.getContext('2d').drawImage(source, minX, minY, w, h, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

function commitCanvas() {
  model.value = hasInk ? trimToDataUrl(canvas.value) : ''
}

function clear() {
  model.value = ''
  uploadError.value = ''
  mode.value = 'draw'
}

function redraw() {
  mode.value = 'draw'
}

// Uploaded photos/scans: make near-white pixels transparent so the paper background disappears.
function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  uploadError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Choose an image file (PNG or JPG)'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'Image is too large (max 5 MB)'
    return
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, 1200 / img.width, 600 / img.height)
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    const cx = c.getContext('2d')
    cx.drawImage(img, 0, 0, c.width, c.height)
    const px = cx.getImageData(0, 0, c.width, c.height)
    const d = px.data
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      if (lum > 200) d[i + 3] = 0
      else if (lum > 150) d[i + 3] = Math.round(d[i + 3] * ((200 - lum) / 50))
    }
    cx.putImageData(px, 0, 0)
    const result = trimToDataUrl(c)
    URL.revokeObjectURL(url)
    if (!result) {
      uploadError.value = "Couldn't find a signature in that image — try a darker pen on white paper"
      return
    }
    model.value = result
    mode.value = 'saved'
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    uploadError.value = "Couldn't read that image"
  }
  img.src = url
}

watch(mode, async (m) => {
  if (m !== 'draw') return
  await Promise.resolve()
  requestAnimationFrame(setupCanvas)
})

const onResize = () => {
  // Resizing wipes the canvas; keep whatever was committed.
  if (mode.value === 'draw') {
    if (hasInk) mode.value = 'saved'
    else setupCanvas()
  }
}

onMounted(() => {
  if (mode.value === 'draw') requestAnimationFrame(setupCanvas)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="sigpad">
    <div v-if="mode === 'saved' && model" class="sig-box saved">
      <img :src="model" alt="Signature" />
    </div>
    <div v-else class="sig-box">
      <canvas
        ref="canvas"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @pointerleave="onUp"
      />
      <span class="baseline" aria-hidden="true" />
      <span v-if="!model" class="placeholder">Sign here</span>
    </div>

    <div class="sig-actions">
      <button v-if="mode === 'saved' && model" type="button" class="btn btn-ghost btn-sm" @click="redraw">Redraw</button>
      <button type="button" class="btn btn-ghost btn-sm" @click="fileInput.click()">Upload image</button>
      <button v-if="model" type="button" class="btn btn-ghost btn-sm" @click="clear">Clear</button>
      <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onFile" />
    </div>
    <small v-if="uploadError" class="ui-error">{{ uploadError }}</small>
  </div>
</template>

<style scoped>
.sig-box {
  position: relative;
  height: 140px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #fff; /* paper, so the navy ink is visible in dark mode too */
  overflow: hidden;
}

.sig-box canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.sig-box.saved {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.sig-box.saved img {
  max-width: 100%;
  max-height: 100%;
}

.baseline {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 34px;
  border-top: 1px solid #c9ced8;
  pointer-events: none;
}

.placeholder {
  position: absolute;
  left: 24px;
  bottom: 12px;
  font-size: 12px;
  color: #8a91a0;
  pointer-events: none;
}

.sig-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
</style>
