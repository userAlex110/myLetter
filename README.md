# 寄信 — 寄往未来的某个时刻

> 一个极简的定时信件投递服务。写信，设置投递时间，通过 Email 自动送达对方。也保留二维码当面送信。信件 30 天后自动销毁。

---

## 在线体验

https://useralex110.github.io/myLetter

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 写信 | 填写收信人、正文、署名，选择信纸主题 |
| Email 投递 | 填写收信人邮箱，支持立即 / 定时发送 |
| 定时送达 | 信件在指定时间自动发送到对方邮箱 |
| 生成二维码 | QR 码只包含短链接，扫描快速稳定 |
| 扫码读信 | 打开链接后，信件以打字机动画逐字展开 |
| 打印卡片 | 生成可打印的实体卡片，适合当面赠送 |
| 四种主题 | 暖光 / 静谧蓝 / 樱花粉 / 薄荷绿 |
| 自动销毁 | 信件 30 天后自动从数据库删除 |

---

## 技术架构

### 前端

- **单文件 HTML**：零构建工具，零前端框架，纯原生 HTML + CSS + JavaScript
- **单页路由**：通过 `location.hash` 实现写信页 / 读信页无刷新切换
- **CSS 变量主题**：`:root` 定义设计令牌，一键切换四套配色
- **打字机动画**：根据字符类型（换行、标点、普通文字）动态调整打字速度
- **响应式布局**：适配手机、平板、桌面端

### 后端

- **腾讯云 CloudBase**：云函数 + NoSQL 数据库
- **三个云函数**：
  - `saveLetter`（POST）— 保存信件，返回短 ID，支持 Email 字段
  - `readLetter`（GET）— 根据 ID 读取信件，检查是否过期
  - `emailLetter`（定时触发器）— 每分钟轮询待发送信件，通过 Resend API 投递 Email
- **邮件服务**：[Resend](https://resend.com) — 域名邮箱 `letter@letter.jixinletter.cn`，HTML + 纯文本双版本
- **数据过期**：写入时记录 `expireAt`，读取时检查并自动清理

### 部署

- **前端**：GitHub Pages（免费 CDN）
- **后端**：腾讯云 CloudBase（上海节点）
- **邮件**：Resend（Tokyo 区域）

---

## 项目结构

```
myLetter/
├── index.html                     # 前端页面（单文件 HTML + CSS + JS）
├── docs/
│   ├── arch-design.md             # 架构设计文档
│   ├── incremental-prd.md         # 增量 PRD
│   └── qa-test-report.md          # QA 测试报告
├── tencent-cloud/                 # 腾讯云 CloudBase 云函数
│   ├── saveLetter/
│   │   ├── index.js               # 保存信件（含 Email 字段）
│   │   └── package.json
│   ├── readLetter/
│   │   ├── index.js               # 读取信件
│   │   └── package.json
│   ├── emailLetter/
│   │   ├── index.js               # Email 定时投递（Resend API）
│   │   └── package.json
│   └── deleteLetter/
│       ├── index.js               # 销毁信件
│       └── package.json
└── README.md
```

---

## 快速开始（本地开发）

```bash
# 克隆仓库
git clone https://github.com/userAlex110/myLetter.git
cd myLetter

# 直接用浏览器打开 index.html 即可预览
# 或使用任意本地服务器
python3 -m http.server 8080
# 然后访问 http://localhost:8080
```

> 注意：本地预览时，API 调用会走真实的腾讯云后端。如需完全本地开发，需要自行搭建后端或使用 mock。

---

## 部署到自己的环境

### 后端部署（腾讯云 CloudBase）

1. 开通 [CloudBase 环境](https://tcb.cloud.tencent.com/dev#/select-env)
2. 创建数据库集合 `letters`
3. 部署 `saveLetter`、`readLetter`、`deleteLetter`、`emailLetter` 四个云函数
4. 配置 `emailLetter` 的环境变量：
   - `RESEND_API_KEY` — Resend API 密钥
   - `SENDER_EMAIL` — 发件人邮箱（如 `letter@your-domain.cn`）
   - `SITE_URL` — 站点根 URL
5. 为 `emailLetter` 添加定时触发器（Cron 表达式：`0 */1 * * * * *`）
6. 开启 HTTP 访问服务
7. 修改 `index.html` 中的 API 地址

### Email 配置（Resend）

1. 注册 [Resend](https://resend.com) 账户
2. 添加子域名（如 `letter.your-domain.cn`），区域选 Tokyo
3. 在域名 DNS 中添加 Resend 提供的 SPF / DKIM / DMARC 记录
4. 验证通过后，创建 API Key 并填入 CloudBase 环境变量

### 前端部署（GitHub Pages）

```bash
git add .
git commit -m "update API endpoints"
git push
```

GitHub Pages 会自动更新。

---

## 设计亮点

### 1. Email 投递 + QR 码双通道

- **Email 通道**：填写收信人邮箱，设置立即/定时发送，信件通过邮件自动送达
- **QR 通道**：不填邮箱即为当面送信，保留原有二维码 + 打印卡片体验
- 两者的读信体验完全一致（打字机动画）

### 2. 邮件模板兼容国内邮箱

Email 邮件采用 **全行内样式 + table 布局**，不使用 Flexbox、CSS 动画、JavaScript、背景图片，确保在 QQ 邮箱、163、Foxmail 等国内主流邮箱中正常渲染。同时提供纯文本 fallback。

### 3. QR 码只存链接，不存内容

传统做法把信件全文编码进 QR 码，导致：
- 内容一长，QR 码密密麻麻，扫描困难
- 内容不可修改

本项目的做法：QR 码只包含 `https://xxx/#token/abc123`（约 50 字符），信件内容存在服务端。

### 4. 打字机读信效果

不是简单的 `setInterval` 匀速输出，而是：
- 换行符停顿 140ms（模拟回车）
- 标点符号停顿 120ms（模拟思考）
- 普通字符 40~70ms 随机速度（模拟真人打字节奏）

### 5. 单文件前端

整个前端只有一个 `index.html`（约 1700 行），没有构建工具、前端框架、包管理器，适合快速迭代和零依赖部署。

---

## API 接口

### POST /saveLetter

**请求体：**
```json
{
  "to": "收信人名字（可选）",
  "body": "信件正文（必填）",
  "from": "署名（可选）",
  "theme": "warm | cool | pink | mint",
  "date": "2026-05-22",
  "email": "recipient@example.com",
  "openAt": "2026-05-23T09:00:00.000Z"
}
```

**响应：**
```json
{
  "id": "hjs8rvte",
  "ok": true
}
```

### GET /readLetter?id={id}

**响应（成功）：**
```json
{
  "ok": true,
  "to": "收信人",
  "body": "信件正文",
  "from": "署名",
  "theme": "warm",
  "date": "2026-05-22"
}
```

**响应（过期或不存在）：**
```json
{
  "error": "Letter not found or expired"
}
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5, CSS3, Vanilla JavaScript |
| QR 码生成 | [QRCode.js](https://github.com/davidshimjs/qrcodejs) |
| 字体 | Google Fonts（Noto Serif SC, ZCOOL XiaoWei）|
| 后端 | 腾讯云 CloudBase 云函数（Node.js 18）|
| 数据库 | CloudBase NoSQL（类 MongoDB）|
| 邮件服务 | [Resend](https://resend.com) |
| 发件域名 | `letter.jixinletter.cn`（SPF + DKIM + DMARC）|
| 前端部署 | GitHub Pages |
| 后端部署 | 腾讯云 CloudBase（上海节点）|

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-05-22 | v2.1 | Email 定时投递上线：Resend 集成、域名 `jixinletter.cn`、邮件模板兼容国内邮箱 |
| 2026-05-09 | v2.0 | 后端迁移至腾讯云 CloudBase，解决国内网络问题 |
| 2026-05-09 | v1.2 | 修复 CloudBase 数据写入格式兼容问题 |
| 2026-05-09 | v1.1 | 添加自动展开文本框、优化移动端体验 |
| 2026-05-09 | v1.0 | 切换至 Cloudflare Workers 后端，支持任意长度信件 |
| 早期 | v0.1 | 初始版本，本地存储 + Base64 URL 编码 |

---

## 未来计划

- [ ] 微信小程序版
- [ ] 图片上传（云存储）
- [ ] 信件密码保护
- [ ] 已读回执
- [ ] 信件撤回

---

## 作者

[userAlex110](https://github.com/userAlex110)

---

## License

MIT
