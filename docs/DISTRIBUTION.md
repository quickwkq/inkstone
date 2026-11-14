# macOS 分发

源码仓库：私有 `quickwkq/inkstone`。公开下载仓库：`quickwkq/inkstone-releases`，只提交安装说明并发布二进制附件，不镜像源码 Git 仓库。

## 构建

在 macOS 上安装 Node.js 22.12+，运行：

```sh
npm ci
npm test
npm run dist:all
npm run checksums
```

产物：`release/Inkstone-<version>-mac-arm64.dmg`、`x64.dmg` 和对应 ZIP；DMG 包含应用及 Applications 快捷方式。图标和背景由仓库内脚本生成，构建不依赖设计素材服务。应用不需要用户安装 Node.js。

GitHub Actions 对 Apple Silicon / Intel 分别构建，保留私有构建附件 14 天。流水线不自动发布、不读取公共仓库写入令牌。维护者测试后，把本版本的 DMG、ZIP、SHA256SUMS.txt 上传到公开仓库 Release。两个矩阵任务的校验和需要汇总为一个文件。不要上传调试日志、应用用户数据或源码仓库归档。

## 未签名与签名构建

默认 `identity: null`，不申请或使用 Apple 账号，也不宣称通过 Gatekeeper。下载页必须标明“未签名 / 未公证测试版”。首次打开可能被系统阻止，按 [Apple 官方说明](https://support.apple.com/en-us/102445)处理；不要要求用户关闭 Gatekeeper、SIP，或执行删除隔离属性的命令。

以后取得 Developer ID Application 证书后，在源码仓库 Actions Secrets 配置：

- `CSC_LINK`：导出的 P12 证书（base64 或 electron-builder 支持的私密证书来源）
- `CSC_KEY_PASSWORD`
- `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`

手动运行工作流并勾选 signed，或在本机设 `INKSTONE_SIGNED=1`。配置缺失会主动失败；签名与公证失败不能降级为“已签名”发布。发行前执行 codesign 验证、stapler validate、spctl 检查，并在另一台 Mac 验证从浏览器下载的文件。

当前没有自动更新；应用「帮助 → 下载新版本与使用说明」打开公开 Release。新版本覆盖 Applications 中的应用，用户数据保存在 Electron 的 userData 目录，开发模式和正式包应使用一致的应用名。

## 验收边界

Apple Silicon 本机进行启动、打开/保存、外部修改保护、另存为、跨进程恢复测试。Intel 产物交叉构建；真实 Intel Mac 仍需验收。自动化测试用临时用户目录和预设系统对话框结果，不会更改用户原始文件。下载后的 Gatekeeper 提示与实际系统文件对话框需要真人验收。

没有云同步或文档上传服务；用户插入的远程图片可能访问外部网址。草稿存储不是版本备份，重要文档仍需保存并备份。
