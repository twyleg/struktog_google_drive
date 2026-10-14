export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const scripts = new Map()
export function loadScript (url) {
  if (!scripts.has(url)) {
    scripts.set(url, new Promise((resolve, reject) => {
      const script = document.createElement('script')
      const timer = setTimeout(() => fail(), 20000)
      const fail = () => {
        clearTimeout(timer)
        script.remove()
        scripts.delete(url)
        reject(new Error('Google could not load. Check your connection and try again.'))
      }
      script.src = url
      script.async = true
      script.onload = () => { clearTimeout(timer); resolve() }
      script.onerror = fail
      document.head.appendChild(script)
    }))
  }
  return scripts.get(url)
}

export class GoogleAuth {
  constructor (clientId) {
    this.clientId = clientId
    this.token = null
    this.expiresAt = 0
  }

  async initialize () {
    await loadScript('https://accounts.google.com/gsi/client')
  }

  invalidate () {
    this.token = null
    this.expiresAt = 0
  }

  // Call directly from a user gesture; never persist access tokens.
  authorize (signal, timeoutMs = 120000) {
    if (signal && signal.aborted) return Promise.reject(signal.reason)
    if (this.token && Date.now() < this.expiresAt) return Promise.resolve(this.token)
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (error, token) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (signal) signal.removeEventListener('abort', cancel)
        if (error) reject(error)
        else resolve(token)
      }
      const cancel = () => finish(signal.reason)
      const timer = setTimeout(() => finish(new Error('Google sign-in did not finish. Close the Google window and try again.')), timeoutMs)
      if (signal) signal.addEventListener('abort', cancel, { once: true })
      try {
        const oauth = window.google.accounts.oauth2
        const client = oauth.initTokenClient({
          client_id: this.clientId,
          scope: DRIVE_SCOPE,
          include_granted_scopes: false,
          callback: response => {
            // A popup may answer after cancellation or timeout; ignore it.
            if (settled) return
            if (response.error || !oauth.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
              finish(new Error('Google Drive access was not granted. Please try again.'))
              return
            }
            this.token = response.access_token
            this.expiresAt = Date.now() + (Number(response.expires_in) - 60) * 1000
            finish(null, this.token)
          },
          error_callback: () => finish(new Error('Google sign-in was cancelled or blocked. Allow popups and try again.'))
        })
        client.requestAccessToken({ prompt: '' })
      } catch (error) { finish(error) }
    })
  }
}
