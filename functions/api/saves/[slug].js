// functions/api/saves/[slug].js
// Handles GET / PUT / DELETE for game save states.
// Expects Clerk JWT in Authorization: Bearer <token> header.

function b64urlDecode(s) {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

async function verifyClerkToken(token, jwksUrl) {
  try {
    const [headerB64] = token.split('.');
    const header = JSON.parse(b64urlDecode(headerB64));
    const jwksRes = await fetch(jwksUrl);
    const { keys } = await jwksRes.json();
    const key = keys.find(k => k.kid === header.kid);
    if (!key) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
    const [, payloadB64, sigB64] = token.split('.');
    const data = new TextEncoder().encode(`${token.split('.')[0]}.${payloadB64}`);
    const sig  = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (payload.exp < Date.now() / 1000) return null;
    return payload.sub; // Clerk user_id
  } catch {
    return null;
  }
}

async function getUserId(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  return verifyClerkToken(token, env.CLERK_JWKS_URL);
}

export async function onRequestGet({ request, env, params }) {
  const userId = await getUserId(request, env);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = params.slug;
  const row = await env.DB.prepare(
    'SELECT save_data FROM game_saves WHERE user_id = ? AND game_slug = ?'
  ).bind(userId, slug).first();

  return Response.json({ data: row ? JSON.parse(row.save_data) : null });
}

export async function onRequestPut({ request, env, params }) {
  const userId = await getUserId(request, env);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = params.slug;
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (body.data === undefined) {
    return new Response('Missing data field', { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(`
    INSERT INTO game_saves (user_id, game_slug, save_data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, game_slug)
    DO UPDATE SET save_data = excluded.save_data, updated_at = excluded.updated_at
  `).bind(userId, slug, JSON.stringify(body.data), now).run();

  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const userId = await getUserId(request, env);
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = params.slug;
  await env.DB.prepare(
    'DELETE FROM game_saves WHERE user_id = ? AND game_slug = ?'
  ).bind(userId, slug).run();

  return Response.json({ ok: true });
}
