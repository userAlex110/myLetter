const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});
const db = app.database();

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

  let id = '';
  if (event.queryString && event.queryString.id) {
    id = event.queryString.id;
  } else if (event.queryStringParameters && event.queryStringParameters.id) {
    id = event.queryStringParameters.id;
  }

  if (!id || id.length < 4) {
    return response({ error: 'Invalid ID' }, 400);
  }

  try {
    const res = await db.collection('letters').doc(id).get();

    if (!res.data || res.data.length === 0) {
      return response({ error: 'Letter not found or expired' }, 404);
    }

    const letter = res.data[0];

    if (letter.expireAt && new Date(letter.expireAt) < new Date()) {
      await db.collection('letters').doc(id).remove();
      return response({ error: 'Letter expired' }, 404);
    }

    if (letter.openAt && new Date(letter.openAt) > new Date()) {
      return response({
        ok: true,
        locked: true,
        openAt: letter.openAt,
        to: letter.to,
        from: letter.from,
        theme: letter.theme
      });
    }

    return response({
      ok: true,
      to: letter.to,
      body: letter.body,
      from: letter.from,
      theme: letter.theme,
      date: letter.date
    });
  } catch (e) {
    return response({ error: 'Letter not found or expired' }, 404);
  }
};
