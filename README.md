# 寄信 — 把说不出口的话，藏进一个二维码里

> 一个极简的匿名信件工具。写一封信，生成二维码，对方扫码即可阅读。信件 30 天后自动销毁。

---

## 在线体验

https://useralex110.github.io/myLetter

---

## 功能特性

| 功能 | 说明 |
|---|---|
| 写信 | 填写收信人、正文、署名，选择信纸主题 |
| 生成二维码 | QR 码只包含短链接，不存储信件内容，扫描快速稳定 |
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
- **两个云函数**：
  - `saveLetter`（POST）— 保存信件，返回短 ID
  - `readLetter`（GET）— 根据 ID 读取信件，检查是否过期
- **数据过期**：写入时记录 `expireAt`，读取时检查并自动清理

### 部署

- **前端**：GitHub Pages（免费 CDN）
- **后端**：腾讯云 CloudBase（国内节点，低延迟）

---

## 项目结构

```
myLetter/
├── index.html              # 前端页面（单文件，包含 HTML + CSS + JS）
├── worker.js               # Cloudflare Worker 后端（旧版，已弃用）
├── tencent-cloud/          # 腾讯云 CloudBase 云函数
│   ├── saveLetter/
│   │   ├── index.js        # 保存信件云函数
│   │   └── package.json
│   └── readLetter/
│       ├── index.js        # 读取信件云函数
│       └── package.json
├── DEPLOY.md               # Cloudflare 部署指南（旧版）
├── TENCENT_DEPLOY.md       # 腾讯云部署指南
└── README.md               # 本文件
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

### 方案一：腾讯云 CloudBase（推荐，国内访问快）

详见 [TENCENT_DEPLOY.md](./TENCENT_DEPLOY.md)

核心步骤：
1. 开通 [CloudBase 环境](https://tcb.cloud.tencent.com/dev#/select-env)
2. 创建数据库集合 `letters`
3. 部署 `saveLetter` 和 `readLetter` 两个云函数
4. 开启 HTTP 访问服务
5. 修改 `index.html` 中的 `SAVE_API` 和 `READ_API`
6. `git push` 到 GitHub Pages

### 方案二：Cloudflare Workers（国际访问快）

详见 [DEPLOY.md](./DEPLOY.md)

> 国内用户可能遇到网络问题，建议用方案一。

---

## 设计亮点

### 1. QR 码只存链接，不存内容

传统做法把信件全文编码进 QR 码，导致：
- 内容一长，QR 码密密麻麻，扫描困难
- 内容不可修改

本项目的做法：QR 码只包含 `https://xxx/#token/abc123`（约 50 字符），信件内容存在服务端。优点是：
- QR 码简洁，秒扫秒开
- 信件长度无限制
- 未来可扩展编辑、撤回等功能

### 2. 打字机读信效果

不是简单的 `setInterval` 匀速输出，而是：
- 换行符停顿 140ms（模拟回车）
- 标点符号停顿 120ms（模拟思考）
- 普通字符 40~70ms 随机速度（模拟真人打字节奏）

### 3. 单文件前端

整个前端只有一个 `index.html`（约 1000 行），没有：
- 构建工具（Webpack/Vite）
- 前端框架（React/Vue）
- 包管理器（npm/yarn）

适合快速迭代、零依赖部署、学习理解。

---

## API 接口

### POST /saveLetter

保存一封信。

**请求体：**
```json
{
  "to": "收信人名字（可选）",
  "body": "信件正文（必填）",
  "from": "署名（可选）",
  "theme": "warm | cool | pink | mint",
  "date": "2026-05-09"
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

读取一封信。

**响应（成功）：**
```json
{
  "ok": true,
  "to": "收信人",
  "body": "信件正文",
  "from": "署名",
  "theme": "warm",
  "date": "2026-05-09"
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
|---|---|
| 前端 | HTML5, CSS3, Vanilla JavaScript |
| QR 码生成 | [QRCode.js](https://github.com/davidshimjs/qrcodejs) |
| 字体 | Google Fonts（Noto Serif SC, ZCOOL XiaoWei）|
| 后端 | 腾讯云 CloudBase 云函数（Node.js 18）|
| 数据库 | CloudBase NoSQL（类 MongoDB）|
| 部署 | GitHub Pages + CloudBase |

---

## 更新日志

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-05-09 | v2.0 | 后端迁移至腾讯云 CloudBase，解决国内网络问题 |
| 2026-05-09 | v1.2 | 修复 CloudBase 数据写入格式兼容问题 |
| 2026-05-09 | v1.1 | 添加自动展开文本框、优化移动端体验 |
| 2026-05-09 | v1.0 | 切换至 Cloudflare Workers 后端，支持任意长度信件 |
| 早期 | v0.1 | 初始版本，本地存储 + Base64 URL 编码 |

---

## 未来计划

- [ ] 图片上传（云存储）
- [ ] 信件密码保护
- [ ] 定时发送（预约未来时间才能打开）
- [ ] 已读回执
- [ ] 微信小程序版

---

## 作者

[userAlex110](https://github.com/userAlex110)

---

## License

MIT
