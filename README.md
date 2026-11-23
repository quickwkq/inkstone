# 墨页 Inkstone

本地优先的开源 macOS Markdown 阅读编辑器，采用 [MIT 许可证](LICENSE)。[下载最新安装包](https://github.com/quickwkq/inkstone/releases)，[历史版本](https://github.com/quickwkq/inkstone-releases/releases)。

## 开发

0.3.0 使用 Tauri 2 + macOS WKWebView，复用 Vite、Vditor、DOMPurify 界面；不再捆绑 Electron/Chromium/Node.js。需要 macOS 13+、Xcode Command Line Tools、Node.js 22.12+、rustup（项目固定 Rust 1.90）。

```sh
npm ci
npm test
npm run test:native
npm start
npm run dist:all
npm run checksums
```

## 功能

0.3.3：纯白与深色主题，支持跟随系统；代码块语法高亮及 HTML 导出；顶部文件名自适应宽度，保存状态位于右下角，外观使用图标与文字。每个正式发布的版本均有对应的 `v<版本号>` 源码 tag。

即时编辑、源码和阅读模式；大纲、搜索、明暗主题和专注模式；本地草稿恢复；系统打开/保存/另存为对话框；最近文件；Finder 文件关联；HTML 导出和系统打印/PDF。原子保存、符号链接保留和外部修改检测防止意外覆盖。

文档限制 10 MB。草稿使用本机 WebView localStorage，写入磁盘文件需 ⌘S。富文本会规范化 Markdown，远程图片可能访问网络。

## 从 0.2 升级

**先在旧版中把需要的草稿保存为 .md 文件**，再安装新版重新打开。Electron 与 WebKit 的草稿数据库不同，新版不会自动读取旧草稿，也不会删除旧数据。旧版安装包仍可从 Release 下载。详见 [分发指南](docs/DISTRIBUTION.md)。

默认发行版没有 Developer ID 签名或 Apple 公证，没有自动更新。Intel 包可交叉构建，但需要 Intel 真机独立验收。

0.3.2 支持已打开 Markdown 文件同目录及子目录中的本地图片，例如 `![图片](images/001.jpg)`，包括中文和空格路径。即时编辑、阅读和恢复草稿均按绑定的文档目录解析；HTML 导出会嵌入本地图片。请保留 Markdown 与 images 目录的相对位置；浏览器预览版无法直接读取本机目录。磁盘目录之外的图片、绝对路径和 file:// 链接暂不支持，单图限制 20 MB。

## 参考与许可证

独立实现界面与文件管理，没有复用 Typora 源码或素材。先前 Typora 1.8.10 静态调查仅覆盖一个 JavaScript 文件，不代表其完整架构。Vditor：https://github.com/Vanessa219/vditor 。第三方依赖遵循各自许可证。
