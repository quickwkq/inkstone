const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('inkstone',{open:()=>ipcRenderer.invoke('document:open'),bind:doc=>ipcRenderer.invoke('document:bind',doc),save:doc=>ipcRenderer.invoke('document:save',doc)});
