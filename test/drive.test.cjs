const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

async function modules() {
  const alerts = [];
  const stored = new Map();
  const window = {
    alert: (message) => alerts.push(message),
    confirm: () => false,
    prompt: () => "copy.json",
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
  };
  const context = vm.createContext({
    window,
    console,
    setTimeout,
    clearTimeout,
    AbortSignal,
    AbortController,
    crypto: webcrypto,
    Date,
  });
  const cache = new Map();
  async function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const source = file.endsWith("/i18n.js")
      ? "export const t = key => key"
      : file.endsWith("/privacy/storage.js")
        ? "export const storage = { getItem: key => window.localStorage.getItem(key), setItem: (key,value) => window.localStorage.setItem(key,value) }; export const workspacePersistenceEnabled = () => window.persistWorkspace === true;"
        : file.endsWith("/privacy/ui.js")
          ? "export const requestGoogleActivation = controller => { controller.activationRequested = true; };"
          : fs.readFileSync(file, "utf8");
    const module = new vm.SourceTextModule(source, {
      context,
      identifier: file,
    });
    cache.set(file, module);
    await module.link((name, parent) =>
      load(path.resolve(path.dirname(parent.identifier), name))
    );
    return module;
  }
  const exports = {};
  for (const file of [
    "document/controller",
    "document/validate",
    "google-drive/auth",
    "google-drive/drive-files",
    "google-drive/picker",
  ]) {
    const module = await load(`src/${file}.js`);
    await module.evaluate();
    Object.assign(exports, module.namespace);
  }
  return { ...exports, window, alerts, context };
}
const tree = () => ({
  id: "root",
  type: "InsertNode",
  followElement: { type: "Placeholder" },
});
const payload = () => ({
  formatVersion: 2,
  meta: { structoName: "test", exportedAt: "now" },
  settings: {},
  tree: tree(),
});
const file = {
  id: "same-id",
  name: "test.json",
  version: "1",
  modifiedTime: "then",
  capabilities: { canEdit: true },
};
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });

async function controller() {
  const m = await modules();
  let data = payload();
  let downloads = 0;
  const presenter = {
    getStructogramName: () => data.meta.structoName,
    setStructogramName: name => { data.meta.structoName = name; },
    getExportPayload: () => data,
    undoList: [],
    redoList: [],
    captureDocument: () => ({
      payload: JSON.parse(JSON.stringify(data)),
      undo: presenter.undoList.slice(), redo: presenter.redoList.slice(), selectedUid: null,
    }),
    restoreDocument: snapshot => {
      data = JSON.parse(JSON.stringify(snapshot.payload));
      presenter.undoList = snapshot.undo.slice();
      presenter.redoList = snapshot.redo.slice();
    },
    downloadLocal: () => {
      downloads++;
    },
    applyImportedData: (value) => {
      if (!m.validDiagram(value)) return false;
      data = value;
      presenter.undoList = [];
      presenter.redoList = [];
      return true;
    },
  };
  const c = new m.DocumentController(presenter, {});
  c.ready = true;
  c.activated = true;
  c.auth.authorize = async () => "token";
  return {
    ...m,
    c,
    edit: () => {
      data.meta.structoName += " edited";
    },
    downloads: () => downloads,
  };
}

test("validates current and legacy trees and rejects corruption before import", async () => {
  const { validDiagram } = await modules();
  assert.equal(validDiagram(payload()), true);
  assert.equal(validDiagram(tree()), true);
  assert.equal(
    validDiagram(
      JSON.parse(fs.readFileSync("src/assets/examples/example1.json"))
    ),
    true
  );
  for (const bad of [
    {},
    { tree: {} },
    { tree: null },
    { ...payload(), settings: { elements: "bad" } },
    { ...payload(), settings: { uiLanguage: "invalid" } },
  ]) {
    assert.equal(validDiagram(bad), false);
  }
  const cyclic = tree();
  cyclic.followElement = cyclic;
  assert.equal(validDiagram(cyclic), false);
  const tryCatch = {
    id: "try",
    type: "TryCatchNode",
    followElement: null,
    tryChild: tree(),
    catches: [tree()],
  };
  assert.equal(validDiagram(tryCatch), true);
});

test("new/local save downloads; Drive Save As binds later saves to the returned ID", async () => {
  const { c, edit, downloads } = await controller();
  await c.save();
  assert.equal(downloads(), 1);
  c.loaded("local", "local.json");
  c.files.create = async (name, content) => {
    assert.equal(name, "copy.json");
    assert.equal(JSON.parse(content).formatVersion, 2);
    return file;
  };
  await c.save(true);
  assert.equal(c.current.source, "google-drive");
  assert.equal(c.current.file.id, "same-id");
  edit();
  assert.equal(c.dirty(), true);
  c.files.update = async (original, content) => {
    assert.equal(original.id, "same-id");
    return { ...file, version: "2" };
  };
  await c.save();
  assert.equal(c.dirty(), false);
  assert.equal(c.current.file.version, "2");
  assert.equal(downloads(), 1);
});

test("failed saves and edits during an in-flight save remain dirty; duplicate saves are ignored", async () => {
  const { c, edit, alerts } = await controller();
  c.loaded("google-drive", file.name, file);
  edit();
  c.files.update = async () => {
    throw new Error("offline");
  };
  await c.save();
  assert.equal(c.error, "offline");
  assert.deepEqual(alerts, []);
  assert.equal(c.dirty(), true);
  assert.equal(c.busy, false);
  c.loaded("google-drive", file.name, file);
  let finish;
  let calls = 0;
  c.files.update = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const saving = c.save();
  await new Promise((resolve) => setImmediate(resolve));
  edit();
  await c.save();
  finish({ ...file, version: "2" });
  await saving;
  assert.equal(calls, 1);
  assert.equal(c.dirty(), true);
});

test("local copy does not clear unsaved Drive changes; exportedAt is not an edit", async () => {
  const { c, edit } = await controller();
  c.loaded("google-drive", file.name, file);
  c.presenter.getExportPayload().meta.exportedAt = "later";
  assert.equal(c.dirty(), false);
  edit();
  c.download();
  assert.equal(c.dirty(), true);
  assert.equal(c.current.file.id, file.id);
});

test("Drive save overwrites the same file without confirmation after a remote change", async () => {
  const { DriveFiles } = await modules();
  const requests = [];
  const remote = { ...file, version: "2" };
  const files = new DriveFiles({ token: "token" }, async (url, options) => {
    requests.push({ url, options });
    return response(remote);
  });
  await files.update(file, "{}");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.method, "PATCH");
  assert.match(requests[1].url, /upload\/drive\/v3\/files\/same-id\?/);
  assert.equal(requests[1].options.headers.Authorization, "Bearer token");
});

test("opening checks for remote changes during download; create sends JSON metadata and content", async () => {
  const { DriveFiles } = await modules();
  let count = 0;
  const files = new DriveFiles({ token: "t" }, async () =>
    response(
      ++count === 1 ? file : count === 2 ? payload() : { ...file, version: "2" }
    )
  );
  await assert.rejects(files.open(file.id), /changed while opening/);
  files.fetcher = async (url, options) => {
    assert.equal(options.method, "POST");
    assert.match(options.headers["Content-Type"], /^multipart\/related/);
    assert.match(options.body, /"name":"new.json"/);
    assert.match(options.body, /"formatVersion":2/);
    return response(file);
  };
  assert.equal(
    (await files.create("new.json", JSON.stringify(payload()))).id,
    file.id
  );
});

test("expiry, permission, missing file, trash and network errors preserve storage state", async () => {
  const { DriveFiles } = await modules();
  let invalidated = false;
  const auth = {
    token: "t",
    invalidate: () => {
      invalidated = true;
    },
  };
  for (const status of [401, 403, 404, 429, 500]) {
    const files = new DriveFiles(auth, async () => response({}, status));
    await assert.rejects(files.metadata(file.id));
  }
  assert.equal(invalidated, true);
  await assert.rejects(
    new DriveFiles(auth, async () => {
      throw new Error();
    }).metadata(file.id),
    /connection/
  );
  await assert.rejects(
    new DriveFiles(auth, async () =>
      response({ ...file, trashed: true })
    ).metadata(file.id),
    /trash/
  );
  await assert.rejects(
    new DriveFiles(auth, async () =>
      response({ ...file, capabilities: { canEdit: false } })
    ).update(file, "{}"),
    /read-only/
  );
});

test("OAuth requests only drive.file, caches valid tokens, and renews expired tokens on action", async () => {
  const { GoogleAuth, DRIVE_SCOPE, window } = await modules();
  let count = 0;
  window.google = {
    accounts: {
      oauth2: {
        hasGrantedAllScopes: () => true,
        initTokenClient: (config) => {
          assert.equal(config.scope, DRIVE_SCOPE);
          assert.equal(config.include_granted_scopes, false);
          return {
            requestAccessToken: () => {
              count++;
              config.callback({ access_token: "token", expires_in: 3600 });
            },
          };
        },
      },
    },
  };
  const auth = new GoogleAuth("client");
  await auth.authorize();
  await auth.authorize();
  assert.equal(count, 1);
  auth.expiresAt = 0;
  await auth.authorize();
  assert.equal(count, 2);
  window.google.accounts.oauth2.initTokenClient = (config) => ({
    requestAccessToken: () => config.error_callback(),
  });
  auth.invalidate();
  await assert.rejects(auth.authorize(), /cancelled or blocked/);
});

test("official Picker cancellation resolves without importing or clearing the document", async () => {
  const { pickFile, window } = await modules();
  let callback;
  let disposed = false;
  class Builder {
    setDeveloperKey() {
      return this;
    }
    setAppId() {
      return this;
    }
    setOAuthToken() {
      return this;
    }
    setOrigin() {
      return this;
    }
    addView() {
      return this;
    }
    setTitle() {
      return this;
    }
    setCallback(value) {
      callback = value;
      return this;
    }
    build() {
      return {
        setVisible() {
          callback({ action: "cancel" });
        },
        dispose() {
          disposed = true;
        },
      };
    }
  }
  class DocsView {
    setParent(parent) { assert.equal(parent, 'root'); return this; }
    setMode(mode) { assert.equal(mode, 'list'); return this; }

    setIncludeFolders() {
      return this;
    }
    setSelectFolderEnabled() {
      return this;
    }
  }
  window.location = { origin: "http://localhost:8081" };
  window.google = {
    picker: {
      PickerBuilder: Builder,
      DocsView,
      DocsViewMode: { LIST: 'list' }, ViewId: { DOCS: "docs" },
      Action: { CANCEL: "cancel", PICKED: "picked" },
    },
  };
  assert.equal(await pickFile({}, "token"), null);
  assert.equal(disposed, true);
});

test('Drive open reuses importer and preserves current diagram on cancellation or corrupt input', async () => {
  const { c, window, alerts, edit } = await controller();
  let action = 'picked';
  let selectedId = file.id;
  class Builder {
    setDeveloperKey() { return this; } setAppId() { return this; } setOAuthToken() { return this; }
    setOrigin() { return this; } addView() { return this; } setTitle() { return this; }
    setCallback(callback) { this.callback = callback; return this; }
    build() { return { setVisible: () => this.callback({ action, docs: [{ id: selectedId }] }), dispose() {} }; }
  }
  class DocsView {
    setParent(parent) { assert.equal(parent, 'root'); return this; }
    setMode(mode) { assert.equal(mode, 'list'); return this; }
 setIncludeFolders() { return this; } setSelectFolderEnabled() { return this; } }
  window.location = { origin: 'http://localhost:8081' };
  window.google = { picker: { PickerBuilder: Builder, DocsView, DocsViewMode: { LIST: 'list' }, ViewId: { DOCS: 'docs' }, Action: { CANCEL: 'cancel', PICKED: 'picked' } } };
  let content = JSON.stringify(payload());
  c.files.open = async id => ({ file: { ...file, id }, content });
  await c.open();
  assert.equal(c.current.file.id, file.id);
  assert.equal(c.current.source, 'google-drive');
  assert.equal(c.dirty(), false);
  edit();
  const previous = c.current;
  await c.open(); // The same Drive file reuses its existing tab.
  assert.equal(c.current, previous);
  assert.equal(c.dirty(), true);
  action = 'cancel';
  await c.open();
  assert.equal(c.current, previous);
  action = 'picked';
  selectedId = 'invalid-id';
  content = '{broken';
  await c.open();
  content = JSON.stringify({ tree: {} });
  await c.open();
  assert.equal(c.current, previous);
  assert.equal(c.dirty(), true);
  assert.equal(c.error, "importExport.unknownImportFormat");
  assert.equal(alerts.length, 0);
});

test('Drive save follows Save As in the toolbar and offers Save As for new/local diagrams', async () => {
  const { c, context, window, downloads } = await controller();
  class Element {
    constructor() { this.dataset = {}; this.children = []; this.listeners = {}; }
    appendChild(child) { this.children.push(child); }
    setAttribute() {}
    addEventListener(type, callback) { this.listeners[type] = callback; }
  }
  context.HTMLElement = Element;
  context.document = { createElement: () => new Element(), getElementById: () => null, addEventListener() {} };
  window.addEventListener = () => {};
  window.confirm = () => { throw new Error('Saving must not ask for overwrite confirmation'); };
  c.configured = true;
  const target = new Element();
  c.mount(target);
  const controls = target.children[0].children;
  assert.equal(controls.indexOf(c.saveDriveButton), controls.indexOf(c.saveAsButton) + 1);
  let picked = 0;
  c.chooseSaveAsFolder = () => { picked++; };
  for (const source of ['new', 'local']) {
    c.loaded(source, 'test');
    assert.equal(c.saveDriveButton.disabled, false);
    c.saveDriveButton.listeners.click();
  }
  assert.equal(picked, 2);
  assert.equal(downloads(), 0);
  c.loaded('google-drive', file.name, file);
  let updated = 0;
  c.files.update = async original => { updated++; assert.equal(original.id, file.id); return file; };
  await c.saveToDrive();
  assert.equal(updated, 1);
  assert.equal(picked, 2);
  c.busy = true;
  c.refresh();
  assert.equal(c.saveDriveButton.disabled, true);
  await c.saveToDrive();
  assert.equal(updated, 1);
  c.busy = false;
  c.loaded('google-drive', file.name, { ...file, capabilities: { canEdit: false } });
  assert.equal(c.saveDriveButton.disabled, true);
  assert.equal(c.saveAsButton.disabled, false);
});

test('Ctrl+S and Cmd+S commit the active field and save the current Drive file', async () => {
  const { c, context, window, edit } = await controller();
  const listeners = {};
  class Element {
    constructor() { this.dataset = {}; }
    appendChild() {}
    setAttribute() {}
    addEventListener() {}
    blur() { edit(); }
  }
  context.HTMLElement = Element;
  context.document = {
    activeElement: new Element(),
    createElement: () => new Element(), getElementById: () => null,
    addEventListener: (type, callback) => { listeners[type] = callback; }
  };
  window.addEventListener = () => {};
  c.mount(new Element());
  c.loaded('google-drive', file.name, file);
  let calls = 0;
  c.files.update = async (original, content) => {
    calls++;
    assert.equal(original.id, file.id);
    assert.match(JSON.parse(content).meta.structoName, /edited/);
    return file;
  };
  for (const modifier of ['ctrlKey', 'metaKey']) {
    let prevented = false;
    listeners.keydown({ [modifier]: true, key: 's', preventDefault: () => { prevented = true; } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(prevented, true);
    assert.equal(c.dirty(), false);
  }
  assert.equal(calls, 2);
});

test('opening a selected but inaccessible file reports the failing stage and project configuration', async () => {
  const { DriveFiles } = await modules();
  const files = new DriveFiles({ token: 't' }, async () => response({}, 404));
  await assert.rejects(files.open(file.id), /404 while reading file details.*numeric Cloud project number/);
  let count = 0;
  files.fetcher = async () => ++count === 1 ? response(file) : response({}, 404);
  await assert.rejects(files.open(file.id), /404 while downloading file contents/);
  await assert.rejects(files.open(undefined), /valid file ID/);
});

test('Picker rejects a textual project ID before contacting Google', async () => {
  const { pickFile } = await modules();
  await assert.rejects(pickFile({ appId: 'my-cloud-project' }, 't'), /numeric Google Cloud project number/);
});

test('recent Drive files persist by ID in most-recent order and storage failures are harmless', async () => {
  const { c, window } = await controller();
  const storage = new Map();
  window.localStorage = {
    getItem: key => storage.get(key),
    setItem: (key, value) => storage.set(key, value)
  };
  for (let index = 0; index < 8; index++) c.remember({ id: String(index), name: `file-${index}.json`, secret: 'not stored' });
  c.remember({ id: '4', name: 'renamed.json' });
  assert.deepEqual(JSON.parse(JSON.stringify(c.recentFiles())), [
    { id: '4', name: 'renamed.json' },
    { id: '7', name: 'file-7.json' },
    { id: '6', name: 'file-6.json' },
    { id: '5', name: 'file-5.json' },
    { id: '3', name: 'file-3.json' },
    { id: '2', name: 'file-2.json' }
  ]);
  storage.set('struktog_drive_recent', '{broken');
  assert.equal(c.recentFiles().length, 0);
  window.localStorage.setItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => c.remember(file));
});

test('new diagram opens a separate tab and preserves unsaved Drive work', async () => {
  const { c, edit, window } = await controller();
  c.loaded('google-drive', file.name, file);
  const first = c.activeTabId;
  edit();
  c.presenter.undoList = ['old-history'];
  window.confirm = () => { throw new Error('New must not discard the previous document'); };
  c.newDiagram();
  assert.equal(c.tabs.length, 2);
  assert.equal(c.current.source, 'new');
  assert.equal(c.current.file, null);
  assert.equal(c.dirty(), false);
  assert.equal(c.presenter.undoList.length, 0);
  c.activateTab(first);
  assert.equal(c.current.file.id, file.id);
  assert.equal(c.dirty(), true);
  assert.deepEqual(c.presenter.undoList, ['old-history']);
  c.busy = true;
  c.newDiagram();
  assert.equal(c.tabs.length, 2);
});

test('named Drive Save As creates a new file and keeps edits during upload dirty', async () => {
  const { c, edit, window } = await controller();
  window.prompt = () => { throw new Error('UI name must bypass the prompt'); };
  c.loaded('google-drive', file.name, file);
  c.files.update = () => { throw new Error('Save As must create a new file'); };
  c.files.create = async (name, content) => {
    assert.equal(name, 'lesson.json');
    assert.equal(JSON.parse(content).formatVersion, 2);
    edit();
    return { ...file, id: 'new-id', name };
  };
  await c.save(true, '  lesson  ');
  assert.equal(c.current.file.id, 'new-id');
  assert.equal(c.dirty(), true);
});

test('recent-file selection opens the stored ID without invoking Picker', async () => {
  const { c } = await controller();
  c.files.open = async id => {
    assert.equal(id, 'recent-id');
    return { file: { ...file, id }, content: JSON.stringify(payload()) };
  };
  // No Google Picker is installed in this context.
  await c.open('recent-id');
  assert.equal(c.current.file.id, 'recent-id');
  assert.equal(c.current.source, 'google-drive');
  assert.equal(c.dirty(), false);
});

test('Google sign-in timeout and cancellation ignore late callbacks and leave tokens unset', async () => {
  const { GoogleAuth, window } = await modules();
  let callback;
  window.google = { accounts: { oauth2: {
    hasGrantedAllScopes: () => true,
    initTokenClient: config => {
      callback = config.callback;
      return { requestAccessToken() {} };
    }
  } } };
  const auth = new GoogleAuth('client');
  await assert.rejects(auth.authorize(undefined, 10), /did not finish/);
  callback({access_token: 'late-token', expires_in: 3600});
  assert.equal(auth.token, null);
  const abort = new AbortController();
  const pending = auth.authorize(abort.signal);
  abort.abort();
  await assert.rejects(pending, {name: 'AbortError'});
  callback({access_token: 'cancelled-token', expires_in: 3600});
  assert.equal(auth.token, null);
});

test('cancelling a pending Google sign-in unlocks controls without an alert or file operation', async () => {
  const { c, edit, alerts } = await controller();
  edit();
  c.auth.authorize = signal => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason));
  });
  let operations = 0;
  const pending = c.run(() => { operations++; });
  assert.equal(c.busy, true);
  assert.equal(c.waitingForGoogle, true);
  c.cancelGoogleWait();
  await pending;
  assert.equal(c.busy, false);
  assert.equal(c.waitingForGoogle, false);
  assert.equal(c.dirty(), true);
  assert.equal(operations, 0);
  assert.equal(c.error, '');
  assert.deepEqual(alerts, []);
});

test('picker cancellation disposes the overlay and ignores late selection', async () => {
  const { pickFile, window } = await modules();
  let callback;
  let disposed = 0;
  class Builder {
    setDeveloperKey() { return this; } setAppId() { return this; } setOAuthToken() { return this; }
    setOrigin() { return this; } addView() { return this; } setTitle() { return this; }
    setCallback(value) { callback = value; return this; }
    build() { return { setVisible() {}, dispose() { disposed++; } }; }
  }
  class DocsView {
    setIncludeFolders() { return this; } setSelectFolderEnabled() { return this; }
    setMode() { return this; } setParent() { return this; }
  }
  window.location = {origin: 'http://localhost:8081'};
  window.google = {picker: {PickerBuilder: Builder, DocsView, DocsViewMode: {LIST:'list'}, ViewId: {DOCS:'docs'}, Action: {CANCEL:'cancel',PICKED:'picked'}}};
  const abort = new AbortController();
  const pending = pickFile({}, 'token', abort.signal);
  abort.abort();
  await assert.rejects(pending, {name:'AbortError'});
  callback({action:'picked',docs:[file]});
  assert.equal(disposed, 1);
});

test('a network failure restores controls and reports an inline error without alerting', async () => {
  const { c, alerts, edit } = await controller();
  c.loaded('google-drive', file.name, file);
  edit();
  c.files.update = async () => { throw new Error('network failure'); };
  await c.save();
  assert.equal(c.busy, false);
  assert.equal(c.waitingForGoogle, false);
  assert.equal(c.error, 'network failure');
  assert.equal(c.dirty(), true);
  assert.deepEqual(alerts, []);
});

function folderPicker(window, selection = {id:'folder-id',name:'Lessons',mimeType:'application/vnd.google-apps.folder'}) {
  let disposed = 0;
  class DocsView {
    constructor(id) { assert.equal(id,'folders'); }
    setIncludeFolders(value) { assert.equal(value,true); return this; }
    setSelectFolderEnabled(value) { assert.equal(value,true); return this; }
    setMode(value) { assert.equal(value,'list'); return this; }
    setParent(value) { assert.equal(value,'root'); return this; }
    setMimeTypes(value) { assert.equal(value,'application/vnd.google-apps.folder'); return this; }
  }
  class Builder {
    setDeveloperKey() { return this; } setAppId() { return this; } setOAuthToken() { return this; }
    setOrigin() { return this; } addView() { return this; }
    setTitle(value) { assert.equal(value,'toolbar.folderPickerTitle'); return this; }
    setCallback(callback) { this.callback=callback; return this; }
    build() { return {setVisible:()=>this.callback(selection ? {action:'picked',docs:[selection]} : {action:'cancel'}),dispose:()=>{disposed++;}}; }
  }
  window.location={origin:'http://localhost:8081'};
  window.google={picker:{DocsView,PickerBuilder:Builder,ViewId:{FOLDERS:'folders'},DocsViewMode:{LIST:'list'},Action:{PICKED:'picked',CANCEL:'cancel'}}};
  return ()=>disposed;
}

test('Drive Save As selects a folder before asking for the filename; cancelling never uploads', async () => {
  const {c,window}=await controller();
  c.configured=true;
  const disposed=folderPicker(window);
  let destination;
  c.openSaveAsDialog=folder=>{assert.equal(c.busy,false);destination=folder;};
  c.files.create=()=>{throw new Error('No upload before entering the filename');};
  await c.chooseSaveAsFolder();
  assert.equal(destination.id,'folder-id');
  assert.equal(disposed(),1);
  assert.equal(c.waitingForGoogle,false);
  const previous=c.current;
  destination=null;
  folderPicker(window,null);
  await c.chooseSaveAsFolder();
  assert.equal(destination,null);
  assert.equal(c.current,previous);
  assert.equal(c.busy,false);
});

test('folder picker rejects a non-folder selection and cleans up', async () => {
  const {pickFolder,window}=await modules();
  const disposed=folderPicker(window,{id:'file-id',name:'file.json',mimeType:'application/json'});
  await assert.rejects(pickFolder({},'token'),/invalidFolder/);
  assert.equal(disposed(),1);
});

test('folder upload includes the selected parent and supports shared drives', async () => {
  const {DriveFiles}=await modules();
  const files=new DriveFiles({token:'t'},async(url,options)=>{
    assert.match(url,/supportsAllDrives=true/);
    const metadata=JSON.parse(options.body.split('\r\n\r\n')[1].split('\r\n--')[0]);
    assert.deepEqual(metadata,{name:'lesson.json',mimeType:'application/json',parents:['chosen-folder']});
    assert.match(options.body,/"formatVersion":2/);
    return response(file);
  });
  await files.create('lesson.json',JSON.stringify(payload()),'chosen-folder');
  await assert.rejects(files.create('lesson.json','{}',''),/valid Google Drive folder/);
});

test('Save As passes the selected folder to create and subsequent save updates the new file', async () => {
  const {c,edit}=await controller();
  c.loaded('google-drive',file.name,file);
  c.files.create=async(name,content,parentId)=>{
    assert.equal(parentId,'chosen-folder');
    return {...file,id:'folder-copy',name,parents:[parentId]};
  };
  await c.save(true,'lesson','chosen-folder');
  assert.equal(c.current.file.id,'folder-copy');
  edit();
  c.files.update=async original=>{
    assert.equal(original.id,'folder-copy');
    assert.equal(original.parents[0],'chosen-folder');
    return {...original,version:'2'};
  };
  await c.save();
  assert.equal(c.current.file.version,'2');
  assert.equal(c.dirty(),false);
});

test('recent paths resolve nested Drive folder names from root to parent', async () => {
  const {DriveFiles}=await modules();
  const folders={lesson:{id:'lesson',name:'Loops',parents:['course']},course:{id:'course',name:'Course',parents:['root']},root:{id:'root',name:'My Drive'}};
  const signals=[];
  const files=new DriveFiles({token:'t'},async(url,options)=>{
    assert.match(url,/parents/);
    signals.push(options.signal);
    return response(folders[new URL(url).pathname.split('/').pop()]);
  });
  assert.equal(await files.folderPath({...file,parents:['lesson']}),'My Drive / Course / Loops');
  assert.ok(signals.every(signal=>signal===signals[0]),'All path requests share one timeout');
});

test('inaccessible ancestors return a partial path and a known selected folder is retained', async () => {
  const {DriveFiles}=await modules();
  const files=new DriveFiles({token:'t'},async url=>url.includes('/lesson?') ? response({id:'lesson',name:'Loops',parents:['private']}) : response({},403));
  assert.equal(await files.folderPath({...file,parents:['lesson']}),'… / Loops');
  assert.equal(await files.folderPath({...file,parents:['private']},{id:'private',name:'Private lessons'}),'… / Private lessons');
  assert.equal(await files.folderPath({...file,parents:['private']}),'');
});

test('cyclic folder metadata cannot make path resolution loop forever', async () => {
  const {DriveFiles}=await modules();
  let requests=0;
  const files=new DriveFiles({token:'t'},async()=>{requests++;return response({id:'cycle',name:'Cycle',parents:['cycle']});});
  assert.equal(await files.folderPath({...file,parents:['cycle']}),'… / Cycle');
  assert.equal(requests,1);
});

test('path enrichment upgrades old recents without changing their order or clearing a saved path', async () => {
  const {c,window}=await controller();
  let stored=JSON.stringify([{id:'a',name:'same.json'},{id:'b',name:'same.json'}]);
  window.localStorage={getItem:()=>stored,setItem:(key,value)=>{stored=value;}};
  let resolve;
  c.files.folderPath=()=>new Promise(finish=>{resolve=finish;});
  const pending=c.enrichRecentPath({id:'a',name:'same.json'});
  c.remember({id:'b',name:'same.json',path:'My Drive / B'});
  resolve('My Drive / A');
  await pending;
  assert.deepEqual(JSON.parse(stored),[{id:'b',name:'same.json',path:'My Drive / B'},{id:'a',name:'same.json',path:'My Drive / A'}]);
  c.remember({id:'a',name:'renamed.json'});
  assert.equal(c.recentFiles()[0].path,'My Drive / A');
  c.files.folderPath=async()=> '… / A';
  await c.enrichRecentPath({id:'a'});
  assert.equal(c.recentFiles()[0].path,'My Drive / A');
});

test('late path lookups cannot overwrite a newer destination or reinsert an evicted recent', async () => {
  const {c,window}=await controller();
  let stored='[]';
  window.localStorage={getItem:()=>stored,setItem:(key,value)=>{stored=value;}};
  const old={id:'a',name:'same.json',parents:['old-folder']};
  c.remember(old);
  let resolve;
  c.files.folderPath=()=>new Promise(finish=>{resolve=finish;});
  const pending=c.enrichRecentPath(old);
  c.remember({...old,parents:['new-folder'],path:'My Drive / New'});
  resolve('My Drive / Old');
  await pending;
  assert.equal(c.recentFiles()[0].path,'My Drive / New');
  const evicted=c.enrichRecentPath({id:'a'});
  stored='[]';
  resolve('My Drive / Old');
  await evicted;
  assert.equal(c.recentFiles().length,0);
});

test('a root-level Pastebin folder resolves even when root metadata is denied', async () => {
  const {DriveFiles}=await modules();
  for (const deniedStatus of [403,404]) {
    const requests=[];
    const files=new DriveFiles({token:'t'},async(url,options)=>{
      requests.push({url,signal:options.signal});
      const path=new URL(url).pathname;
      if (path==='/drive/v3/files/pastebin') return response({id:'pastebin',name:'Pastebin',parents:['root-id']});
      if (path==='/drive/v3/files/root-id') return response({},deniedStatus);
      if (path==='/drive/v2/files/pastebin/parents/root-id') {
        assert.equal(new URL(url).searchParams.get('fields'),'isRoot');
        return response({isRoot:true});
      }
      throw new Error('Unexpected request');
    });
    assert.equal(await files.folderPath({...file,parents:['pastebin']}),'toolbar.myDrive / Pastebin');
    assert.equal(requests.length,3);
    assert.ok(requests.every(request=>request.signal===requests[0].signal));
  }
});

test('a file directly in My Drive resolves from its parent reference', async () => {
  const {DriveFiles}=await modules();
  const files=new DriveFiles({token:'t'},async url=>new URL(url).pathname==='/drive/v2/files/same-id/parents/root-id' ? response({isRoot:true}) : response({},404));
  assert.equal(await files.folderPath({...file,parents:['root-id']}),'toolbar.myDrive');
});

test('unavailable non-root parents and denied parent-reference checks remain partial', async () => {
  const {DriveFiles}=await modules();
  for (const parentResponse of [()=>response({isRoot:false}),()=>response({},403),()=>response({})]) {
    const files=new DriveFiles({token:'t'},async url=>{
      const path=new URL(url).pathname;
      if (path==='/drive/v3/files/pastebin') return response({id:'pastebin',name:'Pastebin',parents:['private-parent']});
      if (path.startsWith('/drive/v2/')) return parentResponse();
      return response({},404);
    });
    assert.equal(await files.folderPath({...file,parents:['pastebin']}),'… / Pastebin');
  }
});

test('root identification upgrades an existing partial recent path without changing order', async () => {
  const {c,window}=await controller();
  let stored=JSON.stringify([{id:'other',name:'other.json'},{id:file.id,name:file.name,path:'… / Pastebin',parentId:'pastebin'}]);
  window.localStorage={getItem:()=>stored,setItem:(key,value)=>{stored=value;}};
  c.files.fetcher=async url=>{
    const path=new URL(url).pathname;
    if (path==='/drive/v3/files/same-id') return response({...file,parents:['pastebin']});
    if (path==='/drive/v3/files/pastebin') return response({id:'pastebin',name:'Pastebin',parents:['root-id']});
    if (path==='/drive/v2/files/pastebin/parents/root-id') return response({isRoot:true});
    return response({},404);
  };
  await c.enrichRecentPath({id:file.id,name:file.name,path:'… / Pastebin'});
  assert.equal(c.recentFiles()[0].id,'other');
  assert.equal(c.recentFiles()[1].path,'toolbar.myDrive / Pastebin');
});

test('configured Drive remains dormant until explicitly activated', async () => {
  const {DocumentController}=await modules();
  const presenter={getStructogramName:()=> 'test',getExportPayload:payload};
  const c=new DocumentController(presenter,{clientId:'client',apiKey:'key',appId:'123'});
  let initialized=0;
  c.auth.initialize=async()=>{initialized++;};
  assert.equal(c.activated,false);
  assert.equal(await c.prepare(),false);
  assert.equal(initialized,0);
  await c.open();
  assert.equal(c.activationRequested,true);
  assert.equal(initialized,0);
  assert.equal(c.busy,false);
});

test('Drive Save As asks for activation before authorizing or opening Picker', async () => {
  const {c}=await controller();
  c.activated=false;
  let authorized=0;
  c.auth.authorize=()=>{authorized++;};
  await c.chooseSaveAsFolder();
  assert.equal(c.activationRequested,true);
  assert.equal(authorized,0);
  assert.equal(c.busy,false);
});

test('local tabs isolate content, dirty state, selection history and invalid imports', async () => {
  const { c, edit } = await controller();
  c.importDiagram(payload(), 'first.json');
  const first = c.activeTabId;
  assert.equal(c.tabs.length, 1, 'The initial empty tab is replaced');
  edit();
  c.presenter.undoList = ['first-undo'];
  c.presenter.redoList = ['first-redo'];
  const second = payload();
  second.meta.structoName = 'second';
  c.importDiagram(second, 'second.json');
  assert.equal(c.tabs.length, 2);
  assert.equal(c.dirty(), false);
  assert.equal(c.hasUnsavedChanges(), true, 'Inactive unsaved work must trigger the browser exit warning');
  assert.equal(c.presenter.undoList.length, 0);
  const active = c.activeTabId;
  assert.equal(c.importDiagram({ tree: {} }, 'broken.json'), false);
  assert.equal(c.activeTabId, active);
  assert.equal(c.tabs.length, 2);
  c.activateTab(first);
  assert.equal(c.presenter.getExportPayload().meta.structoName, 'test edited');
  assert.equal(c.dirty(), true);
  assert.deepEqual(c.presenter.undoList, ['first-undo']);
  assert.deepEqual(c.presenter.redoList, ['first-redo']);
  c.activateTab(active);
  assert.equal(c.presenter.getStructogramName(), 'second');
  assert.equal(c.presenter.undoList.length, 0);
});

test('closing tabs confirms only unsaved work and closing the last tab leaves one new diagram', async () => {
  const { c, edit, window } = await controller();
  edit();
  const first = c.activeTabId;
  c.newDiagram();
  const second = c.activeTabId;
  c.closeTab(first); // Default confirmation cancels.
  assert.equal(c.tabs.length, 2);
  assert.equal(c.activeTabId, second);
  window.confirm = () => true;
  c.closeTab(first);
  assert.equal(c.tabs.length, 1);
  assert.equal(c.activeTabId, second);
  c.closeTab(second);
  assert.equal(c.tabs.length, 1);
  assert.notEqual(c.activeTabId, second);
  assert.equal(c.current.source, 'new');
  assert.equal(c.dirty(), false);
  c.importDiagram(payload(), 'last.json');
  const selected = c.activeTabId;
  c.closeTab(selected);
  assert.equal(c.tabs.length, 1);
  assert.notEqual(c.activeTabId, selected);
});

test('each Drive tab saves to its own file and reopening an open ID preserves edits', async () => {
  const { c, edit } = await controller();
  let reads = 0;
  c.files.open = async id => { reads++; return { file: { ...file, id, name: id + '.json' }, content: JSON.stringify(payload()) }; };
  await c.open('drive-one');
  const first = c.activeTabId;
  edit();
  await c.open('drive-two');
  const second = c.activeTabId;
  const updates = [];
  c.files.update = async original => { updates.push(original.id); return { ...original, version: '2' }; };
  await c.save();
  await c.open('drive-one');
  assert.equal(c.activeTabId, first);
  assert.equal(c.dirty(), true);
  assert.equal(reads, 2, 'Already-open files must not be downloaded over existing work');
  await c.save();
  assert.equal(c.dirty(), false);
  c.activateTab(second);
  assert.equal(c.current.file.id, 'drive-two');
  assert.deepEqual(updates, ['drive-two', 'drive-one']);
});

test('tab switches and closes are blocked during a Drive upload', async () => {
  const { c } = await controller();
  c.importDiagram(payload(), file.name, 'google-drive', file);
  const first = c.activeTabId;
  c.newDiagram();
  const second = c.activeTabId;
  c.activateTab(first);
  let complete;
  c.files.update = () => new Promise(resolve => { complete = resolve; });
  const saving = c.save();
  await new Promise(resolve => setImmediate(resolve));
  c.activateTab(second);
  c.closeTab(first);
  assert.equal(c.activeTabId, first);
  assert.equal(c.tabs.length, 2);
  complete(file);
  await saving;
  c.activateTab(second);
  assert.equal(c.activeTabId, second);
});

test('failed imports roll back to the current tab without losing content or undo history', async () => {
  const { c, edit } = await controller();
  edit();
  c.presenter.undoList = ['keep'];
  const first = c.activeTabId;
  c.presenter.applyImportedData = () => { c.presenter.setStructogramName('half imported'); throw new Error('import failed'); };
  assert.throws(() => c.importDiagram(payload(), 'broken.json'), /import failed/);
  assert.equal(c.tabs.length, 1);
  assert.equal(c.activeTabId, first);
  assert.equal(c.presenter.getStructogramName(), 'test edited');
  assert.deepEqual(c.presenter.undoList, ['keep']);
  assert.equal(c.dirty(), true);
  assert.equal(c.transitioning, false);
});

test('workspace recovery restores all tabs and unsaved flags without retaining live Drive associations', async () => {
  const { c, edit, window } = await controller();
  window.persistWorkspace = true;
  c.restoreWorkspace();
  c.importDiagram(payload(), 'drive.json', 'google-drive', file);
  const first = c.activeTabId;
  edit();
  c.newDiagram();
  c.persistWorkspace();
  const saved = window.localStorage.getItem('struktog_open_tabs');
  assert.ok(saved);
  assert.equal(saved.includes(file.id), false, 'Drive association is confined to the running app');
  const restored = await controller();
  restored.window.persistWorkspace = true;
  restored.window.localStorage.setItem('struktog_open_tabs', saved);
  restored.c.restoreWorkspace();
  assert.equal(restored.c.tabs.length, 2);
  assert.equal(restored.c.current.source, 'new');
  restored.c.activateTab(restored.c.tabs[0].id);
  assert.equal(restored.c.current.source, 'local');
  assert.equal(restored.c.current.file, null);
  assert.equal(restored.c.presenter.getStructogramName(), 'test edited');
  assert.equal(restored.c.dirty(), true);
  c.activateTab(first);
  assert.equal(c.current.file.id, file.id, 'The original running tab keeps its Drive association');
});

test('session-only tabs do not serialize workspace data and corrupt recovery keeps the existing diagram', async () => {
  const { c, window } = await controller();
  c.restoreWorkspace();
  c.newDiagram();
  c.persistWorkspace();
  assert.equal(window.localStorage.getItem('struktog_open_tabs'), null);
  const restored = await controller();
  restored.window.persistWorkspace = true;
  restored.window.localStorage.setItem('struktog_open_tabs', JSON.stringify({ tabs: [{ name: 'bad', saved: '', payload: {tree: {}} }] }));
  restored.c.restoreWorkspace();
  assert.equal(restored.c.tabs.length, 1);
  assert.equal(restored.c.presenter.getStructogramName(), 'test');
});

test('creating a Drive folder uses the selected parent, shared-drive support, and metadata-only JSON', async () => {
  const { DriveFiles } = await modules();
  let requests = 0;
  const files = new DriveFiles({ token: 'token' }, async (url, options) => {
    requests++;
    assert.equal(new URL(url).origin, 'https://www.googleapis.com');
    assert.equal(new URL(url).pathname, '/drive/v3/files');
    assert.equal(new URL(url).searchParams.get('supportsAllDrives'), 'true');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(options.body), {
      name: 'Lessons', mimeType: 'application/vnd.google-apps.folder', parents: ['chosen-parent'],
    });
    return response({ id: 'new-folder', name: 'Lessons', parents: ['chosen-parent'] });
  });
  assert.equal((await files.createFolder(' Lessons ', 'chosen-parent')).id, 'new-folder');
  await assert.rejects(files.createFolder('  ', 'chosen-parent'), /folderNameRequired/);
  await assert.rejects(files.createFolder('Lessons', ''), /invalidFolder/);
  assert.equal(requests, 1);
});

test('folder creation reports Drive errors and rejects a missing folder ID', async () => {
  const { DriveFiles } = await modules();
  const denied = new DriveFiles({ token: 'token' }, async () => response({}, 403));
  await assert.rejects(denied.createFolder('Lessons', 'parent'), /denied access/);
  const invalid = new DriveFiles({ token: 'token' }, async () => response({ name: 'Lessons' }));
  await assert.rejects(invalid.createFolder('Lessons', 'parent'), /invalidFolder/);
});

async function saveFolderDialog() {
  const setup = await controller();
  const elements = [];
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.isConnected = true; this.value = ''; }
    appendChild(child) { this.children.push(child); }
    setAttribute() {}
    addEventListener(type, listener) { this.listeners[type] = listener; }
    focus() {}
    setSelectionRange() {}
    showModal() { this.open = true; }
    close() { this.open = false; this.listeners.close?.(); }
    remove() { this.isConnected = false; }
    click() { if (!this.disabled) return this.listeners.click?.(); }
  }
  setup.context.document = {
    createElement: tag => { const element = new Element(tag); elements.push(element); return element; },
    body: new Element('body'),
  };
  setup.c.refresh = () => {};
  setup.c.configured = true;
  setup.c.saveAsButton = new Element('button');
  setup.c.openSaveAsDialog({ id: 'parent', name: 'Parent' });
  return { ...setup, elements, byId: id => elements.find(element => element.id === id), button: key => elements.find(element => element.textContent === 'toolbar.' + key) };
}

test('Save As creates a subfolder, uses it for saving, and prevents concurrent submissions', async () => {
  const { c, elements, byId, button } = await saveFolderDialog();
  let finish;
  let folders = 0;
  c.files.createFolder = (name, parent) => {
    folders++;
    assert.equal(name, 'Lessons');
    assert.equal(parent, 'parent');
    return new Promise(resolve => { finish = resolve; });
  };
  let saved;
  c.save = (...args) => { saved = args; };
  button('newFolder').click();
  byId('drive-new-folder-name').value = 'Lessons';
  const pending = button('createFolder').click();
  const form = elements.find(element => element.tag === 'form');
  form.listeners.submit({ preventDefault() {} });
  assert.equal(saved, undefined);
  assert.equal(button('saveDrive').disabled, true);
  assert.equal(button('createFolder').disabled, true);
  // Authorization completes before the API call.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(folders, 1);
  finish({ id: 'created-folder', name: 'Lessons' });
  await pending;
  assert.equal(button('saveDrive').disabled, false);
  assert.equal(elements.find(element => element.className === 'document-save-destination').textContent, 'toolbar.destination');
  byId('drive-save-name').value = 'lesson.json';
  form.listeners.submit({ preventDefault() {} });
  assert.deepEqual(saved, [true, 'lesson.json', 'created-folder', 'Lessons']);
});

test('failed folder creation stays in Save As and cancellation never creates a folder', async () => {
  const { c, elements, byId, button } = await saveFolderDialog();
  let calls = 0;
  c.files.createFolder = async () => { calls++; throw new Error('Permission denied'); };
  button('newFolder').click();
  // Empty folder names do not trigger requests.
  await button('createFolder').click();
  assert.equal(calls, 0);
  byId('drive-new-folder-name').value = 'Lessons';
  await button('createFolder').click();
  assert.equal(calls, 1);
  assert.equal(c.nameDialog.open, true);
  const error = elements.find(element => element.className === 'document-error');
  assert.equal(error.textContent, 'Permission denied');
  assert.equal(error.hidden, false);
  assert.equal(button('saveDrive').disabled, false);
  elements.find(element => element.textContent === 'common.cancel').click();
  assert.equal(c.nameDialog, null);
  assert.equal(calls, 1);
});

test('optional headline metadata is backward compatible and validates its type', async () => {
  const { validDiagram } = await modules();
  const original = payload();
  assert.equal(validDiagram(original), true);
  assert.equal(validDiagram({ ...original, meta: { ...original.meta, headline: '' } }), true);
  assert.equal(validDiagram({ ...original, meta: { ...original.meta, headline: 'Algorithm A' } }), true);
  assert.equal(validDiagram({ ...original, meta: { ...original.meta, headline: 42 } }), false);
  assert.equal(validDiagram(tree()), true);
});

test('new diagrams start with an empty headline without changing another tab headline', async () => {
  const { c } = await controller();
  c.presenter.getExportPayload().meta.headline = 'First headline';
  c.newDiagram();
  assert.equal(c.presenter.getExportPayload().meta.headline, '');
  c.activateTab(c.tabs[0].id);
  assert.equal(c.presenter.getExportPayload().meta.headline, 'First headline');
});


test('empty headline metadata does not mark legacy documents as modified', async () => {
  const { c } = await controller();
  c.presenter.getExportPayload().meta.headline = '';
  assert.equal(c.dirty(), false);
  c.presenter.getExportPayload().meta.headline = 'A separate headline';
  assert.equal(c.dirty(), true);
  assert.equal(c.presenter.getStructogramName(), 'test');
});
