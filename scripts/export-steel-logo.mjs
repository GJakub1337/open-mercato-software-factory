// Typographic logo from landing commit 580d1f32, components/site-header.tsx and app/globals.css.
// Original: 40px orange SZ square, gap 12px, Barlow Condensed bold 20px/24px, .025em wordmark tracking.
import { createCanvas, GlobalFonts, SvgExportFlag } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
GlobalFonts.registerFromPath(fileURLToPath(new URL('./assets/BarlowCondensed-Bold.ttf', import.meta.url)), 'Barlow Condensed')
const measure = createCanvas(1, 1).getContext('2d')
measure.font = 'bold 24px "Barlow Condensed"'
measure.letterSpacing = '0.6px'
const width = Math.ceil(52 + measure.measureText('STAL-ZBIORNIKI').width)
const canvas = createCanvas(width, 40, SvgExportFlag.ConvertTextToPaths)
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#0a1826'
ctx.fillRect(0, 0, width, 40)
ctx.fillStyle = '#e8742a'
ctx.beginPath(); ctx.roundRect(0, 0, 40, 40, 2); ctx.fill()
ctx.fillStyle = '#ffffff'
ctx.textBaseline = 'middle'
ctx.textAlign = 'center'
ctx.font = 'bold 20px "Barlow Condensed"'
ctx.fillText('SZ', 20, 20)
ctx.textAlign = 'left'
ctx.font = 'bold 24px "Barlow Condensed"'
ctx.letterSpacing = '0.6px'
ctx.fillText('STAL-ZBIORNIKI', 52, 20)
writeFileSync(new URL('../public/brand/stal-zbiorniki.svg', import.meta.url), canvas.getContent())
console.log('Exported landing wordmark as self-contained SVG paths')
