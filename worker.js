// Cloudflare Worker - Letter API
// Bind KV namespace: LETTERS

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST /api/save - save a letter
    if (request.method === 'POST' && url.pathname === '/api/save') {
      try {
        const data = await request.json();
        if (!data.body || data.body.trim().length === 0) {
          return jsonResponse({ error: 'Empty body' }, 400, corsHeaders);
        }

        const id = generateId();
        // Store for 30 days (2592000 seconds)
        await env.LETTERS.put(id, JSON.stringify(data), { expirationTtl: 2592000 });

        return jsonResponse({ id, ok: true }, 200, corsHeaders);
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders);
      }
    }

    // GET /api/read/:id - read a letter
    if (request.method === 'GET' && url.pathname.startsWith('/api/read/')) {
      const id = url.pathname.split('/').pop();
      if (!id || id.length < 4) {
        return jsonResponse({ error: 'Invalid ID' }, 400, corsHeaders);
      }

      const data = await env.LETTERS.get(id);
      if (!data) {
        return jsonResponse({ error: 'Letter not found or expired' }, 404, corsHeaders);
      }

      // Optional: burn after reading (uncomment to enable)
      // ctx.waitUntil(env.LETTERS.delete(id));

      return new Response(data, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  }
};

function generateId() {
  // 8-char base36, ~2.8 trillion combinations
  return Math.random().toString(36).substring(2, 10);
}

function jsonResponse(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: extraHeaders
  });
}
