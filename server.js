/* Pathfinder 1E Character Builder — server.
   Serves the builder and stores characters per player, so the nine players can build from any
   device and the DM can see the whole party.

       node server.js                        # port 8732, data in ./pf1cb_data.json
       PF1CB_PORT=8080 node server.js
       PF1CB_TS_ORIGIN=http://127.0.0.1:3000 node server.js

   IDENTITY IS DELEGATED TO TWO SNAKES. This app has no passwords of its own. It asks the game
   server "who is this?" by forwarding the caller's cookie to Two Snakes' /me, and trusts that
   answer. Consequences, all deliberate:

     - one login for both apps, and no second set of codes to hand out or leak
     - a player cannot claim to be someone else here without a valid game session
     - if the game is down nobody can authenticate here either, but every browser still holds
       its own working copy, so no one is blocked mid-build

   Deployed behind Caddy at /builder/ on the same origin as the game, which is what lets the
   ts_sess cookie reach both. The builder's own API paths are RELATIVE in the client, so they
   arrive here as /api/... after Caddy strips the prefix, and never collide with the game's
   own /api/chat.

   This server never reads two_snakes_data.json. The only thing it knows about the game is the
   answer to /me. */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PF1CB_PORT || 8732);
const HOST = process.env.PF1CB_BIND || '127.0.0.1';
const ROOT = __dirname;
const DATA_FILE = process.env.PF1CB_DATA || path.join(ROOT, 'pf1cb_data.json');
const TS_ORIGIN = process.env.PF1CB_TS_ORIGIN || 'http://127.0.0.1:3000';

/* ------------------------------------------------------------------ storage */
let DATA = { characters: {} };

function loadData() {
  try { DATA = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { DATA = { characters: {} }; }
  if (!DATA.characters) DATA.characters = {};
}

let writeTimer = null;
function saveData() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(function () {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DATA, null, 2));
    fs.renameSync(tmp, DATA_FILE);           /* atomic: never a half-written data file */
  }, 200);
}

/* ------------------------------------------------------------------ identity */
/* Ask Two Snakes who the caller is, forwarding their cookie. Nothing the client asserts about
   itself is trusted; the game's answer is the only source of identity. */
function whoAmI(req, cb) {
  const cookie = req.headers.cookie || '';
  if (cookie.indexOf('ts_sess=') < 0) return cb(null, null);

  let u;
  try { u = new URL('/me', TS_ORIGIN); } catch (e) { return cb(new Error('bad TS origin')); }
  const lib = u.protocol === 'https:' ? https : http;

  const r = lib.request({
    protocol: u.protocol, hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: '/me', method: 'GET',
    headers: { 'Cookie': cookie, 'Accept': 'application/json' }
  }, function (res) {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', function (c) { body += c; if (body.length > 8192) res.destroy(); });
    res.on('end', function () {
      if (res.statusCode !== 200) return cb(null, null);
      try {
        const j = JSON.parse(body);
        if (!j || !j.user) return cb(null, null);
        cb(null, { user: String(j.user).toLowerCase(), role: j.role === 'dm' ? 'dm' : 'player' });
      } catch (e) { cb(null, null); }
    });
  });
  r.setTimeout(4000, function () { r.destroy(new Error('game server timeout')); });
  r.on('error', function (e) { cb(e); });
  r.end();
}

/* ------------------------------------------------------------------ helpers */
function send(res, code, body, headers) {
  const h = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
  }, headers || {});
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, h);
  res.end(payload);
}

function readBody(req, cb) {
  let n = 0; const chunks = [];
  req.on('data', function (c) {
    n += c.length;
    if (n > 2 * 1024 * 1024) { req.destroy(); return; }   /* 2 MB cap */
    chunks.push(c);
  });
  req.on('end', function () {
    try { cb(null, JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
    catch (e) { cb(new Error('bad json')); }
  });
  req.on('error', function (e) { cb(e); });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

/* Static serving is an ALLOWLIST, not a denylist. server.js, the data file, the test suites
   and the backups directory are unreachable because they are simply not on the list.
   (A denylist got this wrong once: /server.js was served as a script, disclosing source.) */
const SERVE_FILES = new Set(['/character_builder.html', '/favicon.ico', '/riddle.png', '/riddle-banner.png']);
const SERVE_DIRS = ['/js/', '/css/'];

function serveStatic(req, res, urlPath) {
  let rel = urlPath.split('?')[0];
  try { rel = decodeURIComponent(rel); } catch (e) { return send(res, 400, { error: 'bad path' }); }
  if (rel === '/' || rel === '') rel = '/character_builder.html';
  if (rel.indexOf('\0') >= 0) return send(res, 400, { error: 'bad path' });

  const norm = path.posix.normalize(rel);
  const allowed = SERVE_FILES.has(norm) || SERVE_DIRS.some(function (d) { return norm.indexOf(d) === 0; });
  if (!allowed) return send(res, 404, { error: 'not found' });

  const ext = path.extname(norm).toLowerCase();
  if (!MIME[ext]) return send(res, 404, { error: 'not found' });

  const full = path.normalize(path.join(ROOT, norm));
  if (full !== ROOT && full.indexOf(ROOT + path.sep) !== 0) {
    return send(res, 403, { error: 'forbidden' });      /* belt and braces */
  }

  fs.readFile(full, function (err, buf) {
    if (err) return send(res, 404, { error: 'not found' });
    res.writeHead(200, {
      'Content-Type': MIME[ext],
      'Content-Length': buf.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}

/* ------------------------------------------------------------------ routes */
const server = http.createServer(function (req, res) {
  const url = req.url || '/';

  if (url === '/api/health') {
    return send(res, 200, { ok: true, characters: Object.keys(DATA.characters).length });
  }

  /* Everything else under /api needs an identity from the game. */
  if (url.indexOf('/api/') === 0) {
    return whoAmI(req, function (err, who) {
      if (err) {
        return send(res, 503, {
          error: 'Cannot reach the Two Snakes server to check your sign-in. '
            + 'Your work is saved in this browser; try again shortly.'
        });
      }
      handleApi(req, res, url, who);
    });
  }

  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
  return serveStatic(req, res, url);
});

function handleApi(req, res, url, who) {
  if (url === '/api/me') {
    if (!who) return send(res, 401, { error: 'not signed in' });
    return send(res, 200, { user: who.user, role: who.role });
  }

  if (url.indexOf('/api/characters') === 0) {
    if (!who) return send(res, 401, { error: 'not signed in' });
    const id = url.replace(/^\/api\/characters\/?/, '').split('?')[0];

    if (req.method === 'GET' && !id) {
      const out = [];
      Object.keys(DATA.characters).forEach(function (k) {
        const c = DATA.characters[k];
        if (who.role !== 'dm' && c.owner !== who.user) return;
        out.push({
          id: c.id, owner: c.owner, name: (c.data && c.data.name) || '(unnamed)',
          levels: (c.data && c.data.levels) || [], savedAt: c.savedAt
        });
      });
      out.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
      return send(res, 200, { characters: out });
    }

    if (req.method === 'GET' && id) {
      const c = DATA.characters[id];
      if (!c) return send(res, 404, { error: 'not found' });
      if (who.role !== 'dm' && c.owner !== who.user) return send(res, 403, { error: 'not yours' });
      return send(res, 200, { character: c.data, owner: c.owner, savedAt: c.savedAt });
    }

    if (req.method === 'PUT' && id) {
      return readBody(req, function (err, body) {
        if (err || !body || !body.character) return send(res, 400, { error: 'bad request' });
        const existing = DATA.characters[id];
        if (existing && who.role !== 'dm' && existing.owner !== who.user) {
          return send(res, 403, { error: 'not yours' });
        }
        DATA.characters[id] = {
          id: id,
          owner: existing ? existing.owner : who.user,
          data: body.character,
          savedAt: Date.now()
        };
        saveData();
        return send(res, 200, { ok: true, savedAt: DATA.characters[id].savedAt });
      });
    }

    if (req.method === 'DELETE' && id) {
      const c = DATA.characters[id];
      if (!c) return send(res, 404, { error: 'not found' });
      if (who.role !== 'dm' && c.owner !== who.user) return send(res, 403, { error: 'not yours' });
      delete DATA.characters[id];
      saveData();
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'method not allowed' });
  }

  return send(res, 404, { error: 'not found' });
}

loadData();

server.listen(PORT, HOST, function () {
  console.log('Pathfinder 1E Character Builder listening on http://' + HOST + ':' + PORT);
  console.log('  data:        ' + DATA_FILE);
  console.log('  identity by: ' + TS_ORIGIN + '/me');
  console.log('  characters:  ' + Object.keys(DATA.characters).length);
});

module.exports = { server: server, _internals: { whoAmI: whoAmI } };
