// Panel admin JSON : /api/admin?r=login|stats|apps|licenses|users|account
const { kv, hpw, rnd, load, save, me, body } = require('./_lib');

function fillMask(mask) {
  return mask.split('').map(c => c === '*' ? rnd(1) : c).join('');
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const r = url.searchParams.get('r') || '';
  const appId = url.searchParams.get('app') || '';
  let b = {};
  if (req.method === 'POST') b = await body(req);

  if (r === 'login') {
    const db = await load();
    if (!db.admins.length && b.user === 'admin' && b.pass === 'Tas1212.?') {
      db.admins.push({ user: 'admin', pass: hpw('Tas1212.?') });
      await save(db);
    }
    const a = db.admins.find(x => x.user === b.user);
    if (!a || a.pass !== hpw(b.pass || '')) return res.json({ ok: false });
    const t = rnd(32);
    await kv.set('sess:' + t, a.user, { ex: 86400 });
    res.setHeader('Set-Cookie', 'vgk=' + t + '; Path=/; HttpOnly; SameSite=Lax');
    return res.json({ ok: true, user: a.user });
  }
  if (r === 'logout') {
    const m = String(req.headers.cookie || '').match(/vgk=([^;]+)/);
    if (m) await kv.del('sess:' + m[1]);
    return res.json({ ok: true });
  }
  const user = await me(req);
  if (!user) return res.status(401).json({ ok: false });
  const db = await load();

  if (r === 'stats') return res.json({ ok: true, user, apps: db.apps.length, licenses: db.licenses.length, users: db.users.length });

  if (r === 'apps') {
    if (req.method === 'POST') {
      if (b.del) {
        db.apps = db.apps.filter(a => a.id !== b.del);
        db.licenses = db.licenses.filter(l => l.appId !== b.del);
        db.users = db.users.filter(u => u.appId !== b.del);
      } else if (b.rename && b.id) {
        const a = db.apps.find(x => x.id === b.id);
        if (a) a.name = String(b.rename).slice(0, 32);
      } else if (b.toggleHwid && b.id) {
        const a = db.apps.find(x => x.id === b.id);
        if (a) a.hwidLock = !a.hwidLock;
      } else if (b.toggleIp && b.id) {
        const a = db.apps.find(x => x.id === b.id);
        if (a) a.ipLock = !a.ipLock;
      } else if (b.name) {
        db.apps.push({ id: 'app' + Date.now().toString(36), name: String(b.name).slice(0, 32),
          apiKey: 'sk_' + rnd(32), created: Date.now(), hwidLock: true, ipLock: false });
      }
      await save(db);
      return res.json({ ok: true });
    }
    return res.json({ ok: true, apps: db.apps.map(a => Object.assign({}, a, {
      licenses: db.licenses.filter(l => l.appId === a.id).length,
      users: db.users.filter(u => u.appId === a.id).length })) });
  }

  if (r === 'licenses') {
    if (req.method === 'POST') {
      if (b.gen) {
        const n = Math.min(500, parseInt(b.count) || 1);
        let exp = 0;
        const amt = parseInt(b.amount) || 0;
        const mul = { minutes: 60, hours: 3600, days: 86400, weeks: 604800, months: 2592000 }[b.expiry] || 0;
        if (b.expiry !== 'lifetime' && amt > 0) exp = Math.floor(Date.now() / 1000) + amt * mul;
        for (let i = 0; i < n; i++)
          db.licenses.push({ id: 'lic' + Date.now().toString(36) + i, appId: b.appId,
            key: fillMask(b.mask || '****-****-****'), expiresAt: exp, hwid: '', ip: '', banned: false, created: Date.now() });
      } else if (b.ban) {
        const l = db.licenses.find(x => x.id === b.ban); if (l) l.banned = !l.banned;
      } else if (b.resetHwid) {
        const l = db.licenses.find(x => x.id === b.resetHwid); if (l) { l.hwid = ''; l.ip = ''; }
      } else if (b.resetAll && b.appId) {
        db.licenses.forEach(l => { if (l.appId === b.appId) { l.hwid = ''; l.ip = ''; } });
      } else if (b.del) db.licenses = db.licenses.filter(x => x.id !== b.del);
      await save(db);
      return res.json({ ok: true });
    }
    return res.json({ ok: true, licenses: db.licenses.filter(l => !appId || l.appId === appId).slice(-500).reverse() });
  }

  if (r === 'users') {
    if (req.method === 'POST') {
      if (b.del) db.users = db.users.filter(u => u.id !== b.del);
      else if (b.user && b.pass && b.pass.length >= 4 && b.appId) {
        if (db.users.some(u => u.appId === b.appId && u.user === b.user)) return res.json({ ok: false, msg: 'exists' });
        db.users.push({ id: 'usr' + Date.now().toString(36), appId: b.appId, user: b.user, pass: hpw(b.pass), created: Date.now() });
      }
      await save(db);
      return res.json({ ok: true });
    }
    return res.json({ ok: true, users: db.users.filter(u => !appId || u.appId === appId).map(u => ({ id: u.id, appId: u.appId, user: u.user, created: u.created })) });
  }

  if (r === 'account') {
    const adm = db.admins.find(x => x.user === user);
    if (!adm || adm.pass !== hpw(b.cur || '')) return res.json({ ok: false });
    if (b.username) adm.user = String(b.username).slice(0, 30);
    if (b.newpass && b.newpass.length >= 8) adm.pass = hpw(b.newpass);
    await save(db);
    return res.json({ ok: true });
  }

  return res.status(404).json({ ok: false });
};
