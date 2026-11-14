# 墨页 Inkstone

以本地文档为中心的 macOS Markdown 阅读编辑器。源码仓库私有；[安装包与使用指南](https://github.com/quickwkq/inkstone-releases)公开。

## 开发

需要 Node.js 22.12+。使用 Electron + Vite + Vditor + DOMPurify，独立实现界面与文件管理，没有复用 Typora 源码或素材。

```sh
npm ci
npm start
npm test
npm run dist:all
npm run checksums
```

浏览器开发先执行 `node scripts/assets.mjs`，再执行 `npm run dev`，访问 http://127.0.0.1:5178 。浏览器保存会下载文件；桌面版使用系统打开和保存对话框。

## 0.2.0

- Apple Silicon / Intel DMG + ZIP，应用图标、拖入 Applications 安装界面及校验和
- Finder / Dock 文件打开、macOS 原生菜单、最近文件、关闭窗口后的 Dock 恢复
- 保存、另存为、关闭文档、当前文档查找
- 文件路径关联跨重启恢复，原子写入与外部修改检测
- 即时编辑 / 源码 / 阅读、大纲、搜索、主题、专注模式、草稿恢复、HTML 与打印导出
- GitHub Actions 双架构构建和可选签名公证配置

默认构建未签名、未公证；当前没有自动更新。详见 [分发指南](docs/DISTRIBUTION.md)。

文档限制 10 MB，富文本编辑会规范化 Markdown。草稿使用本机 localStorage，保存到实际文件需 ⌘S。重要文档仍需自行备份。外部图片可能请求网络。

## 参考调查

本机 Typora 1.8.10 的静态调查覆盖 199 个清单文件中的一个 JavaScript 文件，未做运行时验收。REA Evidence: `ev_53147ed4dbf475643837b31af1b6ea8d46e72d3042796e67808236af643e423e`。我们的 Electron 实现是独立设计选择，不代表 Typora 的架构。

Vditor 文档：https://github.com/Vanessa219/vditor 。第三方依赖遵循各自许可证。
