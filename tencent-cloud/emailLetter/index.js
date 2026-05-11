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

  return `
    <div style="font-family: 'Georgia', 'Noto Serif SC', serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #faf6f0;">
      <div style="text-align: center; font-size: 48px; margin-bottom: 16px;">✉️</div>
      <div style="background: #fffef9; border-radius: 2px; padding: 36px 32px; box-shadow: 0 2px 24px rgba(60,40,20,0.08);">
        <p style="font-size: 18px; color: #3d322b; margin-bottom: 20px;">
          致 <strong>${recipientName}</strong>：
        </p>
        <p style="font-size: 16px; color: #5a4c42; line-height: 1.8; margin-bottom: 28px;">
          你收到了一封来自「寄信」的信件。
          <br>寄信人 ${senderName} 写了一封信，正在等待你开启。
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${letterUrl}" style="display: inline-block; padding: 14px 36px; background: #3d322b; color: #faf6f0; text-decoration: none; font-size: 16px; letter-spacing: 2px; border-radius: 2px;">
            阅读这封信
          </a>
        </div>
        <p style="font-size: 12px; color: #8b7a6b; text-align: center; margin: 0;">
          「寄信」—— 寄往未来的某个时刻
        </p>
        <hr style="border: none; border-top: 1px solid #e0d5c7; margin: 24px 0;">
        <p style="font-size: 11px; color: #a09080; text-align: center; margin: 0;">
          如果按钮无法点击，请复制以下链接到浏览器打开：<br>
          <span style="color: #8b7a6b;">${letterUrl}</span>
        </p>
      </div>
    </div>
  `;
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

  try {
    const { data: letters } = await db.collection('letters')
      .where(db.command.and([
        db.command.exists('email'),
        db.command.neq('email', ''),
        db.command.eq('sent', false),
        db.command.lt('sendAttempts', 3)
      ]))
      .get();

    if (!letters || letters.length === 0) {
      return response({ ok: true, stats });
    }

    stats.processed = letters.length;

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];

      // Increment attempt count
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

      // Rate limiting: 500ms between sends
      if (i < letters.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return response({ ok: true, stats });
  } catch (e) {
    return response({ error: e.message }, 500);
  }
};
