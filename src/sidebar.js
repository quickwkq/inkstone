export function groupDocuments(docs, query='') {
  const groups=new Map();
  for(const doc of docs) {
    if(!`${doc.name}\n${doc.content}`.toLowerCase().includes(query.toLowerCase()))continue;
    const path=typeof doc.path==='string'?doc.path:'';
    const directory=path.includes('/')?path.slice(0,path.lastIndexOf('/'))||'/':'';
    const key=directory||'drafts';
    if(!groups.has(key))groups.set(key,{key,path:directory,name:directory?directory.split('/').pop()||'/':'草稿',docs:[]});
    groups.get(key).docs.push(doc);
  }
  return [...groups.values()];
}

export function recentDrafts(docs) {
  return [...docs].sort((a,b)=>(b.lastOpened??b.updated??0)-(a.lastOpened??a.updated??0)).slice(0,12);
}

export function createDocumentTree({root,storage,onSelect}) {
  let state={};
  try { const saved=JSON.parse(storage.getItem('inkstone.sidebar')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved; } catch {}
  const expanded=new Set();
  const remember=(key,open)=>{state[key]=open;try{storage.setItem('inkstone.sidebar',JSON.stringify(state));}catch{}};
  return {
    remember,
    isOpen:(key,fallback=true)=>typeof state[key]==='boolean'?state[key]:fallback,
    render(docs,active,query='') {
      root.replaceChildren();
      for(const group of groupDocuments(docs,query)) {
        const details=document.createElement('details');details.className='folder-group';details.open=query?true:state[group.key]!==false;
        const summary=document.createElement('summary');summary.title=group.path||'尚未绑定磁盘文件的草稿';
        const icon=document.createElement('span');icon.className='folder-icon';icon.setAttribute('aria-hidden','true');
        icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 9h18"/></svg>';
        const label=document.createElement('span');label.className='folder-name';label.textContent=group.name;
        const count=document.createElement('span');count.className='folder-count';count.textContent=group.docs.length;
        summary.append(icon,label,count);details.append(summary);
        summary.onclick=event=>{event.preventDefault();details.open=!details.open;if(!query)remember(group.key,details.open);};
        details.ontoggle=()=>{if(!query&&root.contains(details))remember(group.key,details.open);};
        const list=document.createElement('div');list.className='folder-files';
        const all=expanded.has(group.key)||query;
        for(const doc of group.docs.slice(0,all?undefined:5))list.append(documentRow(doc,active,()=>onSelect(doc.id)));
        if(group.docs.length>5&&!query){const more=document.createElement('button');more.className='show-more';more.textContent=all?'收起显示':`展开显示（${group.docs.length-5}）`;more.onclick=()=>{all?expanded.delete(group.key):expanded.add(group.key);this.render(docs,active,query);root.querySelectorAll('.show-more').forEach(button=>{if(button.closest('details')?.querySelector('summary')?.title===summary.title)button.focus();});};list.append(more);}
        details.append(list);root.append(details);
      }
      if(!root.children.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='没有匹配的文档，试试其他关键词';root.append(empty);}
    }
  };
}

export function documentRow(doc,active,onClick) {
  const button=document.createElement('button');button.className='file '+(doc.id===active?'active':'');button.setAttribute('aria-current',String(doc.id===active));
  button.title=[doc.path||doc.name,doc.content?.replace(/[#*`>\n]/g,' ').slice(0,100)].filter(Boolean).join('\n');
  const label=document.createElement('span');label.textContent=doc.name.replace(/\.md$/i,'');button.append(label);button.onclick=onClick;return button;
}
