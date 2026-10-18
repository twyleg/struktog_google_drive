import { storage } from '../privacy/storage.js'
import { t } from '../i18n.js'

const STORAGE_KEY = 'struktog_settings_theme'
const THEMES = ['system', 'light', 'dark']
let preference = 'system'
let systemTheme = null

function applyTheme () {
  const resolved = preference === 'system'
    ? (systemTheme.matches ? 'dark' : 'light')
    : preference
  document.documentElement.dataset.theme = resolved
  const browserColor = document.querySelector('meta[name="theme-color"]')
  if (browserColor) browserColor.content = resolved === 'dark' ? '#111b22' : '#ffffff'
}

export function initializeTheme () {
  const stored = storage.getItem(STORAGE_KEY)
  preference = THEMES.includes(stored) ? stored : 'system'
  if (!systemTheme) {
    systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    systemTheme.addEventListener('change', applyTheme)
  }
  applyTheme()
}

export function setThemePreference (value) {
  if (!THEMES.includes(value)) return
  preference = value
  storage.setItem(STORAGE_KEY, value)
  applyTheme()
}

export function mountThemeSelector () {
  const label = document.createElement('label')
  label.className = 'ui-language-control ui-theme-control'
  label.htmlFor = 'ui-theme-select'
  const caption = document.createElement('span')
  const select = document.createElement('select')
  select.id = 'ui-theme-select'
  label.append(caption, select)
  document.getElementById('header-preferences').appendChild(label)

  const refresh = () => {
    caption.textContent = t('theme.label')
    select.title = caption.textContent
    select.replaceChildren()
    for (const value of THEMES) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = t('theme.' + value)
      select.appendChild(option)
    }
    select.value = preference
  }
  select.addEventListener('change', () => setThemePreference(select.value))
  refresh()
  return refresh
}
