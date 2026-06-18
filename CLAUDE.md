# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

「寄信」(myLetter) —— 一个定时信件投递服务。用户写信、设置投递时间，信件通过 Email 自动送达，或生成二维码当面赠送。信件 30 天后从数据库自动销毁。线上地址 https://useralex110.github.io/myLetter

## 架构大图

这是一个**前后端分离、无构建工具**的应用，理解它的关键在于三层之间的契约：

1. **前端**：单文件 `index.html`（约 1800 行，HTML+CSS+JS 全内联，Vanilla JS，零框架、零包管理器）。通过 `location.hash` 做单页路由（`#token/{id}` = 读信页，否则写信页）。前端**只调用 3 个云函数**（save/read/delete），不直接调 emailLetter。
2. **后端**：`tencent-cloud/` 下 4 个独立 Node.js 云函数，跑在腾讯 CloudBase（上海节点），全部操作同一个 NoSQL 集合 `letters`。
3. **邮件**：emailLetter 云函数通过 Resend 发邮件，与前端无直接交互。

**数据流（Email 通道）**：前端 POST saveLetter → 写入 `letters`（`sent:false`）→ emailLetter 定时触发器每分钟轮询 → 到 `openAt` 时间的信件经 Resend 发出 → 收件人点邮件链接 → 前端 `#token/{id}` → GET readLetter 取正文 → 打字机动画展开。

**数据流（二维码通道）**：不填 email 即为当面送信，二维码只编码短链接 `#token/{id}`（不含正文），扫码后同样走 readLetter。

### `letters` 集合文档结构（前后端共享契约）

```
_id          8 位随机串（saveLetter 用 Math.random().toString(36) 生成，readLetter/deleteLetter 按它查）
to/body/from/theme/date   信件内容；theme ∈ warm|cool|pink|mint
email        收信邮箱，'' 表示纯二维码模式（emailLetter 跳过）
openAt       定时投递时间（Date）；不存在/null = 立即发送
expireAt     创建 +30 天；readLetter 读到过期信件会顺手删除
sent         false | true | 'failed'（重试 3 次失败后置 'failed'）
sendAttempts emailLetter 每次尝试前 inc(1)，<3 才会被轮询到
createTime   db.serverDate()
```

修改任一字段时，必须同步检查所有读写它的地方：`saveLetter`(写)、`readLetter`/`deleteLetter`(读)、`emailLetter`(读写 sent/sendAttempts)、`index.html`(前端构造与渲染)。

### 三条隐性约定（容易踩坑）

- **定时投递的真相**：定时不是靠延迟发送，而是 saveLetter 立即落库 + emailLetter 每分钟轮询过滤 `openAt <= now`。改投递逻辑要同时动这两端。
- **重试与限流**：emailLetter 单次最多处理积压信件，每封间隔 500ms 防 Resend 限频；失败重试上限 3 次（`sendAttempts<3` 是查询条件）。
- **邮件 HTML 的硬约束**：邮件模板（emailLetter 的 `buildHtml`）必须用**全行内样式 + table 布局**，禁用 Flexbox / CSS 动画 / JS / 背景图，否则在 QQ 邮箱、163、Foxmail 等国内邮箱渲染会坏。同时必须维护 `buildText` 纯文本 fallback。

## 后端接口契约

- `POST saveLetter` body: `{to?, body(必填), from?, theme?, date?, email?, openAt?}` → `{id, ok:true}`；空 body 返回 400，邮箱格式非法返回 400。
- `GET readLetter?id={id}` → 正常返回正文；`openAt` 未到返回 `{locked:true, openAt, to, from, theme}`（不含 body）；过期/不存在返回 404。
- `GET deleteLetter?id={id}` → `{ok:true}`。
- 所有函数都处理 `OPTIONS` 预检并返回 `Access-Control-Allow-Origin: *`；入参经 `event.body`（可能 base64）或 `event.queryString`/`queryStringParameters` 读取。

前端的 3 个云函数 URL 硬编码在 `index.html:1083-1085`（`SAVE_API`/`READ_API`/`DELETE_API`）。换 CloudBase 环境后必须改这里。

## 开发与部署

**本地预览**（无构建步骤）：
```bash
python3 -m http.server 8080   # 然后访问 http://localhost:8080
```
注意：本地预览的 API 调用会打到真实的 CloudBase 后端。

**没有测试、lint、构建命令** —— 仓库无根级 package.json，前端零依赖。`docs/qa-test-report.md` 是人工 QA 记录。

**后端部署全靠 CloudBase 控制台手动操作**（仓库里没有 `cloudbaserc.json`，云函数的环境变量、定时触发器、集合创建都不是代码）：
- 创建 `letters` 集合，部署 4 个云函数，开启 HTTP 访问。
- emailLetter 配定时触发器 Cron `0 */1 * * * * *`（每分钟），并配环境变量 `RESEND_API_KEY` / `SENDER_EMAIL` / `SITE_URL`。

**前端部署**：push 到 GitHub，Pages 自动更新。

## Git 提交约定

- **每次 commit 信息必须包含丰富的表情包（emoji），不可省略**。表情包要"多来一点"，与提交内容语义相关、视觉好看，开头与结尾都可加。
- 推荐前缀 emoji 按类型：✨feat / 🐛fix / 📝docs / ♻️refactor / 🎨style / 🚀perf / 🔧chore / 🧪test / 🗑️remove
- 示例：
  - `✨feat: 新增 Email 定时投递 💌🚀📅`
  - `🐛fix: 修复立即发送查询不到 🛠️🔧💡`
  - `📝docs: 更新 README 至 v0.1 📚✨🔖`

## 邮件服务（Resend）

- 发件域名 `letter@jixinletter.cn`（域名在阿里云购买），SDK `resend@^4.0.0`，Resend 区域 Tokyo（ap-northeast-1），免费额度 100 封/天。
- API Key 放在 CloudBase 云函数环境变量 `RESEND_API_KEY`（不在代码里）。
- 已在 Resend 配置该域名的 SPF / DKIM / DMARC DNS 记录；改发件域名需重新配这三条记录并在 Resend 验证。

## CloudBase 开发辅助

本仓库已通过 `npx skills add tencentcloudbase/cloudbase-skills` 安装官方云开发 AI 规则于 `.claude/skills/cloudbase/`，并在 `.mcp.json` 配置了 CloudBase MCP（环境管理、云函数部署、数据库操作等实时工具，需重启会话后用 `/mcp` 确认连接）。涉及 CloudBase 的开发优先参考该 skill 与 MCP 工具。

## 行尾约定

`.gitattributes` 强制 html/css/js/md/json/yml 用 LF，编辑时勿引入 CRLF。
