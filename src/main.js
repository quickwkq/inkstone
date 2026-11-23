import './native';
import Vditor from 'vditor';
import DOMPurify from 'dompurify';
import 'vditor/dist/index.css';
import './document.css';
import './style.css';
import {makeDoc,safeName,outline,loadDocs,hasUnsavedChanges} from './model';
import {imageBase,embedLocalImages} from './images';
import {createTheme} from './theme';
import {createDocumentTree,documentRow,recentDrafts} from './sidebar';
import {highlightHTML,exportCodeStyle} from './highlight';

const $=s=>document.querySelector(s);
let docs, recoveryError=false;
try{docs=loadDocs(localStorage);}catch(e){docs=[makeDoc('恢复说明.md', '# 草稿恢复失败\n\n'+e.message)];recoveryError=true;}
let active=docs.find(d=>d.id===localStorage.getItem('inkstone.active'))?.id||docs[0].id, generation=0, editor, mode='ir', ready=false, dark=false;
const current=()=>docs.find(d=>d.id===active);
document.querySelector('#app').innerHTML=`<aside class="sidebar"><div class="brand"><span class="brand-mark">墨</span><div>墨页 <small>INKSTONE</small></div></div><button class="new primary">＋ 新建文档 <kbd>⌘ N</kbd></button><input class="search" aria-label="搜索文档" placeholder="搜索文档…"><div class="sidebar-scroll"><details id="documents-section" class="sidebar-section" open><summary>文档 <span id="doc-count"></span></summary><div id="files"></div></details><details id="recent-section" class="sidebar-section"><summary>最近</summary><div id="recent-files"></div></details><details id="outline-section" class="sidebar-section" open><summary>文档大纲</summary><nav id="outline" aria-label="文档大纲"></nav></details></div><div class="sidebar-bottom"><label class="theme-control"><span id="theme-icon" aria-hidden="true"></span><select id="theme" aria-label="外观主题"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label></div></aside><main><header><button id="sidebar-toggle" title="切换侧栏" aria-label="切换侧栏">☰</button><input id="title" aria-label="文件名"><div class="header-actions"><button id="open">打开</button><button id="save" class="save">保存文件</button><button id="save-as" title="另存为（⇧⌘S）">另存为</button><select id="export" aria-label="导出"><option value="">导出</option><option value="html">HTML</option><option value="pdf">打印 / PDF</option></select></div></header><div class="modebar"><div class="modes"><button data-mode="ir" class="selected">即时编辑</button><button data-mode="sv">源码</button><button data-mode="read">阅读</button></div><div><button id="find-toggle">查找</button><button id="close-doc" title="关闭当前文档">关闭文档</button><button id="focus">专注模式</button></div></div><div id="findbar" hidden><input id="find-query" aria-label="查找当前文档" placeholder="查找当前文档…"><button id="find-next">查找</button><button id="find-close" aria-label="关闭查找">×</button></div><section class="canvas"><div id="editor"></div><article id="reader" class="vditor-reset" hidden></article></section><footer><span id="stats"></span><div class="footer-status"><span class="format-info">Markdown <span class="footer-dot">·</span> UTF-8</span><span id="save-state" role="status">草稿已保存</span></div></footer></main><div id="notice" role="status"></div><input type="file" id="file-input" accept=".md,.markdown,.txt" hidden>`;
const tree=createDocumentTree({root:$('#files'),storage:localStorage,onSelect:switchDoc});
for(const id of ['documents-section','recent-section','outline-section']){
  const section=$('#'+id);section.open=tree.isOpen('section:'+id,id!=='recent-section');
  section.querySelector('summary').onclick=event=>{event.preventDefault();section.open=!section.open;tree.remember('section:'+id,section.open);};
  section.addEventListener('toggle',()=>{tree.remember('section:'+id,section.open);if(id==='recent-section'&&section.open)renderRecent();});
}
let recentRequest=0;
async function renderRecent(){
  const ticket=++recentRequest,root=$('#recent-files');root.textContent='正在加载…';
  try{
    const paths=window.inkstone?await window.inkstone.recent():null;
    if(ticket!==recentRequest)return;root.replaceChildren();
    const rows=paths?paths.map((path,index)=>({id:docs.find(d=>d.path===path)?.id,name:path.split('/').pop(),path,index})):recentDrafts(docs);
    for(const row of rows)root.append(documentRow(row,active,async()=>{
      try{if(row.id&&docs.some(d=>d.id===row.id))switchDoc(row.id);else await acceptFile(await window.inkstone.openRecent(row.index));}
      catch(e){notify('打开失败：'+e.message);}
    }));
    if(!rows.length)root.textContent='暂无最近打开的文件';
  }catch(e){if(ticket!==recentRequest)return;root.textContent='最近文件加载失败';const retry=document.createElement('button');retry.textContent='重试';retry.onclick=renderRecent;root.append(retry);}
}
function notify(text){$('#notice').textContent=text;$('#notice').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').classList.remove('visible'),4000);}
function persist(){try{if(recoveryError)throw Error('原始草稿受保护，请先保存文件');localStorage.setItem('inkstone.docs',JSON.stringify(docs));localStorage.setItem('inkstone.active',active);$('#save-state').textContent='草稿已保存';return true;}catch(e){$('#save-state').textContent='草稿未保存，请保存文件';return false;}}
function sync(value){current().content=value;current().updated=Date.now();persist();renderFiles();renderOutline();stats();}
function stats(){$('#stats').textContent=`${current().content.replace(/\s/g,'').length.toLocaleString()} 字符 · ${current().content.split('\n').length} 行`;}
function renderFiles(){const query=$('.search').value;$('#doc-count').textContent=docs.length;if(query)$('#documents-section').open=true;tree.render(docs,active,query);}
function renderOutline(){$('#outline').replaceChildren();outline(current().content).forEach((h,i)=>{const b=document.createElement('button');b.textContent=h.text;b.title=h.text;b.style.paddingLeft=(12+(h.level-1)*12)+'px';b.onclick=()=>{const root=mode==='read'?$('#reader'):$('#editor .vditor-ir');const headings=root?.querySelectorAll('h1,h2,h3,h4,h5,h6');if(headings?.[i])headings[i].scrollIntoView({behavior:'smooth',block:'start'});else notify('请切换到即时编辑或阅读模式定位标题');};$('#outline').append(b);});}
function refresh(){ $('#title').value=current().name;renderFiles();renderOutline();stats();if($('#recent-section').open)renderRecent(); }
function capture(){if(ready&&mode!=='read')current().content=editor.getValue();}
function switchDoc(id){capture();persist();active=id;current().lastOpened=Date.now();persist();refresh();mount();if($('#recent-section').open)renderRecent();}
function mount(){const ticket=++generation;ready=false;editor?.destroy();editor=null;$('#editor').innerHTML='';$('#editor').hidden=mode==='read';$('#reader').hidden=mode!=='read';if(mode==='read'){renderReader();return;}editor=new Vditor('editor',{cdn:new URL('vendor/vditor',document.baseURI).href,lang:'zh_CN',mode,theme:dark?'dark':'classic',height:'100%',value:current().content,cache:{enable:false},toolbar:['headings','bold','italic','strike','|','list','ordered-list','check','quote','code','inline-code','link','table','|','undo','redo'],outline:{enable:false},preview:{markdown:{toc:false,linkBase:window.inkstone?imageBase(current().id):''},hljs:{enable:true,style:dark?'github-dark':'github'},math:{engine:'KaTeX'},theme:{current:dark?'dark':'light',path:new URL('vendor/vditor/dist/css/content-theme',document.baseURI).href}},input:value=>{if(ticket===generation)sync(value);},after:()=>{if(ticket===generation){ready=true;editor.setTheme(dark?'dark':'classic',dark?'dark':'light',dark?'github-dark':'github');}}});}
async function html(){const doc=current();const body=DOMPurify.sanitize(await Vditor.md2html(doc.content,{cdn:new URL('vendor/vditor',document.baseURI).href}),{FORBID_TAGS:['style','iframe'],FORBID_ATTR:['style']});const highlighted=await highlightHTML(body);return window.inkstone?embedLocalImages(highlighted,doc.id):highlighted;}
async function renderReader(){const ticket=generation;$('#reader').textContent='正在加载文档…';try{const body=await html();if(ticket===generation)$('#reader').innerHTML=body;}catch(e){if(ticket===generation){$('#reader').textContent='文档加载失败，请重新切换阅读模式。';notify(e.message);}}}
async function download(name,content,type){if(window.inkstone&&type.startsWith('text/html'))return window.inkstone.exportHTML(name,content);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function save(saveAs=false){
  capture();persist();const doc=current(), savedContent=doc.content;
  try{
    if(window.inkstone){const result=await window.inkstone.save({id:doc.id,name:doc.name,content:savedContent,saveAs});
      if(!result)return false;doc.name=result.name;doc.path=result.path;doc.savedContent=savedContent;if(current().id===doc.id&&result.pathChanged)mount();
    }else{download(doc.name,savedContent,'text/markdown;charset=utf-8');doc.savedContent=savedContent;}
    refresh();persist();if($('#recent-section').open)renderRecent();notify(window.inkstone?'文件已保存':'Markdown 已下载');return true;
  }catch(e){notify('保存失败：'+e.message);return false;}
}
async function acceptFile(file){
  if(file.existingId&&docs.some(d=>d.id===file.existingId)){switchDoc(file.existingId);notify('已切换到工作空间中的文档，保留当前草稿');return;}
  add(file.name,file.content);const doc=current();doc.savedContent=file.content;doc.path=file.path;doc.lastOpened=Date.now();
  await window.inkstone.bind({id:doc.id,token:file.token});persist();renderFiles();if($('#recent-section').open)renderRecent();if(current().id===doc.id)mount();
}
async function closeDoc(){
  capture();const doc=current();
  if(hasUnsavedChanges(doc)){
    let decision;
    if(window.inkstone)decision=await window.inkstone.confirmClose({name:doc.name});
    else decision=window.confirm('关闭文档会移除本地草稿，是否先下载保存？取消将保留文档。')?0:1;
    if(decision===1)return;if(decision===0&&!await save())return;
  }
  if(current().id!==doc.id)return;
  await window.inkstone?.close(doc.id);
  docs=docs.filter(d=>d.id!==doc.id);if(!docs.length)docs=[makeDoc()];
  active=docs[0].id;persist();refresh();mount();
}
function add(name='未命名.md',content=''){capture();const d=makeDoc(name,content);docs.unshift(d);active=d.id;persist();refresh();mount();}
async function open(){try{if(window.inkstone){const file=await window.inkstone.open();if(file)await acceptFile(file);}else $('#file-input').click();}catch(e){notify('打开失败：'+e.message);}}
$('.new').onclick=()=>add();$('#open').onclick=open;$('#save').onclick=()=>save();$('#save-as').onclick=()=>save(true);$('#close-doc').onclick=()=>closeDoc().catch(e=>notify(e.message));
$('#file-input').onchange=async e=>{const f=e.target.files[0];if(f){if(f.size>10*1024*1024){notify('首版支持 10 MB 以内的文档');return;}add(f.name,await f.text());}e.target.value='';};
$('#title').onchange=e=>{current().name=safeName(e.target.value);e.target.value=current().name;persist();renderFiles();};
$('.search').oninput=renderFiles;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{capture();persist();mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('selected',x===b));mount();});
const theme=createTheme({
  storage:localStorage,media:window.matchMedia('(prefers-color-scheme: dark)'),
  apply:(resolved,preference)=>{
    dark=resolved==='dark';document.documentElement.dataset.theme=resolved;
    $('#theme').value=preference;
    const icon=preference==='light'?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':preference==='dark'?'<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>':'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>';
    $('#theme-icon').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg>';
    Vditor.highlightRender({enable:false,style:dark?'github-dark':'github'},document,new URL('vendor/vditor',document.baseURI).href);
    if(ready&&editor)editor.setTheme(dark?'dark':'classic',dark?'dark':'light',dark?'github-dark':'github');
  },
  onError:()=>notify('主题已切换，但偏好未能保存')
});
$('#theme').onchange=e=>theme.set(e.target.value);
$('#focus').onclick=()=>{document.body.classList.toggle('focus');$('#focus').textContent=document.body.classList.contains('focus')?'退出专注':'专注模式';};
$('#sidebar-toggle').onclick=()=>document.body.classList.toggle('hide-sidebar');
$('#export').onchange=async e=>{const format=e.target.value;e.target.value='';capture();try{const body=await html();if(format==='html')await download(current().name.replace(/\.md$/i,'.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Inkstone document</title><style>'+exportCodeStyle+'body{max-width:760px;margin:60px auto;padding:24px;font:17px/1.9 system-ui;color:#252b29}pre,blockquote{padding:16px;background:#f4f4f0}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #ccc}img{max-width:100%}</style><body>'+body+'</body></html>','text/html;charset=utf-8');if(format==='pdf'){$('#reader').innerHTML=body;document.body.classList.add('printing');if(window.inkstone)await window.inkstone.print();else window.print();document.body.classList.remove('printing');}}catch(err){notify('导出失败：'+err.message);}};
document.addEventListener('keydown',e=>{if(!window.inkstone&&(e.metaKey||e.ctrlKey)&&['s','o','n','f'].includes(e.key.toLowerCase())){e.preventDefault();({s:()=>save(e.shiftKey),o:open,n:()=>add(),f:toggleFind})[e.key.toLowerCase()]();}if(e.key==='Escape'){document.body.classList.remove('focus');$('#focus').textContent='专注模式';}});
window.addEventListener('beforeunload',e=>{capture();if(!persist()){e.preventDefault();e.returnValue='';}});
refresh();mount();

function toggleFind(){$('#findbar').hidden=!$('#findbar').hidden;if(!$('#findbar').hidden)$('#find-query').focus();else window.inkstone?.find({text:''});}
function findNext(){const text=$('#find-query').value;if(text&&!(window.inkstone?window.inkstone.find({text}):window.find(text)))notify('未找到匹配内容');}
$('#find-toggle').onclick=toggleFind;$('#find-close').onclick=toggleFind;$('#find-next').onclick=findNext;$('#find-query').onkeydown=e=>{if(e.key==='Enter')findNext();if(e.key==='Escape')toggleFind();};
if(window.inkstone){
  window.inkstone.onOpen(file=>acceptFile(file).catch(e=>notify('打开失败：'+e.message)));
  window.inkstone.onCommand(action=>{
    const commands={recent:()=>showRecent(),new:()=>add(),open,save:()=>save(),'save-as':()=>save(true),close:()=>closeDoc().catch(e=>notify(e.message)),find:toggleFind,focus:()=>$('#focus').click(),sidebar:()=>$('#sidebar-toggle').click(),print:()=>{$('#export').value='pdf';$('#export').dispatchEvent(new Event('change'));}};
    commands[action]?.();
  });
  window.inkstone.locations().then(paths=>{for(const doc of docs)if(paths[doc.id])doc.path=paths[doc.id];persist();renderFiles();}).catch(e=>notify(e.message));
  window.inkstone.ready().catch(e=>notify(e.message));
}

function showRecent(){document.body.classList.remove('hide-sidebar','focus');$('#focus').textContent='专注模式';$('#recent-section').open=true;renderRecent();$('#recent-section').scrollIntoView({block:'nearest'});}
