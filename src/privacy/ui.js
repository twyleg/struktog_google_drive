import { t } from '../i18n.js'
import { workspacePersistenceEnabled, offlineCacheEnabled, setWorkspacePersistence, setOfflineCache, deleteSavedWorkspace } from './storage.js'
import { configureOfflineCache } from './offline.js'

function element (tag, text, className) {
  const node = document.createElement(tag)
  if (text) node.textContent = text
  if (className) node.className = className
  return node
}

export function openPrivacySettings (presenter) {
  if (document.getElementById('privacy-settings-dialog')) return
  const dialog = element('dialog', null, 'document-save-dialog privacy-dialog')
  dialog.id = 'privacy-settings-dialog'
  dialog.setAttribute('aria-labelledby', 'privacy-settings-title')
  const title = element('h2', t('privacy.settingsTitle'))
  title.id = 'privacy-settings-title'
  dialog.appendChild(title)
  dialog.appendChild(element('p', t('privacy.sessionOnly')))
  const checkbox = (id, label, description, checked) => {
    const row = element('label', null, 'privacy-choice')
    const input = element('input')
    input.type = 'checkbox'
    input.id = id
    input.checked = checked
    row.appendChild(input)
    row.appendChild(element('span', label))
    dialog.appendChild(row)
    dialog.appendChild(element('p', description))
    return input
  }
  const workspace = checkbox('privacy-workspace', t('privacy.rememberWorkspace'), t('privacy.workspaceDetails'), workspacePersistenceEnabled())
  const offline = checkbox('privacy-offline', t('privacy.enableOffline'), t('privacy.offlineDetails'), offlineCacheEnabled())
  const link = element('a', t('privacy.readPolicy'))
  link.href = './privacy.html'
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  dialog.appendChild(link)
  const status = element('p')
  status.setAttribute('role', 'status')
  dialog.appendChild(status)
  const actions = element('div', null, 'document-dialog-actions')
  const button = (label, action, primary = false) => {
    const node = element('button', label, 'document-button' + (primary ? ' document-button-primary' : ''))
    node.type = 'button'
    node.addEventListener('click', action)
    actions.appendChild(node)
    return node
  }
  button(t('privacy.deleteSaved'), async () => {
    const deleted = deleteSavedWorkspace()
    setOfflineCache(false)
    workspace.checked = false
    offline.checked = false
    try { await configureOfflineCache() } catch (error) {
      status.textContent = t('privacy.offlineFailed')
      return
    }
    if (presenter.documents) presenter.documents.refresh()
    if (!deleted) { status.textContent = t('privacy.storageUnavailable'); return }
    status.textContent = t('privacy.deleted')
  })
  if (presenter.documents && presenter.documents.activated) {
    dialog.appendChild(element('p', t('privacy.googleSession')))
    button(t('privacy.deactivateGoogle'), () => window.location.reload())
  }
  button(t('common.cancel'), () => dialog.close())
  button(t('privacy.saveChoices'), async () => {
    const remembered = setWorkspacePersistence(workspace.checked)
    const cached = setOfflineCache(offline.checked)
    if ((workspace.checked && !remembered) || (offline.checked && !cached)) {
      status.textContent = t('privacy.storageUnavailable')
      return
    }
    if (remembered) {
      presenter.persistSettings()
      presenter.updateBrowserStore()
    }
    try { await configureOfflineCache() } catch (error) {
      status.textContent = t('privacy.offlineFailed')
      return
    }
    if (presenter.documents) presenter.documents.refresh()
    dialog.close()
  }, true)
  dialog.appendChild(actions)
  const trigger = document.activeElement
  dialog.addEventListener('close', () => { dialog.remove(); if (trigger && trigger.isConnected) trigger.focus() })
  document.body.appendChild(dialog)
  dialog.showModal()
}

export function requestGoogleActivation (controller, continuation) {
  if (controller.activationDialog) { controller.activationDialog.focus(); return }
  const dialog = element('dialog', null, 'document-save-dialog privacy-dialog')
  dialog.id = 'google-activation-dialog'
  dialog.setAttribute('aria-labelledby', 'google-activation-title')
  const title = element('h2', t('privacy.googleTitle'))
  title.id = 'google-activation-title'
  dialog.appendChild(title)
  for (const key of ['googleDescription', 'googleData', 'googleSession']) dialog.appendChild(element('p', t('privacy.' + key)))
  const policy = element('a', t('privacy.readPolicy'))
  policy.href = './privacy.html#google'
  policy.target = '_blank'
  policy.rel = 'noopener noreferrer'
  dialog.appendChild(policy)
  const status = element('p')
  status.setAttribute('role', 'status')
  dialog.appendChild(status)
  const actions = element('div', null, 'document-dialog-actions')
  const cancel = element('button', t('common.cancel'), 'document-button')
  cancel.type = 'button'
  cancel.addEventListener('click', () => dialog.close())
  const activate = element('button', t('privacy.activateGoogle'), 'document-button document-button-primary')
  activate.type = 'button'
  activate.addEventListener('click', async event => {
    event.stopPropagation()
    if (controller.ready) {
      dialog.close()
      continuation()
      return
    }
    controller.activated = true
    activate.disabled = true
    status.textContent = t('privacy.googleLoading')
    const ready = await controller.prepare()
    if (!dialog.open) return
    activate.disabled = false
    if (ready) {
      status.textContent = t('privacy.googleReady')
      activate.textContent = t('privacy.continueGoogle')
      activate.focus()
    } else {
      status.textContent = controller.loadError
      activate.textContent = t('privacy.retryGoogle')
    }
  })
  actions.appendChild(cancel)
  actions.appendChild(activate)
  dialog.appendChild(actions)
  controller.activationDialog = dialog
  const trigger = document.activeElement
  dialog.addEventListener('close', () => {
    controller.activationDialog = null
    dialog.remove()
    if (trigger && trigger.isConnected) trigger.focus()
  })
  document.body.appendChild(dialog)
  dialog.showModal()
}
