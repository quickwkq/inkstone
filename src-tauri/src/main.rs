mod files;
mod images;
use std::{collections::HashMap, path::PathBuf, sync::{Mutex, atomic::{AtomicBool, Ordering}}};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult};
#[derive(Clone, Serialize, Deserialize)]
struct Binding { file: PathBuf, hash: String }
#[derive(Default, Serialize, Deserialize)]
struct Settings { bindings: HashMap<String, Binding>, recent: Vec<PathBuf> }
struct State { settings: Mutex<Settings>, pending: Mutex<HashMap<String, Binding>>, queued: Mutex<Vec<PathBuf>>, ready: AtomicBool, saving: AtomicBool, settings_path: PathBuf }
fn persist(s: &State, settings: &Settings) -> Result<(), String> { files::atomic_write(&s.settings_path, &serde_json::to_string(settings).map_err(|e|e.to_string())?) }
fn remember(settings: &mut Settings, file: &PathBuf) { settings.recent.retain(|p|p!=file); settings.recent.insert(0,file.clone()); settings.recent.truncate(12); }
fn make_file(app: &tauri::AppHandle, file: PathBuf) -> Result<serde_json::Value,String> {
    let content=files::read(&file)?; let s=app.state::<State>(); let mut settings=s.settings.lock().unwrap();
    let existing=settings.bindings.iter().find(|(_,b)|b.file==file).map(|(id,_)|id.clone());
    let token=uuid::Uuid::new_v4().to_string(); let mut pending=s.pending.lock().unwrap();
    if pending.len()>=32 { pending.clear(); }
    pending.insert(token.clone(),Binding{file:file.clone(),hash:files::digest(&content)});
    remember(&mut settings,&file); persist(&s,&settings)?;
    Ok(serde_json::json!({"name":file.file_name().unwrap_or_default().to_string_lossy(),"content":content,"token":token,"existingId":existing}))
}
fn receive(app: &tauri::AppHandle, file: PathBuf) {
    let s=app.state::<State>();
    if !s.ready.load(Ordering::SeqCst) { s.queued.lock().unwrap().push(file); return; }
    match make_file(app,file) { Ok(data)=>{let _=app.emit("document-opened",data);},Err(e)=>{app.dialog().message(e).kind(MessageDialogKind::Error).show(|_|{});} }
    if let Some(w)=app.get_webview_window("main") { let _=w.show(); let _=w.set_focus(); }
}
#[tauri::command] fn ready(app:tauri::AppHandle) { let s=app.state::<State>(); s.ready.store(true,Ordering::SeqCst); let queued=std::mem::take(&mut *s.queued.lock().unwrap()); for p in queued { receive(&app,p); } }
#[tauri::command] async fn open_document(app:tauri::AppHandle)->Result<Option<serde_json::Value>,String> {
    match app.dialog().file().add_filter("Markdown", &["md","markdown","txt"]).blocking_pick_file() {
        Some(p)=>Ok(Some(make_file(&app,p.into_path().map_err(|e|e.to_string())?)?)),None=>Ok(None)
    }
}
#[tauri::command] fn bind_document(app:tauri::AppHandle,id:String,token:String)->Result<(),String> {
    let s=app.state::<State>(); let b=s.pending.lock().unwrap().remove(&token).ok_or("文件关联已失效")?;
    let mut settings=s.settings.lock().unwrap(); settings.bindings.insert(id,b); persist(&s,&settings)
}
#[tauri::command] fn close_document(app:tauri::AppHandle,id:String)->Result<(),String> { let s=app.state::<State>();let mut settings=s.settings.lock().unwrap();settings.bindings.remove(&id);persist(&s,&settings) }
#[tauri::command] async fn confirm_close(app:tauri::AppHandle,name:String)->u8 {
    match app.dialog().message(format!("关闭「{}」前保存修改？不保存将移除本地草稿，磁盘文件不会被删除。",name)).title("关闭文档").buttons(MessageDialogButtons::YesNoCancelCustom("保存并关闭".into(),"不保存并关闭".into(),"取消".into())).blocking_show_with_result() {
        MessageDialogResult::Custom(label) if label=="保存并关闭"=>0,
        MessageDialogResult::Custom(label) if label=="不保存并关闭"=>2,
        MessageDialogResult::Yes=>0, MessageDialogResult::No=>2, _=>1
    }
}
#[tauri::command] async fn save_document(app:tauri::AppHandle,id:String,name:String,content:String,save_as:bool)->Result<Option<serde_json::Value>,String> {
    if content.len()>files::LIMIT {return Err("文档超过 10 MB".into());}
    let s=app.state::<State>(); if s.saving.swap(true,Ordering::SeqCst) {return Err("正在保存，请稍候".into());}
    struct Guard<'a>(&'a AtomicBool); impl Drop for Guard<'_> {fn drop(&mut self){self.0.store(false,Ordering::SeqCst);}} let _guard=Guard(&s.saving);
    let binding=s.settings.lock().unwrap().bindings.get(&id).cloned(); let mut save_as=save_as;
    if let Some(b)=&binding { if !save_as && files::read(&b.file).map(|c|files::digest(&c)!=b.hash).unwrap_or(true) {
        if !app.dialog().message("文件已在外部修改或移走，请另存副本以保护其他修改。").buttons(MessageDialogButtons::OkCancelCustom("另存为副本".into(),"取消".into())).blocking_show(){return Ok(None);} save_as=true;
    }}
    let basename=std::path::Path::new(&name).file_name().unwrap_or_default().to_string_lossy().to_string();
    let same_name=binding.as_ref().and_then(|b|b.file.file_name()).map(|n|n.to_string_lossy()==basename).unwrap_or(false);
    let path=if binding.is_none()||save_as||!same_name {
        let suggested=if save_as&&binding.is_some(){format!("{} 副本.md",std::path::Path::new(&basename).file_stem().unwrap_or_default().to_string_lossy())}else{basename};
        match app.dialog().file().add_filter("Markdown",&["md"]).set_file_name(suggested).blocking_save_file(){Some(p)=>p.into_path().map_err(|e|e.to_string())?,None=>return Ok(None)}
    } else {binding.as_ref().unwrap().file.clone()};
    let path_changed=binding.as_ref().map(|b|b.file!=path).unwrap_or(true);
    files::atomic_write(&path,&content)?; let mut settings=s.settings.lock().unwrap(); settings.bindings.insert(id,Binding{file:path.clone(),hash:files::digest(&content)}); remember(&mut settings,&path);persist(&s,&settings)?;
    Ok(Some(serde_json::json!({"name":path.file_name().unwrap_or_default().to_string_lossy(),"pathChanged":path_changed})))
}
#[tauri::command] async fn export_html(app:tauri::AppHandle,name:String,content:String)->Result<bool,String> {
    if content.len()>50*1024*1024 {return Err("导出内容过大".into());}
    let name=std::path::Path::new(&name).file_name().unwrap_or_default().to_string_lossy().to_string();
    if let Some(p)=app.dialog().file().add_filter("HTML",&["html"]).set_file_name(name).blocking_save_file(){files::atomic_write(&p.into_path().map_err(|e|e.to_string())?,&content)?;Ok(true)}else{Ok(false)}
}
#[tauri::command] fn print_document(window:tauri::WebviewWindow)->Result<(),String>{window.print().map_err(|e|e.to_string())}
#[tauri::command] fn recent_documents(app:tauri::AppHandle)->Vec<String>{app.state::<State>().settings.lock().unwrap().recent.iter().map(|p|p.to_string_lossy().to_string()).collect()}
#[tauri::command] fn open_recent(app:tauri::AppHandle,index:usize)->Result<serde_json::Value,String>{let path=app.state::<State>().settings.lock().unwrap().recent.get(index).cloned().ok_or("记录不存在")?;make_file(&app,path)}
fn main() {
    tauri::Builder::default().plugin(tauri_plugin_dialog::init())
    .register_uri_scheme_protocol("inkstone-image", |ctx, request| {
        let result = (|| -> Result<_, String> {
            let (id, relative)=request.uri().path().trim_start_matches('/').split_once('/').ok_or("无效图片地址")?;
            let state=ctx.app_handle().state::<State>();
            let document=state.settings.lock().unwrap().bindings.get(id).map(|b|b.file.clone()).ok_or("文档尚未关联磁盘文件")?;
            images::read(&document,relative)
        })();
        match result {
            Ok((data,mime))=>tauri::http::Response::builder().header("Content-Type",mime).header("Access-Control-Allow-Origin","*").header("Cache-Control","no-store").body(data).unwrap(),
            Err(_)=>tauri::http::Response::builder().status(404).body(Vec::new()).unwrap()
        }
    })
    .setup(|app|{
        let dir=app.path().app_data_dir()?; std::fs::create_dir_all(&dir)?; let path=dir.join("documents.json");
        let settings=if path.exists(){serde_json::from_str(&std::fs::read_to_string(&path)?)?}else{Settings::default()};
        app.manage(State{settings:Mutex::new(settings),pending:Mutex::new(HashMap::new()),queued:Mutex::new(Vec::new()),ready:AtomicBool::new(false),saving:AtomicBool::new(false),settings_path:path});
        tauri::WebviewWindowBuilder::from_config(app,&app.config().app.windows[0])?
            .on_navigation(|url|url.scheme()=="tauri" || (cfg!(debug_assertions) && [Some("localhost"),Some("127.0.0.1")].contains(&url.host_str())))
            .on_new_window(|_,_|tauri::webview::NewWindowResponse::Deny)
            .build()?;
        use tauri::menu::{MenuBuilder,SubmenuBuilder,PredefinedMenuItem,MenuItemBuilder};
        let app_menu=SubmenuBuilder::new(app,"Inkstone").item(&PredefinedMenuItem::about(app,Some("关于墨页"),None)?).separator().hide().hide_others().show_all().separator().quit().build()?;
        let mut file=SubmenuBuilder::new(app,"文件");
        for (id,label,key) in [("new","新建文档","CmdOrCtrl+N"),("open","打开…","CmdOrCtrl+O"),("save","保存","CmdOrCtrl+S"),("save-as","另存为…","CmdOrCtrl+Shift+S"),("close","关闭当前文档","CmdOrCtrl+W"),("print","打印 / PDF","CmdOrCtrl+P")] {file=file.item(&MenuItemBuilder::with_id(id,label).accelerator(key).build(app)?);}
        let file=file.separator().text("recent","最近打开…").build()?;
        let edit=SubmenuBuilder::new(app,"编辑").undo().redo().separator().cut().copy().paste().select_all().separator().item(&MenuItemBuilder::with_id("find","查找").accelerator("CmdOrCtrl+F").build(app)?).build()?;
        let view=SubmenuBuilder::new(app,"显示").text("sidebar","切换侧栏").text("focus","专注模式").fullscreen().build()?;
        let window=SubmenuBuilder::new(app,"窗口").minimize().maximize().build()?;
        let help=SubmenuBuilder::new(app,"帮助").text("releases","下载新版本与使用说明").build()?;
        app.set_menu(MenuBuilder::new(app).items(&[&app_menu,&file,&edit,&view,&window,&help]).build()?)?;
        Ok(())
    })
    .on_menu_event(|app,event|{
        if event.id().as_ref()=="releases" {let _=std::process::Command::new("/usr/bin/open").arg("https://github.com/quickwkq/inkstone-releases/releases").spawn();}
        else if ["new","open","recent","save","save-as","close","print","find","sidebar","focus"].contains(&event.id().as_ref()) {if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.set_focus();}let _=app.emit("app-command",event.id().as_ref());}
    })
    .on_window_event(|w,event|{if let tauri::WindowEvent::CloseRequested{api,..}=event {api.prevent_close();let _=w.hide();}})
    .invoke_handler(tauri::generate_handler![ready,open_document,bind_document,close_document,confirm_close,save_document,export_html,print_document,recent_documents,open_recent])
    .build(tauri::generate_context!()).expect("启动失败")
    .run(|app,event|match event {
        tauri::RunEvent::Opened{urls}=>{for url in urls{if let Ok(p)=url.to_file_path(){receive(app,p);}}},
        tauri::RunEvent::Reopen{..}=>{if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.set_focus();}},
        _=>{}
    });
}
