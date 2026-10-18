/* global __SITE_CONFIG__ */
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

import { t } from "../i18n";

/**
 * Generate a random id string
 *
 * @ return   string   random generated
 */
export function guidGenerator() {
  const gen = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (
    gen() +
    gen() +
    "-" +
    gen() +
    "-" +
    gen() +
    "-" +
    gen() +
    "-" +
    gen() +
    gen()
  );
}

/**
 * Generate HTML tree
 *
 */
export function generateHtmltree(options = {}) {
  const mode = options.mode === "embed" ? "embed" : "full";
  if (mode === "embed") {
    const main = document.createElement("main");
    document.body.appendChild(main);

    const editor = document.createElement("div");
    editor.classList.add("container");
    editor.setAttribute("id", "editorDisplay");
    main.appendChild(editor);

    const modal = document.createElement("div");
    modal.classList.add("modal");
    modal.setAttribute("id", "IEModal");
    main.appendChild(modal);

    const modalOverlay = document.createElement("div");
    modalOverlay.classList.add("modal-overlay");
    modalOverlay.setAttribute("aria-label", "Close");
    modalOverlay.addEventListener("click", () => {
      document.getElementById("IEModal").classList.remove("active");
    });
    modal.appendChild(modalOverlay);

    const modalContainer = document.createElement("div");
    modalContainer.classList.add("modal-container");
    modal.appendChild(modalContainer);

    const modalHeader = document.createElement("div");
    modalHeader.classList.add("modal-header");
    modalContainer.appendChild(modalHeader);

    const modalHeaderClose = document.createElement("div");
    modalHeaderClose.classList.add("close", "hand", "cancelIcon");
    modalHeaderClose.addEventListener("click", () => {
      document.getElementById("IEModal").classList.remove("active");
    });
    modalHeader.appendChild(modalHeaderClose);

    const modalBody = document.createElement("div");
    modalBody.classList.add("modal-body");
    modalContainer.appendChild(modalBody);

    const modalBodyContent = document.createElement("div");
    modalBodyContent.classList.add("content");
    modalBodyContent.setAttribute("id", "modal-content");
    modalBody.appendChild(modalBodyContent);

    const modalFooter = document.createElement("div");
    modalFooter.classList.add("modal-footer", "container");
    modalFooter.setAttribute("id", "modal-footer");
    modalContainer.appendChild(modalFooter);
    return;
  }

  // Header
  const header = document.createElement("header");
  header.classList.add("container");
  document.body.appendChild(header);

  const section1 = document.createElement("section");
  section1.classList.add("nav-col");
  header.appendChild(section1);

  const logoDiv = document.createElement("div");
  logoDiv.classList.add("nav-logo-container");
  section1.appendChild(logoDiv);

  const logoAnker = document.createElement("a");
  logoAnker.classList.add("column", "container");
  let url = "index.html";
  const browserUrl = new URL(window.location.href);
  if (browserUrl.searchParams.get("config")) {
    url = url + "?config=" + browserUrl.searchParams.get("config");
  }
  logoAnker.setAttribute("href", url);
  logoDiv.appendChild(logoAnker);

  const logo = document.createElement("div");
  logo.classList.add("logo", "logo-container");
  logoAnker.appendChild(logo);

  const logoText = document.createElement("strong");
  logoText.classList.add("nav-col");
  logoText.appendChild(document.createTextNode("Struktog."));
  logoAnker.appendChild(logoText);

  const introduction = document.createElement("p");
  introduction.className = "app-introduction";
  introduction.textContent = t("privacy.appDescription");
  introduction.dataset.i18n = "privacy.appDescription";
  section1.appendChild(introduction);

  const section2 = document.createElement("section");
  section2.classList.add("nav-col-opt");
  header.appendChild(section2);

  const divOptions = document.createElement("div");
  divOptions.classList.add("options-container");
  divOptions.setAttribute("id", "optionButtons");
  const divOptionsGroup = document.createElement("div");
  divOptionsGroup.classList.add("optionButtonsGroup");
  divOptionsGroup.setAttribute("id", "optionButtonsGroup");
  divOptions.appendChild(divOptionsGroup);
  section2.appendChild(divOptions);

  const structoNameContainer = document.createElement("div");
  structoNameContainer.classList.add("structoNameContainer");

  const dividerText = document.createElement("div");
  dividerText.classList.add("divider-text");
  dividerText.innerHTML = t("nav.unnamed");
  dividerText.classList.add("tooltip", "tooltip-top", "hand");
  dividerText.setAttribute("data-tooltip", t("nav.renameTooltip"));
  dividerText.dataset.i18nTooltip = "nav.renameTooltip";
  dividerText.setAttribute("id", "structoName");
  structoNameContainer.appendChild(dividerText);
  // main
  const main = document.createElement("main");
  main.classList.add("document-main");
  document.body.appendChild(main);

  const workspace = document.createElement("section");
  workspace.className = "document-workspace";
  main.appendChild(workspace);

  const tabHeader = document.createElement("div");
  tabHeader.className = "document-tab-header";
  workspace.appendChild(tabHeader);

  const tabsHost = document.createElement("div");
  tabsHost.id = "document-tabs-host";
  tabHeader.appendChild(tabsHost);

  const fileHeader = document.createElement("div");
  fileHeader.className = "document-file-header";
  fileHeader.appendChild(structoNameContainer);
  const fileStatus = document.createElement("div");
  fileStatus.id = "document-file-status";
  fileHeader.appendChild(fileStatus);
  tabHeader.appendChild(fileHeader);

  const editor = document.createElement("div");
  editor.classList.add("container");
  editor.setAttribute("id", "editorDisplay");
  editor.setAttribute("role", "tabpanel");
  workspace.appendChild(editor);

  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.setAttribute("id", "IEModal");
  main.appendChild(modal);

  const modalOverlay = document.createElement("div");
  modalOverlay.classList.add("modal-overlay");
  modalOverlay.setAttribute("aria-label", "Close");
  modalOverlay.addEventListener("click", () => {
    document.getElementById("IEModal").classList.remove("active");
  });
  modal.appendChild(modalOverlay);

  const modalContainer = document.createElement("div");
  modalContainer.classList.add("modal-container");
  modal.appendChild(modalContainer);

  const modalHeader = document.createElement("div");
  modalHeader.classList.add("modal-header");
  modalContainer.appendChild(modalHeader);

  const modalHeaderClose = document.createElement("div");
  modalHeaderClose.classList.add("close", "hand", "cancelIcon");
  modalHeaderClose.addEventListener("click", () => {
    document.getElementById("IEModal").classList.remove("active");
  });
  modalHeader.appendChild(modalHeaderClose);

  const modalBody = document.createElement("div");
  modalBody.classList.add("modal-body");
  modalContainer.appendChild(modalBody);

  const modalBodyContent = document.createElement("div");
  modalBodyContent.classList.add("content");
  modalBodyContent.setAttribute("id", "modal-content");
  modalBody.appendChild(modalBodyContent);

  const modalFooter = document.createElement("div");
  modalFooter.classList.add("modal-footer", "container");
  modalFooter.setAttribute("id", "modal-footer");
  modalContainer.appendChild(modalFooter);
}

/**
 * Generate HTML tree for footer
 **/
export function generateFooter() {
  // footer
  const footer = document.createElement("footer");
  footer.classList.add("container");
  document.body.appendChild(footer);

  const footerDiv = document.createElement("div");
  footerDiv.classList.add("column");
  footer.appendChild(footerDiv);

  const footerSpan = document.createElement("span");

  const url = new URL(window.location.href);
  // if url contains subfolder 'dev'
  if (url.pathname.split("/")[1] === "dev") {
    // create textnode
    const devText = document.createTextNode(t("footer.devNotice"));
    footerSpan.appendChild(devText);
    // create link
    const devLink = document.createElement("a");
    devLink.appendChild(document.createTextNode(t("footer.stableVersion")));
    devLink.setAttribute("href", "https://ddi.education/struktog/");
    footerSpan.appendChild(devLink);
    footerSpan.appendChild(document.createTextNode(" | "));
  }

  const sourceLink = document.createElement("a");
  sourceLink.classList.add("hand", "tooltip", "tooltip-top");
  sourceLink.appendChild(document.createTextNode(t("footer.sourceCode")));
  sourceLink.dataset.i18n = "footer.sourceCode";
  sourceLink.href = __SITE_CONFIG__.sourceUrl || "./terms.html#source";
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.classList.add("privacy-footer-link");
  sourceLink.setAttribute("data-tooltip", t("footer.sourceCode"));
  sourceLink.dataset.i18nTooltip = "footer.sourceCode";

  const maintainer = document.createElement("div");
  maintainer.appendChild(document.createTextNode(t("footer.maintainer")));
  maintainer.dataset.i18n = "footer.maintainer";

  const contributorLink = document.createElement("div");
  contributorLink.classList.add("hand", "tooltip", "tooltip-top");
  contributorLink.dataset.i18n = "footer.contributors";
  contributorLink.dataset.i18nTooltip = "footer.contributorsTooltip";
  contributorLink.appendChild(
    document.createTextNode(t("footer.contributors"))
  );
  contributorLink.setAttribute(
    "href",
    "https://gitlab.com/dev-ddi/cs-school-tools/struktog/-/blob/master/CONTRIBUTORS.md"
  );
  contributorLink.setAttribute("data-tooltip", t("footer.contributorsTooltip"));
  contributorLink.addEventListener("click", () => {
    window.open(
      "https://gitlab.com/dev-ddi/cs-school-tools/struktog/-/blob/master/CONTRIBUTORS.md",
      "_blank"
    );
  });

  const hash = document.createElement("div");
  hash.setAttribute("id", "whats-new-link");
  hash.dataset.i18nTooltip = "footer.whatsNewTooltip";
  hash.classList.add("hand", "tooltip", "tooltip-top");
  hash.appendChild(document.createTextNode(__COMMIT_HASH__));
  hash.setAttribute(
    "href",
    "https://gitlab.com/dev-ddi/cs-school-tools/struktog/-/blob/master/VERSIONS.md"
  );
  hash.setAttribute("data-tooltip", t("footer.whatsNewTooltip"));
  hash.addEventListener("click", () => {
    window.open(
      "https://gitlab.com/dev-ddi/cs-school-tools/struktog/-/blob/master/VERSIONS.md",
      "_blank"
    );
  });

  const impressumLink = document.createElement("a");
  impressumLink.classList.add("privacy-footer-link");
  impressumLink.textContent = t("footer.imprint");
  impressumLink.dataset.i18n = "footer.imprint";
  impressumLink.href = "./imprint.html";
  impressumLink.target = "_blank";
  impressumLink.rel = "noopener noreferrer";

  footerDiv.appendChild(footerSpan);
  footerSpan.appendChild(sourceLink);
  footerSpan.appendChild(document.createTextNode("|"));
  footerSpan.appendChild(maintainer);
  footerSpan.appendChild(document.createTextNode("|"));
  footerSpan.appendChild(contributorLink);
  footerSpan.appendChild(document.createTextNode("|"));
  footerSpan.appendChild(hash);
  footerSpan.appendChild(document.createTextNode("|"));
  footerSpan.appendChild(impressumLink);
  for (const [label, href] of [["privacy.footerPolicy", "./privacy.html"], ["privacy.footerTerms", "./terms.html"]]) {
    footerSpan.appendChild(document.createTextNode("|"));
    const link = document.createElement("a");
    link.className = "privacy-footer-link";
    link.textContent = t(label);
    link.dataset.i18n = label;
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    footerSpan.appendChild(link);
  }
  footerSpan.appendChild(document.createTextNode("|"));
  const privacySettings = document.createElement("button");
  privacySettings.type = "button";
  privacySettings.id = "privacy-settings-link";
  privacySettings.className = "privacy-footer-link";
  privacySettings.textContent = t("privacy.footerSettings");
  privacySettings.dataset.i18n = "privacy.footerSettings";
  footerSpan.appendChild(privacySettings);
}

export function generateResetButton(presenter, domNode) {
  // reset button must be last defined
  const resetButtonDiv = document.createElement("div");
  resetButtonDiv.classList.add(
    "struktoOption",
    "resetIcon",
    "tooltip",
    "tooltip-bottom",
    "hand"
  );
  resetButtonDiv.setAttribute("data-tooltip", t("common.reset"));
  resetButtonDiv.dataset.i18nTooltip = "common.reset";
  resetButtonDiv.addEventListener("click", () => {
    const content = document.getElementById("modal-content");
    const footer = document.getElementById("modal-footer");
    while (content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    while (footer.hasChildNodes()) {
      footer.removeChild(footer.lastChild);
    }
    content.appendChild(document.createTextNode(t("editor.deleteAllQuestion")));
    const doButton = document.createElement("div");
    doButton.classList.add("modal-buttons", "acceptIcon", "hand");
    doButton.addEventListener("click", () => presenter.resetModel());
    footer.appendChild(doButton);
    const cancelButton = document.createElement("div");
    cancelButton.classList.add("modal-buttons", "deleteIcon", "hand");
    cancelButton.addEventListener("click", () =>
      document.getElementById("IEModal").classList.remove("active")
    );
    footer.appendChild(cancelButton);

    document.getElementById("IEModal").classList.add("active");
  });
  domNode.appendChild(resetButtonDiv);
}

export function generateInfoButton(domNode) {
  const infoButtonDiv = document.createElement("div");
  infoButtonDiv.classList.add(
    "options-element",
    "infoIcon",
    "tooltip",
    "tooltip-bottomInfo",
    "hand"
  );
  infoButtonDiv.setAttribute("data-tooltip", t("footer.sourceTooltip"));
  infoButtonDiv.dataset.i18nTooltip = "footer.sourceTooltip";
  infoButtonDiv.addEventListener("click", () => {
    window.open(
      "https://gitlab.com/dev-ddi/cs-school-tools/struktog",
      "_blank"
    );
  });

  domNode.appendChild(infoButtonDiv);
}

export function highlight() {
  // Rollout-Datum des Releases eintragen
  const releaseDate = new Date("2025-08-25");
  const now = new Date();

  // 30 Tage später berechnen
  const expiryDate = new Date(releaseDate);
  expiryDate.setDate(expiryDate.getDate() + 30);

  if (now <= expiryDate) {
    document.getElementById("whats-new-link").classList.add("glimming");
  }
}
