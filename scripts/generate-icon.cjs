const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true
    }
  })

  const svgPath = path.join(__dirname, '..', 'public', 'framexe-ai-logo.svg')
  const svgContent = fs.readFileSync(svgPath, 'utf8')

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 512px;
            height: 512px;
            background: transparent;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg {
            width: 480px;
            height: 480px;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))

  // Allow rendering of gradients and filters
  await new Promise(resolve => setTimeout(resolve, 1000))

  const image512 = await win.webContents.capturePage()
  const png512 = image512.toPNG()

  const buildDir = path.join(__dirname, '..', 'build')
  const publicDir = path.join(__dirname, '..', 'public')
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })

  // Save 512x512 PNG
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512)
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), image512.resize({ width: 32, height: 32, quality: 'best' }).toPNG())

  // Generate multi-size ICO: 256, 128, 64, 48, 32, 16
  const sizes = [256, 128, 64, 48, 32, 16]
  const images = sizes.map(s => {
    const resized = s === 512 ? image512 : image512.resize({ width: s, height: s, quality: 'best' })
    return {
      size: s,
      buffer: resized.toPNG()
    }
  })

  // Calculate ICO offsets
  const count = images.length
  let offset = 6 + (16 * count)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type 1 = ICO
  header.writeUInt16LE(count, 4) // Count of images

  const entries = []
  for (const img of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0) // Width (0 means 256)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1) // Height (0 means 256)
    entry.writeUInt8(0, 2) // Color count
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8) // Image size in bytes
    entry.writeUInt32LE(offset, 12) // Image offset
    entries.push(entry)
    offset += img.buffer.length
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...images.map(img => img.buffer)
  ])

  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer)

  console.log(`[Icon Generator] Successfully wrote icon.png (${png512.length} bytes) and icon.ico (${icoBuffer.length} bytes)`)
  app.exit(0)
})
