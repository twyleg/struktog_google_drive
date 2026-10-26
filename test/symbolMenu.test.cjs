const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

async function setup() {
  // Small DOM fixture: the browser's selection API and native button activation
  // are separate from the menu's insertion and focus-management behavior.
  class Element extends EventTarget {
    constructor() {
      super();
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.value = "abc def";
      this.selectionStart = 3;
      this.selectionEnd = 3;
    }
    appendChild(child) { this.children.push(child); }
    setAttribute(key, value) { this.attributes[key] = value; }
    contains(target) {
      return this === target || this.children.some(child => child.contains(target));
    }
    focus() { this.focused = true; }
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
    setRangeText(text, start, end) {
      this.value = this.value.slice(0, start) + text + this.value.slice(end);
      this.setSelectionRange(start + text.length, start + text.length);
    }
  }
  const context = vm.createContext({
    Event,
    document: { createElement: () => new Element() },
  });
  const module = new vm.SourceTextModule(
    fs.readFileSync("src/helpers/symbolMenu.js", "utf8"), { context }
  );
  await module.link(() => new vm.SyntheticModule(["t"], function () {
    this.setExport("t", () => "Insert symbol");
  }, { context }));
  await module.evaluate();
  const input = new Element();
  const menu = module.namespace.createSymbolMenu(input);
  const [toggle, panel] = menu.children;
  const blur = () => {
    const event = new Event("blur");
    event.relatedTarget = toggle;
    input.dispatchEvent(event);
  };
  return { input, menu, toggle, panel, blur };
}

test("picker inserts at the caret and emits input without committing", async () => {
  const { input, toggle, panel, blur } = await setup();
  let updates = 0;
  let commits = 0;
  input.addEventListener("input", () => updates++);
  input.addEventListener("blur", () => commits++);
  blur();
  toggle.dispatchEvent(new Event("click"));
  assert.equal(panel.hidden, false);
  panel.children[0].dispatchEvent(new Event("click"));
  assert.equal(input.value, "abc← def");
  assert.equal(input.selectionStart, 4);
  assert.equal(input.focused, true);
  assert.equal(panel.hidden, true);
  assert.equal(updates, 1);
  assert.equal(commits, 0);
});

test("selected text is replaced and repeated insertion uses the new caret", async () => {
  const { input, panel, blur } = await setup();
  input.setSelectionRange(0, 3);
  blur();
  panel.children[1].dispatchEvent(new Event("click"));
  assert.equal(input.value, "→ def");
  blur();
  panel.children[0].dispatchEvent(new Event("click"));
  assert.equal(input.value, "→← def");
});

test("Escape closes the picker and restores the selection without editing", async () => {
  const { input, menu, toggle, panel, blur } = await setup();
  input.setSelectionRange(1, 5);
  blur();
  toggle.dispatchEvent(new Event("click"));
  const event = new Event("keydown", { cancelable: true });
  event.key = "Escape";
  menu.dispatchEvent(event);
  assert.equal(panel.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
  assert.equal(input.value, "abc def");
  assert.equal(input.selectionStart, 1);
  assert.equal(input.selectionEnd, 5);
  assert.equal(event.defaultPrevented, true);
});

test("leaving the picker closes it and preserves blur-to-commit behavior", async () => {
  const { input, menu, toggle, panel, blur } = await setup();
  let commits = 0;
  input.addEventListener("blur", () => commits++);
  blur();
  toggle.dispatchEvent(new Event("click"));
  menu.dispatchEvent(new Event("focusout"));
  assert.equal(panel.hidden, true);
  assert.equal(commits, 1);
});
