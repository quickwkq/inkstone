const {contextBridge,ipcRenderer}=require('electron');
function subscribe(channel,callback){const listener=(_event,value)=>callback(value);ipcRenderer.on(channel,listener);return()=>ipcRenderer.removeListener(channel,listener);}
contextBridge.exposeInMainWorld('inkstone',{
  ready:()=>ipcRenderer.invoke('app:ready'),
  open:()=>ipcRenderer.invoke('document:open'),
  bind:doc=>ipcRenderer.invoke('document:bind',doc),
  save:doc=>ipcRenderer.invoke('document:save',doc),
  close:id=>ipcRenderer.invoke('document:close',id),
  confirmClose:doc=>ipcRenderer.invoke('document:confirm-close',doc),
  find:query=>ipcRenderer.invoke('document:find',query),
  onOpen:callback=>subscribe('document:opened',callback),
  onCommand:callback=>subscribe('app:command',callback)
});
