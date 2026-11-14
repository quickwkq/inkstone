const {app, BrowserWindow, ipcMain, dialog, Menu, shell} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {readDocument, atomicWrite, digest} = require('./files.cjs');
const paths = new Map(), pending = new Map(), saving = new Set();
let win, rendererReady = false, queuedFiles = [], queuedCommands = [], recent = [], settingsWrite = Promise.resolve(), findText = '';
app.setName('Inkstone');
const releasesURL = 'https://github.com/quickwkq/inkstone-releases/releases';
const settingsPath = () => path.join(app.getPath('userData'), 'documents.json');
function persistSettings() {
  const data = JSON.stringify({bindings: [...paths], recent});
  settingsWrite = settingsWrite.catch(() => {}).then(() => atomicWrite(settingsPath(), data));
  return settingsWrite;
}
function remember(file) {
  recent = [file, ...recent.filter(p => p !== file)].slice(0, 12);
  app.addRecentDocument(file); buildMenu(); persistSettings().catch(() => {});
}
function command(action) { if (!win || win.isDestroyed()) createWindow(); if(!rendererReady)queuedCommands.push(action);else win.webContents.send('app:command', action); }
function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Inkstone', submenu:[{role:'about'}, {type:'separator'}, {role:'hide'}, {role:'hideOthers'}, {role:'unhide'}, {type:'separator'}, {role:'quit'}]},
    {label:'文件', submenu:[
      {label:'新建文档', accelerator:'CmdOrCtrl+N', click:()=>command('new')},
      {label:'打开…', accelerator:'CmdOrCtrl+O', click:()=>command('open')},
      {label:'最近打开', submenu: recent.length ? [...recent.map(file=>({label:path.basename(file),toolTip:file,click:()=>receiveFile(file)})),{type:'separator'},{label:'清除最近记录',click:()=>{recent=[];app.clearRecentDocuments();persistSettings().catch(()=>{});buildMenu();}}] : [{label:'暂无最近文件', enabled:false}]},
      {type:'separator'}, {label:'保存',accelerator:'CmdOrCtrl+S',click:()=>command('save')},
      {label:'另存为…',accelerator:'CmdOrCtrl+Shift+S',click:()=>command('save-as')},
      {label:'关闭当前文档',accelerator:'CmdOrCtrl+W',click:()=>command('close')},
      {label:'打印 / PDF',accelerator:'CmdOrCtrl+P',click:()=>command('print')}
    ]},
    {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{type:'separator'},{label:'查找',accelerator:'CmdOrCtrl+F',click:()=>command('find')}]},
    {label:'显示',submenu:[{label:'切换侧栏',click:()=>command('sidebar')},{label:'专注模式',click:()=>command('focus')},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
    {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]},
    {label:'帮助',submenu:[{label:'下载新版本与使用说明',click:()=>shell.openExternal(releasesURL)}]}
  ]));
}
function createWindow() {
  rendererReady = false;
  win = new BrowserWindow({width:1280,height:900,minWidth:760,minHeight:540,backgroundColor:'#fdfdfb',title:'墨页 · Inkstone',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.webContents.on('will-prevent-unload', async () => {
    const result = await dialog.showMessageBox(win,{type:'warning',message:'草稿保存失败',detail:'请返回编辑器，将文档保存到文件后再退出。',buttons:['返回编辑器','仍然关闭'],defaultId:0,cancelId:0});
    if (result.response === 1) win.destroy();
  });
  win.on('closed',()=>{win=null;rendererReady=false;});
  win.loadFile(path.join(__dirname,'../dist/index.html'));
}
function trusted(event) {
  if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw Error('Invalid IPC sender');
}
async function makeFile(file) {
  const result = await readDocument(file);
  const existing = [...paths].find(([, binding])=>binding.file === file);
  const token = crypto.randomUUID();
  pending.set(token,{file,hash:result.hash});
  if (pending.size > 32) pending.delete(pending.keys().next().value);
  remember(file);
  return {...result, token, existingId:existing?.[0]};
}
async function receiveFile(file) {
  if (!app.isReady()) {queuedFiles.push(file);return;}
  if (!win || win.isDestroyed()) createWindow();
  if (!rendererReady) {queuedFiles.push(file);return;}
  try {win.webContents.send('document:opened',await makeFile(file));win.show();win.focus();}
  catch(e) {dialog.showErrorBox('无法打开文件',e.message);}
}
app.on('open-file',(event,file)=>{event.preventDefault();receiveFile(file);});
app.whenReady().then(async()=>{
  try {const data=JSON.parse(await fs.readFile(settingsPath(),'utf8'));for(const [id,b] of data.bindings||[])if(typeof id==='string'&&typeof b?.file==='string'&&typeof b.hash==='string')paths.set(id,b);recent=(data.recent||[]).filter(p=>typeof p==='string').slice(0,12);}catch{}
  app.setAboutPanelOptions({applicationName:'墨页 Inkstone',applicationVersion:app.getVersion(),copyright:'© 2026 Inkstone',credits:'Markdown editing powered by Vditor. Local-first, no account required.'});
  createWindow(); buildMenu();
});
app.on('activate',()=>{if(!win)createWindow();else win.show();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('app:ready',event=>{trusted(event);rendererReady=true;const files=queuedFiles;queuedFiles=[];for(const file of files)receiveFile(file);const commands=queuedCommands;queuedCommands=[];for(const action of commands)command(action);return {version:app.getVersion()};});
ipcMain.handle('document:open',async event=>{trusted(event);const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Markdown',extensions:['md','markdown','txt']}]});return r.canceled?null:makeFile(r.filePaths[0]);});
ipcMain.handle('document:bind',async(event,{id,token})=>{trusted(event);if(typeof id!=='string'||!pending.has(token))throw Error('Invalid document');paths.set(id,pending.get(token));pending.delete(token);await persistSettings();});
ipcMain.handle('document:close',async(event,id)=>{trusted(event);paths.delete(id);await persistSettings();});
ipcMain.handle('document:confirm-close',async(event,{name})=>{trusted(event);const r=await dialog.showMessageBox(win,{type:'question',message:'关闭「'+String(name).slice(0,200)+'」？',detail:'文档将从工作空间移除。未写入文件的修改需要先保存。磁盘文件不会被删除。',buttons:['保存并关闭','取消','不保存并关闭'],defaultId:0,cancelId:1});return r.response;});
ipcMain.handle('document:save',async(event,{id,name,content,saveAs=false})=>{
  trusted(event);
  if(typeof id!=='string'||typeof name!=='string'||typeof content!=='string'||Buffer.byteLength(content)>10*1024*1024)throw Error('文档无效或超过 10 MB');
  if(saving.has(id))throw Error('正在保存，请稍候');saving.add(id);
  try {
    const binding=paths.get(id);let file=binding?.file;
    if(file&&!saveAs){
      let changed=false;try{changed=digest(await fs.readFile(file,'utf8'))!==binding.hash;}catch(e){if(e.code==='ENOENT')changed=true;else throw e;}
      if(changed){const r=await dialog.showMessageBox(win,{type:'warning',message:'文件已在外部修改或移走',detail:'为避免覆盖其他修改，请另存一份副本。',buttons:['另存为副本','取消'],defaultId:0,cancelId:1});if(r.response===1)return null;saveAs=true;}
    }
    if(!file||saveAs||path.basename(file)!==name){const r=await dialog.showSaveDialog(win,{defaultPath:saveAs&&file?path.join(path.dirname(file),path.basename(name,path.extname(name))+' 副本.md'):path.basename(name),filters:[{name:'Markdown',extensions:['md']}]});if(r.canceled)return null;file=r.filePath;}
    await atomicWrite(file,content);
    paths.set(id,{file,hash:digest(content)});remember(file);await persistSettings();
    return {name:path.basename(file)};
  } finally {saving.delete(id);}
});
ipcMain.handle('document:find',(event,{text,forward=true})=>{trusted(event);if(typeof text!=='string'||text.length>500)return;const changed=findText!==text;findText=text;if(changed||!text)win.webContents.stopFindInPage('clearSelection');if(text)win.webContents.findInPage(text,{forward,findNext:!changed});});
