const { kv } = require('@vercel/kv');
const crypto = require('crypto');
const SECRET = process.env.HMAC_SECRET || 'vgk_hmac_9xK!2pLm#8qRz$wNv'; // = VGK_HMAC_SECRET du .cpp
const hmac = (d) => crypto.createHmac('sha256', SECRET).update(d).digest('hex');
function rnd(n) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += c[b[i] % c.length];
  return s;
}
const hpw = (p) => crypto.scryptSync(p, 'vgk', 64).toString('hex');
function cookies(req) {
  const o = {};
  String(req.headers.cookie || '').split(';').forEach(s => {
    const i = s.indexOf('=');
    if (i > 0) o[s.slice(0, i).trim()] = decodeURIComponent(s.slice(i + 1).trim());
  });
  return o;
}
async function load() {
  return (await kv.get('db')) || { admins: [], apps: [], licenses: [], users: [] };
}
async function save(db) { await kv.set('db', db); }
async function me(req) {
  const t = cookies(req).vgk;
  if (!t) return null;
  return await kv.get('sess:' + t);
}
function body(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', c => { d += c; });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}
module.exports = { kv, hmac, rnd, hpw, cookies, load, save, me, body, SECRET };
