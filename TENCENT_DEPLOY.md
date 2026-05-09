# 寄信APP - 腾讯云 CloudBase 部署指南

> 替代 Cloudflare Workers + KV，解决国内网络问题。

---

## 步骤 1：开通腾讯云 CloudBase 环境

**正确入口（不是腾讯云主控制台）：**

打开 https://tcb.cloud.tencent.com/dev#/select-env

### 新用户（第一次用 CloudBase）

1. 用微信扫码登录
2. 勾选服务条款，授权云开发服务角色
3. 系统会**自动创建一个免费体验环境**
4. 自动跳转到云开发平台

### 老用户（已有 CloudBase 环境）

1. 打开上面的链接，登录
2. 点击页面上的「**新建环境**」按钮
3. 选择「免费体验版」，环境名称填 `myletter-prod`
4. 点击确定，等待创建完成

> 每个账号在腾讯云侧只能创建 **1 个免费环境**。

---

## 步骤 2：创建数据库集合

1. 进入环境后，左侧菜单找到「**数据库**」
2. 点击「**添加集合**」（或「开始添加」）
3. 集合名称填：`letters`
4. 点击「确定」

**重要：设置数据库权限**

5. 进入 `letters` 集合 → 点击「**权限设置**」标签
6. 选择「**所有用户可读，仅创建者可写**」
7. 点击「保存」

> 云函数有管理员权限，不受此限制。但前端如果直接访问数据库需要这个权限。

---

## 步骤 3：创建 saveLetter 云函数

1. 左侧菜单找到「**云函数**」
2. 点击「**新建**」按钮
3. 填写：
   - 函数名称：`saveLetter`
   - 运行环境：`Node.js 16.13`（或更高版本）
   - 触发器：点击「**添加触发器**」→ 选择「**HTTP 触发**」→ **勾选「集成响应」** → 确定
   - 内存：128MB（默认即可）
   - 超时时间：5秒（默认即可）
4. 点击「完成」或「确定」
5. 创建完成后，点击 `saveLetter` 进入函数详情
6. 切换到「**函数代码**」标签
7. 删除编辑器里默认的所有代码
8. 把 `tencent-cloud/saveLetter/index.js` 的内容**全部粘贴进去**
9. 点击编辑器左侧的「**+**」→「**新建文件**」，文件名填 `package.json`
10. 把 `tencent-cloud/saveLetter/package.json` 的内容粘贴进去
11. 点击「**保存并安装依赖**」（按钮在编辑器右上角或下方）
12. 等待终端显示依赖安装完成

---

## 步骤 4：创建 readLetter 云函数

重复步骤 3，但：
- 函数名称改为：`readLetter`
- 代码粘贴 `tencent-cloud/readLetter/index.js`
- `package.json` 粘贴 `tencent-cloud/readLetter/package.json`

---

## 步骤 5：获取云函数访问 URL

1. 进入 `saveLetter` 函数详情
2. 点击「**触发管理**」标签（或「触发器」）
3. 你会看到 HTTP 触发的访问路径，类似：
   ```
   https://xxxxxx-xxx.ap-shanghai.app.tcloudbase.com/saveLetter
   ```
4. **复制这个完整 URL**（保存下来，等下要用）

5. 同样进入 `readLetter` 函数详情 → 「触发管理」，复制：
   ```
   https://xxxxxx-xxx.ap-shanghai.app.tcloudbase.com/readLetter
   ```

---

## 步骤 6：修改前端代码

1. 打开 `index.html`
2. 找到 CONFIG 区域（大约第 727 行）：
   ```javascript
   const SAVE_API = 'https://xxxxxx-xxx.ap-shanghai.app.tcloudbase.com/saveLetter';
   const READ_API = 'https://xxxxxx-xxx.ap-shanghai.app.tcloudbase.com/readLetter';
   ```
3. 把 `xxxxxx` 部分替换为你步骤 5 复制的真实 URL

> 如果你之前按照我的步骤改过 `index.html`，那两处 `fetch` 调用应该已经是 `SAVE_API` 和 `READ_API` 了，不需要再改。

---

## 步骤 7：部署前端到 GitHub Pages

```bash
git add .
git commit -m "feat: migrate backend to Tencent CloudBase"
git push
```

GitHub Pages 会自动更新。

---

## 完成

现在国内用户访问你的「寄信」页面时，信件存储和读取都会走腾讯云，速度稳定。

---

## 常见问题

**Q: 找不到 CloudBase 入口？**
> 不要从 `console.cloud.tencent.com` 进，直接用 https://tcb.cloud.tencent.com/dev#/select-env

**Q: 云函数报错 "Module not found: @cloudbase/node-sdk"？**
> 确保你创建了 `package.json` 文件并点击了「保存并安装依赖」。如果只保存了 `index.js` 没有 `package.json`，依赖不会安装。

**Q: 前端报错 CORS / 跨域失败？**
> 云函数代码中已经返回了 CORS 头（`Access-Control-Allow-Origin: *`）。如果还有问题，检查创建 HTTP 触发器时是否勾选了「**集成响应**」。

**Q: 数据库写入成功但读取不到？**
> 检查步骤 2 的数据库权限是否设置为「所有用户可读」。

**Q: 免费额度够用吗？**
> 免费体验环境每月提供 3000 资源点，个人小项目（几百~几千次访问）完全够用。

**Q: 数据多久过期？**
> 代码中设置了 30 天过期（`expireAt` 字段）。读取时会检查过期时间，过期后自动删除。

---

## 费用说明（参考）

免费体验环境每月 3000 资源点，超出后才计费。个人项目几乎不可能超出。

| 项目 | 资源点消耗 |
|---|---|
| 云函数调用 1 次 | 约 0.01~0.05 点 |
| 数据库读 1 次 | 约 0.01 点 |
| 数据库写 1 次 | 约 0.05 点 |

> 3000 点 ≈ 几万次调用，完全够用。
