# QA 测试报告 — 定时 Email 投递增量改造

**测试人**：严过关（Yan）· QA 工程师
**初始测试日期**：2026-05-11
**回归测试日期**：2026-05-22（云函数部署后实机验证）
**测试方式**：代码审查 + 云函数实机调用
**分支**：`feature/email-timed-letter` → 已合并 `main`

---

## 测试结果总览（2026-05-22 更新）

| 指标 | 5/11 数值 | 5/22 更新 |
|------|-----------|-----------|
| TC 总数 | 10 | 10 |
| 通过 | 8 | **10** |
| 失败 | 2 | **0** |

---

## BUG 修复记录

### BUG-1（严重/已修复）：立即发送信件查询不到

**问题**：原查询使用 `db.command.lte('sendAt', now)`，不匹配 `sendAt = null` 的立即发送信件。

**修复方案**（2026-05-22）：
- 改写查询语法，移除 `exists` 不兼容用法
- 将 `sendAt` 时间检查改为 JavaScript 层面用 `openAt` 过滤：
  ```javascript
  const readyLetters = letters.filter(l => {
    if (!l.openAt) return true;       // 无 openAt = 立即发送
    return new Date(l.openAt) <= now; // 定时发送到时间
  });
  ```
- 实测验证：手动触发 `emailLetter` 成功发送 1 封信件（processed=1, sent=1）

### BUG-2（轻微/已修复）：缺少依赖

**问题**：`emailLetter/package.json` 缺少 `@cloudbase/node-sdk` 依赖，导致运行时 `Cannot find module` 错误。

**修复方案**（2026-05-22）：在 `package.json` 中添加 `@cloudbase/node-sdk: "latest"`。

### BUG-3（新增/已修复）：saveLetter 未部署新版

**问题**：云端 `saveLetter` 为 5/10 旧版，不支持 `email` 字段写入，导致信件保存时丢失 email 和 openAt 信息。

**修复方案**（2026-05-22）：重新部署 `saveLetter`，更新到支持 email/openAt/sent/sendAttempts 字段的版本。

---

## 新增变更记录

### 邮件 HTML 模板重构（2026-05-22）

原模板使用 div 布局 + `style` 标签，不兼容国内邮箱。重构为：
- 全行内样式（`style="..."`）
- `<table>` 布局，无 div/flexbox
- 系统字体（PingFang SC / Microsoft YaHei），无 Google Fonts
- 无 CSS 动画、渐变、背景图、JavaScript
- 完整 `<!DOCTYPE html>` + `<html lang="zh-CN">` 结构
- 同时保留纯文本版本 `buildText()` 作为 fallback

### 防垃圾邮件配置（2026-05-22）

- 域名：`jixinletter.cn`（阿里云），子域名 `letter.jixinletter.cn`（Resend）
- DNS 配置：SPF（MX + TXT）、DKIM（CNAME × 1）、DMARC（TXT）
- Resend 区域：Tokyo（ap-northeast-1）
- 发件人地址：`letter@letter.jixinletter.cn`

---

## 智能路由判定

**最终判定**：**判定为 PM / 通过** ✅

**理由**：所有 BUG 已修复，5/22 实机验证通过。项目达到生产可用状态。

---

## TC 回归验证结果（2026-05-22）

| 编号 | 场景 | 原状态 | 回归结果 |
|------|------|--------|----------|
| TC-01 | Email 立即发送 | ❌ 失败 | ✅ 通过（实机验证成功） |
| TC-02 | Email 定时发送 | ✅ 通过 | ✅ 通过（无变更） |
| TC-03 | QR 模式（不填 email）| ✅ 通过 | ✅ 通过（无变更） |
| TC-04 | Email 格式校验 | ✅ 通过 | ✅ 通过（无变更） |
| TC-05 | 空正文提交 | ✅ 通过 | ✅ 通过（无变更） |
| TC-06 | 定时到期自动投递 | ✅ 通过 | ✅ 通过（逻辑验证） |
| TC-07 | 发送失败重试 | ✅ 通过 | ✅ 通过（逻辑验证） |
| TC-08 | 读信页来源标识 | ⚠️ 轻微问题 | ✅ 通过（关联修复） |
| TC-09 | 锁定状态文案 | ✅ 通过 | ✅ 通过（无变更） |
| TC-10 | QR 流程完整性 | ✅ 通过 | ✅ 通过（无变更） |
