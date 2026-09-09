/* Local stand-in for the production Caddy + Two Snakes pair, so the /builder/ deployment can
   be exercised end to end before it touches the VPS.

       node devproxy.js          then open http://localhost:8740/

   It reproduces the three things that only appear once deployed:
     1. the builder lives under /builder/ with the prefix stripped, so relative API paths matter
     2. the game and the builder share one origin, so the ts_sess cookie reaches both
     3. /me and /data/get are the game's, not the builder's

   The stub game serves a fake sign-in and a /data/get built from the real local snapshot when
   one is present, so the import can be driven against realistic records. It is NOT the game and
   must never be deployed. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROXY_PORT = 8740;
const GAME_PORT = 8741;
const BUILDER_PORT = Number(process.env.PF1CB_PORT || 8732);

/* ------------------------------------------------------------------ stub game */
const SESSIONS = { toka: { user: 'melicious', role: 'player' }, tokdm: { user: 'dm', role: 'dm' } };

function loadSnapshot() {
  const p = path.join(process.env.HOME, 'Documents', 'Two_Snakes', 'two_snakes_data.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return {}; }
}
const SNAP = loadSnapshot();

/* Mirrors the real canRead(): never expose the api key or credential records; a player sees
   only their own ts_char / ts_hist; the DM sees everything. */
function canRead(sess, key) {
  const kl = String(key).toLowerCase();
  if (kl === 'ts_apikey') return false;
  if (kl.indexOf('ts_user:') === 0) return false;
  if (sess.role === 'dm') return true;
  const u = String(sess.user).toLowerCase();
  return kl === 'ts_char:' + u || kl.indexOf('ts_hist:' + u + ':') === 0;
}

function sessionOf(req) {
  const m = /ts_sess=([a-zA-Z0-9_]+)/.exec(req.headers.cookie || '');
  return m && SESSIONS[m[1]] ? SESSIONS[m[1]] : null;
}

const game = http.createServer(function (req, res) {
  const url = (req.url || '/').split('?')[0];
  const sess = sessionOf(req);
  const json = function (code, obj, headers) {
    res.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, headers || {}));
    res.end(JSON.stringify(obj));
  };

  if (url === '/me') return sess ? json(200, { user: sess.user, role: sess.role }) : json(401, { error: 'Not logged in' });

  if (url === '/data/get') {
    if (!sess) return json(401, { error: 'Not logged in' });
    const out = {};
    Object.keys(SNAP).forEach(function (k) { if (canRead(sess, k)) out[k] = SNAP[k]; });
    return json(200, out);
  }

  if (url === '/stub-login') {
    const who = /dm/.test(req.url) ? 'tokdm' : 'toka';
    res.writeHead(302, { 'Set-Cookie': 'ts_sess=' + who + '; Path=/; HttpOnly; SameSite=Lax', Location: '/' });
    return res.end();
  }
  if (url === '/stub-logout') {
    res.writeHead(302, { 'Set-Cookie': 'ts_sess=; Path=/; Max-Age=0', Location: '/' });
    return res.end();
  }

  /* a stand-in for the game's own page, carrying the same links the real one will get */
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>Stub Two Snakes</title>'
    + '<body style="font:15px system-ui;max-width:640px;margin:40px auto">'
    + '<h1>Stub Two Snakes</h1>'
    + '<p>Signed in as: <b>' + (sess ? sess.user + ' (' + sess.role + ')' : 'nobody') + '</b></p>'
    + '<p><a href="/stub-login">sign in as melicious</a> &middot; '
    + '<a href="/stub-login?dm">sign in as DM</a> &middot; '
    + '<a href="/stub-logout">sign out</a></p>'
    + '<hr><p><a href="/builder/">⚔ Character Builder →</a> '
    + '(this is the link that will be added to the real DM and player screens)</p>'
    + '</body>');
});

/* ------------------------------------------------------------------ proxy */
function pipeTo(port, req, res, newPath) {
  const p = http.request({
    host: '127.0.0.1', port: port, path: newPath, method: req.method, headers: req.headers
  }, function (up) {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  p.on('error', function (e) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('upstream ' + port + ' unreachable: ' + e.message
      + (port === BUILDER_PORT ? '\n\nStart the builder:  node server.js' : ''));
  });
  req.pipe(p);
}

const proxy = http.createServer(function (req, res) {
  const url = req.url || '/';
  if (url === '/builder') { res.writeHead(302, { Location: '/builder/' }); return res.end(); }
  if (url.indexOf('/builder/') === 0) {
    /* Caddy's handle_path strips the prefix; reproduce that exactly. */
    return pipeTo(BUILDER_PORT, req, res, url.slice('/builder'.length) || '/');
  }
  return pipeTo(GAME_PORT, req, res, url);
});

game.listen(GAME_PORT, '127.0.0.1', function () {
  proxy.listen(PROXY_PORT, '127.0.0.1', function () {
    console.log('dev proxy      http://localhost:' + PROXY_PORT + '/          (stub game)');
    console.log('               http://localhost:' + PROXY_PORT + '/builder/  (the builder)');
    console.log('stub game      127.0.0.1:' + GAME_PORT);
    console.log('builder        127.0.0.1:' + BUILDER_PORT + '   <- start it with: node server.js');
    console.log('snapshot keys  ' + Object.keys(SNAP).length + (Object.keys(SNAP).length ? '' : '  (no local two_snakes_data.json found)'));
  });
});
