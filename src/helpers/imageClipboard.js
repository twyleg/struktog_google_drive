export function canCopyImage (format) {
  if (!window.isSecureContext || !navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) return false
  return format === 'png' || (typeof window.ClipboardItem.supports === 'function' && window.ClipboardItem.supports('image/svg+xml'))
}

export function copyImage (format, render) {
  if (!canCopyImage(format)) return Promise.reject(new Error('Clipboard image format unavailable'))
  const type = format === 'svg' ? 'image/svg+xml' : 'image/png'
  const image = Promise.resolve().then(render).then(async dataUrl => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new Blob([blob], { type })
  })
  // Start write during the click, before rendering awaits fonts/images (Safari).
  // Observe render errors even if permission is denied before the blob is read.
  image.catch(() => {})
  try {
    return navigator.clipboard.write([new window.ClipboardItem({ [type]: image })])
  } catch (error) {
    return Promise.reject(error)
  }
}
