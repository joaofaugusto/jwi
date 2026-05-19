#!/usr/bin/env node

/**
 * Generates icon assets for electron-builder from build/icon.svg:
 *   build/icon.png  — Linux (1024×1024)
 *   build/icon.ico  — Windows (multi-size)
 *   build/icon.icns — macOS (multi-size)
 *
 * Usage: npm run icons
 */

const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')
const png2icons = require('png2icons')

const BUILD_DIR = path.join(__dirname, '..', 'build')
const SVG_PATH = path.join(BUILD_DIR, 'icon.svg')

function main() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`SVG not found: ${SVG_PATH}`)
    process.exit(1)
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true })

  console.log('Rendering SVG → PNG 1024×1024…')
  const svgBuffer = fs.readFileSync(SVG_PATH)
  const resvg = new Resvg(svgBuffer, { fitTo: { mode: 'width', value: 1024 } })
  const pngBuffer = resvg.render().asPng()

  const pngPath = path.join(BUILD_DIR, 'icon.png')
  fs.writeFileSync(pngPath, pngBuffer)
  console.log('✓ build/icon.png')

  console.log('Generating ICO…')
  const ico = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, true)
  if (!ico) { console.error('ICO generation failed'); process.exit(1) }
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico)
  console.log('✓ build/icon.ico')

  console.log('Generating ICNS…')
  const icns = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0)
  if (!icns) { console.error('ICNS generation failed'); process.exit(1) }
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.icns'), icns)
  console.log('✓ build/icon.icns')
}

main()
