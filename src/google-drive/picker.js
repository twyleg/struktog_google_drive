import { loadScript } from './auth.js'
import { t } from '../i18n.js'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export async function initializePicker () {
  await loadScript('https://apis.google.com/js/api.js')
  await new Promise((resolve, reject) => window.gapi.load('picker', {
    callback: resolve,
    onerror: () => reject(new Error('Google Picker could not load. Please try again.')),
    timeout: 20000,
    ontimeout: () => reject(new Error('Google Picker timed out. Please try again.'))
  }))
}

export function pickFile (config, token, signal) {
  return pick(config, token, signal, false)
}

export function pickFolder (config, token, signal) {
  return pick(config, token, signal, true)
}

function pick (config, token, signal, folders) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject(signal.reason); return }
    if (config.appId && !/^\d+$/.test(config.appId)) {
      reject(new Error('STRUKTOG_GOOGLE_APP_ID must be the numeric Google Cloud project number, not the project name or project ID. Restart the development server or rebuild after changing it.'))
      return
    }
    let picker
    let settled = false
    const finish = (error, selected = null) => {
      if (settled) return
      settled = true
      if (signal) signal.removeEventListener('abort', cancel)
      if (picker) {
        try { picker.dispose() } catch (disposeError) { if (!error) error = disposeError }
      }
      if (error) reject(error)
      else resolve(selected)
    }
    const cancel = () => finish(signal.reason)
    if (signal) signal.addEventListener('abort', cancel, { once: true })
    try {
      const api = window.google.picker
      const driveView = new api.DocsView(folders ? api.ViewId.FOLDERS : api.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(folders)
        .setMode(api.DocsViewMode.LIST)
        .setParent('root')
      if (folders) driveView.setMimeTypes(FOLDER_MIME)
      picker = new api.PickerBuilder()
        .setDeveloperKey(config.apiKey)
        .setAppId(config.appId)
        .setOAuthToken(token)
        .setOrigin(window.location.origin)
        .addView(driveView)
        .setTitle(t(folders ? 'toolbar.folderPickerTitle' : 'toolbar.filePickerTitle'))
        .setCallback(data => {
          if (data.action === api.Action.CANCEL) finish(null)
          else if (data.action === api.Action.PICKED) {
            const selected = data.docs && data.docs[0]
            if (!selected || typeof selected.id !== 'string' || !selected.id.trim()) finish(new Error(t('toolbar.invalidSelection')))
            else if (folders && selected.mimeType && selected.mimeType !== FOLDER_MIME) finish(new Error(t('toolbar.invalidFolder')))
            else finish(null, selected)
          } else if (data.action === 'error') finish(new Error('Google Picker failed. Please try again.'))
        })
        .build()
      picker.setVisible(true)
    } catch (error) { finish(error) }
  })
}
