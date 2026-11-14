use std::{fs, io::Write, path::Path};
use sha2::{Digest, Sha256};
pub const LIMIT: usize = 10 * 1024 * 1024;
pub fn digest(content: &str) -> String { format!("{:x}", Sha256::digest(content.as_bytes())) }
pub fn read(path: &Path) -> Result<String, String> {
    let ext = path.extension().and_then(|s|s.to_str()).unwrap_or("").to_lowercase();
    if !["md", "markdown", "txt"].contains(&ext.as_str()) { return Err("仅支持 Markdown 或文本文件".into()); }
    if fs::metadata(path).map_err(|e|e.to_string())?.len() > LIMIT as u64 { return Err("文档超过 10 MB".into()); }
    let content = fs::read_to_string(path).map_err(|e|e.to_string())?;
    if content.len() > LIMIT { return Err("文档超过 10 MB".into()); }
    Ok(content)
}
pub fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let target = if path.is_symlink() { fs::canonicalize(path).map_err(|e|e.to_string())? } else { path.to_owned() };
    let parent = target.parent().ok_or("文件目录无效")?;
    let temp = parent.join(format!(".inkstone-{}.tmp", uuid::Uuid::new_v4()));
    let result = (|| -> std::io::Result<()> {
        let mut f = fs::OpenOptions::new().write(true).create_new(true).open(&temp)?;
        if let Ok(meta) = fs::metadata(&target) { f.set_permissions(meta.permissions())?; }
        f.write_all(content.as_bytes())?; f.sync_all()?; fs::rename(&temp, &target)?; Ok(())
    })();
    if result.is_err() { let _ = fs::remove_file(&temp); }
    result.map_err(|e|e.to_string())
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn unicode_atomic_and_symlink() {
        let dir=std::env::temp_dir().join(uuid::Uuid::new_v4().to_string()); fs::create_dir(&dir).unwrap();
        let p=dir.join("测试.md"); atomic_write(&p,"你好\n🌿").unwrap(); assert_eq!(read(&p).unwrap(),"你好\n🌿");
        let link=dir.join("link.md"); std::os::unix::fs::symlink(&p,&link).unwrap(); atomic_write(&link,"更新").unwrap();
        assert!(link.is_symlink()); assert_eq!(read(&p).unwrap(),"更新"); assert_eq!(fs::read_dir(&dir).unwrap().count(),2); fs::remove_dir_all(dir).unwrap();
    }
    #[test] fn rejects_large_and_invalid() {
        let dir=std::env::temp_dir().join(uuid::Uuid::new_v4().to_string()); fs::create_dir(&dir).unwrap();
        let p=dir.join("large.md"); let f=fs::File::create(&p).unwrap(); f.set_len((LIMIT+1) as u64).unwrap(); assert!(read(&p).is_err()); assert!(read(&dir.join("file.exe")).is_err()); fs::remove_dir_all(dir).unwrap();
    }
}
