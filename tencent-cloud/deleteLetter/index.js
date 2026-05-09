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
      return response({ error: 'Letter not found' }, 404);
    }

    await db.collection('letters').doc(id).remove();

    return response({ ok: true, message: 'Letter deleted' });
  } catch (e) {
    return response({ error: 'Delete failed' }, 500);
  }
};
