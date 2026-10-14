import { offlineCacheEnabled } from './storage.js'

export async function configureOfflineCache () {
  if (!('serviceWorker' in navigator)) return
  const base = new URL('./', window.location.href)
  if (offlineCacheEnabled()) {
    await navigator.serviceWorker.register(new URL('sw.js', base).href)
    return
  }
  const registrations = await navigator.serviceWorker.getRegistrations()
  let owned = false
  for (const registration of registrations) {
    const worker = registration.active || registration.waiting || registration.installing
    if (registration.scope === base.href && worker && worker.scriptURL === new URL('sw.js', base).href) {
      owned = true
      await registration.unregister()
    }
  }
  if ('caches' in window) {
    for (const name of await window.caches.keys()) {
      if ((name.startsWith('workbox-') && name.includes(base.href)) || (owned && ['example-json-cache', 'struktog-examples'].includes(name))) await window.caches.delete(name)
    }
  }
}
