# macOS 分发

源码与新版安装包公开在 quickwkq/inkstone，采用 MIT 许可证。quickwkq/inkstone-releases 保留 0.3.2 及更早版本的下载。

## 版本与 tag

每次发版必须先提交全部改动，确认工作区干净，并执行 `npm run check:version`。package.json、package-lock.json、Cargo.toml、Cargo.lock 和 tauri.conf.json 的版本必须一致。

从最终提交构建并验收两个架构的安装包后，在该提交创建 `v<version>` tag（例如 `v0.3.3`），将 Release 绑定到同一 tag，并附上 DMG、ZIP 和 SHA256SUMS.txt。发布后不可移动 tag 或用同版本号替换安装包；修复必须增加版本号。首次开源版本为 0.3.3。

可用 `git tag -a v<version> <commit> -m "Inkstone <version>"` 创建 tag，然后 `git push origin v<version>`；GitHub Release 页面创建 tag 时也必须选择最终提交。CI 会校验 tag 与包版本相同，但不会自动发布安装包。

## 构建

macOS 13+、Xcode Command Line Tools、Node.js 22.12+、rustup。Rust 版本和两个目标由 rust-toolchain.toml 固定。

```sh
npm ci
npm test
npm run test:native
npm run dist:all
npm run checksums
```

Tauri 通过系统 WKWebView 显示界面，不捆绑 Chromium 或 Node.js。产物为 release/Inkstone-<version>-mac-arm64.dmg、x64.dmg 及 ZIP。DMG 包含应用和 Applications 快捷方式。

CI 分别构建两个架构，构建产物保留 14 天，不自动发布。上传公开 Release 前验证文件操作、安装包和校验和。合并矩阵任务的 SHA256SUMS.txt。不得上传应用用户数据、凭据或调试日志。

## 未签名测试版

Tauri 的 `bundle.macOS.signingIdentity` 显式设为 `-`，对完整 App bundle 做 ad-hoc 签名。仅依赖链接器给 Mach-O 可执行文件生成的签名会导致 bundle 校验失败（`code has no resources but signature indicates they must be present`）。收集安装包前必须通过 `codesign --verify --deep --strict`；发行验收还需挂载 DMG，校验其中的 App 并实际启动。ad-hoc 校验通过不能证明 Gatekeeper 信任或公证通过。

当前不配置 Developer ID 证书或 Apple 公证。架构要求的 ad-hoc 签名不等于 Developer ID 签名。下载页标明“未签名 / 未公证测试版”，不要宣称通过 Gatekeeper。首次打开按 [Apple 官方说明](https://support.apple.com/en-us/102445)处理，不关闭系统保护。未来签名发行需另行配置 Tauri 的 Apple 签名/公证环境并验证 stapler 和 spctl。

## 0.2 → 0.3 草稿迁移

升级前，在 0.2 Electron 版把每份重要草稿保存为 .md 文件。安装 0.3 后重新打开文件。新版不会自动读取 Chromium localStorage，也不会删除旧版数据。旧版用户数据仍保留在 ~/Library/Application Support/Inkstone。需要找回未保存草稿时，可重新启动旧版安装包。

新版文件关联信息保存在 ~/Library/Application Support/com.quickwkq.inkstone/documents.json；草稿由 WKWebView localStorage 管理。关闭窗口隐藏应用，Dock 可恢复；退出后重新启动可恢复新版草稿。重要文件请另行备份。

## 验收范围

自动化测试覆盖 Markdown 模型、Unicode 文件、原子写入、符号链接、大小与扩展名限制。本机验证 Apple Silicon 包；Intel 包需要 Intel 真机验证。浏览器下载后的 Gatekeeper 体验不等同本地启动验证。没有自动更新或云同步。
