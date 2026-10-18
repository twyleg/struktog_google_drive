// Only this preference record is read before optional storage is enabled.
const CHOICE_KEY = 'struktog_privacy_choices_v1'
const APP_KEYS = new Set(['tree', 'lang', 'displaySourcecode', 'struktog_code', 'struktog_structogram_name', 'struktog_diagram_headline', 'struktog_settings_ui_language', 'struktog_settings_theme', 'struktog_settings_shortcuts', 'struktog_settings_profile', 'struktog_settings_elements', 'struktog_settings_colors', 'struktog_settings_function_insert_top_only', 'struktog_tour_hint_seen_v1', 'struktog_drive_recent', 'struktog_open_tabs'])
const memory = new Map()
let choices = { workspace: false, offline: false }
function deviceStorage () {
  try { return window.localStorage } catch (error) { return null }
}
try {
  const saved = JSON.parse(deviceStorage().getItem(CHOICE_KEY) || 'null')
  if (saved) choices = { workspace: saved.workspace === true, offline: saved.offline === true }
} catch (error) { /* Private mode and blocked storage default to session-only. */ }

function persistChoices () {
  try {
    deviceStorage().setItem(CHOICE_KEY, JSON.stringify(choices))
    return true
  } catch (error) { return false }
}
function getItem (key) {
  key = String(key)
  if (memory.has(key)) return memory.get(key)
  if (choices.workspace && APP_KEYS.has(key)) {
    try { return deviceStorage().getItem(key) } catch (error) { /* Use session data. */ }
  }
  return null
}
function setItem (key, value) {
  key = String(key)
  value = String(value)
  memory.set(key, value)
  if (choices.workspace && APP_KEYS.has(key)) {
    try { deviceStorage().setItem(key, value) } catch (error) { /* Editing still works. */ }
  }
}
function removeItem (key) {
  key = String(key)
  memory.delete(key)
  if (choices.workspace && APP_KEYS.has(key)) {
    try { deviceStorage().removeItem(key) } catch (error) { /* Storage unavailable. */ }
  }
}
export function workspacePersistenceEnabled () { return choices.workspace }
export function offlineCacheEnabled () { return choices.offline }
export function setWorkspacePersistence (enabled) {
  if (choices.workspace && !enabled) {
    for (const key of APP_KEYS) {
      const value = getItem(key)
      if (value !== null) memory.set(key, value)
    }
  }
  choices.workspace = Boolean(enabled)
  if (!persistChoices()) {
    if (enabled) { choices.workspace = false; return false }
    try { deviceStorage().removeItem(CHOICE_KEY) } catch (error) { /* Browser settings can clear blocked data. */ }
  }
  for (const key of APP_KEYS) {
    try {
      if (enabled && memory.has(key)) deviceStorage().setItem(key, memory.get(key))
      else if (!enabled) deviceStorage().removeItem(key)
    } catch (error) { /* Keep the current workspace in memory. */ }
  }
  return choices.workspace
}
export function setOfflineCache (enabled) {
  choices.offline = Boolean(enabled)
  if (!persistChoices()) {
    if (enabled) choices.offline = false
    else {
      try { deviceStorage().removeItem(CHOICE_KEY) } catch (error) { /* Browser settings can clear blocked data. */ }
    }
  }
  return choices.offline
}
export function deleteSavedWorkspace () {
  setWorkspacePersistence(false)
  memory.delete('struktog_drive_recent')
  let deleted = true
  for (const key of APP_KEYS) {
    try { deviceStorage().removeItem(key) } catch (error) { deleted = false }
  }
  return deleted
}
// Existing editor code uses both Storage methods and named properties.
export const storage = new Proxy({}, {
  get (target, key) {
    if (key === 'getItem') return getItem
    if (key === 'setItem') return setItem
    if (key === 'removeItem') return removeItem
    return getItem(key)
  },
  set (target, key, value) { setItem(key, value); return true },
  has (target, key) { return getItem(key) !== null }
})
