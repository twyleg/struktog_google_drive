import { storage } from "./privacy/storage.js";
const SUPPORTED_UI_LANGUAGES = ["de", "en", "fr", "es"];
const UI_LANGUAGE_STORAGE_KEY = "struktog_settings_ui_language";
const UI_LANGUAGE_AUTO = "auto";

const translations = {
  de: {
    privacy: {
      appDescription: "Struktogramme bearbeiten, Quellcode erzeugen und lokal oder optional in Google Drive speichern.",
      deactivateGoogle: "Google deaktivieren (neu laden)",
      sessionStatus: "Nur dieser Tab",
      settingsTitle: "Datenschutz & Browserdaten",
      sessionOnly: "Ohne Ihre Zustimmung bleibt der Arbeitsbereich nur in diesem Tab. Speichern Sie wichtige Diagramme als Datei, bevor Sie den Tab schließen.",
      rememberWorkspace: "Arbeitsbereich auf diesem Gerät merken",
      workspaceDetails: "Speichert Diagramm, erzeugten Code, Einstellungen, zuletzt verwendete Drive-Dateien (Namen, IDs und Pfade) und den Tour-Status in diesem Browser. Bis zur Löschung oder zum Widerruf.",
      enableOffline: "Offline-Nutzung aktivieren",
      offlineDetails: "Speichert die öffentlichen Programmdateien im Browser, damit der Editor offline verfügbar ist. Es werden keine Google-Dateien im Offline-Cache gespeichert.",
      readPolicy: "Datenschutzhinweise lesen",
      deleteSaved: "Gespeicherte Daten löschen",
      deleted: "Gespeicherte Arbeitsbereichsdaten wurden gelöscht und die Offline-Nutzung deaktiviert. Ihr aktuelles Diagramm bleibt geöffnet.",
      saveChoices: "Auswahl speichern",
      storageUnavailable: "Dieser Browser erlaubt keine dauerhafte Speicherung. Der Arbeitsbereich bleibt für diesen Tab verfügbar.",
      offlineFailed: "Der Offline-Cache konnte nicht aktualisiert werden. Bitte erneut versuchen.",
      googleTitle: "Google Drive aktivieren?",
      googleDescription: "Google Drive ist optional. Die Aktivierung lädt Dienste von Google, um Dateien aus Ihrem Drive zu öffnen oder dort zu speichern. Der lokale Editor funktioniert auch ohne Google.",
      googleData: "Dabei erhält Google Ihre IP-Adresse und Browserinformationen und kann Cookies oder ähnliche Technologien verwenden. Beim Speichern in Drive wird das Diagramm an Google übertragen; beim Öffnen werden Inhalte und Dateiinformationen aus Drive abgerufen. Verarbeitung außerhalb der EU, auch in den USA, ist möglich.",
      googleSession: "Die Zustimmung gilt nur für diesen Tab. Ein Neuladen beendet die Aktivierung. Speichern Sie vorher Ihr Diagramm. Bereits gespeicherte Drive-Dateien und die Google-Kontoberechtigung werden dadurch nicht gelöscht.",
      activateGoogle: "Google Drive aktivieren",
      googleLoading: "Google Drive wird aktiviert…",
      googleReady: "Google Drive ist bereit. Mit „Weiter“ können Sie fortfahren.",
      continueGoogle: "Weiter zu Google Drive",
      retryGoogle: "Aktivierung erneut versuchen",
      footerPolicy: "Datenschutz",
      footerTerms: "Nutzungsbedingungen",
      footerSettings: "Browserdaten",
    },
    toolbar: {
      myDrive: "Meine Ablage",
      pathUnavailable: "Pfad noch nicht verfügbar",
      folderPickerTitle: "Zielordner in Google Drive auswählen",
      filePickerTitle: "Struktog-Datei öffnen",
      destination: "Speicherort: {{name}}",
      invalidFolder: "Bitte einen gültigen Ordner auswählen.",
      invalidSelection: "Google Picker hat keine gültige Auswahl zurückgegeben.",
      cancelGoogle: "Google-Aktion abbrechen",
      label: "Diagramm-Aktionen",
      new: "Neu",
      loadLocal: "Datei öffnen",
      saveLocal: "Lokal speichern",
      openDrive: "Google Drive",
      saveDrive: "In Drive speichern",
      saveAsDrive: "In Drive speichern unter",
      export: "Bild exportieren",
      settings: "Einstellungen",
      help: "Hilfe",
      recent: "Zuletzt verwendet",
      noRecent: "Noch keine Dateien. Öffne ein Diagramm aus Google Drive.",
      picker: "Andere Datei öffnen…",
      driveUnavailable: "Google Drive ist für diese Installation nicht eingerichtet.",
      saveDriveHint: "Ordner und Dateiname für eine neue Datei in Drive wählen.",
      unsaved: "Ungespeicherte Änderungen",
      saved: "Keine ungespeicherten Änderungen",
      discardNew: "Ungespeicherte Änderungen verwerfen und ein neues Diagramm erstellen?",
      saveTitle: "In Google Drive speichern",
      fileName: "Dateiname",
      saveDescription: "Es wird eine neue Datei erstellt. Die bisherige Datei bleibt erhalten.",
    },
    drive: {
      open: "Aus Google Drive öffnen",
      saveAs: "Kopie in Google Drive speichern",
      download: "Lokale Kopie herunterladen",
      new: "Neu",
      local: "Lokal",
      working: "Bitte warten…",
      loading: "Google wird geladen. Bitte die Aktion gleich erneut anklicken.",
      filename: "Dateiname in Google Drive:",
      discard: "Ungespeicherte Änderungen verwerfen und die Datei öffnen?",
      conflict:
        "Die Datei wurde in Google Drive geändert. Trotzdem mit diesem Diagramm überschreiben? Abbrechen, um stattdessen eine Drive-Kopie zu speichern.",
    },
    common: {
      ok: "OK",
      cancel: "Abbruch",
      close: "Schließen",
      yes: "Ja",
      no: "Nein",
      undo: "Undo",
      redo: "Redo",
      reset: "Reset",
      settings: "Einstellung",
      remove: "Entfernen",
      move: "Verschieben",
      moveCancel: "Verschieben abbrechen",
      addCase: "Fall hinzufügen",
      addCatch: "Catch hinzufügen",
      addParameter: "Parameter hinzufügen",
      sourcecode: "Quellcode",
    },
    nodes: {
      InputNode: "Eingabe-Feld",
      OutputNode: "Ausgabe-Feld",
      TaskNode: "Anweisung",
      BlockCallNode: "Funktionsaufruf",
      CountLoopNode: "Zählergesteuerte Schleife",
      HeadLoopNode: "Kopfgesteuerte Schleife",
      FootLoopNode: "Fußgesteuerte Schleife",
      BranchNode: "Verzweigung",
      CaseNode: "Fallunterscheidung",
      TryCatchNode: "Try-Catch-Block",
      FunctionNode: "Funktionsblock",
    },
    nav: {
      unnamed: "unbenannt",
      renameTooltip: "Benenne dein Struktogramm.",
      renamePrompt: "Bitte gib einen Namen für dein Struktogramm ein:",
      donate: "Spenden",
      donateTooltip: "Unterstuetze Struktog",
    },
    footer: {
      sourceCode: "Source code",
      sourceTooltip: "Gitlab Repository",
      contributors: "Contributors",
      contributorsTooltip: "Contributors",
      maintainer: "Maintainer Thiemo Leonhardt",
      whatsNewTooltip: "Whats New?",
      imprint: "Impressum",
      imprintTooltip: "Impressum",
      devNotice: "Development branch please use ",
      stableVersion: "stable version",
    },
    editor: {
      chooseElement: "Element wählen:",
      heading: "Editor:",
      trueLabel: "Wahr",
      falseLabel: "Falsch",
      caseSettingsTitle: "Einstellungen der {{node}}: ",
      tryCatchSettingsTitle: "Einstellungen des {{node}}s : ",
      functionSettingsTitle: "Einstellungen des {{node}}s: ",
      numberOfParameters: "Anzahl der Parameter:",
      numberOfCases: "Anzahl der Fälle:",
      numberOfCatches: "Anzahl der Catch-Blöcke:",
      functionReturnType: "Rückgabetyp:",
      functionParameters: "Parameter:",
      functionParameterLabel: "Parameter",
      functionParametersEmpty: "Keine Parameter",
      enableDefaultBranch: "Sonst Zweig einschalten:",
      deleteQuestion:
        "Dieses Element und alle darin erstellten Blöcke löschen?",
      deleteAllQuestion: "Alles löschen?",
      removeParameterTooltip: "Entfernen",
      expandEditorWidth: "Editor auf Seitenbreite",
      limitEditorWidth: "Editor auf 1200px",
    },
    code: {
      translateTo: "Übersetzen in:",
      copyCode: "Kopiere Code",
      showSourcecode: "Quellcode einblenden",
      unsupported:
        "Das Struktogramm enthält Elemente, \nwelche in der gewählten Programmiersprache \nnicht direkt zur Verfügung stehen.\nDeshalb bitte manuell in Code überführen.",
    },
    importExport: {
      startTour: "Tour starten",
      settings: "Einstellungen",
      load: "Laden",
      save: "Speichern",
      imageExport: "Bildexport",
      imageExportFormatTitle: "Bildformat waehlen",
      exportPng: "PNG",
      exportSvg: "SVG",
      copyPng: "PNG kopieren",
      copySvg: "SVG kopieren",
      copyingImage: "Bild wird kopiert…",
      imageCopied: "Bild kopiert. Jetzt mit Strg+V / Cmd+V einfügen.",
      imageCopyFailed:
        "Kopieren fehlgeschlagen. Bitte den Zugriff auf die Zwischenablage erlauben und erneut versuchen oder das Bild herunterladen.",
      clipboardUnavailable:
        "Bilder können hier nicht kopiert werden. Bitte HTTPS oder localhost und einen unterstützten Browser verwenden.",
      svgClipboardUnavailable:
        "Dieser Browser unterstützt kein SVG in der Zwischenablage. Bitte PNG kopieren oder SVG herunterladen.",
      settingsTitle: "Einstellungen",
      tabGeneral: "Allgemein",
      tabColors: "Farben",
      profile: "Profil",
      showElements: "Elemente anzeigen",
      language: "Programmiersprache",
      uiLanguage: "Oberflächensprache",
      uiAuto: "Automatisch (Browser)",
      showSourcecode: "Quellcode anzeigen",
      enableShortcuts: "Shortcuts (Alt+1..0) aktivieren",
      restrictFunctionInsertToTop:
        "Funktionsblock nur am Anfang des Struktogramms einfügen",
      resetColors: "Reset Farben",
      colorGroupInputOutput: "Ein- und Ausgabe",
      colorGroupLoops: "Schleifen",
      colorGroupBranching: "Verzweigungen und Fehlerbehandlung",
      colorGroupFunctions: "Funktionen",
      applyGroupColor: "Gruppenfarbe übernehmen",
      atLeastOneElement: "Bitte mindestens ein Element aktiv lassen.",
      invalidJson: "Datei konnte nicht gelesen werden: ungültiges JSON.",
      unknownImportFormat:
        "Datei konnte nicht importiert werden: unbekanntes Format.",
    },
    webtour: {
      titleIntro: "Was ist ein Struktogramm?",
      textIntro:
        "Ein Struktogramm beschreibt einen Algorithmus in klaren, strukturierten Bausteinen. Du planst damit den Programmablauf schrittweise über Sequenz, Verzweigung und Schleife, bevor du ihn als Quellcode formulierst. Der Editor unterstützt dich dabei, diese Bausteine konsistent zu erstellen, logisch zu ordnen und in ausführbaren Code zu überführen.",
      titleStart: "Kurze Tour",
      textStart: "Hier startest du jederzeit diese Einführung.",
      titleNaming: "Struktogramm benennen",
      textNaming:
        "Hier benennst du dein Struktogramm. Dieser Name wird auch für zukünftige JSON- und PNG-Exporte als Dateiname verwendet.",
      titleInsert: "Elemente einfügen",
      textInsert:
        "Wähle hier ein Element aus und füge es per Klick oder Drag-and-Drop ein.",
      titleWorkspace: "Arbeitsfläche",
      textWorkspace:
        "Hier baust du dein Struktogramm auf und bearbeitest die Inhalte direkt.",
      titleElementOptions: "Elementoptionen",
      textElementOptions:
        "An eingefügten Elementen findest du Aktionen wie Entfernen und je nach Typ weitere Optionen.",
      titleFileSettings: "Datei und Einstellungen",
      textFileSettings:
        "Oben findest du Einstellungen sowie Laden, Speichern und Bildexport.",
      titleHistory: "Undo, Redo, Reset",
      textHistory:
        "Diese Leiste enthält Rückgängig, Wiederholen und Zurücksetzen des Diagramms.",
      titleSourcecode: "Quellcode",
      textSourcecode:
        "Mit diesem Button blendest du den Quellcode ein. Sprache und Kopieren stehen dann rechts bereit.",
      back: "Zurück",
      next: "Weiter",
      done: "Fertig",
      finish: "Beenden",
    },
    meta: {
      title:
        "Struktog - Struktogramme erstellen und unterrichten | ddi.education",
      description:
        "Struktog ist ein kostenloses Open-Source-Tool zum Erstellen von Struktogrammen für Informatikunterricht und Lehrerbildung.",
      locale: "de_DE",
      keywords:
        "Struktogramm, Nassi-Shneiderman-Diagramm, Informatikunterricht, Lehrerbildung, Open Source, Diagrammeditor, Codegenerierung",
      jsonLdLanguage: "de",
    },
  },
  en: {
    privacy: {
      appDescription: "Edit structograms, generate code, and save locally or optionally to Google Drive.",
      deactivateGoogle: "Deactivate Google (reload)",
      sessionStatus: "This tab only",
      settingsTitle: "Privacy & browser data",
      sessionOnly: "Without your agreement, the workspace stays in this tab only. Download important diagrams before closing the tab.",
      rememberWorkspace: "Remember this workspace on this device",
      workspaceDetails: "Stores the diagram, generated code, settings, recent Drive files (names, IDs and paths), and tour status in this browser until you delete them or withdraw this choice.",
      enableOffline: "Enable offline use",
      offlineDetails: "Caches public application files in this browser so the editor can work offline. Google Drive files are not stored in the offline cache.",
      readPolicy: "Read the privacy notice",
      deleteSaved: "Delete saved data",
      deleted: "Saved workspace data was deleted and offline use disabled. Your current diagram stays open.",
      saveChoices: "Save choices",
      storageUnavailable: "This browser does not allow persistent storage. Your workspace remains available in this tab.",
      offlineFailed: "The offline cache could not be updated. Please try again.",
      googleTitle: "Activate Google Drive?",
      googleDescription: "Google Drive is optional. Activation loads Google services to open files from your Drive or save files there. The local editor also works without Google.",
      googleData: "Google receives your IP address and browser information and may use cookies or similar technologies. Saving to Drive sends the diagram to Google; opening a file retrieves content and file details from Drive. Processing outside the EU, including in the US, is possible.",
      googleSession: "Your agreement applies to this tab only. Reloading ends activation. Save your diagram first. Existing Drive files and your Google-account permission are not deleted.",
      activateGoogle: "Activate Google Drive",
      googleLoading: "Activating Google Drive…",
      googleReady: "Google Drive is ready. Select Continue to proceed.",
      continueGoogle: "Continue to Google Drive",
      retryGoogle: "Retry activation",
      footerPolicy: "Privacy",
      footerTerms: "Terms of use",
      footerSettings: "Browser data",
    },
    toolbar: {
      myDrive: "My Drive",
      pathUnavailable: "Path not available yet",
      folderPickerTitle: "Choose a destination folder in Google Drive",
      filePickerTitle: "Open a Struktog file",
      destination: "Save location: {{name}}",
      invalidFolder: "Please select a valid folder.",
      invalidSelection: "Google Picker did not return a valid selection.",
      cancelGoogle: "Cancel Google action",
      label: "Diagram actions",
      new: "New",
      loadLocal: "Open file",
      saveLocal: "Save locally",
      openDrive: "Google Drive",
      saveDrive: "Save to Drive",
      saveAsDrive: "Save as in Drive",
      export: "Export image",
      settings: "Settings",
      help: "Help",
      recent: "Recently used",
      noRecent: "No recent files yet. Open a diagram from Google Drive.",
      picker: "Open another file…",
      driveUnavailable: "Google Drive is not configured for this installation.",
      saveDriveHint: "Choose a folder and filename for a new Drive file.",
      unsaved: "Unsaved changes",
      saved: "No unsaved changes",
      discardNew: "Discard unsaved changes and create a new diagram?",
      saveTitle: "Save to Google Drive",
      fileName: "File name",
      saveDescription: "This creates a new file. Your existing file is kept.",
    },
    drive: {
      open: "Open from Google Drive",
      saveAs: "Save a copy to Google Drive",
      download: "Download local copy",
      new: "New",
      local: "Local",
      working: "Working…",
      loading: "Google is loading. Please click the action again shortly.",
      filename: "Google Drive filename:",
      discard: "Discard unsaved changes and open the file?",
      conflict:
        "This file changed in Google Drive. Overwrite it with this diagram? Cancel to keep your edits and save a new Drive copy instead.",
    },
    common: {
      ok: "OK",
      cancel: "Cancel",
      close: "Close",
      yes: "Yes",
      no: "No",
      undo: "Undo",
      redo: "Redo",
      reset: "Reset",
      settings: "Settings",
      remove: "Remove",
      move: "Move",
      moveCancel: "Cancel move",
      addCase: "Add case",
      addCatch: "Add catch",
      addParameter: "Add parameter",
      sourcecode: "Source code",
    },
    nodes: {
      InputNode: "Input field",
      OutputNode: "Output field",
      TaskNode: "Statement",
      BlockCallNode: "Block call",
      CountLoopNode: "Count-controlled loop",
      HeadLoopNode: "Head-controlled loop",
      FootLoopNode: "Foot-controlled loop",
      BranchNode: "Branch",
      CaseNode: "Case distinction",
      TryCatchNode: "Try-catch block",
      FunctionNode: "Function block",
    },
    nav: {
      unnamed: "untitled",
      renameTooltip: "Rename your diagram.",
      renamePrompt: "Please enter a name for your diagram:",
      donate: "Donate",
      donateTooltip: "Support Struktog",
    },
    footer: {
      sourceCode: "Source code",
      sourceTooltip: "GitLab repository",
      contributors: "Contributors",
      contributorsTooltip: "Contributors",
      maintainer: "Maintainer Thiemo Leonhardt",
      whatsNewTooltip: "What's new?",
      imprint: "Imprint",
      imprintTooltip: "Imprint",
      devNotice: "Development branch please use ",
      stableVersion: "stable version",
    },
    editor: {
      chooseElement: "Choose element:",
      heading: "Editor:",
      trueLabel: "True",
      falseLabel: "False",
      caseSettingsTitle: "Settings for {{node}}: ",
      tryCatchSettingsTitle: "Settings for {{node}}: ",
      functionSettingsTitle: "Settings for {{node}}: ",
      numberOfParameters: "Number of parameters:",
      numberOfCases: "Number of cases:",
      numberOfCatches: "Number of catch blocks:",
      functionReturnType: "Return type:",
      functionParameters: "Parameters:",
      functionParameterLabel: "Parameter",
      functionParametersEmpty: "No parameters",
      enableDefaultBranch: "Enable else branch:",
      deleteQuestion: "Delete this element and all nested blocks?",
      deleteAllQuestion: "Delete everything?",
      removeParameterTooltip: "Remove",
      expandEditorWidth: "Expand editor to full page width",
      limitEditorWidth: "Limit editor to 1200px",
    },
    code: {
      translateTo: "Translate to:",
      copyCode: "Copy code",
      showSourcecode: "Show source code",
      unsupported:
        "The diagram contains elements\nthat are not directly available\nin the selected programming language.\nPlease convert them to code manually.",
    },
    importExport: {
      startTour: "Start tour",
      settings: "Settings",
      load: "Load",
      save: "Save",
      imageExport: "Image export",
      imageExportFormatTitle: "Choose image format",
      exportPng: "PNG",
      exportSvg: "SVG",
      copyPng: "Copy PNG",
      copySvg: "Copy SVG",
      copyingImage: "Copying image…",
      imageCopied: "Image copied. Paste with Ctrl+V / Cmd+V.",
      imageCopyFailed:
        "Copy failed. Allow clipboard access and try again, or download the image.",
      clipboardUnavailable:
        "Image copying is unavailable. Use HTTPS or localhost and a supported browser.",
      svgClipboardUnavailable:
        "This browser does not support SVG clipboard images. Copy PNG or download SVG instead.",
      settingsTitle: "Settings",
      tabGeneral: "General",
      tabColors: "Colors",
      profile: "Profile",
      showElements: "Show elements",
      language: "Programming language",
      uiLanguage: "Interface language",
      uiAuto: "Automatic (browser)",
      showSourcecode: "Show source code",
      enableShortcuts: "Enable shortcuts (Alt+1..0)",
      restrictFunctionInsertToTop:
        "Only allow function blocks at the top of the diagram",
      resetColors: "Reset colors",
      colorGroupInputOutput: "Input and output",
      colorGroupLoops: "Loops",
      colorGroupBranching: "Branching and error handling",
      colorGroupFunctions: "Functions",
      applyGroupColor: "Apply group color",
      atLeastOneElement: "Please keep at least one element enabled.",
      invalidJson: "File could not be read: invalid JSON.",
      unknownImportFormat: "File could not be imported: unknown format.",
    },
    webtour: {
      titleIntro: "What is a Nassi-Shneiderman diagram?",
      textIntro:
        "A Nassi-Shneiderman diagram describes an algorithm using clear, structured building blocks. You plan program flow step by step with sequence, branch, and loop before writing source code. The editor helps you create these blocks consistently, arrange them logically, and transform them into executable code.",
      titleStart: "Quick tour",
      textStart: "You can start this introduction here at any time.",
      titleNaming: "Name your diagram",
      textNaming:
        "You can rename your diagram here. This name is also used for future JSON and PNG export filenames.",
      titleInsert: "Insert elements",
      textInsert:
        "Choose an element here and insert it by click or drag and drop.",
      titleWorkspace: "Workspace",
      textWorkspace: "Build your diagram here and edit content directly.",
      titleElementOptions: "Element options",
      textElementOptions:
        "Inserted elements provide actions like delete and type-specific options.",
      titleFileSettings: "File and settings",
      textFileSettings:
        "At the top you can access settings, load/save, and image export.",
      titleHistory: "Undo, Redo, Reset",
      textHistory:
        "This bar contains undo, redo, and reset actions for the diagram.",
      titleSourcecode: "Source code",
      textSourcecode:
        "Use this button to show source code. Language and copy actions are then available on the right.",
      back: "Back",
      next: "Next",
      done: "Done",
      finish: "Close",
    },
    meta: {
      title:
        "Struktog - Create and teach Nassi-Shneiderman diagrams | ddi.education",
      description:
        "Struktog is a free open-source tool for creating Nassi-Shneiderman diagrams in computer science education and teacher training.",
      locale: "en_US",
      keywords:
        "Nassi-Shneiderman diagram, structogram, computer science education, teacher training, open source, diagram editor, code generation",
      jsonLdLanguage: "en",
    },
  },
  fr: {
    privacy: {
      appDescription: "Modifier des structogrammes, générer du code et enregistrer localement ou sur Google Drive en option.",
      deactivateGoogle: "Désactiver Google (recharger)",
      sessionStatus: "Cet onglet uniquement",
      settingsTitle: "Confidentialité et données du navigateur",
      sessionOnly: "Sans votre accord, l’espace de travail reste dans cet onglet uniquement. Téléchargez les diagrammes importants avant de fermer l’onglet.",
      rememberWorkspace: "Mémoriser cet espace de travail sur cet appareil",
      workspaceDetails: "Conserve le diagramme, le code, les paramètres, les fichiers Drive récents (noms, identifiants et chemins) et l’état de la visite jusqu’à suppression ou retrait de ce choix.",
      enableOffline: "Activer l’utilisation hors ligne",
      offlineDetails: "Conserve les fichiers publics de l’application dans ce navigateur pour utiliser l’éditeur hors ligne. Aucun fichier Google Drive n’est conservé dans ce cache.",
      readPolicy: "Lire les informations de confidentialité",
      deleteSaved: "Supprimer les données enregistrées",
      deleted: "Les données enregistrées ont été supprimées et le mode hors ligne désactivé. Le diagramme actuel reste ouvert.",
      saveChoices: "Enregistrer les choix",
      storageUnavailable: "Ce navigateur ne permet pas le stockage persistant. Votre espace de travail reste disponible dans cet onglet.",
      offlineFailed: "Le cache hors ligne n’a pas pu être actualisé. Veuillez réessayer.",
      googleTitle: "Activer Google Drive ?",
      googleDescription: "Google Drive est facultatif. L’activation charge des services Google pour ouvrir ou enregistrer des fichiers Drive. L’éditeur local fonctionne aussi sans Google.",
      googleData: "Google reçoit votre adresse IP et des informations sur votre navigateur et peut utiliser des cookies ou technologies similaires. L’enregistrement transmet le diagramme à Google ; l’ouverture récupère son contenu et ses informations. Un traitement hors de l’UE, notamment aux États-Unis, est possible.",
      googleSession: "Votre accord ne vaut que pour cet onglet. Le rechargement met fin à l’activation. Enregistrez d’abord votre diagramme. Les fichiers Drive et l’autorisation du compte Google ne sont pas supprimés.",
      activateGoogle: "Activer Google Drive",
      googleLoading: "Activation de Google Drive…",
      googleReady: "Google Drive est prêt. Cliquez sur Continuer.",
      continueGoogle: "Continuer vers Google Drive",
      retryGoogle: "Réessayer l’activation",
      footerPolicy: "Confidentialité",
      footerTerms: "Conditions d’utilisation",
      footerSettings: "Données du navigateur",
    },
    toolbar: {
      myDrive: "Mon Drive",
      pathUnavailable: "Chemin pas encore disponible",
      folderPickerTitle: "Choisir un dossier de destination sur Google Drive",
      filePickerTitle: "Ouvrir un fichier Struktog",
      destination: "Emplacement : {{name}}",
      invalidFolder: "Veuillez sélectionner un dossier valide.",
      invalidSelection: "Google Picker n’a pas renvoyé de sélection valide.",
      cancelGoogle: "Annuler l’action Google",
      label: "Actions du diagramme",
      new: "Nouveau",
      loadLocal: "Ouvrir un fichier",
      saveLocal: "Enregistrer localement",
      openDrive: "Google Drive",
      saveDrive: "Enregistrer sur Drive",
      saveAsDrive: "Enregistrer sous sur Drive",
      export: "Exporter une image",
      settings: "Paramètres",
      help: "Aide",
      recent: "Fichiers récents",
      noRecent: "Aucun fichier récent. Ouvrez un diagramme depuis Google Drive.",
      picker: "Ouvrir un autre fichier…",
      driveUnavailable: "Google Drive n’est pas configuré pour cette installation.",
      saveDriveHint: "Choisissez un dossier et un nom pour un nouveau fichier Drive.",
      unsaved: "Modifications non enregistrées",
      saved: "Aucune modification non enregistrée",
      discardNew: "Abandonner les modifications et créer un nouveau diagramme ?",
      saveTitle: "Enregistrer sur Google Drive",
      fileName: "Nom du fichier",
      saveDescription: "Un nouveau fichier sera créé. Le fichier existant sera conservé.",
    },
    drive: {
      open: "Ouvrir depuis Google Drive",
      saveAs: "Enregistrer une copie sur Google Drive",
      download: "Télécharger une copie locale",
      new: "Nouveau",
      local: "Local",
      working: "Veuillez patienter…",
      loading: "Chargement de Google. Réessayez dans un instant.",
      filename: "Nom du fichier Google Drive :",
      discard: "Abandonner les modifications et ouvrir le fichier ?",
      conflict:
        "Le fichier a changé sur Google Drive. Le remplacer ? Annulez pour enregistrer une nouvelle copie.",
    },
    common: {
      ok: "OK",
      cancel: "Annuler",
      close: "Fermer",
      yes: "Oui",
      no: "Non",
      undo: "Annuler",
      redo: "Rétablir",
      reset: "Réinitialiser",
      settings: "Paramètres",
      remove: "Supprimer",
      move: "Déplacer",
      moveCancel: "Annuler le déplacement",
      addCase: "Ajouter un cas",
      addCatch: "Ajouter un bloc catch",
      addParameter: "Ajouter un paramètre",
      sourcecode: "Code source",
    },
    nodes: {
      InputNode: "Entrée",
      OutputNode: "Sortie",
      TaskNode: "Instruction",
      BlockCallNode: "Appel de bloc",
      CountLoopNode: "Boucle à compteur",
      HeadLoopNode: "Boucle à pré-condition",
      FootLoopNode: "Boucle à post-condition",
      BranchNode: "Branchement",
      CaseNode: "Distinction de cas",
      TryCatchNode: "Bloc try-catch",
      FunctionNode: "Bloc function",
    },
    nav: {
      unnamed: "sans titre",
      renameTooltip: "Renommez votre diagramme.",
      renamePrompt: "Veuillez saisir un nom pour votre diagramme :",
      donate: "Faire un don",
      donateTooltip: "Soutenir Struktog",
    },
    footer: {
      sourceCode: "Code source",
      sourceTooltip: "Dépôt GitLab",
      contributors: "Contributeurs",
      contributorsTooltip: "Contributeurs",
      maintainer: "Mainteneur Thiemo Leonhardt",
      whatsNewTooltip: "Nouveautés ?",
      imprint: "Mentions légales",
      imprintTooltip: "Mentions légales",
      devNotice: "Branche de développement, veuillez utiliser ",
      stableVersion: "la version stable",
    },
    editor: {
      chooseElement: "Choisir un élément :",
      heading: "Éditeur :",
      trueLabel: "Vrai",
      falseLabel: "Faux",
      caseSettingsTitle: "Paramètres de {{node}} : ",
      tryCatchSettingsTitle: "Paramètres de {{node}} : ",
      functionSettingsTitle: "Paramètres de {{node}} : ",
      numberOfParameters: "Nombre de paramètres :",
      numberOfCases: "Nombre de cas :",
      numberOfCatches: "Nombre de blocs catch :",
      functionReturnType: "Type de retour :",
      functionParameters: "Paramètres :",
      functionParameterLabel: "Paramètre",
      functionParametersEmpty: "Aucun paramètre",
      enableDefaultBranch: "Activer la branche sinon :",
      deleteQuestion:
        "Supprimer cet élément et tous les blocs qu'il contient ?",
      deleteAllQuestion: "Tout supprimer ?",
      removeParameterTooltip: "Supprimer",
      expandEditorWidth: "Etendre l'editeur a la largeur de la page",
      limitEditorWidth: "Limiter l'editeur a 1200px",
    },
    code: {
      translateTo: "Traduire vers :",
      copyCode: "Copier le code",
      showSourcecode: "Afficher le code source",
      unsupported:
        "Le diagramme contient des éléments\nqui ne sont pas directement disponibles\ndans le langage sélectionné.\nVeuillez les convertir manuellement en code.",
    },
    importExport: {
      startTour: "Démarrer la visite",
      settings: "Paramètres",
      load: "Charger",
      save: "Enregistrer",
      imageExport: "Exporter l'image",
      imageExportFormatTitle: "Choisir le format d'image",
      exportPng: "PNG",
      exportSvg: "SVG",
      copyPng: "Copier PNG",
      copySvg: "Copier SVG",
      copyingImage: "Copie de l’image…",
      imageCopied: "Image copiée. Collez avec Ctrl+V / Cmd+V.",
      imageCopyFailed:
        "Échec de la copie. Autorisez le presse-papiers et réessayez, ou téléchargez l’image.",
      clipboardUnavailable:
        "Copie indisponible. Utilisez HTTPS ou localhost et un navigateur compatible.",
      svgClipboardUnavailable:
        "Ce navigateur ne prend pas en charge les images SVG dans le presse-papiers. Copiez le PNG ou téléchargez le SVG.",
      settingsTitle: "Paramètres",
      tabGeneral: "Général",
      tabColors: "Couleurs",
      profile: "Profil",
      showElements: "Afficher les éléments",
      language: "Langage de programmation",
      uiLanguage: "Langue de l'interface",
      uiAuto: "Automatique (navigateur)",
      showSourcecode: "Afficher le code source",
      enableShortcuts: "Activer les raccourcis (Alt+1..0)",
      restrictFunctionInsertToTop:
        "Autoriser les blocs function uniquement en haut du diagramme",
      resetColors: "Réinitialiser les couleurs",
      colorGroupInputOutput: "Entrée et sortie",
      colorGroupLoops: "Boucles",
      colorGroupBranching: "Branchements et erreurs",
      colorGroupFunctions: "Fonctions",
      applyGroupColor: "Appliquer la couleur du groupe",
      atLeastOneElement: "Veuillez laisser au moins un élément activé.",
      invalidJson: "Le fichier ne peut pas être lu : JSON invalide.",
      unknownImportFormat:
        "Le fichier ne peut pas être importé : format inconnu.",
    },
    webtour: {
      titleIntro: "Qu'est-ce qu'un diagramme de Nassi-Shneiderman ?",
      textIntro:
        "Un diagramme de Nassi-Shneiderman décrit un algorithme avec des blocs structurés clairs. Vous planifiez le déroulement du programme étape par étape avec séquence, branchement et boucle avant d'écrire le code source. L'éditeur vous aide à créer ces blocs de manière cohérente, à les organiser logiquement et à les transformer en code exécutable.",
      titleStart: "Visite rapide",
      textStart: "Vous pouvez démarrer cette introduction ici à tout moment.",
      titleNaming: "Nommer le diagramme",
      textNaming:
        "Vous pouvez renommer votre diagramme ici. Ce nom est aussi utilisé pour les futurs noms de fichiers d'export JSON et PNG.",
      titleInsert: "Insérer des éléments",
      textInsert:
        "Choisissez ici un élément et insérez-le par clic ou glisser-déposer.",
      titleWorkspace: "Espace de travail",
      textWorkspace:
        "Construisez votre diagramme ici et modifiez les contenus directement.",
      titleElementOptions: "Options des éléments",
      textElementOptions:
        "Les éléments insérés offrent des actions comme supprimer et des options selon le type.",
      titleFileSettings: "Fichier et paramètres",
      textFileSettings:
        "En haut, vous trouvez les paramètres, le chargement/enregistrement et l'export d'image.",
      titleHistory: "Annuler, Rétablir, Réinitialiser",
      textHistory:
        "Cette barre contient les actions d'annulation, de rétablissement et de réinitialisation du diagramme.",
      titleSourcecode: "Code source",
      textSourcecode:
        "Utilisez ce bouton pour afficher le code source. La langue et la copie sont ensuite disponibles à droite.",
      back: "Retour",
      next: "Suivant",
      done: "Terminer",
      finish: "Fermer",
    },
    meta: {
      title:
        "Struktog - Créer et enseigner les diagrammes de Nassi-Shneiderman | ddi.education",
      description:
        "Struktog est un outil open source gratuit pour créer des diagrammes de Nassi-Shneiderman dans l'enseignement de l'informatique et la formation des enseignants.",
      locale: "fr_FR",
      keywords:
        "diagramme de Nassi-Shneiderman, enseignement de l'informatique, formation des enseignants, open source, editeur de diagrammes, generation de code",
      jsonLdLanguage: "fr",
    },
  },
  es: {
    privacy: {
      appDescription: "Editar diagramas, generar código y guardar localmente o, de forma opcional, en Google Drive.",
      deactivateGoogle: "Desactivar Google (recargar)",
      sessionStatus: "Solo esta pestaña",
      settingsTitle: "Privacidad y datos del navegador",
      sessionOnly: "Sin su consentimiento, el espacio de trabajo solo permanece en esta pestaña. Descargue los diagramas importantes antes de cerrarla.",
      rememberWorkspace: "Recordar este espacio de trabajo en este dispositivo",
      workspaceDetails: "Guarda el diagrama, el código, los ajustes, los archivos recientes de Drive (nombres, identificadores y rutas) y el estado del recorrido hasta que los borre o retire esta opción.",
      enableOffline: "Activar el uso sin conexión",
      offlineDetails: "Guarda los archivos públicos de la aplicación en este navegador para usar el editor sin conexión. No guarda archivos de Google Drive en esta caché.",
      readPolicy: "Leer el aviso de privacidad",
      deleteSaved: "Borrar los datos guardados",
      deleted: "Se borraron los datos guardados y se desactivó el uso sin conexión. El diagrama actual sigue abierto.",
      saveChoices: "Guardar opciones",
      storageUnavailable: "Este navegador no permite el almacenamiento persistente. Su espacio de trabajo sigue disponible en esta pestaña.",
      offlineFailed: "No se pudo actualizar la caché sin conexión. Inténtelo de nuevo.",
      googleTitle: "¿Activar Google Drive?",
      googleDescription: "Google Drive es opcional. La activación carga servicios de Google para abrir o guardar archivos en Drive. El editor local también funciona sin Google.",
      googleData: "Google recibe su dirección IP e información del navegador y puede usar cookies o tecnologías similares. Guardar en Drive envía el diagrama a Google; abrir recupera su contenido y detalles. Es posible el tratamiento fuera de la UE, incluso en Estados Unidos.",
      googleSession: "Su consentimiento solo se aplica a esta pestaña. Recargar termina la activación. Guarde antes el diagrama. No se borran los archivos de Drive ni el permiso de su cuenta de Google.",
      activateGoogle: "Activar Google Drive",
      googleLoading: "Activando Google Drive…",
      googleReady: "Google Drive está listo. Seleccione Continuar.",
      continueGoogle: "Continuar a Google Drive",
      retryGoogle: "Reintentar la activación",
      footerPolicy: "Privacidad",
      footerTerms: "Condiciones de uso",
      footerSettings: "Datos del navegador",
    },
    toolbar: {
      myDrive: "Mi unidad",
      pathUnavailable: "Ruta aún no disponible",
      folderPickerTitle: "Elegir carpeta de destino en Google Drive",
      filePickerTitle: "Abrir un archivo Struktog",
      destination: "Ubicación: {{name}}",
      invalidFolder: "Seleccione una carpeta válida.",
      invalidSelection: "Google Picker no devolvió una selección válida.",
      cancelGoogle: "Cancelar acción de Google",
      label: "Acciones del diagrama",
      new: "Nuevo",
      loadLocal: "Abrir archivo",
      saveLocal: "Guardar localmente",
      openDrive: "Google Drive",
      saveDrive: "Guardar en Drive",
      saveAsDrive: "Guardar como en Drive",
      export: "Exportar imagen",
      settings: "Configuración",
      help: "Ayuda",
      recent: "Archivos recientes",
      noRecent: "No hay archivos recientes. Abra un diagrama desde Google Drive.",
      picker: "Abrir otro archivo…",
      driveUnavailable: "Google Drive no está configurado para esta instalación.",
      saveDriveHint: "Elija una carpeta y un nombre para un nuevo archivo en Drive.",
      unsaved: "Cambios sin guardar",
      saved: "Sin cambios pendientes",
      discardNew: "¿Descartar los cambios y crear un nuevo diagrama?",
      saveTitle: "Guardar en Google Drive",
      fileName: "Nombre del archivo",
      saveDescription: "Se creará un archivo nuevo. Se conservará el archivo existente.",
    },
    drive: {
      open: "Abrir desde Google Drive",
      saveAs: "Guardar copia en Google Drive",
      download: "Descargar copia local",
      new: "Nuevo",
      local: "Local",
      working: "Espere…",
      loading: "Google se está cargando. Vuelva a intentarlo en un momento.",
      filename: "Nombre del archivo en Google Drive:",
      discard: "¿Descartar los cambios y abrir el archivo?",
      conflict:
        "El archivo cambió en Google Drive. ¿Sobrescribirlo? Cancele para guardar una copia nueva.",
    },
    common: {
      ok: "OK",
      cancel: "Cancelar",
      close: "Cerrar",
      yes: "Sí",
      no: "No",
      undo: "Deshacer",
      redo: "Rehacer",
      reset: "Restablecer",
      settings: "Configuración",
      remove: "Eliminar",
      move: "Mover",
      moveCancel: "Cancelar movimiento",
      addCase: "Agregar caso",
      addCatch: "Agregar bloque catch",
      addParameter: "Agregar parámetro",
      sourcecode: "Código fuente",
    },
    nodes: {
      InputNode: "Entrada",
      OutputNode: "Salida",
      TaskNode: "Instrucción",
      BlockCallNode: "Llamada de bloque",
      CountLoopNode: "Bucle con contador",
      HeadLoopNode: "Bucle de cabecera",
      FootLoopNode: "Bucle de pie",
      BranchNode: "Rama condicional",
      CaseNode: "Distinción de casos",
      TryCatchNode: "Bloque try-catch",
      FunctionNode: "Bloque function",
    },
    nav: {
      unnamed: "sin título",
      renameTooltip: "Renombra tu diagrama.",
      renamePrompt: "Introduce un nombre para tu diagrama:",
      donate: "Donar",
      donateTooltip: "Apoya Struktog",
    },
    footer: {
      sourceCode: "Código fuente",
      sourceTooltip: "Repositorio de GitLab",
      contributors: "Colaboradores",
      contributorsTooltip: "Colaboradores",
      maintainer: "Mantenedor Thiemo Leonhardt",
      whatsNewTooltip: "¿Qué hay de nuevo?",
      imprint: "Aviso legal",
      imprintTooltip: "Aviso legal",
      devNotice: "Rama de desarrollo, utiliza ",
      stableVersion: "la versión estable",
    },
    editor: {
      chooseElement: "Elegir elemento:",
      heading: "Editor:",
      trueLabel: "Verdadero",
      falseLabel: "Falso",
      caseSettingsTitle: "Configuración de {{node}}: ",
      tryCatchSettingsTitle: "Configuración de {{node}}: ",
      functionSettingsTitle: "Configuración de {{node}}: ",
      numberOfParameters: "Cantidad de parámetros:",
      numberOfCases: "Cantidad de casos:",
      numberOfCatches: "Cantidad de bloques catch:",
      functionReturnType: "Tipo de retorno:",
      functionParameters: "Parámetros:",
      functionParameterLabel: "Parámetro",
      functionParametersEmpty: "Sin parámetros",
      enableDefaultBranch: "Activar rama predeterminada:",
      deleteQuestion: "¿Eliminar este elemento y todos los bloques anidados?",
      deleteAllQuestion: "¿Eliminar todo?",
      removeParameterTooltip: "Eliminar",
      expandEditorWidth: "Ampliar editor al ancho completo",
      limitEditorWidth: "Limitar editor a 1200px",
    },
    code: {
      translateTo: "Traducir a:",
      copyCode: "Copiar código",
      showSourcecode: "Mostrar código fuente",
      unsupported:
        "El diagrama contiene elementos\nque no están disponibles directamente\nen el lenguaje de programación seleccionado.\nPor favor, conviértelos manualmente a código.",
    },
    importExport: {
      startTour: "Iniciar tour",
      settings: "Configuración",
      load: "Cargar",
      save: "Guardar",
      imageExport: "Exportar imagen",
      imageExportFormatTitle: "Elegir formato de imagen",
      exportPng: "PNG",
      exportSvg: "SVG",
      copyPng: "Copiar PNG",
      copySvg: "Copiar SVG",
      copyingImage: "Copiando imagen…",
      imageCopied: "Imagen copiada. Pegue con Ctrl+V / Cmd+V.",
      imageCopyFailed:
        "No se pudo copiar. Permita el acceso al portapapeles y reinténtelo, o descargue la imagen.",
      clipboardUnavailable:
        "Copia no disponible. Use HTTPS o localhost y un navegador compatible.",
      svgClipboardUnavailable:
        "Este navegador no admite imágenes SVG en el portapapeles. Copie PNG o descargue SVG.",
      settingsTitle: "Configuración",
      tabGeneral: "General",
      tabColors: "Colores",
      profile: "Perfil",
      showElements: "Mostrar elementos",
      language: "Lenguaje de programación",
      uiLanguage: "Idioma de la interfaz",
      uiAuto: "Automático (navegador)",
      showSourcecode: "Mostrar código fuente",
      enableShortcuts: "Activar atajos (Alt+1..0)",
      restrictFunctionInsertToTop:
        "Permitir bloques function solo al inicio del diagrama",
      resetColors: "Restablecer colores",
      colorGroupInputOutput: "Entrada y salida",
      colorGroupLoops: "Bucles",
      colorGroupBranching: "Ramas y manejo de errores",
      colorGroupFunctions: "Funciones",
      applyGroupColor: "Aplicar color del grupo",
      atLeastOneElement: "Mantén al menos un elemento activado.",
      invalidJson: "No se pudo leer el archivo: JSON inválido.",
      unknownImportFormat:
        "No se pudo importar el archivo: formato desconocido.",
    },
    webtour: {
      titleIntro: "¿Qué es un diagrama de Nassi-Shneiderman?",
      textIntro:
        "Un diagrama de Nassi-Shneiderman describe un algoritmo con bloques claros y estructurados. Planificas el flujo del programa paso a paso con secuencia, rama y bucle antes de escribir código fuente. El editor te ayuda a crear estos bloques de forma coherente, ordenarlos lógicamente y transformarlos en código ejecutable.",
      titleStart: "Tour rápido",
      textStart: "Puedes iniciar esta introducción aquí en cualquier momento.",
      titleNaming: "Nombrar el diagrama",
      textNaming:
        "Aquí puedes renombrar tu diagrama. Este nombre también se usa para futuros nombres de archivo en las exportaciones JSON y PNG.",
      titleInsert: "Insertar elementos",
      textInsert:
        "Elige un elemento aquí e insértalo con clic o arrastrar y soltar.",
      titleWorkspace: "Área de trabajo",
      textWorkspace:
        "Aquí construyes tu diagrama y editas el contenido directamente.",
      titleElementOptions: "Opciones del elemento",
      textElementOptions:
        "Los elementos insertados ofrecen acciones como eliminar y otras opciones según el tipo.",
      titleFileSettings: "Archivo y configuración",
      textFileSettings:
        "Arriba encontrarás configuración, cargar/guardar y exportación de imagen.",
      titleHistory: "Deshacer, Rehacer, Restablecer",
      textHistory:
        "Esta barra contiene las acciones de deshacer, rehacer y restablecer del diagrama.",
      titleSourcecode: "Código fuente",
      textSourcecode:
        "Con este botón muestras el código fuente. El idioma y la copia quedan disponibles a la derecha.",
      back: "Atrás",
      next: "Siguiente",
      done: "Listo",
      finish: "Cerrar",
    },
    meta: {
      title:
        "Struktog - Crear y enseñar diagramas de Nassi-Shneiderman | ddi.education",
      description:
        "Struktog es una herramienta gratuita de código abierto para crear diagramas de Nassi-Shneiderman en la enseñanza de la informática y la formación docente.",
      locale: "es_ES",
      keywords:
        "diagrama de Nassi-Shneiderman, ensenanza de la informatica, formacion docente, codigo abierto, editor de diagramas, generacion de codigo",
      jsonLdLanguage: "es",
    },
  },
};

const contentDefaultsByLanguage = {
  de: {
    taskDefault: "Anweisung",
    blockCallDefault: "Blockaufruf",
    branchCondition: "Bedingung",
    caseVariable: "Variable",
    caseLabel: "Fall",
    elseLabel: "Sonst",
    countCondition: "Zählbedingung",
    loopCondition: "Gültigkeitsbedingung",
    catchUndefined: "undefiniert",
    functionKeyword: "function",
    returnTypePlaceholder: "Rückgabetyp",
    inputPrefix: "E",
    outputPrefix: "A",
    trueLabel: "Wahr",
    falseLabel: "Falsch",
    tryLabel: "Try",
    catchLabel: "Catch",
  },
  en: {
    taskDefault: "Statement",
    blockCallDefault: "Block call",
    branchCondition: "Condition",
    caseVariable: "Expression",
    caseLabel: "Case",
    elseLabel: "Else",
    countCondition: "Count condition",
    loopCondition: "Validity condition",
    catchUndefined: "undefined",
    functionKeyword: "function",
    returnTypePlaceholder: "Return type",
    inputPrefix: "I",
    outputPrefix: "O",
    trueLabel: "True",
    falseLabel: "False",
    tryLabel: "Try",
    catchLabel: "Catch",
  },
  fr: {
    taskDefault: "Instruction",
    blockCallDefault: "Appel de bloc",
    branchCondition: "Condition",
    caseVariable: "Expression",
    caseLabel: "Cas",
    elseLabel: "Sinon",
    countCondition: "Condition de comptage",
    loopCondition: "Condition de validité",
    catchUndefined: "indéfini",
    functionKeyword: "function",
    returnTypePlaceholder: "Type de retour",
    inputPrefix: "E",
    outputPrefix: "S",
    trueLabel: "Vrai",
    falseLabel: "Faux",
    tryLabel: "Try",
    catchLabel: "Catch",
  },
  es: {
    taskDefault: "Instrucción",
    blockCallDefault: "Llamada de bloque",
    branchCondition: "Condición",
    caseVariable: "Expresión",
    caseLabel: "Caso",
    elseLabel: "Si no",
    countCondition: "Condición de conteo",
    loopCondition: "Condición de validez",
    catchUndefined: "indefinido",
    functionKeyword: "function",
    returnTypePlaceholder: "Tipo de retorno",
    inputPrefix: "E",
    outputPrefix: "S",
    trueLabel: "Verdadero",
    falseLabel: "Falso",
    tryLabel: "Try",
    catchLabel: "Catch",
  },
};

const contentDefaultAliases = {
  countCondition: ["Zaehlbedingung", "Zahlbedingung", "Zaehl-Bedingung"],
  loopCondition: ["Gueltigkeitsbedingung", "Gultigkeitsbedingung"],
  returnTypePlaceholder: ["Rueckgabetyp", "Ruckgabetyp", "Ruckgabe Typ"],
  taskDefault: ["Anweisung"],
  blockCallDefault: ["Blockaufruf"],
  branchCondition: ["Bedingung"],
  caseVariable: ["Variable"],
  caseLabel: ["Fall"],
  elseLabel: ["Sonst"],
  catchUndefined: ["undefiniert"],
  functionKeyword: ["function"],
  inputPrefix: ["E"],
  outputPrefix: ["A"],
  trueLabel: ["Wahr"],
  falseLabel: ["Falsch"],
  tryLabel: ["Try"],
  catchLabel: ["Catch"],
};

let uiLanguagePreference = UI_LANGUAGE_AUTO;
let resolvedUiLanguage = "de";

function normalizeLanguageCode(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === UI_LANGUAGE_AUTO) {
    return UI_LANGUAGE_AUTO;
  }

  for (const lang of SUPPORTED_UI_LANGUAGES) {
    if (normalized === lang || normalized.startsWith(lang + "-")) {
      return lang;
    }
  }

  return null;
}

function resolveValue(path, language) {
  const keys = path.split(".");
  let result = translations[language];
  for (const key of keys) {
    if (!result || typeof result !== "object" || !(key in result)) {
      return null;
    }
    result = result[key];
  }
  return typeof result === "string" ? result : null;
}

export function detectBrowserLanguage() {
  const languageCandidates = [];
  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) {
      languageCandidates.push(...navigator.languages);
    }
    if (navigator.language) {
      languageCandidates.push(navigator.language);
    }
  }

  for (const candidate of languageCandidates) {
    const normalized = normalizeLanguageCode(candidate);
    if (normalized && normalized !== UI_LANGUAGE_AUTO) {
      return normalized;
    }
  }

  return "de";
}

export function resolveUiLanguage(setting = UI_LANGUAGE_AUTO) {
  const normalized = normalizeLanguageCode(setting);
  if (normalized && normalized !== UI_LANGUAGE_AUTO) {
    return normalized;
  }
  return detectBrowserLanguage();
}

export function initializeI18n() {
  if (typeof Storage !== "undefined") {
    const storedPreference = storage.getItem(UI_LANGUAGE_STORAGE_KEY);
    const normalized = normalizeLanguageCode(storedPreference);
    uiLanguagePreference = normalized || UI_LANGUAGE_AUTO;
  }

  resolvedUiLanguage = resolveUiLanguage(uiLanguagePreference);
}

export function getUiLanguagePreference() {
  return uiLanguagePreference;
}

export function getUiLanguage() {
  return resolvedUiLanguage;
}

export function setUiLanguagePreference(preference, persist = true) {
  const normalized = normalizeLanguageCode(preference) || UI_LANGUAGE_AUTO;
  uiLanguagePreference = normalized;
  resolvedUiLanguage = resolveUiLanguage(uiLanguagePreference);

  if (persist && typeof Storage !== "undefined") {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, uiLanguagePreference);
  }
}

export function getUiLanguageStorageKey() {
  return UI_LANGUAGE_STORAGE_KEY;
}

export function getSupportedUiLanguages() {
  return [...SUPPORTED_UI_LANGUAGES];
}

export function getUiLanguageSelectOptions() {
  return [
    { value: UI_LANGUAGE_AUTO, label: t("importExport.uiAuto") },
    { value: "de", label: "Deutsch" },
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "es", label: "Español" },
  ];
}

export function getNodeLabel(nodeType) {
  return t("nodes." + nodeType);
}

function normalizeContentValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getContentDefault(key, language = null) {
  const targetLanguage = language || resolvedUiLanguage;
  if (
    targetLanguage in contentDefaultsByLanguage &&
    key in contentDefaultsByLanguage[targetLanguage]
  ) {
    return contentDefaultsByLanguage[targetLanguage][key];
  }
  return contentDefaultsByLanguage.de[key] || "";
}

export function isContentDefaultValue(value, key) {
  const normalizedValue = normalizeContentValue(value);
  if (normalizedValue === "") {
    return false;
  }

  const aliases = [];
  for (const language of SUPPORTED_UI_LANGUAGES) {
    aliases.push(getContentDefault(key, language));
  }
  if (key in contentDefaultAliases) {
    aliases.push(...contentDefaultAliases[key]);
  }

  return aliases.some(
    (candidate) => normalizeContentValue(candidate) === normalizedValue
  );
}

export function localizeContentDefault(value, key, language = null) {
  if (!isContentDefaultValue(value, key)) {
    return value;
  }
  return getContentDefault(key, language);
}

export function t(key, params = {}) {
  let result = resolveValue(key, resolvedUiLanguage);
  if (result === null) {
    result = resolveValue(key, "de");
  }
  if (result === null) {
    return key;
  }

  return result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, paramKey) => {
    if (Object.prototype.hasOwnProperty.call(params, paramKey)) {
      return String(params[paramKey]);
    }
    return match;
  });
}

initializeI18n();
