# 寄信APP 部署指南

## 步骤 1：注册 Cloudflare

1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册（不需要绑卡）
3. 验证邮箱

## 步骤 2：创建 KV 命名空间

1. 登录 Cloudflare Dashboard
2. 左侧菜单找到 **Workers & Pages**
3. 点击 **KV**
4. 点击 **Create a namespace**
5. 名称填：`LETTERS`
6. 点击 **Add**

## 步骤 3：创建 Worker

1. 左侧菜单 **Workers & Pages**
2. 点击 **Create application**
3. 点击 **Create Worker**
4. Worker 名称：填 `letter-api`（或你喜欢的名字）
5. 点击 **Deploy**

## 步骤 4：编辑 Worker 代码

1. 创建后点击 **Edit code**
2. 把左边默认代码全部删掉
3. 粘贴 `worker.js` 里的全部代码
4. 点击 **Save and deploy**

## 步骤 5：绑定 KV

1. 在 Worker 编辑页面，点击左侧 **Settings**
2. 点击 **Variables**
3. 向下滚动找到 **KV Namespace Bindings**
4. 点击 **Add binding**
5. Variable name 填：`LETTERS`
6. KV namespace 选择你刚创建的 `LETTERS`
7. 点击 **Deploy**

## 步骤 6：获取 Worker URL

1. 回到 Worker 页面，顶部能看到类似这样的地址：
   ```
   https://letter-api.your-username.workers.dev
   ```
2. 复制这个地址

## 步骤 7：更新前端代码

1. 打开 `index.html`
2. 找到这一行（大约在第 10 行）：
   ```javascript
   const API_BASE = 'https://letter-api.YOUR_SUBDOMAIN.workers.dev';
   ```
3. 替换为你的 Worker 地址：
   ```javascript
   const API_BASE = 'https://letter-api.your-username.workers.dev';
   ```

## 步骤 8：推送到 GitHub

```bash
cd 寄信APP
git add .
git commit -m "feat: switch to Cloudflare Workers backend"
git push
```

GitHub Pages 会自动更新。

## 完成

现在可以写任意长度的信了！QR 码只包含短 token，扫码秒开。
