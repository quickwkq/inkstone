const {app,BrowserWindow,ipcMain,dialog,Menu}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const paths=new Map(),pending=new Map();
let win;
app.setName('Inkstone');
app.whenReady().then(()=>{
  win=new BrowserWindow({width:1280,height:900,minWidth:720,minHeight:520,backgroundColor:'#fdfdfb',title:'墨页 · Inkstone',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Inkstone',submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},{label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{role:'togglefullscreen'}]}]));
  win.loadFile(path.join(__dirname,'../dist/index.html'));
});
function trusted(event){if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Invalid IPC sender');}
ipcMain.handle('document:open',async event=>{trusted(event);const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Markdown',extensions:['md','markdown','txt']}]});if(r.canceled)return null;const file=r.filePaths[0];if((await fs.stat(file)).size>10*1024*1024)throw Error('文件超过 10 MB');const content=await fs.readFile(file,'utf8');const token=crypto.randomUUID();pending.set(token,file);return {name:path.basename(file),content,token};});
ipcMain.handle('document:bind',(event,{id,token})=>{trusted(event);if(typeof id!=='string'||!pending.has(token))throw Error('Invalid document');paths.set(id,pending.get(token));pending.delete(token);});
ipcMain.handle('document:save',async(event,{id,name,content})=>{trusted(event);if(typeof id!=='string'||typeof content!=='string'||typeof name!=='string'||content.length>20*1024*1024)throw Error('Invalid document');let file=paths.get(id);if(!file||path.basename(file)!==name){const r=await dialog.showSaveDialog(win,{defaultPath:path.basename(name),filters:[{name:'Markdown',extensions:['md']}]});if(r.canceled)return null;file=r.filePath;}await fs.writeFile(file,content,'utf8');paths.set(id,file);return {name:path.basename(file)};});
app.on('window-all-closed',()=>app.quit());
