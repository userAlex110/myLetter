const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});
const db = app.database();

function getBody(event) {
  if (!event.body) return event;
  let body = event.body;
  if (event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function response(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  };
}

exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return response({}, 200);
  }

  const data = getBody(event);
  const { to, body: letterBody, from, theme, date } = data;

  if (!letterBody || letterBody.trim().length === 0) {
    return response({ error: 'Empty body' }, 400);
  }

  const id = Math.random().toString(36).substring(2, 10);
  const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    await db.collection('letters').add({
      data: {
        _id: id,
        to: to || '',
        body: letterBody,
        from: from || '',
        theme: theme || 'warm',
        date: date || '',
        expireAt,
        createTime: db.serverDate()
      }
    });

    return response({ id, ok: true });
  } catch (e) {
    return response({ error: e.message }, 500);
  }
};
