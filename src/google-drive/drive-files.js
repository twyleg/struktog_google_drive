import { t } from '../i18n.js'

const FIELDS = 'id,name,modifiedTime,version,parents,trashed,capabilities(canEdit)'
const BASE = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export class DriveFiles {
  constructor (auth, fetcher = (...args) => fetch(...args)) {
    this.auth = auth
    this.fetcher = fetcher
  }

  async request (url, options = {}) {
    let response
    try {
      response = await this.fetcher(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${this.auth.token}` },
        cache: 'no-store',
        signal: options.signal || AbortSignal.timeout(60000)
      })
    } catch (error) {
      throw new Error('Drive could not be reached. Your diagram is still here. Check your connection; for an interrupted save, check Drive before retrying.')
    }
    if (!response.ok) {
      if (response.status === 401) this.auth.invalidate()
      const messages = {
        401: 'Google sign-in expired. Click the action again to sign in.',
        403: 'Google Drive denied access. Check file permissions and API configuration, or save a new Drive copy.',
        404: 'Google Drive could not find this file or has not granted this app access to it.',
        412: 'This Drive file changed remotely. Reopen it or save a new Drive copy.',
        429: 'Google Drive is busy. Please try again later.'
      }
      const error = new Error(messages[response.status] || `Google Drive request failed (${response.status}). Your diagram is still here.`)
      error.status = response.status
      throw error
    }
    return response
  }

  async metadata (id, signal) {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Google Picker did not return a valid file ID. Please select the file again.')
    const response = await this.request(`${BASE}/${encodeURIComponent(id)}?fields=${FIELDS}&supportsAllDrives=true`, { signal })
    const file = await response.json()
    if (file.trashed) throw new Error('This Drive file is in the trash. Restore it or save a new Drive copy.')
    return file
  }

  async parentIsRoot (childId, parentId, signal) {
    // v2 exposes isRoot on the readable child's parent reference. This avoids
    // requiring metadata access to the root folder itself with drive.file.
    const response = await this.request(`https://www.googleapis.com/drive/v2/files/${encodeURIComponent(childId)}/parents/${encodeURIComponent(parentId)}?fields=isRoot`, { signal })
    return (await response.json()).isRoot === true
  }

  // Folder names are optional: limited Drive permissions may hide ancestors.
  // Use one deadline for the whole lookup, without delaying file operations.
  async folderPath (file, knownFolder = null) {
    const signal = AbortSignal.timeout(5000)
    const names = []
    const visited = new Set()
    let parentId = knownFolder && knownFolder.id
    let childId = file.id
    try {
      if (!Array.isArray(file.parents) && !parentId) file = await this.metadata(file.id, signal)
      parentId = (file.parents && file.parents[0]) || parentId
      while (parentId && !signal.aborted && visited.size < 32) {
        if (visited.has(parentId)) break
        visited.add(parentId)
        const folder = await this.metadata(parentId, signal)
        names.unshift(folder.name)
        childId = folder.id || parentId
        parentId = folder.parents && folder.parents[0]
      }
      if (parentId) names.unshift('…')
    } catch (error) {
      if (!names.length && knownFolder && knownFolder.name) names.push(knownFolder.name)
      let isRoot = false
      if ((error.status === 403 || error.status === 404) && parentId && childId && !signal.aborted) {
        try { isRoot = await this.parentIsRoot(childId, parentId, signal) } catch (error) { /* Keep the partial path if this check also fails. */ }
      }
      if (isRoot) names.unshift(t('toolbar.myDrive'))
      else if (names.length) names.unshift('…')
    }
    return names.join(' / ')
  }

  async open (id) {
    let stage = 'reading file details'
    try {
      const before = await this.metadata(id)
      stage = 'downloading file contents'
      const response = await this.request(`${BASE}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`)
      const content = await response.text()
      stage = 'checking the downloaded file version'
      const after = await this.metadata(id)
      if (before.version !== after.version) throw new Error('The Drive file changed while opening. Please open it again.')
      return { file: after, content }
    } catch (error) {
      if (error.status === 404) {
        throw new Error(`Google Drive returned 404 while ${stage}. The file may exist but this app may not have access. Check that STRUKTOG_GOOGLE_APP_ID is the numeric Cloud project number from the same project as the OAuth client and API key, then restart the development server (or rebuild), refresh, and select the file again. For a shortcut, try selecting the original file directly.`)
      }
      throw error
    }
  }

  async create (name, content, parentId = null) {
    const metadata = { name, mimeType: 'application/json' }
    if (parentId !== null) {
      if (typeof parentId !== 'string' || !parentId.trim()) throw new Error('Choose a valid Google Drive folder before saving.')
      metadata.parents = [parentId]
    }
    const boundary = 'struktog_' + crypto.randomUUID()
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`
    const response = await this.request(`${UPLOAD}?uploadType=multipart&fields=${FIELDS}&supportsAllDrives=true`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    })
    return response.json()
  }

  async update (file, content) {
    const remote = await this.metadata(file.id)
    if (remote.capabilities && !remote.capabilities.canEdit) throw new Error('This Drive file is read-only. Save a new Drive copy.')
    const response = await this.request(`${UPLOAD}/${encodeURIComponent(file.id)}?uploadType=media&fields=${FIELDS}&supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: content
    })
    return response.json()
  }
}
