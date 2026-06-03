// Generate brand PNG icons for 氧气捏捏 using only Node built-ins (zlib).
// Draws a rounded-square sage background with soft "oxygen bubbles".
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// ── CRC32 ──
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  // filtered scanlines (filter 0)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function lerp(a, b, t) { return a + (b - a) * t }

function draw(size) {
  const buf = Buffer.alloc(size * size * 4)
  const r = size * 0.22         // corner radius
  const cx = size / 2
  // bubble centres (relative)
  const bubbles = [
    { x: 0.40, y: 0.44, r: 0.20, a: 0.95 },
    { x: 0.64, y: 0.36, r: 0.11, a: 0.85 },
    { x: 0.58, y: 0.64, r: 0.085, a: 0.75 },
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // rounded-rect mask
      const dx = Math.max(r - x, x - (size - r), 0)
      const dy = Math.max(r - y, y - (size - r), 0)
      const inside = (dx * dx + dy * dy) <= r * r
      if (!inside) { buf[i] = buf[i+1] = buf[i+2] = buf[i+3] = 0; continue }

      // vertical sage gradient: #6FAE88 → #4F8268
      const t = y / size
      let R = Math.round(lerp(0x6F, 0x4F, t))
      let G = Math.round(lerp(0xAE, 0x82, t))
      let B = Math.round(lerp(0x88, 0x68, t))

      // composite white bubbles
      for (const b of bubbles) {
        const bx = b.x * size, by = b.y * size, br = b.r * size
        const d = Math.hypot(x - bx, y - by)
        if (d < br) {
          const edge = Math.min(1, (br - d) / (size * 0.02)) // soft edge
          const a = b.a * edge
          R = Math.round(lerp(R, 255, a))
          G = Math.round(lerp(G, 255, a))
          B = Math.round(lerp(B, 255, a))
        }
      }
      buf[i] = R; buf[i+1] = G; buf[i+2] = B; buf[i+3] = 255
    }
  }
  return buf
}

mkdirSync(new URL('../public', import.meta.url), { recursive: true })
for (const size of [192, 512, 180]) {
  const png = encodePNG(size, draw(size))
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png)
  console.log(`wrote public/${name} (${png.length} bytes)`)
}
