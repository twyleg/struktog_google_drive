import { requestGoogleActivation } from '../privacy/ui.js'
import { storage, workspacePersistenceEnabled } from '../privacy/storage.js'
/* global HTMLElement, AbortController */
import { GoogleAuth } from '../google-drive/auth.js'
import { initializePicker, pickFile, pickFolder } from '../google-drive/picker.js'
import { DriveFiles } from '../google-drive/drive-files.js'
import { DocumentState } from './state.js'
import { DocumentTabs } from './tabs.js'
import { validDiagram } from './validate.js'
import { t } from '../i18n.js'

export class DocumentController {
  constructor (presenter, config) {
    this.presenter = presenter
    this.config = config
    this.configured = Boolean(config.clientId && config.apiKey && config.appId)
    this.auth = new GoogleAuth(config.clientId)
    this.files = new DriveFiles(this.auth)
    this.busy = false
    this.buttons = []
    this.current = new DocumentState('new', presenter.getStructogramName(), presenter.getExportPayload())
    this.tabSequence = 0
    this.tabs = [this.createTab(this.current)]
    this.activeTabId = this.tabs[0].id
    this.initialized = false
    this.activated = false
    this.ready = false
  }

  prepare () {
    if (!this.activated) return Promise.resolve(false)
    if (this.ready) return Promise.resolve(true)
    if (this.preparing) return this.preparing
    this.loadError = null
    this.preparing = Promise.all([this.auth.initialize(), initializePicker()]).then(() => {
      this.ready = true
      return true
    }).catch(error => {
      this.loadError = error.message
      return false
    }).finally(() => { this.preparing = null })
    return this.preparing
  }

  mount (target, actions = {}) {
    const group = document.createElement('div')
    group.className = 'document-controls'
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', t('toolbar.label'))
    const add = (key, icon, action, parent = group) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'document-button'
      button.dataset.label = key
      const symbol = document.createElement('span')
      symbol.className = 'document-icon ' + icon
      symbol.setAttribute('aria-hidden', 'true')
      button.appendChild(symbol)
      const label = document.createElement('span')
      label.textContent = t('toolbar.' + key)
      button.appendChild(label)
      button._label = label
      button.addEventListener('click', () => {
        // Finish any inline edit before importing or taking a save snapshot.
        if (document.activeElement instanceof HTMLElement && document.activeElement !== button) document.activeElement.blur()
        action()
      })
      this.buttons.push(button)
      parent.appendChild(button)
      return button
    }
    add('new', 'document-plus', () => this.newDiagram())
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.multiple = true
    input.hidden = true
    input.addEventListener('change', event => {
      this.presenter.readFile(event)
      input.value = ''
    })
    group.appendChild(input)
    add('loadLocal', 'uploadIcon', () => input.click())
    add('saveLocal', 'saveIcon', () => this.download())

    this.driveMenu = document.createElement('div')
    this.driveMenu.className = 'drive-menu'
    group.appendChild(this.driveMenu)
    this.driveToggle = add('openDrive', 'document-cloud', () => this.toggleRecent(), this.driveMenu)
    this.driveToggle.setAttribute('aria-expanded', 'false')
    this.driveToggle.setAttribute('aria-controls', 'drive-recent-files')
    this.driveToggle.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (this.recentPanel.hidden) this.toggleRecent()
        this.recentPanel.querySelector('button').focus()
      }
    })
    const caret = document.createElement('span')
    caret.className = 'document-caret'
    caret.setAttribute('aria-hidden', 'true')
    this.driveToggle.appendChild(caret)
    this.recentPanel = document.createElement('div')
    this.recentPanel.id = 'drive-recent-files'
    this.recentPanel.className = 'drive-recent-panel'
    this.recentPanel.hidden = true
    this.driveMenu.appendChild(this.recentPanel)
    this.driveMenu.addEventListener('focusout', event => {
      if (event.relatedTarget && !this.driveMenu.contains(event.relatedTarget)) this.closeRecent()
    })
    this.saveAsButton = add('saveAsDrive', 'copyIcon', () => this.chooseSaveAsFolder())
    this.saveDriveButton = add('saveDrive', 'document-cloud', () => this.saveToDrive())
    this.saveDriveButton.className += ' document-button-primary'
    const utilities = document.createElement('div')
    utilities.className = 'document-utilities'
    group.appendChild(utilities)
    add('export', 'exportIcon', () => actions.export && actions.export(), utilities)
    add('settings', 'settingsToolbarIcon', () => actions.settings && actions.settings(), utilities)
    const tour = add('help', 'infoIcon', () => {}, utilities)
    tour.id = 'tourInfoButton'
    tour.className += ' document-button-icon'
    this.status = document.createElement('span')
    this.status.className = 'document-status'
    this.status.setAttribute('role', 'status')
    const statusRow = document.createElement('div')
    statusRow.className = 'document-status-row'
    statusRow.appendChild(this.status)
    this.cancelWaitButton = document.createElement('button')
    this.cancelWaitButton.type = 'button'
    this.cancelWaitButton.className = 'document-button document-cancel-wait'
    this.cancelWaitButton.addEventListener('click', () => this.cancelGoogleWait())
    statusRow.appendChild(this.cancelWaitButton)
    const fileStatus = document.getElementById('document-file-status') || group
    fileStatus.appendChild(statusRow)
    this.errorMessage = document.createElement('div')
    this.errorMessage.className = 'document-error'
    this.errorMessage.setAttribute('role', 'alert')
    fileStatus.appendChild(this.errorMessage)
    target.appendChild(group)
    this.tabView = new DocumentTabs(this, document.getElementById('document-tabs-host') || target)
    document.addEventListener('click', event => {
      if (!this.driveMenu.contains(event.target)) this.closeRecent()
    })
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.waitingForGoogle) this.cancelGoogleWait()
      if (event.key === 'Escape' && !this.recentPanel.hidden) {
        this.closeRecent()
        this.driveToggle.focus()
      }
    })
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (this.nameDialog && this.nameDialog.open) return
        // Commit the editor's active text field before taking a save snapshot.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        this.save()
      }
    })
    window.addEventListener('beforeunload', event => {
      this.persistWorkspace()
      if (this.hasUnsavedChanges() || this.busy) {
        event.preventDefault()
        event.returnValue = ''
      }
    })
    this.refresh()
  }

  dirty () { return this.current.isDirty(this.presenter.getExportPayload()) }

  refresh () {
    if (this.transitioning) return
    const active = this.activeTab()
    if (active) active.document = this.current
    if (this.current.source === 'new') this.current.name = this.presenter.getStructogramName()
    if (this.tabView) this.tabView.render()
    if (!this.status) return
    for (const button of this.buttons) {
      const label = t('toolbar.' + button.dataset.label)
      button._label.textContent = label
      button.title = label
      button.setAttribute('aria-label', label)
      button.disabled = this.busy
    }
    this.driveToggle.disabled = this.busy || !this.configured
    this.saveAsButton.disabled = this.busy || !this.configured
    this.saveDriveButton.disabled = this.busy || !this.configured || Boolean(this.current.file && this.current.file.capabilities && !this.current.file.capabilities.canEdit)
    if (!this.configured) {
      for (const button of [this.driveToggle, this.saveDriveButton, this.saveAsButton]) button.title = t('toolbar.driveUnavailable')
    } else if (this.current.source !== 'google-drive') {
      this.saveDriveButton.title = t('toolbar.saveDriveHint')
    }
    if (this.current.source === 'new') this.current.name = this.presenter.getStructogramName()
    const source = this.current.source === 'google-drive' ? 'Google Drive' : t('drive.' + this.current.source)
    this.status.textContent = `${this.current.name} · ${source} · ${this.busy ? t('drive.working') : t(this.dirty() ? 'toolbar.unsaved' : 'toolbar.saved')}`
    if (!workspacePersistenceEnabled()) this.status.textContent += ' · ' + t('privacy.sessionStatus')
    this.status.dataset.dirty = String(this.dirty())
    this.cancelWaitButton.textContent = t('toolbar.cancelGoogle')
    this.cancelWaitButton.hidden = !this.waitingForGoogle
    this.cancelWaitButton.disabled = !this.waitingForGoogle
    this.errorMessage.hidden = !this.error
    this.errorMessage.textContent = this.error || ''
  }

  newDiagram () {
    if (this.busy) return
    const payload = JSON.parse(JSON.stringify(this.presenter.getExportPayload()))
    payload.meta.structoName = t('nav.unnamed')
    payload.meta.headline = ''
    payload.tree = { id: crypto.randomUUID(), type: 'InsertNode', followElement: { type: 'Placeholder' } }
    this.importDiagram(payload, t('nav.unnamed'), 'new')
  }

  createTab (state, snapshot = null) {
    return { id: String(++this.tabSequence), document: state, snapshot, dirty: snapshot ? state.isDirty(snapshot.payload) : false }
  }

  activeTab () { return this.tabs.find(tab => tab.id === this.activeTabId) }

  captureActive () {
    const tab = this.activeTab()
    if (!tab) return
    tab.document = this.current
    tab.snapshot = this.presenter.captureDocument()
    tab.dirty = tab.document.isDirty(tab.snapshot.payload)
  }

  hasUnsavedChanges () {
    return this.tabs.some(tab => tab.id === this.activeTabId
      ? this.dirty()
      : tab.dirty)
  }

  activateTab (id, internal = false) {
    if ((this.busy && !internal) || this.transitioning || id === this.activeTabId) return
    const tab = this.tabs.find(tab => tab.id === id)
    if (!tab) return
    this.commitEditor()
    this.captureActive()
    this.transitioning = true
    try {
      this.activeTabId = id
      this.current = tab.document
      this.presenter.restoreDocument(tab.snapshot)
      this.error = ''
    } finally {
      this.transitioning = false
      this.refresh()
      this.persistWorkspace()
    }
  }

  commitEditor () {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  importDiagram (data, name, source = 'local', file = null) {
    if (!validDiagram(data)) return false
    this.commitEditor()
    this.captureActive()
    const previous = this.activeTab()
    const next = this.createTab(this.current)
    // Only replace the initial, untouched empty placeholder.
    const replaceEmpty = source !== 'new' && this.tabs.length === 1 &&
      this.current.source === 'new' && !this.dirty() &&
      previous.snapshot.payload.tree.type === 'InsertNode' &&
      previous.snapshot.payload.tree.followElement?.type === 'Placeholder'
    this.tabs.push(next)
    this.activeTabId = next.id
    this.transitioning = true
    const wasApplying = this.applying
    this.applying = true
    let imported = false
    try {
      imported = this.presenter.applyImportedData(data, name)
      if (!imported) return false
      this.loaded(source, name || this.presenter.getStructogramName(), file)
      this.captureActive()
      if (replaceEmpty) this.tabs.splice(this.tabs.indexOf(previous), 1)
      return true
    } finally {
      if (!imported) {
        this.tabs.splice(this.tabs.indexOf(next), 1)
        this.activeTabId = previous.id
        this.current = previous.document
        this.presenter.restoreDocument(previous.snapshot)
      }
      this.applying = wasApplying
      this.transitioning = false
      this.refresh()
      this.persistWorkspace()
    }
  }

  closeTab (id) {
    if (this.busy || this.transitioning) return
    this.commitEditor()
    this.captureActive()
    const index = this.tabs.findIndex(tab => tab.id === id)
    if (index < 0) return
    const tab = this.tabs[index]
    if (tab.document.isDirty(tab.snapshot.payload) && !window.confirm(t('tabs.discard', { name: tab.document.name }))) return
    if (this.tabs.length === 1) {
      this.newDiagram()
    } else if (id === this.activeTabId) {
      this.activateTab(this.tabs[index + 1]?.id || this.tabs[index - 1].id)
    }
    this.tabs.splice(this.tabs.indexOf(tab), 1)
    this.refresh()
    this.persistWorkspace()
  }

  persistWorkspace () {
    if (!this.initialized || this.transitioning || !workspacePersistenceEnabled()) return
    this.captureActive()
    const tabs = this.tabs.map(tab => ({
      name: tab.document.name,
      source: tab.document.source === 'new' ? 'new' : 'local',
      saved: tab.document.saved,
      payload: tab.snapshot.payload
    }))
    storage.setItem('struktog_open_tabs', JSON.stringify({ tabs, active: this.tabs.findIndex(tab => tab.id === this.activeTabId) }))
  }

  restoreWorkspace () {
    try {
      const workspace = JSON.parse(storage.getItem('struktog_open_tabs') || 'null')
      if (workspace && Array.isArray(workspace.tabs) && workspace.tabs.length &&
        workspace.tabs.every(tab => tab && typeof tab.name === 'string' && typeof tab.saved === 'string' &&
          typeof tab.payload?.meta?.structoName === 'string' && tab.payload.settings && validDiagram(tab.payload))) {
        const tabs = workspace.tabs.map(saved => {
          const state = new DocumentState(saved.source === 'new' ? 'new' : 'local', saved.name, saved.payload)
          state.saved = saved.saved
          return this.createTab(state, { payload: saved.payload, undo: [], redo: [], selectedUid: null })
        })
        this.tabs = tabs
        const selected = Number.isInteger(workspace.active) ? workspace.active : 0
        const active = tabs[selected] || tabs[0]
        this.activeTabId = active.id
        this.current = active.document
        this.transitioning = true
        this.presenter.restoreDocument(active.snapshot)
      }
    } catch (error) { /* Invalid recovery data must not prevent the editor from opening. */ } finally {
      this.transitioning = false
      this.initialized = true
      this.refresh()
      this.persistWorkspace()
    }
  }

  recentFiles () {
    try {
      const files = JSON.parse(storage.getItem('struktog_drive_recent') || '[]')
      return Array.isArray(files) ? files.filter(file => file && typeof file.id === 'string' && typeof file.name === 'string').slice(0, 6) : []
    } catch (error) { return [] }
  }

  remember (file) {
    if (!file) return
    try {
      const recent = this.recentFiles()
      const previous = recent.find(item => item.id === file.id)
      const entry = { id: file.id, name: file.name }
      const path = typeof file.path === 'string' ? file.path : previous && previous.path
      if (typeof path === 'string' && path) entry.path = path
      const parentId = file.parents && file.parents[0]
      if (parentId) {
        entry.parentId = parentId
        if (previous && previous.parentId && previous.parentId !== parentId && !file.path) delete entry.path
      } else if (previous && previous.parentId) entry.parentId = previous.parentId
      storage.setItem('struktog_drive_recent', JSON.stringify([entry, ...recent.filter(item => item.id !== file.id)].slice(0, 6)))
    } catch (error) { /* Storage can be disabled; opening and saving still work. */ }
  }

  async enrichRecentPath (file, knownFolder = null) {
    try {
      const parentId = (file.parents && file.parents[0]) || (knownFolder && knownFolder.id)
      const path = await this.files.folderPath(file, knownFolder)
      if (!path) return
      const recent = this.recentFiles()
      const entry = recent.find(item => item.id === file.id)
      // Don't reinsert an evicted item or overwrite a newer folder selection.
      if (!entry || (parentId && entry.parentId && entry.parentId !== parentId)) return
      if (path.startsWith('…') && typeof entry.path === 'string' && !entry.path.startsWith('…')) return
      entry.path = path
      storage.setItem('struktog_drive_recent', JSON.stringify(recent))
      if (this.recentPanel && !this.recentPanel.hidden) {
        for (const button of this.recentPanel.querySelectorAll('[data-recent-id]')) {
          const item = recent.find(item => item.id === button.dataset.recentId)
          if (item) this.renderRecentFile(button, item)
        }
      }
    } catch (error) { /* A path lookup must never interrupt editing or saving. */ }
  }

  renderRecentFile (button, file) {
    button.textContent = ''
    const name = document.createElement('span')
    name.className = 'drive-recent-name'
    name.textContent = file.name
    const path = document.createElement('span')
    path.className = 'drive-recent-path'
    path.textContent = ' — ' + (typeof file.path === 'string' && file.path ? file.path : t('toolbar.pathUnavailable'))
    button.appendChild(name)
    button.appendChild(path)
    button.title = name.textContent + path.textContent
  }

  closeRecent () {
    this.recentPanel.hidden = true
    this.driveToggle.setAttribute('aria-expanded', 'false')
  }

  toggleRecent () {
    if (!this.activated) return requestGoogleActivation(this, () => this.toggleRecent())
    if (!this.recentPanel.hidden) return this.closeRecent()
    this.recentPanel.textContent = ''
    const heading = document.createElement('div')
    heading.className = 'drive-recent-heading'
    heading.textContent = t('toolbar.recent')
    this.recentPanel.appendChild(heading)
    const recent = this.recentFiles()
    if (!recent.length) {
      const empty = document.createElement('p')
      empty.className = 'drive-recent-empty'
      empty.textContent = t('toolbar.noRecent')
      this.recentPanel.appendChild(empty)
    }
    const add = (label, action) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.title = label
      button.addEventListener('click', () => { this.closeRecent(); action() })
      this.recentPanel.appendChild(button)
      return button
    }
    for (const file of recent) {
      const button = add(file.name, () => this.open(file.id))
      button.dataset.recentId = file.id
      this.renderRecentFile(button, file)
    }
    add(t('toolbar.picker'), () => this.open())
    this.recentPanel.lastChild.className = 'drive-picker-button'
    this.recentPanel.hidden = false
    this.driveToggle.setAttribute('aria-expanded', 'true')
    if (this.auth.token && Date.now() < this.auth.expiresAt) {
      for (const file of recent) {
        if (!file.path || file.path.startsWith('…')) this.enrichRecentPath(file)
      }
    }
  }

  loaded (source, name, file = null) {
    this.current = new DocumentState(source, name, this.presenter.getExportPayload(), file)
    this.activeTab().document = this.current
    if (source === 'google-drive') {
      this.remember(file)
      this.enrichRecentPath(file)
    }
    this.refresh()
    this.persistWorkspace()
  }

  download () {
    this.presenter.downloadLocal()
    if (this.current.source !== 'google-drive') {
      this.loaded('local', this.current.name)
    }
    this.refresh()
  }

  cancelGoogleWait () {
    if (!this.waitingForGoogle || !this.interactionAbort) return
    const error = new Error('Google action cancelled')
    error.name = 'AbortError'
    this.interactionAbort.abort(error)
  }

  async run (operation) {
    if (this.busy) return
    if (!this.activated) return requestGoogleActivation(this, () => this.run(operation))
    this.error = ''
    if (!this.ready) {
      this.error = this.loadError || t('drive.loading')
      this.refresh()
      this.prepare()
      return
    }
    this.busy = true
    this.waitingForGoogle = true
    const interaction = new AbortController()
    this.interactionAbort = interaction
    this.refresh()
    try {
      // authorize executes synchronously up to opening Google's popup.
      const token = await this.auth.authorize(interaction.signal)
      if (interaction.signal.aborted) throw interaction.signal.reason
      this.waitingForGoogle = false
      this.refresh()
      return await operation(token, interaction.signal)
    } catch (error) {
      if (error.name !== 'AbortError') this.error = error.message
    } finally {
      this.interactionAbort = null
      this.waitingForGoogle = false
      this.busy = false
      this.refresh()
    }
  }

  open (id = null) {
    const existing = id && this.tabs.find(tab => tab.document.file?.id === id)
    if (existing) return this.activateTab(existing.id)
    if (!this.activated) return requestGoogleActivation(this, () => this.open(id))
    return this.run(async (token, signal) => {
      let selected
      if (id) selected = { id }
      else {
        this.waitingForGoogle = true
        this.refresh()
        try { selected = await pickFile(this.config, token, signal) } finally {
          this.waitingForGoogle = false
          this.refresh()
        }
      }
      if (!selected) return
      const existing = this.tabs.find(tab => tab.document.file?.id === selected.id)
      if (existing) return this.activateTab(existing.id, true)
      const { file, content } = await this.files.open(selected.id)
      let data
      try { data = JSON.parse(content) } catch (error) { throw new Error(t('importExport.invalidJson')) }
      if (!this.importDiagram(data, file.name, 'google-drive', file)) throw new Error(t('importExport.unknownImportFormat'))
    })
  }

  async chooseSaveAsFolder () {
    if (!this.activated) return requestGoogleActivation(this, () => this.chooseSaveAsFolder())
    if (this.busy || !this.configured || (this.nameDialog && this.nameDialog.open)) return
    const folder = await this.run(async (token, signal) => {
      this.waitingForGoogle = true
      this.refresh()
      return pickFolder(this.config, token, signal)
    })
    if (folder) this.openSaveAsDialog(folder)
  }

  openSaveAsDialog (folder) {
    if (this.busy || !this.configured) return
    if (this.nameDialog && this.nameDialog.open) return
    const dialog = document.createElement('dialog')
    this.nameDialog = dialog
    dialog.className = 'document-save-dialog'
    dialog.setAttribute('aria-labelledby', 'drive-save-title')
    dialog.setAttribute('aria-describedby', 'drive-save-description')
    const form = document.createElement('form')
    const heading = document.createElement('h2')
    heading.id = 'drive-save-title'
    heading.textContent = t('toolbar.saveTitle')
    const description = document.createElement('p')
    description.id = 'drive-save-description'
    description.textContent = t('toolbar.saveDescription')
    const destination = document.createElement('p')
    destination.className = 'document-save-destination'
    destination.textContent = t('toolbar.destination', { name: folder.name })
    const label = document.createElement('label')
    label.htmlFor = 'drive-save-name'
    label.textContent = t('toolbar.fileName')
    const input = document.createElement('input')
    input.id = 'drive-save-name'
    input.value = this.presenter.getStructogramName().replace(/\.json$/i, '') + '.json'
    input.required = true
    const footer = document.createElement('div')
    footer.className = 'document-dialog-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'document-button'
    cancel.textContent = t('common.cancel')
    cancel.addEventListener('click', () => dialog.close())
    const submit = document.createElement('button')
    submit.type = 'submit'
    submit.className = 'document-button document-button-primary'
    submit.textContent = t('toolbar.saveDrive')
    const newFolder = document.createElement('button')
    newFolder.type = 'button'
    newFolder.className = 'document-button'
    newFolder.textContent = t('toolbar.newFolder')
    const folderControls = document.createElement('div')
    folderControls.className = 'document-new-folder'
    folderControls.id = 'drive-new-folder-controls'
    newFolder.setAttribute('aria-controls', folderControls.id)
    folderControls.hidden = true
    const folderLabel = document.createElement('label')
    folderLabel.htmlFor = 'drive-new-folder-name'
    folderLabel.textContent = t('toolbar.folderName')
    const folderInput = document.createElement('input')
    folderInput.id = 'drive-new-folder-name'
    const createFolder = document.createElement('button')
    createFolder.type = 'button'
    createFolder.className = 'document-button'
    createFolder.textContent = t('toolbar.createFolder')
    const folderError = document.createElement('p')
    folderError.className = 'document-error'
    folderError.setAttribute('role', 'alert')
    folderError.hidden = true
    for (const element of [folderLabel, folderInput, createFolder, folderError]) folderControls.appendChild(element)
    newFolder.addEventListener('click', () => {
      folderControls.hidden = !folderControls.hidden
      newFolder.setAttribute('aria-expanded', String(!folderControls.hidden))
      if (!folderControls.hidden) folderInput.focus()
    })
    newFolder.setAttribute('aria-expanded', 'false')
    createFolder.addEventListener('click', async () => {
      if (this.busy) return
      if (!folderInput.value.trim()) { folderInput.focus(); return }
      folderError.hidden = true
      for (const element of [submit, newFolder, folderInput, createFolder]) element.disabled = true
      const created = await this.run(() => this.files.createFolder(folderInput.value, folder.id))
      if (!dialog.isConnected) return
      for (const element of [submit, newFolder, folderInput, createFolder]) element.disabled = false
      if (created) {
        folder = created
        destination.textContent = t('toolbar.destination', { name: folder.name })
        folderInput.value = ''
        folderControls.hidden = true
        newFolder.setAttribute('aria-expanded', 'false')
        input.focus()
      } else {
        folderError.textContent = this.error || t('toolbar.folderCreateFailed')
        folderError.hidden = false
        folderInput.focus()
      }
    })
    folderInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); createFolder.click() }
    })
    footer.appendChild(cancel)
    footer.appendChild(submit)
    for (const element of [heading, description, destination, newFolder, folderControls, label, input, footer]) form.appendChild(element)
    dialog.appendChild(form)
    document.body.appendChild(dialog)
    form.addEventListener('submit', event => {
      event.preventDefault()
      if (this.busy) return
      if (!input.value.trim()) { input.focus(); return }
      const name = input.value.trim()
      dialog.close()
      this.save(true, name, folder.id, folder.name)
    })
    dialog.addEventListener('close', () => {
      dialog.remove()
      this.nameDialog = null
      this.saveAsButton.focus()
    })
    dialog.showModal()
    input.focus()
    input.setSelectionRange(0, input.value.length - 5)
  }

  saveToDrive () {
    if (this.busy || !this.configured) return
    return this.current.source === 'google-drive' ? this.save() : this.chooseSaveAsFolder()
  }

  save (saveAs = false, givenName = null, parentId = null, folderName = null) {
    if (this.busy) return
    if (!saveAs && this.current.source !== 'google-drive') {
      this.download()
      return
    }
    if (!this.activated) return requestGoogleActivation(this, () => this.save(saveAs, givenName, parentId, folderName))
    let name
    if (saveAs) {
      name = givenName === null ? window.prompt(t('drive.filename'), this.presenter.getStructogramName() + '.json') : givenName
      if (name === null || !name.trim()) return
      name = name.trim()
      if (!name.toLowerCase().endsWith('.json')) name += '.json'
    }
    return this.run(async () => {
      const current = this.current
      const payload = this.presenter.getExportPayload()
      const content = JSON.stringify(payload)
      // Capture before awaiting network; edits during upload must remain dirty.
      const savedState = new DocumentState('google-drive', '', JSON.parse(content))
      const file = saveAs
        ? await this.files.create(name, content, parentId)
        : await this.files.update(current.file, content)
      if (!file || this.current !== current) return
      savedState.name = file.name
      savedState.file = file
      this.current = savedState
      this.activeTab().document = savedState
      this.remember(file)
      this.enrichRecentPath(file, parentId ? { id: parentId, name: folderName } : null)
      this.persistWorkspace()
    })
  }
}
