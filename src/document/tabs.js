import { t } from '../i18n.js'

export class DocumentTabs {
  constructor (controller, target) {
    this.controller = controller
    this.items = new Map()
    this.panel = document.getElementById('editorDisplay')
    this.root = document.createElement('div')
    this.root.className = 'document-tabs'
    this.root.setAttribute('role', 'tablist')
    target.appendChild(this.root)
  }

  create (tab) {
    const item = document.createElement('div')
    item.className = 'document-tab'
    item.setAttribute('role', 'presentation')
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'diagram-tab-' + tab.id
    button.dataset.tabId = tab.id
    button.className = 'document-tab-select'
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-controls', 'editorDisplay')
    button.addEventListener('click', () => this.controller.activateTab(tab.id))
    button.addEventListener('keydown', event => {
      const tabs = this.controller.tabs
      const index = tabs.findIndex(item => item.id === tab.id)
      let next
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length]
      if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length]
      if (event.key === 'Home') next = tabs[0]
      if (event.key === 'End') next = tabs[tabs.length - 1]
      if (next) {
        event.preventDefault()
        this.controller.activateTab(next.id)
        this.focusActive()
      }
      if (event.key === 'Delete') {
        event.preventDefault()
        this.controller.closeTab(tab.id)
        this.focusActive()
      }
    })
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'document-tab-close'
    close.textContent = '×'
    close.addEventListener('click', () => {
      this.controller.closeTab(tab.id)
      this.focusActive()
    })
    item.appendChild(button)
    item.appendChild(close)
    this.root.appendChild(item)
    const nodes = { item, button, close }
    this.items.set(tab.id, nodes)
    return nodes
  }

  focusActive () {
    const nodes = this.items.get(this.controller.activeTabId)
    if (nodes) nodes.button.focus()
  }

  render () {
    const controller = this.controller
    this.root.setAttribute('aria-label', t('tabs.label'))
    for (const [id, nodes] of this.items) {
      if (!controller.tabs.some(tab => tab.id === id)) {
        nodes.item.remove()
        this.items.delete(id)
      }
    }
    for (const tab of controller.tabs) {
      const nodes = this.items.get(tab.id) || this.create(tab)
      const active = tab.id === controller.activeTabId
      const dirty = active ? controller.dirty() : tab.dirty
      const name = tab.document.name || t('nav.unnamed')
      const label = name + (dirty ? ' · ' + t('toolbar.unsaved') : '')
      nodes.button.textContent = (dirty ? '● ' : '') + name
      nodes.button.title = label
      nodes.button.setAttribute('aria-label', label)
      nodes.button.setAttribute('aria-selected', String(active))
      nodes.button.tabIndex = active ? 0 : -1
      nodes.button.disabled = controller.busy
      nodes.item.dataset.active = String(active)
      nodes.item.dataset.dirty = String(dirty)
      nodes.item.dataset.source = tab.document.source
      const closeLabel = t('tabs.close', { name })
      nodes.close.title = closeLabel
      nodes.close.setAttribute('aria-label', closeLabel)
      nodes.close.disabled = controller.busy
      if (active && this.panel) this.panel.setAttribute('aria-labelledby', nodes.button.id)
      if (active && this.lastActive !== tab.id && nodes.item.scrollIntoView) {
        nodes.item.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
    this.lastActive = controller.activeTabId
  }
}
