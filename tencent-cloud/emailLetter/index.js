const tcb = require('@cloudbase/node-sdk');
const { Resend } = require('resend');

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.SITE_URL || 'https://your-domain.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'letter@jixinletter.cn';

function response(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  };
}

function buildHtml(letter) {
  const recipientName = letter.to || '朋友';
  const senderName = letter.from || '匿名';
  const letterUrl = `${SITE_URL}/#token/${letter._id}?from=email`;

  // 国内邮箱兼容版：全行内样式 + table 布局，无 JS/CSS动画/Flex/背景图
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>你收到了一封信</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0e8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f0e8;padding:40px 0;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="font-size:48px;padding-bottom:16px;">✉️</td>
        </tr>
      </table>

      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#fffef9;border-top:4px solid #c44536;">
        <tr>
          <td style="padding:36px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:18px;color:#3d322b;padding-bottom:20px;">
                  致 <strong>${recipientName}</strong>：
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:16px;color:#5a4c42;line-height:28px;padding-bottom:28px;">
                  你收到了一封来自「寄信」的信件。
                  <br>寄信人 ${senderName} 写了一封信，正在等待你开启。
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <a href="${letterUrl}" style="display:inline-block;padding:14px 36px;background-color:#3d322b;color:#faf6f0;text-decoration:none;font-size:16px;font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;letter-spacing:2px;">
                    阅读这封信
                  </a>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:12px;color:#8b7a6b;padding:0;">
                  「寄信」—— 寄往未来的某个时刻
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:24px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="border-top:1px solid #e0d5c7;"></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="font-family:'PingFang SC','Microsoft YaHei','Hiragino Sans GB',sans-serif;font-size:11px;color:#a09080;padding:0;line-height:18px;">
                  如果按钮无法点击，请复制以下链接到浏览器打开：<br>
                  <span style="color:#8b7a6b;">${letterUrl}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildText(letter) {
  const recipientName = letter.to || '朋友';
  const senderName = letter.from || '匿名';
  const letterUrl = `${SITE_URL}/#token/${letter._id}?from=email`;

  return `致 ${recipientName}：

你收到了一封来自「寄信」的信件。
寄信人 ${senderName} 写了一封信，正在等待你开启。

打开以下链接阅读这封信：
${letterUrl}

「寄信」—— 寄往未来的某个时刻`;
}

exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return response({}, 200);

  const stats = { processed: 0, sent: 0, failed: 0, skipped: 0 };
  const now = new Date();

  try {
    const { data: letters } = await db.collection('letters')
      .where({
        email: db.command.neq(''),
        sent: false,
        sendAttempts: db.command.lt(3)
      })
      .get();

    if (!letters || letters.length === 0) {
      return response({ ok: true, stats });
    }

    // 过滤：只发送已到时间的信件
    // openAt 不存在或为 null = 立即发送
    // openAt 存在且 <= now = 定时发送已到时间
    const readyLetters = letters.filter(l => {
      if (!l.openAt) return true;
      return new Date(l.openAt) <= now;
    });

    stats.processed = readyLetters.length;
    stats.skipped = letters.length - readyLetters.length;

    for (let i = 0; i < readyLetters.length; i++) {
      const letter = readyLetters[i];

      await db.collection('letters').doc(letter._id)
        .update({ sendAttempts: db.command.inc(1) });

      try {
        await resend.emails.send({
          from: `寄信 <${SENDER_EMAIL}>`,
          to: letter.email,
          subject: `${letter.from || '匿名'} 给你写了一封信`,
          html: buildHtml(letter),
          text: buildText(letter)
        });

        await db.collection('letters').doc(letter._id)
          .update({
            sent: true,
            sentAt: now,
            sendError: ''
          });
        stats.sent++;
      } catch (err) {
        const newAttempts = (letter.sendAttempts || 0) + 1;
        const update = {
          sendError: err.message,
          sendAttempts: newAttempts
        };
        if (newAttempts >= 3) update.sent = 'failed';
        await db.collection('letters').doc(letter._id).update(update);
        stats.failed++;
      }

      // 限流：每次发送间隔 500ms，防止触发 Resend 限制
      if (i < readyLetters.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return response({ ok: true, stats });
  } catch (e) {
    return response({ error: e.message }, 500);
  }
};
