import {invoke, isTauri} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';

if (isTauri()) {
  const subscriptions=[];
  const call=(command,args)=>invoke(command,args).catch(error=>{throw new Error(String(error));});
  window.inkstone={
    open:()=>call('open_document'),
    bind:args=>call('bind_document',args),
    save:args=>call('save_document',args),
    close:id=>call('close_document',{id}),
    confirmClose:args=>call('confirm_close',args),
    exportHTML:(name,content)=>call('export_html',{name,content}),
    print:()=>call('print_document'),
    recent:()=>call('recent_documents'),
    openRecent:index=>call('open_recent',{index}),
    find:({text})=>text ? window.find(text) : false,
    onOpen:callback=>subscriptions.push(listen('document-opened',event=>callback(event.payload))),
    onCommand:callback=>subscriptions.push(listen('app-command',event=>callback(event.payload))),
    ready:async()=>{await Promise.all(subscriptions);return call('ready');}
  };
}
