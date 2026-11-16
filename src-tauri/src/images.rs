use std::{fs, path::Path};

// Only serve image files inside the explicitly opened document's directory.
pub fn read(document: &Path, encoded: &str) -> Result<(Vec<u8>, &'static str), String> {
    let relative = percent_encoding::percent_decode_str(encoded).decode_utf8().map_err(|e|e.to_string())?;
    let root = document.parent().ok_or("文档目录不存在")?.canonicalize().map_err(|e|e.to_string())?;
    let path = root.join(relative.as_ref()).canonicalize().map_err(|e|e.to_string())?;
    if !path.starts_with(&root) { return Err("图片必须位于文档目录内".into()); }
    let mime = match path.extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "png" => "image/png", "jpg" | "jpeg" => "image/jpeg", "gif" => "image/gif",
        "webp" => "image/webp", "svg" => "image/svg+xml", "avif" => "image/avif",
        "bmp" => "image/bmp", "ico" => "image/x-icon", _ => return Err("不支持的图片类型".into())
    };
    if fs::metadata(&path).map_err(|e|e.to_string())?.len() > 20 * 1024 * 1024 { return Err("图片超过 20 MB".into()); }
    let data = fs::read(path).map_err(|e|e.to_string())?;
    Ok((data, mime))
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn resolves_unicode_and_rejects_escape() {
        let root=std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        fs::create_dir_all(root.join("images")).unwrap();
        fs::write(root.join("images/中文 空格.png"),b"image").unwrap();
        let document=root.join("article.md");
        assert_eq!(read(&document,"images/%E4%B8%AD%E6%96%87%20%E7%A9%BA%E6%A0%BC.png").unwrap().0,b"image");
        assert!(read(&document,"missing.png").is_err());
        assert!(read(&document,"../outside.png").is_err());
        std::os::unix::fs::symlink("/etc/hosts",root.join("escape.png")).unwrap();
        assert!(read(&document,"escape.png").is_err());
        fs::write(root.join("secret.txt"),b"private").unwrap();
        assert!(read(&document,"secret.txt").is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
