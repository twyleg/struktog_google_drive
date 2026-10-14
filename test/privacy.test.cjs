const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const CHOICE='struktog_privacy_choices_v1';
async function privacy(initial={}, extras={}) {
  const data=new Map(Object.entries(initial));
  const reads=[];
  const writes=[];
  const device={
    getItem:key=>{reads.push(key);return data.has(key)?data.get(key):null;},
    setItem:(key,value)=>{writes.push(key);data.set(key,String(value));},
    removeItem:key=>data.delete(key)
  };
  const context=vm.createContext({window:{localStorage:device,location:{href:'https://example.test/editor/index.html'},...extras.window},console,URL,...extras});
  const cache=new Map();
  async function load(file) {
    file=path.resolve(file);
    if(cache.has(file))return cache.get(file);
    const module=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});
    cache.set(file,module);
    await module.link((name,parent)=>load(path.resolve(path.dirname(parent.identifier),name)));
    return module;
  }
  const module=await load('src/privacy/storage.js');
  await module.evaluate();
  return {api:module.namespace,data,reads,writes,device,load,context};
}

test('no workspace data is read or persisted before a storage choice',async()=>{
  const {api,data,reads,writes}=await privacy({tree:'old diagram',struktog_drive_recent:'private filenames'});
  assert.deepEqual(reads,[CHOICE]);
  assert.equal(api.storage.getItem('tree'),null);
  assert.equal('tree' in api.storage,false);
  api.storage.tree='current diagram';
  api.storage.setItem('struktog_code','current code');
  assert.equal(api.storage.tree,'current diagram');
  assert.equal('tree' in api.storage,true);
  assert.equal(api.storage.getItem('struktog_code'),'current code');
  assert.equal(data.get('tree'),'old diagram');
  assert.deepEqual(writes,[]);
});

test('enabling storage persists the active session and restores it on later visits',async()=>{
  const p=await privacy();
  p.api.storage.tree='diagram';
  p.api.storage.lang='Python';
  assert.equal(p.api.setWorkspacePersistence(true),true);
  assert.equal(p.data.get('tree'),'diagram');
  p.api.storage.setItem('struktog_drive_recent','[]');
  const later=await privacy(Object.fromEntries(p.data));
  assert.equal(later.api.workspacePersistenceEnabled(),true);
  assert.equal(later.api.storage.tree,'diagram');
  assert.equal(later.api.storage.lang,'Python');
});

test('withdrawal deletes saved workspace data but preserves the current tab and unrelated data',async()=>{
  const p=await privacy({[CHOICE]:JSON.stringify({workspace:true,offline:false}),tree:'saved diagram',struktog_code:'saved code',unrelated:'keep'});
  p.api.storage.tree='edited diagram';
  p.api.setWorkspacePersistence(false);
  assert.equal(p.data.has('tree'),false);
  assert.equal(p.data.has('struktog_code'),false);
  assert.equal(p.data.get('unrelated'),'keep');
  assert.equal(p.api.storage.tree,'edited diagram');
  assert.equal(p.api.storage.getItem('struktog_code'),'saved code');
  const later=await privacy(Object.fromEntries(p.data));
  assert.equal(later.api.workspacePersistenceEnabled(),false);
  assert.equal(later.api.storage.tree,null);
});

test('blocked or full storage leaves editing and code copy available in memory',async()=>{
  const p=await privacy();
  p.device.setItem=()=>{throw new Error('blocked');};
  assert.equal(p.api.setWorkspacePersistence(true),false);
  p.api.storage.tree='diagram';
  assert.equal(p.api.storage.tree,'diagram');
  const enabled=await privacy({[CHOICE]:JSON.stringify({workspace:true}),struktog_code:'old code'});
  enabled.device.setItem=()=>{throw new Error('quota');};
  enabled.api.storage.setItem('struktog_code','new code');
  assert.equal(enabled.api.storage.getItem('struktog_code'),'new code');
});

test('offline caching is a separate choice and unregisters only this app',async()=>{
  let registered=0;
  let removed=0;
  const deleted=[];
  const navigator={serviceWorker:{register:async url=>{assert.equal(url,'https://example.test/editor/sw.js');registered++;},getRegistrations:async()=>[
    {scope:'https://example.test/editor/',active:{scriptURL:'https://example.test/editor/sw.js'},unregister:async()=>{removed++;}},
    {scope:'https://example.test/other/',active:{scriptURL:'https://example.test/other/sw.js'},unregister:async()=>{throw new Error('must not unregister another app');}}
  ]}};
  const caches={keys:async()=>['workbox-precache-v2-https://example.test/editor/','workbox-precache-v2-https://example.test/other/','example-json-cache'],delete:async name=>{deleted.push(name);}};
  const p=await privacy({}, {navigator,caches});
  p.context.window.caches=caches;
  const module=await p.load('src/privacy/offline.js');
  await module.evaluate();
  await module.namespace.configureOfflineCache();
  assert.equal(registered,0);
  assert.equal(removed,1);
  assert.deepEqual(deleted,['workbox-precache-v2-https://example.test/editor/','example-json-cache']);
  p.api.setOfflineCache(true);
  assert.equal(p.api.workspacePersistenceEnabled(),false);
  await module.namespace.configureOfflineCache();
  assert.equal(registered,1);
});

test('deleting saved data also clears legacy data without reading it or touching unrelated keys',async()=>{
  const p=await privacy({tree:'legacy diagram',struktog_drive_recent:'legacy names',unrelated:'other app'});
  p.api.storage.tree='active diagram';
  assert.equal(p.api.deleteSavedWorkspace(),true);
  assert.equal(p.data.has('tree'),false);
  assert.equal(p.data.has('struktog_drive_recent'),false);
  assert.equal(p.data.get('unrelated'),'other app');
  assert.equal(p.api.storage.tree,'active diagram');
  assert.ok(p.reads.every(key=>key===CHOICE));
});

test('failed preference writes cannot leave an old opt-in active after withdrawal',async()=>{
  const p=await privacy({[CHOICE]:JSON.stringify({workspace:true,offline:true}),tree:'diagram'});
  p.device.setItem=()=>{throw new Error('quota');};
  p.api.setWorkspacePersistence(false);
  p.api.setOfflineCache(false);
  assert.equal(p.data.has(CHOICE),false);
  const later=await privacy(Object.fromEntries(p.data));
  assert.equal(later.api.workspacePersistenceEnabled(),false);
  assert.equal(later.api.offlineCacheEnabled(),false);
});

test('Google activation needs an explicit choice and a separate continuation gesture',async()=>{
  const document={activeElement:null};
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.isConnected=true;}
    appendChild(child){this.children.push(child);return child;}
    setAttribute(){}
    addEventListener(name,callback){this.listeners[name]=callback;}
    focus(){document.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;if(this.listeners.close)this.listeners.close();}
    remove(){this.isConnected=false;}
  }
  document.createElement=tag=>new Element(tag);
  document.body=new Element('body');
  document.activeElement=document.body;
  const p=await privacy({}, {document});
  const module=await p.load('src/privacy/ui.js');
  await module.evaluate();
  let loaded=0;
  let continued=0;
  const controller={activated:false,ready:false,prepare:async()=>{loaded++;controller.ready=true;return true;}};
  module.namespace.requestGoogleActivation(controller,()=>{continued++;});
  assert.equal(loaded,0);
  let buttons=controller.activationDialog.children.at(-1).children;
  buttons[0].listeners.click();
  assert.equal(controller.activationDialog,null);
  assert.equal(loaded,0);
  module.namespace.requestGoogleActivation(controller,()=>{continued++;});
  buttons=controller.activationDialog.children.at(-1).children;
  let stopped=0;
  await buttons[1].listeners.click({stopPropagation:()=>{stopped++;}});
  assert.equal(loaded,1);
  assert.equal(controller.activated,true);
  assert.equal(continued,0);
  await buttons[1].listeners.click({stopPropagation:()=>{stopped++;}});
  assert.equal(continued,1);
  assert.equal(stopped,2,'Activation clicks must not bubble into the toolbar outside-click handler');
  assert.equal(controller.activationDialog,null);
});
