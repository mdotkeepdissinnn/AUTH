// POST /api/verify {key,hwid,nonce,ts,sig,api_key} -- protocole vgk_auth.cpp
const { kv, hmac, load, save, body } = require('./_lib');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const b = await body(req);
  const ts = Math.floor(Date.now() / 1000).toString();
  const deny = (error) => res.json({ valid: 'false', ts, error, sig: hmac((b.nonce || '') + ':false:' + ts) });
  if (!b.key || !b.hwid || !b.nonce || !b.ts || !b.sig || !b.api_key) return deny('bad request');
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(b.ts, 10)) > 60) return deny('stale request');
  if (await kv.get('n:' + b.nonce)) return deny('replay');
  await kv.set('n:' + b.nonce, 1, { ex: 180 });
  const want = hmac(b.key + ':' + b.hwid + ':' + b.nonce + ':' + b.ts);
  if (want.length !== String(b.sig).length ||
      !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(b.sig)))) return deny('bad signature');
  const db = await load();
  const A = db.apps.find(a => a.apiKey === b.api_key);
  if (!A) return deny('bad api key');
  const L = db.licenses.find(l => l.appId === A.id && l.key === b.key);
  if (!L) return deny('Invalid license key.');
  if (L.banned) return deny('License banned.');
  if (L.expiresAt && L.expiresAt < now) return deny('License expired.');
  if (A.hwidLock && L.hwid && L.hwid !== b.hwid) return deny('HWID mismatch.');
  if (A.ipLock) {
    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || 'unknown';
    if (L.ip && L.ip !== ip) return deny('IP mismatch.');
    L.ip = ip;
  }
  L.hwid = b.hwid;
  L.lastCheck = now;
  await save(db);
  return res.json({ valid: 'true', ts, sig: hmac(b.nonce + ':true:' + ts) });
};
