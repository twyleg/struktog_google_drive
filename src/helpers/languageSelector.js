import { getUiLanguageSelectOptions, t } from '../i18n'

export function mountLanguageSelector (presenter) {
  const heading = document.querySelector('.nav-logo-container')
  const controls = document.createElement('div')
  controls.id = 'header-preferences'
  controls.className = 'header-preferences'
  heading.appendChild(controls)
  const label = document.createElement('label')
  label.className = 'ui-language-control'
  label.htmlFor = 'ui-language-select'

  const caption = document.createElement('span')
  const select = document.createElement('select')
  select.id = 'ui-language-select'

  label.append(caption, select)
  controls.appendChild(label)

  const refresh = () => {
    caption.textContent = t('importExport.uiLanguage')
    select.title = caption.textContent
    select.replaceChildren()

    for (const { value, label } of getUiLanguageSelectOptions()) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      select.appendChild(option)
    }

    select.value = presenter.getUiLanguage()
  }

  select.addEventListener('change', () => {
    presenter.applySettings({ uiLanguage: select.value })
  })

  refresh()
  return refresh
}
