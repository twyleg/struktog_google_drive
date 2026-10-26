import { t } from "../i18n";

export const commonSymbols = [
  "←", "→", "↑", "↓", "↔", "⇒", "⇔",
  "≤", "≥", "≠", "≈", "×", "÷", "±", "∞",
  "∧", "∨", "¬", "∈", "∉", "∅", "∪", "∩",
];

// Keep editing in the original field; committing remains the editor's job.
export function createSymbolMenu(input) {
  const menu = document.createElement("span");
  menu.className = "symbol-menu";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = "Ω ▾";
  toggle.dataset.i18nTitle = "editor.insertSymbol";
  toggle.title = t("editor.insertSymbol");
  toggle.setAttribute("aria-label", toggle.title);
  toggle.setAttribute("aria-expanded", "false");
  const panel = document.createElement("span");
  panel.className = "symbol-menu-panel";
  panel.hidden = true;
  let start = 0;
  let end = 0;
  const rememberSelection = () => {
    start = input.selectionStart;
    end = input.selectionEnd;
  };
  const close = () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  input.addEventListener("blur", (event) => {
    rememberSelection();
    // Some function fields commit on blur. Moving into their picker is
    // still part of the same edit session.
    if (menu.contains(event.relatedTarget)) event.stopImmediatePropagation();
  }, true);
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
  });
  menu.addEventListener("keydown", (event) => {
    // Do not let the inline editor's Enter/Escape handlers commit/cancel.
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      input.focus();
      input.setSelectionRange(start, end);
    }
  });
  menu.addEventListener("focusout", (event) => {
    if (!menu.contains(event.relatedTarget)) {
      close();
      if (event.relatedTarget !== input) input.dispatchEvent(new Event("blur"));
    }
  });
  for (const symbol of commonSymbols) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = symbol;
    button.addEventListener("click", () => {
      input.setRangeText(symbol, start, end, "end");
      close();
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    panel.appendChild(button);
  }
  menu.appendChild(toggle);
  menu.appendChild(panel);
  return menu;
}
