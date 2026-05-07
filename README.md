# WebShell Desktop

网页桌面壳：一个基于 Electron 的开源桌面壳项目，用于将远程 Web 应用封装为 Windows、macOS 和 Linux 桌面客户端。

这是一个基于 Electron 的桌面壳应用，用于加载远程服务：

```text
https://ai.boxrom.com/
```

当前支持 Windows、Linux、macOS 打包配置，主要面向 Windows 安装包发布。

## 项目结构

```text
.
├── main.js          # Electron 主进程入口
├── package.json     # 应用信息、依赖、打包配置
├── loading.html     # 启动加载页
├── offline.html     # 加载失败/断网页
├── about.html       # 关于窗口页面
├── settings.html    # 设置窗口页面
├── logs.html        # 日志查看器页面
├── notifications.html # 通知中心页面
├── downloads.html   # 下载管理器页面
├── onboarding.html   # 首次启动引导页
├── health.html       # 健康检查面板
├── announcement.html # 版本公告页
├── update.html       # 自动更新状态窗口
├── quick-actions.html # 快捷操作面板
├── feedback.html     # 问题反馈页面
├── remote-config.html # 配置中心页面
├── license.html      # 授权中心页面
├── release-notes.html # 更新说明页面
├── preload.js       # 本地管理页面 IPC 桥接
├── favicon.ico      # Windows 图标
├── favicon.icns     # macOS 图标
└── favicon.png      # Linux/托盘/通知图标
```

## 环境要求

- Node.js
- npm
- Windows 打包建议在 Windows 环境执行

安装依赖：

```bash
npm install
```

## 管理员工具

生成 RSA 密钥对：

```bash
npm run keypair -- --out keys
```

生成设备授权：

```bash
npm run license:generate -- --privateKey keys/private-key.pem --licenseId LIC-001 --licenseKey xxxx --subject 客户名称 --deviceId 设备ID --expiresAt 2027-05-01T00:00:00Z --out customer.license
```

生成通用授权，适合所有下载者使用：

```bash
npm run license:generate -- --privateKey keys/private-key.pem --licenseId UNIVERSAL-2026 --licenseKey public-download-license --subject 所有下载者 --universal --expiresAt 2027-05-01T00:00:00Z --out default.license
```

签名远程配置：

```bash
npm run config:sign -- config.json --privateKey keys/private-key.pem --out config.signed.json
```

生成更新说明 JSON：

```bash
npm run release-notes:generate -- --version 1.0.1 --out release-notes.json
```

生成完整性校验清单：

```bash
npm run manifest:generate
```

生产强制签名模式：

```bash
APP_REQUIRE_SIGNATURE=true
APP_TRUSTED_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

启用后，本地授权和远程配置必须带签名，且必须配置可信公钥。

启动开发环境：

```bash
npm start
```

## 打包

Windows x64：

```bash
npm run dist-win
```

Linux x64：

```bash
npm run dist-linux
```

打包输出目录：

```text
dist/
```

## 主要功能

- 加载远程网页 `https://ai.boxrom.com/`
- 启动时显示本地加载页，减少白屏
- 页面加载失败时显示本地错误页，并支持重试
- 网络断开/恢复时系统通知提醒
- 网络恢复后，如果当前在加载页或错误页，会自动重载主站
- 关闭窗口时最小化到托盘
- 第一次关闭窗口时提示“程序已最小化到托盘，可右键退出”
- 托盘菜单支持显示、刷新、打开官网、窗口置顶、开机启动、清理缓存、检查更新、关于、退出
- 设置窗口集中管理开机启动、启动最小化、关闭行为、快捷键、URL 环境、白名单、缩放、静音等配置
- 配置持久化到 `settings.json`
- 应用内通知中心记录网络、下载、更新、错误等事件
- 下载管理器显示下载进度、速度、来源，并支持打开文件/目录
- 日志查看器可直接查看 `app.log`
- 支持导出诊断信息，包含日志、版本、系统、窗口状态、当前配置
- 支持清理 Cookie、LocalStorage、全部站点数据
- GitHub Actions 支持 tag 自动打包并发布 Release
- 设置导入/导出，方便换电脑或重装后恢复
- 离线页显示网络状态、最后在线时间、自动重试倒计时，并支持打开日志、清理缓存并重试
- 首次启动引导介绍托盘、快捷键、设置入口、清理缓存和日志位置
- 重要通知会触发任务栏闪烁提醒
- 托盘状态支持在线、离线、下载中、有更新
- 下载完成动作可配置：仅通知、打开文件、打开文件夹、不提示
- 权限管理 UI 支持通知、摄像头/麦克风、剪贴板、定位、MIDI、屏幕共享
- 健康检查面板显示主站连通性、网络状态、证书状态、日志大小、Electron 版本等
- 一键修复会清理缓存、站点数据、重置窗口状态并重启
- 日志级别支持 error、warn、info、debug
- 日志超过 5MB 自动轮转归档
- 诊断导出包含 crash dump 路径
- 远程配置基础框架支持默认 URL、允许域名、公告、功能开关、最低版本强制更新
- 许可证基础校验支持许可证密钥、设备名、授权过期提醒
- 单实例运行，重复打开会唤起已有窗口
- 记住窗口大小、位置、最大化状态
- 页面顶部加载进度条
- 全局快捷键 `Ctrl+Alt+A` 显示/隐藏窗口
- 网页下载拦截，下载前选择保存路径，完成后通知并打开文件所在目录
- 外部链接使用系统浏览器打开
- 协议限制，只允许 `https:` 和 `file:`
- 权限白名单，默认只允许主站通知权限
- 生产环境默认禁用开发者工具
- HTTPS 证书异常时显示错误页并写日志
- 渲染进程崩溃时显示错误页
- 本地页面支持系统深色/浅色主题
- 关于窗口显示应用版本、官网、Electron、Chrome、Node.js 版本
- 日志文件记录关键错误
- 支持启动参数和环境变量切换 URL
- 自动更新窗口显示检查、下载进度、错误原因，并在下载完成后支持立即重启安装
- 支持 `stable`、`beta`、`dev` 更新渠道配置
- 页面加载超时、无响应、渲染进程崩溃会记录最近异常，并在下次启动提示修复
- 新增快捷操作面板 `Ctrl+Alt+Space`，可快速刷新、清理缓存、置顶、静音、打开设置/日志/反馈、重启应用
- 授权状态显示设备名、设备 ID、剩余天数和即将过期提醒
- 新增问题反馈窗口，可复制反馈内容、诊断摘要或导出完整诊断信息
- 托盘状态扩展为正在加载、网页异常、授权异常、后台运行中、有重要公告、更新下载中等
- 健康检查新增启动耗时、最近加载耗时、加载成功率、代理环境和权限访问记录
- 权限请求会记录来源、权限类型、允许/拒绝结果，便于排查安全问题

## 托盘菜单

当前托盘右键菜单包含：

```text
显示
显示/隐藏快捷键：Ctrl+Alt+A
快捷操作面板：Ctrl+Alt+Space
设置
刷新页面
打开官网
窗口置顶
静音
页面放大
页面缩小
恢复默认缩放
开机自动启动
打开开机启动设置
清理缓存并重启
清理 Cookie
清理 LocalStorage
清理全部站点数据
通知中心
下载管理器
日志查看器
健康检查
快捷操作面板
问题反馈
一键修复并重启
导出诊断信息
自动更新
检查更新
关于 WebShell Desktop
退出
```

## 快捷键

全局快捷键：

```text
Ctrl+Alt+A    显示/隐藏主窗口
Ctrl+Alt+Space 打开快捷操作面板
```

窗口内快捷键：

```text
F5            刷新当前页面
Ctrl+Shift+I  开发模式打开开发者工具
```

说明：正式打包后默认禁用 `Ctrl+Shift+I`。如果需要启用开发者工具，请使用 `--devtools` 参数。

## 启动参数

支持以下启动参数：

```bash
npm start -- --devtools
npm start -- --reset-window-state
npm start -- --clear-cache
npm start -- --env=prod
npm start -- --url=https://example.com/
npm start -- --name=我的应用 --url=https://example.com/
```

参数说明：

```text
--devtools             允许打开开发者工具
--reset-window-state   重置窗口大小、位置、最大化状态
--clear-cache          启动时禁用 HTTP 缓存
--env=prod|test|dev    使用指定环境的 URL
--url=地址             直接覆盖默认 URL
--name=名称            直接覆盖运行时应用名称
```

## 环境变量

也可以通过环境变量指定运行环境或 URL：

```text
APP_ENV=prod
APP_URL=https://example.com/
APP_NAME=我的应用
```

优先级：

```text
URL 优先级：--url 参数 > APP_URL 环境变量 > 设置页强制覆盖 URL > --env 参数 > APP_ENV 环境变量 > 设置页环境 > 默认 prod

应用名称优先级：--name 参数 > APP_NAME 环境变量 > 设置页应用名称 > 默认名称
```

当前 `main.js` 内置环境地址：

```js
const URLS = {
    prod: 'https://ai.boxrom.com/',
    test: 'https://ai.boxrom.com/',
    dev: 'https://ai.boxrom.com/'
};
```

如需区分测试环境和开发环境，修改这里即可。

## 关于窗口

点击托盘菜单 `关于 WebShell Desktop` 会打开独立窗口，显示：

```text
应用名称
应用版本
官网地址
Electron 版本
Chrome 版本
Node.js 版本
```

页面文件：

```text
about.html
```

## 设置窗口

点击托盘菜单 `设置` 会打开 `settings.html`，可配置：

- 开机自动启动
- 启动时最小化到托盘
- 窗口置顶
- 静音
- 关闭行为：关闭到托盘、直接退出、每次询问
- 显示/隐藏窗口快捷键
- 页面缩放
- 是否允许正式版打开开发者工具
- prod/test/dev URL
- 强制覆盖 URL
- URL 白名单 Origin
- 清理缓存并重启
- 检查更新
- 导出诊断信息
- 导入设置
- 导出设置
- 下载完成动作
- 权限管理
- 日志级别
- 远程配置 URL
- 许可证密钥和过期时间

设置保存位置：

```text
settings.json
```

Windows 上通常位于：

```text
C:\Users\你的用户名\AppData\Roaming\WebShell Desktop\settings.json
```

## 通知中心

点击托盘菜单 `通知中心` 会打开 `notifications.html`，显示最近事件：

- 网络断开/恢复
- 页面加载失败
- 下载完成/失败
- 自动更新状态
- 快捷键注册失败
- 证书错误

## 下载管理器

点击托盘菜单 `下载管理器` 会打开 `downloads.html`，显示：

- 文件名
- 下载来源
- 进度
- 已下载大小/总大小
- 下载速度
- 下载状态
- 打开文件
- 打开目录

## 日志查看器

点击托盘菜单 `日志查看器` 会打开 `logs.html`，直接查看 `app.log`。

## 诊断导出

点击托盘菜单 `导出诊断信息` 会生成 JSON 文件，包含：

- 应用版本
- Electron/Chrome/Node.js 版本
- 系统平台、架构、内存、CPU 数量
- 当前设置
- 窗口状态
- 应用日志
- 通知记录
- 下载记录
- crash dump 文件路径

## 首次启动引导

首次启动会打开 `onboarding.html`，说明：

- 托盘运行
- 快捷键
- 设置入口
- 清理缓存
- 日志位置
- 诊断导出

完成后会在 `userData` 目录写入：

```text
onboarding-done
```

## 健康检查

点击托盘菜单 `健康检查` 会打开 `health.html`，显示：

- 主站地址
- 网络状态
- 最后在线时间
- 主站连通性
- 证书状态
- 响应耗时
- 日志大小
- Electron、Chrome、Node.js 版本
- 许可证状态
- 远程配置状态

## 远程配置

可在设置窗口启用远程配置，并填写远程 JSON 地址。

远程配置示例：

```json
{
  "defaultUrl": "https://ai.boxrom.com/",
  "allowedOrigins": ["https://ai.boxrom.com"],
  "minVersion": "1.0.0",
  "forceUpdate": false,
  "forceUpdateMessage": "当前版本存在重要问题，请更新后继续使用。",
  "updateChannel": "stable",
  "logLevel": "debug",
  "logExpiresAt": "2026-05-10T00:00:00Z",
  "rollout": {
    "percentage": 20,
    "groups": ["beta", "internal"],
    "platforms": ["win32"],
    "versions": { "min": "1.0.0", "max": "2.0.0" },
    "features": { "quickActions": true },
    "disabledFeatures": { "feedback": false }
  },
  "releaseNotes": {
    "show": false,
    "title": "更新说明",
    "version": "1.0.1",
    "body": "修复若干问题。"
  },
  "killSwitch": {
    "enabled": false,
    "message": "当前版本已停止服务，请下载新版。"
  },
  "maintenance": {
    "enabled": false,
    "message": "服务维护中，预计 18:00 恢复。"
  },
  "commands": [
    { "commandId": "cmd-001", "type": "setLogLevel", "logLevel": "debug" }
  ],
  "revokeUniversalLicense": false,
  "revokedLicenses": ["LIC-2026-0001"],
  "announcement": {
    "id": "notice-2026-05-01",
    "title": "版本公告",
    "version": "1.0.0",
    "body": "更新内容...",
    "force": false,
    "actionText": "查看详情",
    "actionUrl": "https://ai.boxrom.com/"
  },
  "features": {
    "downloads": true,
    "diagnostics": true,
    "notifications": true,
    "health": true,
    "quickActions": true,
    "feedback": true,
    "updates": true,
    "logs": true,
    "settings": true,
    "trayMaintenance": true,
    "announcement": true,
    "autoRepairPrompt": true
  }
}
```

远程配置行为：

- `minVersion` 高于当前应用版本时，会提示需要更新、隐藏主窗口并触发检查更新。
- `forceUpdate: true` 会强制进入更新流程，即使 `minVersion` 未命中。
- `forceUpdateMessage` 会显示在强制更新提示中。
- `updateChannel` 可远程切换 `stable`、`beta`、`dev` 更新渠道。
- `announcement.force: true` 会打开不可关闭的强制公告窗口，并显示重要公告提示。
- `announcement.id` 用于记录已读状态；普通公告读过后不再重复弹出，强制公告每次都会弹。
- `announcement.actionText` 和 `announcement.actionUrl` 可显示公告按钮。
- `features` 是实际功能开关，默认全部开启；只有远程配置明确设置为 `false` 时才关闭对应功能。
- `rollout` 支持灰度发布。客户端会按稳定设备 ID 计算 0-99 的 bucket，命中 `percentage`、`groups`、`platforms`、`versions` 后才应用 `rollout.features`；未命中时可应用 `rollout.disabledFeatures`。
- `logLevel` 可远程临时调整日志级别；如果配置了 `logExpiresAt`，过期后不会生效。
- 远程配置支持 `{ "payload": {...}, "signature": "base64" }` 包装格式；配置了环境变量 `APP_TRUSTED_PUBLIC_KEY` 后会使用 RSA-SHA256 验签，失败则拒绝生效。
- `APP_REQUIRE_SIGNATURE=true` 会启用强制签名模式，缺签名或缺公钥都会拒绝授权/配置。
- 拉取成功的远程配置会缓存到 `remote-config-cache.json`，拉取失败时自动使用缓存；应用失败会回滚到上一份配置。
- `commands` 支持一次性远程命令，必须带 `commandId`，避免重复执行。当前支持 `clearCache`、`restart`、`announcement`、`setLogLevel`、`exportDiagnostics`、`syncRemoteConfig`。
- `revokedLicenses` 可撤销本地授权文件中的 `licenseId`。
- `revokeUniversalLicense: true` 会一键吊销所有通用授权，适合停止面向所有下载者的公共授权。
- `killSwitch.enabled: true` 会停止加载主站，只允许使用更新、授权、诊断等本地能力。
- `maintenance.enabled: true` 会显示维护提示，不再加载主站。

当前支持的 `features`：

- `downloads`：下载拦截、下载管理器、下载文件打开入口。
- `diagnostics`：导出诊断、复制诊断摘要。
- `notifications`：系统通知和通知中心。
- `health`：健康检查面板和健康检查 IPC。
- `quickActions`：快捷操作面板和 `Ctrl+Alt+Space` 入口。
- `feedback`：问题反馈窗口和反馈复制。
- `updates`：自动更新窗口、检查更新和安装更新。
- `logs`：日志查看器和读取日志。
- `settings`：设置窗口、设置保存、导入、导出。
- `trayMaintenance`：清理缓存、清理站点数据、一键修复等维护操作。
- `announcement`：远程公告窗口。
- `autoRepairPrompt`：启动时异常恢复提示。

灰度相关本地设置：

- `rolloutGroup`：用户分组，默认 `stable`，可在设置页改为 `beta`、`internal` 等。
- `deviceId`：首次启动生成并保存到 `device-state.json`，用于稳定分桶。

白屏/崩溃诊断：

- 页面加载超时、窗口无响应、渲染进程崩溃时，会自动截图到 `userData/diagnostics/`。
- 截图路径会写入 `last-crash.json` 和诊断导出文件。

服务端授权校验：

- 设置页可填写 `licenseServerUrl` 和 `licenseOfflineGraceDays`。
- 客户端会向授权接口 `POST` 许可证、设备 ID、设备名、版本、平台和分组。
- 授权接口建议返回 `{ "valid": true, "reason": "授权有效", "daysLeft": 30, "expiresAt": "2026-06-01" }`。
- 授权服务器不可用时，如果上次授权有效且未超过离线宽限期，会继续允许使用并标记为离线授权。
- 设置页支持导入本地授权文件，导入后会保存到 `local-license.json`，没有授权服务器时也可离线校验。

本地授权文件示例：

```json
{
  "licenseId": "LIC-2026-0001",
  "licenseKey": "xxxx-xxxx-xxxx",
  "subject": "客户名称或授权对象",
  "deviceId": "可选，填写后只允许指定设备使用",
  "notBefore": "2026-05-01T00:00:00Z",
  "expiresAt": "2027-05-01T00:00:00Z"
}
```

授权可限制功能、版本和渠道：

```json
{
  "licenseId": "TRIAL-001",
  "licenseKey": "trial-key",
  "channel": "trial",
  "minAppVersion": "1.0.0",
  "maxAppVersion": "1.5.0",
  "features": {
    "downloads": true,
    "updates": false
  }
}
```

通用授权文件示例，适合给予所有下载者使用：

```json
{
  "licenseId": "UNIVERSAL-2026",
  "licenseKey": "public-download-license",
  "subject": "所有下载者",
  "universal": true,
  "scope": "universal",
  "expiresAt": "2027-05-01T00:00:00Z"
}
```

签名授权文件示例：

```json
{
  "payload": {
    "licenseId": "LIC-2026-0001",
    "licenseKey": "xxxx-xxxx-xxxx",
    "subject": "客户名称",
    "deviceId": "win32-PC-12345",
    "expiresAt": "2027-05-01T00:00:00Z"
  },
  "signature": "base64-signature"
}
```

配置 `APP_TRUSTED_PUBLIC_KEY` 后会校验本地授权和远程配置签名。未配置公钥时，为兼容测试环境，会记录警告并跳过验签。

本地授权规则：

- `deviceId` 为空时不绑定设备。
- `universal: true` 或 `scope: "universal"` 表示通用授权，不校验设备绑定，所有下载者都可导入使用。
- `deviceId` 不为空时必须等于当前设备 `deviceId`。
- `notBefore` 晚于当前时间时授权尚未生效。
- `expiresAt` 早于当前时间时授权过期。
- 导入成功后，如果文件包含 `licenseKey`，会同步到设置里的许可证密钥。
- 授权中心支持导出 `license-request.json`，包含设备 ID、设备名、系统、版本和申请时间，便于管理员生成离线授权。
- 授权中心和设置页支持一键清除当前通用授权。
- 授权中心支持拖拽 `.license` 文件导入。
- 如果安装包内置 `default.license`，首次启动会自动导入，适合所有下载者开箱可用；后续仍可通过 `revokeUniversalLicense` 远程吊销。
- 配置中心可查看当前远程配置 URL、缓存状态、生效 features、灰度 bucket、公告 ID 和日志级别。
- 配置中心会显示远程配置审计日志、命令执行回执、配置来源徽章、features 开关列表和灰度 bucket。
- 授权中心会显示授权状态卡片、剩余天数进度条、通用授权/签名状态标识。
- 远程命令执行结果会写入 `command-receipts.log`，如果远程配置提供 `commandReceiptUrl` 会尝试上报。
- 授权状态会定期写入 `license-status-report.log`，如果远程配置提供 `licenseStatusReportUrl` 会尝试上报。
- 远程配置拉取、签名校验、缓存使用、版本变化、features 变化、kill switch 和 maintenance 会写入 `remote-config-audit.log`。
- 本地授权保存时会尽量使用 Electron `safeStorage` 加密 `licenseKey`；系统不支持加密时回退明文。
- 可运行 `npm run manifest:generate` 生成 `manifest.json`，启动时会校验 `main.js`、`preload.js`、`*.html`、`default.license` 和 `tools/*.js` 的 SHA256。
- 完整性异常或连续启动失败 3 次会进入安全模式，只提供修复、授权、诊断和日志等本地操作。

## 许可证

设置窗口支持填写：

- 许可证密钥
- 许可证过期时间

当前实现支持本地基础校验和可选服务端校验：未配置服务端时，未填写视为无许可证，过期时间早于当前时间视为过期；配置服务端后，会优先使用服务端返回的授权状态，并支持离线宽限期。

## 自动更新

项目已加入依赖：

```json
"electron-updater": "^6.3.9"
```

当前代码会在打包环境中尝试自动检查更新，开发模式下会跳过。

注意：自动更新要真正生效，还需要配置发布源，例如 GitHub Releases、私有更新服务器或对象存储。未配置发布源时，检查更新可能失败，但不会影响应用启动，错误会写入日志。

后续可以在 `package.json` 的 `build` 中增加类似配置：

```json
"publish": [
  {
    "provider": "github",
    "owner": "你的 GitHub 用户名或组织",
    "repo": "你的仓库名"
  }
]
```

## 日志位置

应用日志写入 Electron 的 `userData` 目录：

```text
app.log
```

日志会记录：

- 页面加载失败
- HTTPS 证书错误
- 缓存清理失败
- 窗口状态保存失败
- 渲染进程异常退出
- 自动更新检查失败

Windows 上通常位于：

```text
C:\Users\你的用户名\AppData\Roaming\WebShell Desktop\app.log
```

实际目录取决于 Electron 的 `app.getPath('userData')`。

## 本地状态文件

应用会在 `userData` 目录保存：

```text
window-state.json     窗口大小、位置、最大化状态
close-tip-shown       是否已经显示过关闭到托盘提示
settings.json         用户设置
device-state.json     设备 ID、首次启动时间、最近在线状态
local-license.json    导入的本地离线授权
announcement-read.json 公告已读状态
remote-config-cache.json 最近成功生效的远程配置缓存
remote-config-backup.json 上一份远程配置备份
remote-commands.json 已执行远程命令 ID
license-reminders.json 授权过期提醒记录
remote-config-audit.log 远程配置审计日志
command-receipts.log 远程命令执行回执
license-status-report.log 授权状态上报记录
startup-state.json 连续启动状态
app.log               应用日志
```

如果窗口位置异常，可以使用：

```bash
npm start -- --reset-window-state
```

## 安全策略

当前安全策略包括：

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- 禁止远程页面访问 Node.js 能力
- 只允许 `https:` 和 `file:` 协议
- 非主站外链使用系统浏览器打开
- 默认只允许主站通知权限
- 支持 URL 白名单 Origin 配置
- 记录外链、新窗口、可疑协议和下载来源审计日志
- 生产环境禁用开发者工具快捷键
- HTTPS 证书异常时拒绝加载并显示错误页

如果远程网页需要摄像头、麦克风、定位等权限，需要在 `main.js` 中修改：

```js
const ALLOWED_PERMISSIONS = new Set(['notifications']);
```

例如允许麦克风：

```js
const ALLOWED_PERMISSIONS = new Set(['notifications', 'media']);
```

## 图标要求

各平台图标：

| 平台 | 图标格式 |
| --- | --- |
| Windows | `.ico` |
| macOS | `.icns` |
| Linux | `.png` |

建议图标尺寸：

```text
256x256
```

## 常用配置位置

修改默认访问地址可以直接在设置页的 `URL 环境` 中填写，也可以启动时覆盖：

```bash
npm start -- --url=https://example.com/
```

修改托盘提示和运行时应用标题可以直接在设置页的 `应用名称` 中填写，也可以启动时覆盖：

```bash
npm start -- --name=我的应用
```

修改打包应用名：

```json
"build": {
  "productName": "WebShell Desktop"
}
```

也可以不改文件，打包时临时覆盖：

```bash
npx electron-builder --win --x64 -c.productName=我的应用 -c.appId=com.example.myapp
```

修改版本号：

```json
"version": "1.0.0"
```

## 依赖版本

当前配置：

```json
"dependencies": {
  "electron-updater": "^6.3.9",
  "electron-localshortcut": "^3.2.1",
  "qiao-is-online": "^1.0.6"
},
"devDependencies": {
  "electron": ">=40.0.0",
  "electron-builder": "^26.0.0"
}
```

如果希望只使用 Electron 40.x，不自动升级到更高大版本，可以改成：

```json
"electron": "^40.0.0"
```

## GitHub Actions 自动打包

已新增 workflow：

```text
.github/workflows/build.yml
```

触发方式：

- 手动运行 `workflow_dispatch`
- 推送 `v*` tag，例如 `v1.0.0`

流程会在 Windows 环境执行：

```bash
npm install
npm run dist-win
```

推送 tag 时会自动创建 GitHub Release 并上传 `dist/` 产物。

## 打包注意事项

如果打包异常，可以清理缓存后重试。

Windows 常见缓存目录：

```text
C:\Users\你的用户名\AppData\Local\electron-builder\Cache\
C:\Users\你的用户名\AppData\Local\electron\Cache\
```

Linux 常见缓存目录：

```text
~/.cache/electron/
~/.cache/electron-builder/
```

也可以删除 `dist/` 后重新打包。

## 故障排查

如果启动白屏：

- 检查网络是否能访问 `https://ai.boxrom.com/`
- 查看本地错误页提示
- 查看 `app.log`
- 使用托盘菜单 `清理缓存并重启`

如果窗口跑到屏幕外：

```bash
npm start -- --reset-window-state
```

如果需要临时换地址测试：

```bash
npm start -- --url=https://example.com/
```

如果需要打开开发者工具：

```bash
npm start -- --devtools
```
