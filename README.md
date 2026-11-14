# 墨页 Inkstone

一个以本地文档为中心的 Markdown 阅读编辑器，首版面向 macOS。参考 Typora 的单画布编辑理念，使用开源 Vditor 内核；没有复用 Typora 的源码、图标或主题。

## 运行

需要 Node.js 22.12+。

```sh
npm ci
npm start        # 构建并启动桌面应用
npm run pack    # 生成未签名 macOS .app 到 release/
```

浏览器开发：先运行 `node scripts/assets.mjs`，再运行 `npm run dev`，访问 http://127.0.0.1:5178 。浏览器保存操作下载文件；桌面版使用系统打开/保存对话框。

## 首版功能

- 即时渲染编辑、Markdown 源码、阅读模式
- 文档列表、内容搜索、标题大纲、重命名、多文档草稿
- 本地草稿自动恢复、系统文件打开/保存、Markdown 下载
- 明暗主题、专注模式、字符统计、常用快捷键
- HTML 导出、系统打印 / 保存 PDF

草稿持久化使用本机 localStorage；保存到实际 .md 文件需要点击保存或 ⌘S。打开的路径仅在本次进程内记忆，重启后再次保存会请求选择位置。首版限制导入文件不超过 10 MB。富文本模式会规范化 Markdown 格式，不承诺逐字节往返。外部图片仍需要网络。链接不在桌面应用中跳转。未提供文件夹树、云同步、历史版本、Pandoc 导出或发布签名。

## 验证

```sh
npm test
npm run build
```

## 参考与边界

本机 Typora 1.8.10 静态调查确认了源码模式、大纲和实时渲染相关结构；没有对 Typora 做运行时验收。REA 6.7.0 分析了 199 个清单文件中的一个选中 JavaScript 文件，图覆盖不完整。

Evidence ID: `ev_53147ed4dbf475643837b31af1b6ea8d46e72d3042796e67808236af643e423e`。

独立实现选择：Electron 桌面宿主 + Vite + Vditor + DOMPurify。这不代表 Typora 使用相同架构。

Vditor 文档：https://github.com/Vanessa219/vditor 。第三方依赖遵循各自许可证。
