import { storage } from "../privacy/storage.js";
/*
 Copyright (C) 2019-2023 Thiemo Leonhardt, Klaus Ramm, Tom-Maurice Schreiber, Sören Schwab

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { validDiagram } from "../document/validate.js";
import { guidGenerator } from "../helpers/generator";
import {
  generateSourceCode,
  getSupportedCodeLanguages,
} from "../helpers/sourceCode";
import { config } from "../config";
import {
  getContentDefault,
  getNodeLabel,
  getSupportedUiLanguages,
  getUiLanguagePreference,
  getUiLanguageStorageKey,
  localizeContentDefault,
  setUiLanguagePreference,
  t,
} from "../i18n";

const STRUCTOGRAM_NAME_STORAGE_KEY = "struktog_structogram_name";
const HEADLINE_STORAGE_KEY = "struktog_diagram_headline";
const FUNCTION_INSERT_RESTRICTION_STORAGE_KEY =
  "struktog_settings_function_insert_top_only";

export class Presenter {
  constructor(model, options = {}) {
    this.model = model;
    this.options = options;
    this.embedMode = Boolean(options.embedMode);
    this.externalEventHandler = null;
    this.insertMode = false;
    this.insertModeEventActive = false;
    this.activeInsertNodeType = null;
    this.selectedUid = null;
    this.settingFunctionMode = false; // if the user is setting a function block then true
    this.views = [];
    this.moveId = null;
    this.nextInsertElement = null;
    this.displaySourcecode = false;
    this.codeLanguage = "--";
    this.shortcutsEnabled = true;
    this.restrictFunctionInsertToTop = true;
    this.activeConfigProfile = "standard";
    this.uiLanguage = getUiLanguagePreference();
    this.structogramName = t("nav.unnamed");
    this.diagramHeadline = "";
    this.undoList = [];
    this.redoList = [];

    if (typeof Storage !== "undefined") {
      if ("displaySourcecode" in storage) {
        this.displaySourcecode = JSON.parse(storage.displaySourcecode);
      }
      if ("lang" in storage) {
        this.codeLanguage = storage.lang;
      }
      if ("struktog_settings_shortcuts" in storage) {
        this.shortcutsEnabled = JSON.parse(
          storage.struktog_settings_shortcuts
        );
      }
      if ("struktog_settings_profile" in storage) {
        this.activeConfigProfile = storage.struktog_settings_profile;
      }
      if (getUiLanguageStorageKey() in storage) {
        this.uiLanguage = storage[getUiLanguageStorageKey()];
        setUiLanguagePreference(this.uiLanguage, false);
      }
      if (STRUCTOGRAM_NAME_STORAGE_KEY in storage) {
        this.structogramName = storage[STRUCTOGRAM_NAME_STORAGE_KEY];
      }
      this.diagramHeadline = storage.getItem(HEADLINE_STORAGE_KEY) || "";
      if (FUNCTION_INSERT_RESTRICTION_STORAGE_KEY in storage) {
        this.restrictFunctionInsertToTop = JSON.parse(
          storage[FUNCTION_INSERT_RESTRICTION_STORAGE_KEY]
        );
      }
    }
  }

  isEmbedMode() {
    return this.embedMode;
  }

  setExternalEventHandler(handler) {
    if (typeof handler === "function") {
      this.externalEventHandler = handler;
    } else {
      this.externalEventHandler = null;
    }
  }

  emitExternalEvent(type, payload = {}) {
    if (this.documents) this.documents.refresh();
    if (typeof this.externalEventHandler === "function") {
      this.externalEventHandler({ type, payload });
    }
  }

  addView(view) {
    this.views.push(view);
  }

  getInsertMode() {
    return this.insertMode;
  }

  getSettingFunctionMode() {
    return this.settingFunctionMode;
  }

  getModelTree() {
    return this.model.getTree();
  }

  getStructogramName() {
    const structoNameNode = document.getElementById("structoName");
    if (structoNameNode && typeof structoNameNode.textContent === "string") {
      return structoNameNode.textContent;
    }
    return this.structogramName || t("nav.unnamed");
  }

  setStructogramName(name) {
    const normalizedName =
      typeof name === "string" && name.trim() !== "" ? name : t("nav.unnamed");
    this.structogramName = normalizedName;

    const structoNameNode = document.getElementById("structoName");
    if (structoNameNode) {
      structoNameNode.textContent = normalizedName;
    }

    this.updateBrowserStore();
    if (this.documents) this.documents.refresh();
    this.emitExternalEvent("structogramMetaChanged", {
      structoName: normalizedName,
    });

    return normalizedName;
  }

  getDiagramHeadline() {
    return this.diagramHeadline;
  }

  setDiagramHeadline(headline) {
    this.diagramHeadline = typeof headline === "string" ? headline : "";
    const input = document.getElementById("diagram-headline-input");
    if (input && input.value !== this.diagramHeadline) input.value = this.diagramHeadline;
    this.updateBrowserStore();
    if (this.documents) this.documents.refresh();
    this.emitExternalEvent("structogramMetaChanged", { headline: this.diagramHeadline });
    return this.diagramHeadline;
  }

  getElementByUid(uid) {
    return this.model.getElementInTree(uid, this.model.getTree());
  }

  findParentNodeInfo(uid, subTree = this.model.getTree()) {
    if (!subTree || typeof subTree !== "object") {
      return null;
    }

    if (Array.isArray(subTree.cases)) {
      for (let index = 0; index < subTree.cases.length; index += 1) {
        const caseNode = subTree.cases[index];
        if (caseNode && caseNode.id === uid) {
          return {
            parentUid: subTree.id,
            parentType: subTree.type,
            childUid: caseNode.id,
            childType: caseNode.type,
            index,
          };
        }

        const nestedResult = this.findParentNodeInfo(uid, caseNode);
        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    if (Array.isArray(subTree.catches)) {
      for (let index = 0; index < subTree.catches.length; index += 1) {
        const catchNode = subTree.catches[index];
        if (catchNode && catchNode.id === uid) {
          return {
            parentUid: subTree.id,
            parentType: subTree.type,
            childUid: catchNode.id,
            childType:
              catchNode.specialType && catchNode.specialType === "CatchNode"
                ? "CatchNode"
                : catchNode.type,
            index,
          };
        }

        const nestedResult = this.findParentNodeInfo(uid, catchNode);
        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    const childKeys = [
      "followElement",
      "child",
      "trueChild",
      "falseChild",
      "tryChild",
      "defaultNode",
    ];
    for (const key of childKeys) {
      if (subTree[key] && typeof subTree[key] === "object") {
        const nestedResult = this.findParentNodeInfo(uid, subTree[key]);
        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    return null;
  }

  resetButtons() {
    for (const view of this.views) {
      view.resetButtons();
    }
  }

  reset() {
    // reset the model fields connected to inserting
    this.insertMode = false;
    this.insertModeEventActive = false;
    this.activeInsertNodeType = null;
    this.settingFunctionMode = false;
    this.nextInsertElement = null;
    this.moveId = null;
  }

  setSourcecodeDisplay(state) {
    this.displaySourcecode = state;
  }

  setSourcecodeDisplayState(state) {
    const nextState = Boolean(state);
    if (this.displaySourcecode === nextState) {
      return;
    }

    this.displaySourcecode = nextState;
    this.updateBrowserStore();
    for (const view of this.views) {
      if (typeof view.displaySourcecode === "function") {
        view.displaySourcecode("ToggleSourcecode");
      }
    }
  }

  getSourcecodeDisplay() {
    return this.displaySourcecode;
  }

  getCodeLanguage() {
    return this.codeLanguage;
  }

  setCodeLanguage(lang) {
    this.codeLanguage = lang;
    for (const view of this.views) {
      if (typeof view.setLang === "function") {
        view.setLang(lang);
      }
    }
    this.emitSourceCodeChanged();
  }

  getSupportedCodeLanguages() {
    return getSupportedCodeLanguages();
  }

  getSourceCode(language = this.codeLanguage) {
    const selectedLanguage = language || this.codeLanguage;
    if (!selectedLanguage || selectedLanguage === "--") {
      return {
        ok: false,
        code: "NO_LANGUAGE_SELECTED",
        error: "No source code language selected",
      };
    }

    return generateSourceCode(this.model.getTree(), selectedLanguage);
  }

  getSourceCodeState(language = this.codeLanguage) {
    const selectedLanguage = language || this.codeLanguage;
    if (!selectedLanguage || selectedLanguage === "--") {
      return {
        ok: true,
        language: selectedLanguage || "--",
        displaySourcecode: this.getSourcecodeDisplay(),
        supported: false,
        code: "",
        selected: false,
      };
    }

    const sourceCode = this.getSourceCode(selectedLanguage);
    if (!sourceCode.ok) {
      return sourceCode;
    }

    return {
      ...sourceCode,
      displaySourcecode: this.getSourcecodeDisplay(),
      selected: selectedLanguage === this.codeLanguage,
    };
  }

  emitSourceCodeChanged(language = this.codeLanguage) {
    const selectedLanguage = language || this.codeLanguage;
    const payload = this.getSourceCodeState(selectedLanguage);
    this.emitExternalEvent("sourcecodeChanged", payload);
  }

  getShortcutsEnabled() {
    return this.shortcutsEnabled;
  }

  setShortcutsEnabled(enabled) {
    this.shortcutsEnabled = Boolean(enabled);
  }

  getRestrictFunctionInsertToTop() {
    return this.restrictFunctionInsertToTop;
  }

  setRestrictFunctionInsertToTop(enabled) {
    this.restrictFunctionInsertToTop = Boolean(enabled);
  }

  setActiveConfigProfile(profile) {
    if (profile && profile in config.alternatives) {
      this.activeConfigProfile = profile;
    }
  }

  getActiveConfigProfile() {
    return this.activeConfigProfile;
  }

  getSettingsElementKeys() {
    return [
      "InputNode",
      "OutputNode",
      "TaskNode",
      "BlockCallNode",
      "CountLoopNode",
      "HeadLoopNode",
      "FootLoopNode",
      "BranchNode",
      "CaseNode",
      "TryCatchNode",
      "FunctionNode",
    ];
  }

  getSettingsElements() {
    return this.getSettingsElementKeys().map((key) => ({
      key,
      text: getNodeLabel(key),
      use: config.get()[key].use,
    }));
  }

  getUiLanguage() {
    return this.uiLanguage;
  }

  getSupportedUiLanguages() {
    return getSupportedUiLanguages();
  }

  setUiLanguage(uiLanguage) {
    const supportedLanguages = this.getSupportedUiLanguages();
    const normalizedLanguage =
      typeof uiLanguage === "string" ? uiLanguage.trim() : "";

    if (normalizedLanguage === "auto") {
      this.uiLanguage = normalizedLanguage;
      setUiLanguagePreference(normalizedLanguage, false);
      return { ok: true, language: this.getUiLanguage() };
    }

    if (!supportedLanguages.includes(normalizedLanguage)) {
      return {
        ok: false,
        code: "UNSUPPORTED_UI_LANGUAGE",
        error: "Unsupported UI language",
      };
    }

    this.uiLanguage = normalizedLanguage;
    setUiLanguagePreference(normalizedLanguage, false);
    return { ok: true, language: this.getUiLanguage() };
  }

  getSettingsColors() {
    const colorSettings = {};
    for (const key of this.getSettingsElementKeys()) {
      colorSettings[key] = config.get()[key].color;
    }
    return colorSettings;
  }

  normalizeColorValue(value) {
    if (typeof value !== "string") {
      return null;
    }

    const trimmedValue = value.trim();
    const hexMatch = trimmedValue.match(/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/);
    if (hexMatch) {
      if (trimmedValue.length === 4) {
        return (
          "#" +
          trimmedValue[1] +
          trimmedValue[1] +
          trimmedValue[2] +
          trimmedValue[2] +
          trimmedValue[3] +
          trimmedValue[3]
        ).toLowerCase();
      }
      return trimmedValue.toLowerCase();
    }

    const rgbMatch = trimmedValue.match(
      /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
    );
    if (!rgbMatch) {
      return null;
    }

    const channels = rgbMatch.slice(1).map((item) => Number(item));
    if (
      channels.some(
        (channel) => Number.isNaN(channel) || channel < 0 || channel > 255
      )
    ) {
      return null;
    }

    const toHex = (channel) => channel.toString(16).padStart(2, "0");
    return "#" + channels.map((channel) => toHex(channel)).join("");
  }

  getStoredSettings(ignoreProfile = false) {
    if (typeof Storage === "undefined") {
      return {};
    }

    const settings = {};
    if (!ignoreProfile && "struktog_settings_profile" in storage) {
      settings.profile = storage.struktog_settings_profile;
    }
    if (!ignoreProfile && "struktog_settings_elements" in storage) {
      settings.elements = JSON.parse(storage.struktog_settings_elements);
    }
    if (!ignoreProfile && "struktog_settings_colors" in storage) {
      settings.colors = JSON.parse(storage.struktog_settings_colors);
    }
    if (getUiLanguageStorageKey() in storage) {
      settings.uiLanguage = storage[getUiLanguageStorageKey()];
    }
    if ("lang" in storage) {
      settings.language = storage.lang;
    }
    if ("displaySourcecode" in storage) {
      settings.displaySourcecode = JSON.parse(storage.displaySourcecode);
    }
    if ("struktog_settings_shortcuts" in storage) {
      settings.shortcutsEnabled = JSON.parse(
        storage.struktog_settings_shortcuts
      );
    }
    if (FUNCTION_INSERT_RESTRICTION_STORAGE_KEY in storage) {
      settings.restrictFunctionInsertToTop = JSON.parse(
        storage[FUNCTION_INSERT_RESTRICTION_STORAGE_KEY]
      );
    }

    return settings;
  }

  persistSettings() {
    if (typeof Storage === "undefined") {
      return;
    }

    const elementSettings = {};
    for (const key of this.getSettingsElementKeys()) {
      elementSettings[key] = config.get()[key].use;
    }

    const colorSettings = {};
    for (const key of this.getSettingsElementKeys()) {
      colorSettings[key] = config.get()[key].color;
    }

    storage.struktog_settings_profile = this.activeConfigProfile;
    storage.struktog_settings_elements = JSON.stringify(elementSettings);
    storage.struktog_settings_colors = JSON.stringify(colorSettings);
    storage.struktog_settings_shortcuts = JSON.stringify(
      this.shortcutsEnabled
    );
    storage[FUNCTION_INSERT_RESTRICTION_STORAGE_KEY] = JSON.stringify(
      this.restrictFunctionInsertToTop
    );
    storage[getUiLanguageStorageKey()] = this.uiLanguage;
  }

  applySettings(settings, options = {}) {
    const opts = {
      persist: true,
      rerender: true,
      ...options,
    };

    if (settings.profile && Object.prototype.hasOwnProperty.call(config.alternatives, settings.profile)) {
      config.loadConfig(settings.profile);
      this.activeConfigProfile = settings.profile;
    }

    if (settings.elements) {
      for (const key of this.getSettingsElementKeys()) {
        if (key in settings.elements) {
          config.get()[key].use = Boolean(settings.elements[key]);
        }
      }
    }

    if (settings.colors) {
      for (const key of this.getSettingsElementKeys()) {
        if (key in settings.colors) {
          const normalizedColor = this.normalizeColorValue(
            settings.colors[key]
          );
          if (normalizedColor) {
            config.get()[key].color = normalizedColor;
          }
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(settings, "language")) {
      this.setCodeLanguage(settings.language);
    }

    if (Object.prototype.hasOwnProperty.call(settings, "displaySourcecode")) {
      this.setSourcecodeDisplayState(settings.displaySourcecode);
    }

    if (Object.prototype.hasOwnProperty.call(settings, "shortcutsEnabled")) {
      this.setShortcutsEnabled(settings.shortcutsEnabled);
    }

    if (
      Object.prototype.hasOwnProperty.call(
        settings,
        "restrictFunctionInsertToTop"
      )
    ) {
      this.setRestrictFunctionInsertToTop(settings.restrictFunctionInsertToTop);
    }

    if (Object.prototype.hasOwnProperty.call(settings, "uiLanguage")) {
      const uiLanguageResult = this.setUiLanguage(settings.uiLanguage);
      if (!uiLanguageResult.ok) {
        throw new Error(uiLanguageResult.error);
      }
    }

    this.migrateLocalizedDefaultContent();

    if (opts.persist) {
      this.persistSettings();
      this.updateBrowserStore();
    }

    if (opts.rerender) {
      this.renderAllViews();
      for (const view of this.views) {
        if (typeof view.displaySourcecode === "function") {
          view.displaySourcecode("ToggleSourcecode");
        }
      }
    }

    this.emitExternalEvent("uiLanguageChanged", {
      language: this.getUiLanguage(),
    });

    this.emitExternalEvent("settingsChanged", {
      settings: this.getCurrentSettingsSnapshot(),
    });
  }

  resetSettingsToDefault() {
    this.applySettings({
      profile: "standard",
      uiLanguage: "auto",
      language: "--",
      displaySourcecode: false,
      shortcutsEnabled: true,
      restrictFunctionInsertToTop: true,
    });
  }

  /**
   * Update the model stored in the browser store
   */
  updateBrowserStore() {
    // check if browser supports web storage
    if (typeof Storage !== "undefined") {
      // update the model as stringified JSON data
      storage.tree = JSON.stringify(this.model.getTree());
      storage.displaySourcecode = this.displaySourcecode;
      storage[STRUCTOGRAM_NAME_STORAGE_KEY] = this.structogramName;
      storage[HEADLINE_STORAGE_KEY] = this.diagramHeadline;
    }
    if (this.documents) this.documents.persistWorkspace();
  }

  getMoveId() {
    return this.moveId;
  }

  getSelectedUid() {
    return this.selectedUid;
  }

  getSelectedNode() {
    if (!this.selectedUid) {
      return null;
    }
    return this.getElementByUid(this.selectedUid);
  }

  isNodeSelected(uid) {
    return Boolean(uid) && this.selectedUid === uid;
  }

  emitSelectionChanged() {
    const selectedNode = this.getSelectedNode();
    this.emitExternalEvent("selectionChanged", {
      uid: selectedNode ? selectedNode.id : null,
      nodeType: selectedNode ? selectedNode.type : null,
      text:
        selectedNode && typeof selectedNode.text === "string"
          ? selectedNode.text
          : null,
    });
  }

  selectNode(uid, emitEvent = true) {
    const node = this.getElementByUid(uid);
    if (!node) {
      return { ok: false, error: "Node not found" };
    }

    const selectionChanged = this.selectedUid !== uid;
    this.selectedUid = uid;
    if (selectionChanged) {
      this.renderAllViews();
      if (emitEvent) {
        this.emitSelectionChanged();
      }
    }

    return { ok: true, node };
  }

  clearSelectedNode(emitEvent = true) {
    if (!this.selectedUid) {
      return { ok: true, cleared: false };
    }

    this.selectedUid = null;
    this.renderAllViews();
    if (emitEvent) {
      this.emitSelectionChanged();
    }
    return { ok: true, cleared: true };
  }

  syncSelectedNode(emitEvent = false) {
    if (!this.selectedUid) {
      return false;
    }

    if (!this.getElementByUid(this.selectedUid)) {
      this.selectedUid = null;
      if (emitEvent) {
        this.emitSelectionChanged();
      }
      return true;
    }

    return false;
  }

  getNextInsertElement() {
    return this.nextInsertElement;
  }

  renderAllViews() {
    const selectionChanged = this.syncSelectedNode();
    for (const view of this.views) {
      view.render(this.model.getTree());
    }
    this.refreshUndoControls();
    if (selectionChanged) {
      this.emitSelectionChanged();
    }
  }

  notifyTreeChanged(reason = "changed") {
    this.emitExternalEvent("treeChanged", {
      reason,
      tree: this.model.getTree(),
    });
    this.emitSourceCodeChanged();
  }

  init() {
    if (this.migrateLocalizedDefaultContent()) {
      this.updateBrowserStore();
    }
    this.setStructogramName(this.structogramName);
    this.setDiagramHeadline(this.diagramHeadline);
    this.renderAllViews();
    this.emitExternalEvent("ready", {
      embedMode: this.embedMode,
      tree: this.model.getTree(),
    });
    this.emitSourceCodeChanged();
  }

  updateNodeTextFromDefault(node, textKey) {
    if (!node || typeof node.text !== "string") {
      return false;
    }

    const localizedText = localizeContentDefault(node.text, textKey);
    if (localizedText !== node.text) {
      node.text = localizedText;
      return true;
    }
    return false;
  }

  migrateLocalizedDefaultContentInNode(subTree) {
    if (!subTree || typeof subTree !== "object") {
      return false;
    }

    let changed = false;

    switch (subTree.type) {
      case "InsertNode":
      case "InputNode":
      case "OutputNode":
        return this.migrateLocalizedDefaultContentInNode(subTree.followElement);
      case "TaskNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "taskDefault") || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "BlockCallNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "blockCallDefault") ||
          changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "BranchNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "branchCondition") || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.trueChild) ||
          changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.falseChild) ||
          changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "CaseNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "caseVariable") || changed;
        if (Array.isArray(subTree.cases)) {
          for (const caseNode of subTree.cases) {
            changed =
              this.updateNodeTextFromDefault(caseNode, "caseLabel") || changed;
            changed =
              this.migrateLocalizedDefaultContentInNode(
                caseNode.followElement
              ) || changed;
          }
        }
        if (subTree.defaultNode) {
          changed =
            this.updateNodeTextFromDefault(subTree.defaultNode, "elseLabel") ||
            changed;
          changed =
            this.migrateLocalizedDefaultContentInNode(
              subTree.defaultNode.followElement
            ) || changed;
        }
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "CountLoopNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "countCondition") || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.child) || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "HeadLoopNode":
      case "FootLoopNode":
        changed =
          this.updateNodeTextFromDefault(subTree, "loopCondition") || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.child) || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "FunctionNode":
        if (typeof subTree.returnType === "string") {
          const localizedReturnType = localizeContentDefault(
            subTree.returnType,
            "returnTypePlaceholder"
          );
          if (localizedReturnType !== subTree.returnType) {
            subTree.returnType = localizedReturnType;
            changed = true;
          }
        }
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.child) || changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "TryCatchNode":
        if (Array.isArray(subTree.catches)) {
          for (const catchNode of subTree.catches) {
            changed =
              this.updateNodeTextFromDefault(catchNode, "catchUndefined") ||
              changed;
            changed =
              this.migrateLocalizedDefaultContentInNode(
                catchNode.followElement
              ) || changed;
          }
        }
        if (subTree.catchChild) {
          changed =
            this.migrateLocalizedDefaultContentInNode(subTree.catchChild) ||
            changed;
        }
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.tryChild) ||
          changed;
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      case "InsertCase":
      case "CatchNode":
        changed =
          this.migrateLocalizedDefaultContentInNode(subTree.followElement) ||
          changed;
        return changed;
      default:
        return false;
    }
  }

  migrateLocalizedDefaultContent() {
    return this.migrateLocalizedDefaultContentInNode(this.model.getTree());
  }

  /**
   * Start the transformation of the model tree to sourcecode
   *
   * @param   lang   programming language to which the translation happens
   */
  startTransforming(event) {
    this.setCodeLanguage(event.target.value);
    this.renderAllViews();
  }

  /**
   * Toggle the rendering of sourcecode
   *
   * @param   buttonId   id of the sourcecode display button
   */
  alterSourcecodeDisplay(buttonId) {
    this.setSourcecodeDisplayState(!this.displaySourcecode);
  }

  getInsertNodeTypeMap() {
    return {
      InputNode: "InputButton",
      OutputNode: "OutputButton",
      TaskNode: "TaskButton",
      BlockCallNode: "BlockCallButton",
      CountLoopNode: "CountLoopButton",
      HeadLoopNode: "HeadLoopButton",
      FootLoopNode: "FootLoopButton",
      BranchNode: "BranchButton",
      CaseNode: "CaseButton",
      TryCatchNode: "TryCatchButton",
      FunctionNode: "FunctionButton",
    };
  }

  getInsertNodeTypes() {
    return Object.keys(this.getInsertNodeTypeMap());
  }

  getInsertButtonIdByNodeType(nodeType) {
    if (typeof nodeType !== "string") {
      return null;
    }

    const normalizedNodeType = nodeType.trim();
    if (normalizedNodeType === "") {
      return null;
    }

    const map = this.getInsertNodeTypeMap();
    return map[normalizedNodeType] || null;
  }

  getInsertNodeTypeByButtonId(buttonId) {
    const insertNodeTypeMap = this.getInsertNodeTypeMap();
    for (const nodeType of Object.keys(insertNodeTypeMap)) {
      if (insertNodeTypeMap[nodeType] === buttonId) {
        return nodeType;
      }
    }
    return null;
  }

  getInsertState() {
    if (!this.insertMode) {
      return {
        active: false,
        mode: "idle",
      };
    }

    if (this.moveId) {
      return {
        active: true,
        mode: "move",
      };
    }

    const state = {
      active: true,
      mode: "insert",
    };
    if (this.activeInsertNodeType) {
      state.nodeType = this.activeInsertNodeType;
    }
    return state;
  }

  getPendingInsertNodeType() {
    if (this.activeInsertNodeType) {
      return this.activeInsertNodeType;
    }

    if (
      this.nextInsertElement &&
      typeof this.nextInsertElement.type === "string" &&
      this.nextInsertElement.type !== ""
    ) {
      return this.nextInsertElement.type;
    }

    return null;
  }

  isTopLevelInsertTarget(uid) {
    const tree = this.model.getTree();
    return Boolean(tree && tree.type === "InsertNode" && tree.id === uid);
  }

  isProtectedTopFunctionInsertTarget(uid) {
    if (!this.getRestrictFunctionInsertToTop()) {
      return false;
    }

    if (!this.isTopLevelInsertTarget(uid)) {
      return false;
    }

    const tree = this.model.getTree();
    return Boolean(
      tree && tree.followElement && tree.followElement.type === "FunctionNode"
    );
  }

  canInsertAt(uid, nodeType = this.getPendingInsertNodeType()) {
    const targetNode = this.getElementByUid(uid);
    if (!targetNode || targetNode.type !== "InsertNode") {
      return {
        ok: false,
        code: "INVALID_INSERT_TARGET",
        error: "Invalid insert target",
      };
    }

    if (
      this.isProtectedTopFunctionInsertTarget(uid) &&
      nodeType !== "FunctionNode"
    ) {
      return {
        ok: false,
        code: "FUNCTION_TOP_POSITION_PROTECTED",
        error: "Top-level function position is protected",
      };
    }

    return { ok: true };
  }

  emitInsertModeChanged(reason) {
    this.emitExternalEvent("insertModeChanged", {
      ...this.getInsertState(),
      reason,
    });
  }

  getMoveSourceError(uid, options = {}) {
    const opts = {
      allowFunctionNode: true,
      ...options,
    };

    const sourceNode = this.getElementByUid(uid);
    if (!sourceNode) {
      return {
        code: "NODE_NOT_FOUND",
        error: "Node not found",
      };
    }

    if (
      sourceNode.type === "InsertNode" ||
      sourceNode.type === "InsertCase" ||
      sourceNode.type === "Placeholder" ||
      sourceNode.specialType === "CatchNode" ||
      (!opts.allowFunctionNode && sourceNode.type === "FunctionNode")
    ) {
      return {
        code: "NODE_NOT_MOVABLE",
        error: "Node type cannot be moved",
      };
    }

    if (
      !sourceNode.followElement ||
      sourceNode.followElement.type !== "InsertNode"
    ) {
      return {
        code: "NODE_NOT_MOVABLE",
        error: "Source node is malformed",
      };
    }

    return null;
  }

  startMoveByUid(uid) {
    if (!this.embedMode) {
      return {
        ok: false,
        code: "MOVE_NOT_AVAILABLE",
        error: "Move bridge mode is only available in embed mode",
      };
    }

    if (this.insertMode) {
      return {
        ok: false,
        code: "MOVE_MODE_CONFLICT",
        error: "Insert or move mode is already active",
      };
    }

    const moveError = this.getMoveSourceError(uid, {
      allowFunctionNode: false,
    });
    if (moveError) {
      return {
        ok: false,
        ...moveError,
      };
    }

    this.moveElement(uid);
    return {
      ok: true,
      state: this.getInsertState(),
    };
  }

  startInsertByNodeType(nodeType) {
    if (!this.embedMode) {
      return {
        ok: false,
        code: "INSERT_NOT_AVAILABLE",
        error: "Insert bridge mode is only available in embed mode",
      };
    }

    if (this.moveId) {
      return {
        ok: false,
        code: "INSERT_MODE_CONFLICT",
        error: "Move mode is active",
      };
    }

    const buttonId = this.getInsertButtonIdByNodeType(nodeType);
    if (!buttonId) {
      return {
        ok: false,
        code: "UNKNOWN_NODE_TYPE",
        error: "Unknown node type",
      };
    }

    const previousState = this.getInsertState();
    const prepared = this.setNextInsertElementByButtonId(buttonId);
    if (!prepared || !this.nextInsertElement || !this.nextInsertElement.id) {
      return {
        ok: false,
        code: "INSERT_NOT_AVAILABLE",
        error: "Insert preparation failed",
      };
    }

    this.resetButtons();
    this.insertMode = true;
    this.insertModeEventActive = true;
    this.activeInsertNodeType = this.getInsertNodeTypeByButtonId(buttonId);

    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add("boldText");
    }

    this.renderAllViews();

    const reason =
      previousState.active &&
      previousState.mode === "insert" &&
      previousState.nodeType &&
      previousState.nodeType !== this.activeInsertNodeType
        ? "replaced"
        : "started";
    this.emitInsertModeChanged(reason);

    return {
      ok: true,
      state: this.getInsertState(),
    };
  }

  cancelInsertMode() {
    const hadActiveInsertMode = this.insertMode;
    const shouldEmitEvent = this.insertModeEventActive;

    this.resetButtons();
    this.reset();
    this.renderAllViews();

    if (hadActiveInsertMode && shouldEmitEvent) {
      this.emitInsertModeChanged("cancelled");
    }

    return {
      ok: true,
      state: this.getInsertState(),
    };
  }

  setNextInsertElementByButtonId(id) {
    this.settingFunctionMode = false;
    switch (id) {
      case "InputButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "InputNode",
          text: "",
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
        };
        return true;
      case "OutputButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "OutputNode",
          text: "",
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
        };
        return true;
      case "TaskButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "TaskNode",
          text: getContentDefault("taskDefault"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
        };
        return true;
      case "BlockCallButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "BlockCallNode",
          text: getContentDefault("blockCallDefault"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
        };
        return true;
      case "BranchButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "BranchNode",
          text: getContentDefault("branchCondition"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          trueChild: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
          falseChild: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
        };
        return true;
      case "CaseButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "CaseNode",
          text: getContentDefault("caseVariable"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          defaultOn: true,
          defaultNode: {
            id: guidGenerator(),
            type: "InsertCase",
            text: getContentDefault("elseLabel"),
            followElement: {
              id: guidGenerator(),
              type: "InsertNode",
              followElement: { type: "Placeholder" },
            },
          },
          cases: [
            {
              id: guidGenerator(),
              type: "InsertCase",
              text: getContentDefault("caseLabel"),
              followElement: {
                id: guidGenerator(),
                type: "InsertNode",
                followElement: { type: "Placeholder" },
              },
            },
            {
              id: guidGenerator(),
              type: "InsertCase",
              text: getContentDefault("caseLabel"),
              followElement: {
                id: guidGenerator(),
                type: "InsertNode",
                followElement: { type: "Placeholder" },
              },
            },
          ],
        };
        return true;
      case "CountLoopButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "CountLoopNode",
          text: getContentDefault("countCondition"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          child: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
        };
        return true;
      case "HeadLoopButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "HeadLoopNode",
          text: getContentDefault("loopCondition"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          child: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
        };
        return true;
      case "FunctionButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "FunctionNode",
          text: "",
          parameters: [],
          returnType: "",
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          child: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
        };
        this.settingFunctionMode = true;
        return true;
      case "FootLoopButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "FootLoopNode",
          text: getContentDefault("loopCondition"),
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          child: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
        };
        return true;
      case "TryCatchButton":
        this.nextInsertElement = {
          id: guidGenerator(),
          type: "TryCatchNode",
          followElement: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: null,
          },
          tryChild: {
            id: guidGenerator(),
            type: "InsertNode",
            followElement: { type: "Placeholder" },
          },
          catches: [
            {
              id: guidGenerator(),
              type: "InsertNode",
              specialType: "CatchNode",
              text: getContentDefault("catchUndefined"),
              followElement: { type: "Placeholder" },
            },
          ],
        };
        return true;
      default:
        return false;
    }
  }

  /**
   * Prepare for inserting an element
   *
   * @param   buttonId   id of the selected button
   */
  insertNode(id, event) {
    const previousState = this.getInsertState();
    const nextInsertNodeType = this.getInsertNodeTypeByButtonId(id);
    if (!this.setNextInsertElementByButtonId(id)) {
      return;
    }
    if (event && event.dataTransfer !== undefined) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text", id);
    }
    const button = document.getElementById(id);
    if (button && button.classList.contains("boldText")) {
      const shouldEmitEvent = this.insertModeEventActive;
      this.resetButtons();
      this.reset();
      if (shouldEmitEvent) {
        this.emitInsertModeChanged("cancelled");
      }
    } else {
      // prepare insert by updating the model data
      this.resetButtons();
      this.insertMode = true;
      this.insertModeEventActive = true;
      this.activeInsertNodeType = nextInsertNodeType;
      if (button) {
        button.classList.add("boldText");
      }

      const reason =
        previousState.active &&
        previousState.mode === "insert" &&
        previousState.nodeType &&
        previousState.nodeType !== this.activeInsertNodeType
          ? "replaced"
          : "started";
      this.emitInsertModeChanged(reason);
    }
    // rerender the struktogramm
    this.renderAllViews();
  }

  /**
   * Helper function to correctly abort while using drag and drop
   */
  resetDrop() {
    // while drag and dropping an inserting element, the user can drop everywhere
    // if the location is not valid, one step more must be done to abort everything
    if (this.insertMode) {
      const shouldEmitEvent = this.insertModeEventActive;
      this.reset();
      this.resetButtons();
      this.renderAllViews();
      if (shouldEmitEvent) {
        this.emitInsertModeChanged("cancelled");
      }
    } else {
      this.resetButtons();
    }
  }

  resetModel() {
    if (this.documents && this.documents.busy) return;
    this.updateUndo();
    this.model.reset();
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    const modal = document.getElementById("IEModal");
    if (modal) {
      modal.classList.remove("active");
    }
    if (this.documents) this.documents.loaded("new", this.getStructogramName());
    this.notifyTreeChanged("reset");
  }

  /**
   * Switch the state of the default case
   *
   * @param   uid   id of the clicked element in the struktogramm
   */
  switchDefaultState(uid) {
    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.switchDefaultCase,
        false,
        ""
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    this.notifyTreeChanged("switchDefaultState");
  }

  setCaseDefault(uid, enabled) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "CaseNode") {
      return { ok: false, error: "Case node not found" };
    }

    const desiredState = Boolean(enabled);
    if (Boolean(element.defaultOn) !== desiredState) {
      this.switchDefaultState(uid);
    }

    return {
      ok: true,
      defaultOn: Boolean(this.getElementByUid(uid).defaultOn),
    };
  }

  /**
   * Add another new case
   *
   * @param   uid   id of the clicked element in the struktogramm
   */
  addCase(uid) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "CaseNode") {
      return { ok: false, error: "Case node not found" };
    }

    const maxCases = 7;
    if (element.cases.length >= maxCases) {
      return {
        ok: false,
        error: "Maximum number of cases reached",
        maxCases,
        caseCount: element.cases.length,
        defaultOn: Boolean(element.defaultOn),
      };
    }

    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.insertNewCase,
        false,
        getContentDefault("caseLabel")
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    this.notifyTreeChanged("addCase");
    const updatedElement = this.getElementByUid(uid);
    return {
      ok: true,
      caseCount: updatedElement.cases.length,
      maxCases,
      defaultOn: Boolean(updatedElement.defaultOn),
      node: updatedElement,
    };
  }

  /**
   * Add another new catch
   *
   * @param   uid   id of the clicked element in the struktogramm
   */
  addCatch(uid) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "TryCatchNode") {
      return { ok: false, error: "Try-catch node not found" };
    }

    const maxCatches = 20;
    if (element.catches.length >= maxCatches) {
      return {
        ok: false,
        error: "Maximum number of catches reached",
        maxCatches,
        catchCount: element.catches.length,
      };
    }

    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.insertNewCatch,
        false,
        getContentDefault("catchUndefined")
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    this.notifyTreeChanged("addCatch");

    const updatedElement = this.getElementByUid(uid);
    return {
      ok: true,
      catchCount: updatedElement.catches.length,
      maxCatches,
      node: updatedElement,
    };
  }

  getNodeTypeForRemoval(element) {
    if (!element) {
      return null;
    }
    if (element.specialType && element.specialType === "CatchNode") {
      return "CatchNode";
    }
    return element.type;
  }

  checkEmptyCatches(catches) {
    for (const item of catches) {
      if (item.followElement.type !== "Placeholder") {
        return false;
      }
    }
    return true;
  }

  requiresRemoveConfirmation(element, type) {
    if (!element || !type) {
      return false;
    }

    switch (type) {
      case "TaskNode":
      case "BlockCallNode":
      case "InputNode":
      case "OutputNode":
        return false;
      case "HeadLoopNode":
      case "CountLoopNode":
      case "FootLoopNode":
      case "FunctionNode":
        return element.child.followElement.type !== "Placeholder";
      case "BranchNode":
        return (
          element.trueChild.followElement.type !== "Placeholder" ||
          element.falseChild.followElement.type !== "Placeholder"
        );
      case "TryCatchNode":
        return (
          element.tryChild.followElement.type !== "Placeholder" ||
          this.checkEmptyCatches(element.catches)
        );
      case "CaseNode": {
        let hasContent = false;
        for (const item of element.cases) {
          if (item.followElement.followElement.type !== "Placeholder") {
            hasContent = true;
          }
        }
        if (
          element.defaultNode.followElement.followElement.type !== "Placeholder"
        ) {
          hasContent = true;
        }
        return hasContent;
      }
      case "InsertCase":
      case "CatchNode":
        return element.followElement.type !== "Placeholder";
      default:
        return true;
    }
  }

  getRemovalInfo(uid) {
    const element = this.model.getElementInTree(uid, this.model.getTree());
    if (!element) {
      return {
        ok: false,
        error: "Node not found",
      };
    }

    const nodeType = this.getNodeTypeForRemoval(element);
    const requiresConfirmation = this.requiresRemoveConfirmation(
      element,
      nodeType
    );
    return {
      ok: true,
      uid,
      nodeType,
      requiresConfirmation,
    };
  }

  canRemove(uid) {
    return this.getRemovalInfo(uid);
  }

  removeNode(uid, force = false) {
    const removalInfo = this.getRemovalInfo(uid);
    if (!removalInfo.ok) {
      return removalInfo;
    }

    if (removalInfo.requiresConfirmation && !force) {
      return {
        ok: false,
        requiresConfirmation: true,
        nodeType: removalInfo.nodeType,
        error: "Confirmation required",
      };
    }

    this.removeNodeFromTree(uid, false);
    return {
      ok: true,
      nodeType: removalInfo.nodeType,
    };
  }

  /**
   * Remove the element from the tree
   *
   * @param   uid   id of the clicked element in the struktogramm
   */
  removeElement(uid) {
    const removalInfo = this.getRemovalInfo(uid);
    if (!removalInfo.ok) {
      return;
    }

    if (removalInfo.requiresConfirmation) {
      this.prepareRemoveQuestion(uid);
      return;
    }

    this.removeNodeFromTree(uid);
  }

  prepareRemoveQuestion(uid) {
    const content = document.getElementById("modal-content");
    const footer = document.getElementById("modal-footer");
    while (content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    while (footer.hasChildNodes()) {
      footer.removeChild(footer.lastChild);
    }
    content.appendChild(document.createTextNode(t("editor.deleteQuestion")));
    const doButton = document.createElement("div");
    doButton.classList.add("modal-buttons", "acceptIcon", "hand");
    doButton.addEventListener("click", () =>
      this.removeNodeFromTree(uid, true)
    );
    footer.appendChild(doButton);
    const cancelButton = document.createElement("div");
    cancelButton.classList.add("modal-buttons", "deleteIcon", "hand");
    cancelButton.addEventListener("click", () =>
      document.getElementById("IEModal").classList.remove("active")
    );
    footer.appendChild(cancelButton);

    document.getElementById("IEModal").classList.add("active");
  }

  removeNodeFromTree(uid, closeModal = false) {
    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.removeNode,
        false,
        ""
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    if (closeModal) {
      const modal = document.getElementById("IEModal");
      if (modal) {
        modal.classList.remove("active");
      }
    }
    this.notifyTreeChanged("removeElement");
  }

  /**
   * removes a parameter from the function parameters
   *
   * @param delPos   pos of the param in the dom list
   */
  removeParamFromParameters(delPos) {
    let editedTree = this.model.getTree();
    // search for the function box tree
    const followingElements = [];
    while (editedTree.type !== "FunctionNode") {
      followingElements.push(editedTree);
      editedTree = editedTree.followElement;
    }

    // find the respective parameter to remove it from the model
    const params = editedTree.parameters;
    for (const param of params) {
      const actPos = parseInt(param.pos);
      if (actPos === delPos) {
        let listIndex = actPos / 3; // convert the element position in the dom into the position in the array
        params.splice(listIndex, 1);

        // update all pos-values of the following param elements
        while (listIndex < params.length) {
          params[listIndex].pos -= 3;
          listIndex += 1;
        }
        editedTree.parameters = params;

        // set up the whole tree
        let index = followingElements.length - 1;
        while (index > -1) {
          const subTree = followingElements[index];
          subTree.followElement = editedTree;
          editedTree = subTree;
          index -= 1;
        }
        this.model.setTree(editedTree);
        this.updateBrowserStore();
        this.renderAllViews();
        return;
      }
    }
  }

  /**
   * Prepare moving of an element of the struktogramm
   *
   * @param   uid   id of the clicked element in the struktogramm
   */
  moveElement(uid) {
    // prepare data
    this.moveId = uid;
    this.insertMode = true;
    this.insertModeEventActive = true;
    this.activeInsertNodeType = null;
    this.nextInsertElement = this.model.getElementInTree(
      uid,
      this.model.getTree()
    );
    this.nextInsertElement.followElement.followElement = null;
    // rerender
    this.renderAllViews();
    this.emitInsertModeChanged("started");
  }

  // textType: only used for the distinction of function name and function parameters
  editElement(uid, textValue, textType = "") {
    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.editElement,
        false,
        textType + textValue
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    this.notifyTreeChanged("editElement");
  }

  setBranchCondition(uid, condition) {
    const branchNode = this.getElementByUid(uid);
    if (!branchNode || branchNode.type !== "BranchNode") {
      return { ok: false, error: "Branch node not found" };
    }

    this.editElement(uid, String(condition));
    return { ok: true, node: this.getElementByUid(uid) };
  }

  getCaseSettings(uid) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "CaseNode") {
      return { ok: false, error: "Case node not found" };
    }

    return {
      ok: true,
      uid,
      caseCount: element.cases.length,
      maxCases: 7,
      defaultOn: Boolean(element.defaultOn),
      text: element.text,
      cases: element.cases.map((caseNode, index) => ({
        uid: caseNode.id,
        text: caseNode.text,
        index,
      })),
      defaultCase:
        element.defaultNode && element.defaultNode.id
          ? {
              uid: element.defaultNode.id,
              text: element.defaultNode.text,
            }
          : null,
    };
  }

  setCaseLabel(uid, text) {
    const caseNode = this.getElementByUid(uid);
    if (!caseNode || caseNode.type !== "InsertCase") {
      return { ok: false, error: "Case branch not found" };
    }

    this.editElement(uid, String(text));
    return { ok: true, node: this.getElementByUid(uid) };
  }

  removeCase(uid, force = false) {
    const caseNode = this.getElementByUid(uid);
    if (!caseNode || caseNode.type !== "InsertCase") {
      return { ok: false, error: "Case branch not found" };
    }

    const parentInfo = this.findParentNodeInfo(uid);
    if (!parentInfo || parentInfo.parentType !== "CaseNode") {
      return { ok: false, error: "Parent case node not found" };
    }

    const parentNode = this.getElementByUid(parentInfo.parentUid);
    const minCases = 2;
    if (parentNode.cases.length <= minCases) {
      return {
        ok: false,
        error: "Minimum number of cases reached",
        minCases,
        caseCount: parentNode.cases.length,
      };
    }

    const removalResult = this.removeNode(uid, force);
    if (!removalResult.ok) {
      return removalResult;
    }

    const updatedParentNode = this.getElementByUid(parentInfo.parentUid);
    return {
      ok: true,
      removedUid: uid,
      parentUid: parentInfo.parentUid,
      caseCount: updatedParentNode ? updatedParentNode.cases.length : 0,
      minCases,
      node: updatedParentNode,
    };
  }

  getTryCatchSettings(uid) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "TryCatchNode") {
      return { ok: false, error: "Try-catch node not found" };
    }

    return {
      ok: true,
      uid,
      catchCount: element.catches.length,
      maxCatches: 20,
      catches: element.catches.map((catchNode, index) => ({
        uid: catchNode.id,
        text: catchNode.text,
        index,
      })),
    };
  }

  getFunctionSettings(uid) {
    const element = this.getElementByUid(uid);
    if (!element || element.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    const parameters = this.normalizeFunctionParameters(element.parameters);

    return {
      ok: true,
      uid,
      text: element.text,
      returnType: element.returnType || "",
      parameterCount: parameters.length,
      parameters: parameters.map((parameter, index) => ({
        index,
        name: parameter.parName,
      })),
    };
  }

  setCatchLabel(uid, text) {
    const catchNode = this.getElementByUid(uid);
    if (!catchNode || catchNode.specialType !== "CatchNode") {
      return { ok: false, error: "Catch node not found" };
    }

    this.editElement(uid, String(text));
    return { ok: true, node: this.getElementByUid(uid) };
  }

  removeCatch(uid, force = false) {
    const catchNode = this.getElementByUid(uid);
    if (!catchNode || catchNode.specialType !== "CatchNode") {
      return { ok: false, error: "Catch node not found" };
    }

    const parentInfo = this.findParentNodeInfo(uid);
    if (!parentInfo || parentInfo.parentType !== "TryCatchNode") {
      return { ok: false, error: "Parent try-catch node not found" };
    }

    const removalResult = this.removeNode(uid, force);
    if (!removalResult.ok) {
      return removalResult;
    }

    const updatedParentNode = this.getElementByUid(parentInfo.parentUid);
    return {
      ok: true,
      removedUid: uid,
      parentUid: parentInfo.parentUid,
      catchCount: updatedParentNode ? updatedParentNode.catches.length : 0,
      node: updatedParentNode,
    };
  }

  mutateFunctionNode(uid, mutator) {
    const functionNode = this.getElementByUid(uid);
    if (!functionNode || functionNode.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    this.updateUndo();
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        (subTree) => {
          if (subTree.type === "FunctionNode") {
            mutator(subTree);
          }
          return subTree;
        },
        false,
        ""
      )
    );
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    this.notifyTreeChanged("editElement");
    return { ok: true, node: this.getElementByUid(uid) };
  }

  normalizeFunctionParameters(parameters) {
    const normalized = [];
    if (Array.isArray(parameters)) {
      for (const item of parameters) {
        normalized.push({
          pos: 0,
          parName: item && typeof item.parName === "string" ? item.parName : "",
        });
      }
    }
    for (let index = 0; index < normalized.length; index += 1) {
      normalized[index].pos = index * 3;
    }
    return normalized;
  }

  setFunctionName(uid, name) {
    const functionNode = this.getElementByUid(uid);
    if (!functionNode || functionNode.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    this.editElement(uid, String(name), "funcname|");
    return { ok: true, node: this.getElementByUid(uid) };
  }

  setFunctionReturnType(uid, returnType) {
    const functionNode = this.getElementByUid(uid);
    if (!functionNode || functionNode.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    this.editElement(uid, String(returnType), "returntype|");
    return { ok: true, node: this.getElementByUid(uid) };
  }

  addFunctionParameter(uid, name = "") {
    return this.mutateFunctionNode(uid, (functionNode) => {
      const params = this.normalizeFunctionParameters(functionNode.parameters);
      params.push({ pos: 0, parName: String(name) });
      functionNode.parameters = this.normalizeFunctionParameters(params);
    });
  }

  setFunctionParameter(uid, index, name) {
    const indexNumber = Number(index);
    if (!Number.isInteger(indexNumber) || indexNumber < 0) {
      return { ok: false, error: "Invalid parameter index" };
    }

    const functionNode = this.getElementByUid(uid);
    if (!functionNode || functionNode.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    const params = this.normalizeFunctionParameters(functionNode.parameters);
    if (indexNumber >= params.length) {
      return { ok: false, error: "Parameter index out of bounds" };
    }

    return this.mutateFunctionNode(uid, (node) => {
      const normalizedParams = this.normalizeFunctionParameters(
        node.parameters
      );
      normalizedParams[indexNumber].parName = String(name);
      node.parameters = normalizedParams;
    });
  }

  removeFunctionParameter(uid, index) {
    const indexNumber = Number(index);
    if (!Number.isInteger(indexNumber) || indexNumber < 0) {
      return { ok: false, error: "Invalid parameter index" };
    }

    const functionNode = this.getElementByUid(uid);
    if (!functionNode || functionNode.type !== "FunctionNode") {
      return { ok: false, error: "Function node not found" };
    }

    const params = this.normalizeFunctionParameters(functionNode.parameters);
    if (indexNumber >= params.length) {
      return { ok: false, error: "Parameter index out of bounds" };
    }

    return this.mutateFunctionNode(uid, (node) => {
      const normalizedParams = this.normalizeFunctionParameters(
        node.parameters
      );
      normalizedParams.splice(indexNumber, 1);
      node.parameters = this.normalizeFunctionParameters(normalizedParams);
    });
  }

  /**
   * Append an element in the tree
   *
   * @param   uid   id of the clicked InsertNode in the struktogramm
   */
  appendElement(uid) {
    const insertValidation = this.canInsertAt(uid);
    if (!insertValidation.ok) {
      return insertValidation;
    }

    this.updateUndo();
    // remove old node, when moving is used
    const insertStateBeforeAppend = this.getInsertState();
    const shouldEmitInsertEvent = this.insertModeEventActive;
    const moveState = this.moveId;
    if (moveState) {
      this.model.setTree(
        this.model.findAndAlterElement(
          this.moveId,
          this.model.getTree(),
          this.model.removeNode,
          false,
          ""
        )
      );
    }
    // insert the new node, on moving, its the removed
    const elemId = this.nextInsertElement.id;
    console.log(this.nextInsertElement);
    this.model.setTree(
      this.model.findAndAlterElement(
        uid,
        this.model.getTree(),
        this.model.insertElement,
        false,
        ""
      )
    );
    // reset the buttons if moving occurred
    if (moveState) {
      // TODO
      this.resetButtons();
    }
    // rerender
    this.reset();
    this.checkUndo();
    this.updateBrowserStore();
    this.renderAllViews();
    // on new inserted elements start the editing mode of the element
    // start no editing mode for try catch blocks
    if (
      !this.embedMode &&
      !moveState &&
      this.getElementByUid(elemId).type !== "TryCatchNode"
    ) {
      this.switchEditState(elemId);
    }
    this.notifyTreeChanged(moveState ? "moveElement" : "insertElement");
    if (insertStateBeforeAppend.active && shouldEmitInsertEvent) {
      const payload = {
        ...this.getInsertState(),
        reason: "completed",
      };
      if (
        insertStateBeforeAppend.mode === "insert" &&
        insertStateBeforeAppend.nodeType
      ) {
        payload.nodeType = insertStateBeforeAppend.nodeType;
      }
      this.emitExternalEvent("insertModeChanged", payload);
    }

    return { ok: true, insertedUid: elemId };
  }

  /**
   * Switch an element in the struktogramm to the editing state
   *
   * @param   uid         id of the desired element in the struktogramm
   * @param   paramIndex  index (position) of the function parameter
   */
  switchEditState(uid, paramIndex = null) {
    if (this.embedMode) {
      const result = this.selectNode(uid, true);
      const node = result.ok ? result.node : null;
      this.emitExternalEvent("nodeSelected", {
        uid,
        nodeType: node ? node.type : null,
        text: node && typeof node.text === "string" ? node.text : "",
        paramIndex,
      });
      return;
    }

    let elem = document.getElementById(uid);
    console.log(elem);

    // element is a function node
    if (
      elem.children[0].children.length &&
      elem.children[0].children[0].classList.contains("func-box-header")
    ) {
      let funcTextNode = null;
      // click function name
      if (paramIndex === null) {
        funcTextNode = elem.children[0].children[0].children[1].children[0];
        // trigger click event to show input field
      } else {
        funcTextNode =
          elem.children[0].children[0].children[2].children[paramIndex]
            .children[0];
      }
      if (funcTextNode) {
        funcTextNode.click();
      }
    } else {
      // get the input field and display it
      // work around for FootLoopNodes, duo to HTML structure, the last element has to be found and edited
      if (elem.getElementsByClassName("input-group editField " + uid).length) {
        if (elem.childNodes[0].classList.contains("tryCatchNode")) {
          elem = elem.getElementsByClassName("input-group editField " + uid)[1];
        } else {
          elem = elem.getElementsByClassName("input-group editField " + uid)[0];
        }
      } else {
        // in try catch block the input field of the catch block has not to be the first input field (if the try block has child nodes)
        if (elem.children[0].classList.contains("tryCatchNode")) {
          elem =
            elem.getElementsByClassName("tryCatchNode")[1].children[1]
              .children[1];
        } else {
          elem = elem.getElementsByClassName("input-group editField")[0];
        }
      }
      elem.previousSibling.style.display = "none";
      elem.style.display = "inline-flex";
      // automatic set focus on the input
      elem.getElementsByTagName("input")[0].select();
    }
  }

  getStringifiedTree() {
    return JSON.stringify(this.model.getTree());
  }

  collectInsertTargetsInNode(subTree, targets) {
    if (!subTree || typeof subTree !== "object") {
      return;
    }
    if (subTree.type === "InsertNode" && subTree.id) {
      targets.push(subTree.id);
    }

    if (subTree.followElement) {
      this.collectInsertTargetsInNode(subTree.followElement, targets);
    }
    if (subTree.child) {
      this.collectInsertTargetsInNode(subTree.child, targets);
    }
    if (subTree.trueChild) {
      this.collectInsertTargetsInNode(subTree.trueChild, targets);
    }
    if (subTree.falseChild) {
      this.collectInsertTargetsInNode(subTree.falseChild, targets);
    }
    if (subTree.tryChild) {
      this.collectInsertTargetsInNode(subTree.tryChild, targets);
    }
    if (Array.isArray(subTree.cases)) {
      for (const caseNode of subTree.cases) {
        this.collectInsertTargetsInNode(caseNode, targets);
      }
    }
    if (Array.isArray(subTree.catches)) {
      for (const catchNode of subTree.catches) {
        this.collectInsertTargetsInNode(catchNode, targets);
      }
    }
    if (subTree.defaultNode) {
      this.collectInsertTargetsInNode(subTree.defaultNode, targets);
    }
  }

  getInsertTargets() {
    const targets = [];
    this.collectInsertTargetsInNode(this.model.getTree(), targets);
    return targets;
  }

  nodeContainsUid(subTree, uid) {
    if (!subTree || typeof subTree !== "object") {
      return false;
    }

    if (subTree.id === uid) {
      return true;
    }

    if (this.nodeContainsUid(subTree.followElement, uid)) {
      return true;
    }
    if (this.nodeContainsUid(subTree.child, uid)) {
      return true;
    }
    if (this.nodeContainsUid(subTree.trueChild, uid)) {
      return true;
    }
    if (this.nodeContainsUid(subTree.falseChild, uid)) {
      return true;
    }
    if (this.nodeContainsUid(subTree.tryChild, uid)) {
      return true;
    }
    if (Array.isArray(subTree.cases)) {
      for (const caseNode of subTree.cases) {
        if (this.nodeContainsUid(caseNode, uid)) {
          return true;
        }
      }
    }
    if (Array.isArray(subTree.catches)) {
      for (const catchNode of subTree.catches) {
        if (this.nodeContainsUid(catchNode, uid)) {
          return true;
        }
      }
    }
    if (this.nodeContainsUid(subTree.defaultNode, uid)) {
      return true;
    }

    return false;
  }

  moveNode(uid, targetInsertUid) {
    const sourceNode = this.getElementByUid(uid);
    const moveError = this.getMoveSourceError(uid);
    if (moveError) {
      return { ok: false, error: moveError.error };
    }

    const targetNode = this.getElementByUid(targetInsertUid);
    if (!targetNode || targetNode.type !== "InsertNode") {
      return { ok: false, error: "Invalid insert target" };
    }

    const targetValidation = this.canInsertAt(targetInsertUid, sourceNode.type);
    if (!targetValidation.ok) {
      return targetValidation;
    }

    if (this.nodeContainsUid(sourceNode, targetInsertUid)) {
      return { ok: false, error: "Target cannot be inside moved subtree" };
    }
    this.moveId = uid;
    this.insertMode = true;
    this.insertModeEventActive = false;
    this.activeInsertNodeType = null;
    this.nextInsertElement = sourceNode;
    this.nextInsertElement.followElement.followElement = null;

    const appendResult = this.appendElement(targetInsertUid);
    if (!appendResult || !appendResult.ok) {
      return appendResult || { ok: false, error: "Move failed" };
    }
    return { ok: true, movedUid: uid };
  }

  insertNodeAt(targetInsertUid, nodeType) {
    const buttonId = this.getInsertButtonIdByNodeType(nodeType);
    if (!buttonId) {
      return { ok: false, error: "Unknown node type" };
    }

    const targetValidation = this.canInsertAt(targetInsertUid, nodeType);
    if (!targetValidation.ok) {
      return targetValidation;
    }

    const prepared = this.setNextInsertElementByButtonId(buttonId);
    if (!prepared || !this.nextInsertElement || !this.nextInsertElement.id) {
      return { ok: false, error: "Insert preparation failed" };
    }

    const newUid = this.nextInsertElement.id;
    this.insertMode = true;
    this.insertModeEventActive = false;
    this.activeInsertNodeType = this.getInsertNodeTypeByButtonId(buttonId);
    const appendResult = this.appendElement(targetInsertUid);
    if (!appendResult || !appendResult.ok) {
      return appendResult || { ok: false, error: "Insert failed" };
    }
    return { ok: true, newUid };
  }

  removeElementDirect(uid) {
    const element = this.getElementByUid(uid);
    if (!element) {
      return false;
    }
    this.removeNodeFromTree(uid, false);
    return true;
  }

  getExportPayload() {
    const structoName = this.getStructogramName();
    return {
      formatVersion: 2,
      meta: {
        exportedAt: new Date().toISOString(),
        structoName,
        headline: this.getDiagramHeadline(),
      },
      settings: this.getCurrentSettingsSnapshot(),
      tree: this.model.getTree(),
    };
  }

  captureDocument() {
    return {
      payload: JSON.parse(JSON.stringify(this.getExportPayload())),
      undo: this.undoList.slice(),
      redo: this.redoList.slice(),
      selectedUid: this.selectedUid,
    };
  }

  restoreDocument(snapshot) {
    const payload = JSON.parse(JSON.stringify(snapshot.payload));
    this.resetButtons();
    this.reset();
    this.model.setTree(payload.tree);
    this.undoList = snapshot.undo.slice();
    this.redoList = snapshot.redo.slice();
    this.selectedUid = snapshot.selectedUid;
    this.setStructogramName(payload.meta.structoName);
    this.setDiagramHeadline(payload.meta.headline);

    // Interface language belongs to the workspace, not to an individual tab.
    this.applySettings({ ...payload.settings, uiLanguage: this.uiLanguage });
    this.notifyTreeChanged("tab-switch");
  }

  refreshUndoControls() {
    for (const node of document.getElementsByClassName("UndoIconButtonOverlay")) {
      node.classList.toggle("disableIcon", this.undoList.length === 0);
    }
    for (const node of document.getElementsByClassName("RedoIconButtonOverlay")) {
      node.classList.toggle("disableIcon", this.redoList.length === 0);
    }
  }

  getCurrentSettingsSnapshot() {
    const elements = {};
    const colors = {};
    for (const key of this.getSettingsElementKeys()) {
      elements[key] = config.get()[key].use;
      colors[key] = this.normalizeColorValue(config.get()[key].color) || config.get()[key].color;
    }

    return {
      profile: this.getActiveConfigProfile(),
      elements,
      colors,
      uiLanguage: this.getUiLanguage(),
      language: this.getCodeLanguage(),
      displaySourcecode: this.getSourcecodeDisplay(),
      shortcutsEnabled: this.getShortcutsEnabled(),
      restrictFunctionInsertToTop: this.getRestrictFunctionInsertToTop(),
    };
  }

  normalizeImportedData(data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    if ("tree" in data && data.tree && typeof data.tree === "object") {
      return {
        tree: data.tree,
        settings:
          "settings" in data && typeof data.settings === "object"
            ? data.settings
            : null,
        meta:
          "meta" in data && typeof data.meta === "object" ? data.meta : null,
      };
    }

    if ("type" in data) {
      return {
        tree: data,
        settings: null,
        meta: null,
      };
    }

    return null;
  }

  applyImportedData(data, fallbackName = null) {
    if (this.documents && this.documents.busy && !this.documents.applying)
      return false;
    if (!validDiagram(data)) return false;
    if (this.documents && !this.documents.applying) {
      return this.documents.importDiagram(data, fallbackName);
    }
    const importedData = this.normalizeImportedData(data);
    if (!importedData) {
      return false;
    }

    const structoNameFromMeta =
      importedData.meta && typeof importedData.meta.structoName === "string"
        ? importedData.meta.structoName
        : null;
    const structoName = structoNameFromMeta || fallbackName;
    if (structoName) {
      this.setStructogramName(structoName);
    }
    // Older files have no headline; do not inherit one from the active tab.
    this.setDiagramHeadline(importedData.meta && importedData.meta.headline);

    if (this.documents && this.documents.applying) {
      this.resetButtons();
      this.reset();
      this.selectedUid = null;
      this.undoList = [];
      this.redoList = [];
    } else {
      this.updateUndo();
    }
    this.model.setTree(importedData.tree);

    if (importedData.settings) {
      this.applySettings(importedData.settings, {
        persist: true,
        rerender: false,
      });
    }

    this.migrateLocalizedDefaultContent();

    this.checkUndo();
    this.renderAllViews();
    this.updateBrowserStore();
    if (this.documents && !this.documents.applying)
      this.documents.loaded("local", fallbackName || this.getStructogramName());
    this.notifyTreeChanged("import");
    return true;
  }

  saveDialog() {
    if (this.documents) return this.documents.save();
    this.downloadLocal();
  }

  downloadLocal() {
    const exportPayload = this.getExportPayload();
    const structoName = exportPayload.meta.structoName;

    // define the data url to start a download on click
    const dataUri =
      "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportPayload));
    // create filename with current date in the name
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    const timeString = hours + "-" + minutes;
    const exportFileDefaultName =
      structoName +
      "-" +
      new Date(Date.now()).toJSON().substring(0, 10) +
      "-" +
      timeString +
      ".json";
    // generate the download button element and append it to the node
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Read a JSON file into a separate document tab.
   */
  async readFile(event) {
    if (this.documents && this.documents.busy) return;
    // Snapshot FileList before the toolbar clears its input value.
    const files = Array.from(event.target.files);
    for (const file of files) {
      let parsedData;
      try {
        parsedData = JSON.parse(await file.text());
      } catch (error) {
        window.alert(t("importExport.invalidJson"));
        continue;
      }

      if (this.documents && this.documents.busy) {
        window.alert(t("drive.working"));
        return;
      }
      const isImported = this.applyImportedData(parsedData, file.name);
      if (!isImported) {
        window.alert(t("importExport.unknownImportFormat"));
      }
    }
  }

  /**
   * Read input from a JSON file and replace the current model
   */
  readUrl(file) {
    this.applyImportedData(file);
  }

  updateUndo() {
    this.undoList.push(this.getStringifiedTree());
    for (const item of document.getElementsByClassName(
      "UndoIconButtonOverlay"
    )) {
      item.classList.remove("disableIcon");
    }
    this.redoList = [];
    for (const item of document.getElementsByClassName(
      "RedoIconButtonOverlay"
    )) {
      item.classList.add("disableIcon");
    }
  }

  undo() {
    if (this.undoList.length) {
      this.redoList.unshift(this.getStringifiedTree());
      this.model.setTree(JSON.parse(this.undoList[this.undoList.length - 1]));
      this.undoList.pop();
      if (this.undoList === 0) {
        for (const item of document.getElementsByClassName(
          "UndoIconButtonOverlay"
        )) {
          item.classList.add("disableIcon");
        }
      }
      for (const item of document.getElementsByClassName(
        "RedoIconButtonOverlay"
      )) {
        item.classList.remove("disableIcon");
      }
      this.renderAllViews();
      this.updateBrowserStore();
      this.notifyTreeChanged("undo");
    }
  }

  checkUndo() {
    if (this.undoList[this.undoList.length - 1] === this.getStringifiedTree()) {
      this.undoList.pop();
      if (this.undoList === 0) {
        for (const item of document.getElementsByClassName(
          "UndoIconButtonOverlay"
        )) {
          item.classList.add("disableIcon");
        }
      }
    }
  }

  redo() {
    if (this.redoList.length) {
      this.undoList.push(this.getStringifiedTree());
      this.model.setTree(JSON.parse(this.redoList[0]));
      this.redoList.shift();
      if (this.redoList.length === 0) {
        for (const item of document.getElementsByClassName(
          "RedoIconButtonOverlay"
        )) {
          item.classList.add("disableIcon");
        }
      }
      for (const item of document.getElementsByClassName(
        "UndoIconButtonOverlay"
      )) {
        item.classList.remove("disableIcon");
      }
      this.renderAllViews();
      this.updateBrowserStore();
      this.notifyTreeChanged("redo");
    }
  }
}
