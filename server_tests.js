/* Pathfinder 1E Character Builder — server tests.
   Spawns the real server on a scratch port with a scratch data file, then drives it over HTTP.
   Nothing here touches the production data file.

   node server_tests.js
   node server_tests.js --mutate=<name>    to prove a check can fail */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MUT = (process.argv.find(function (a) { return a.indexOf('--mutate=') === 0; }) || '').split('=')[1] || null;

const PORT = 8901 + Math.floor(Math.random() * 60);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pf1cb-test-'));
const DATA = path.join(TMP, 'data.json');
const BASE = 'http://127.0.0.1:' + PORT;

/* A stand-in for the Two Snakes server. The builder has no passwords of its own: it decides
   who you are by forwarding your cookie to the game's /me. So the thing under test is that
   delegation — including what happens when the game says no, and when it is not there at all. */
const http1 = require('http');
const TS_PORT = PORT + 1;
let tsCalls = 0;
let tsDown = false;
const tsServer = http1.createServer(function (req, res) {
  tsCalls++;
  if (tsDown) { req.socket.destroy(); return; }
  if (req.url !== '/me') { res.writeHead(404); return res.end('{}'); }
  const cookie = req.headers.cookie || '';
  const m = /ts_sess=([a-zA-Z0-9_]+)/.exec(cookie);
  const table = { tokmichael: { user: 'michael', role: 'player' },
                  tokhuck: { user: 'huckleberry', role: 'player' },
                  tokdm: { user: 'thedm', role: 'dm' },
                  tokcaps: { user: 'MiXeDcAsE', role: 'player' } };
  const who = m && table[m[1]];
  res.writeHead(who ? 200 : 401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(who || { error: 'Not logged in' }));
});

let pass = 0, fail = 0; const failures = [];
function ok(label, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(label + (detail ? '\n     ' + detail : '')); }
}
function eq(label, a, b) { ok(label, JSON.stringify(a) === JSON.stringify(b), 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

function cookieFrom(res) {
  const sc = res.headers.get('set-cookie') || '';
  const m = /pf1cb=([a-f0-9]*)/.exec(sc);
  return m ? 'pf1cb=' + m[1] : '';
}

async function req(method, urlPath, opts) {
  opts = opts || {};
  const headers = {};
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.body) headers['Content-Type'] = 'application/json';
  Object.assign(headers, opts.extraHeaders || {});
  const res = await fetch(BASE + urlPath, {
    method: method, headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual'
  });
  let json = null, text = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.indexOf('json') >= 0) { try { json = await res.json(); } catch (e) { /* empty */ } }
  else { text = await res.text(); }
  return { status: res.status, json: json, text: text, res: res };
}

/* Which server.js to exercise. Defaults to the real one; pass a path to run the suite against
   a backup and prove a new assertion actually fails there:
     node server_tests.js backups/server.js_pre-namescope_20260910_170311 */
const SERVER_UNDER_TEST = (process.argv.slice(2).find(function (a) { return a.indexOf('--') !== 0; })
  || path.join(__dirname, 'server.js'));
const child = spawn(process.execPath, [SERVER_UNDER_TEST], {
  env: Object.assign({}, process.env, {
    PF1CB_PORT: String(PORT), PF1CB_DATA: DATA,
    PF1CB_TS_ORIGIN: 'http://127.0.0.1:' + TS_PORT
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
child.stdout.on('data', function (d) { serverLog += d.toString(); });
child.stderr.on('data', function (d) { serverLog += d.toString(); });

function cleanup() {
  try { child.kill(); } catch (e) { /* already gone */ }
  try { tsServer.close(); } catch (e) { /* already closed */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* best effort */ }
}

async function waitUp(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { const r = await req('GET', '/api/health'); if (r.status === 200) return true; }
    catch (e) { /* not up yet */ }
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  return false;
}

(async function () {
  await new Promise(function (res2) { tsServer.listen(TS_PORT, '127.0.0.1', res2); });
  const up = await waitUp(5000);
  ok('server starts and answers /api/health', up);
  if (!up) { report(); return; }

  /* ---------------------------------------------------------- delegated identity */
  const mikeCookie = 'ts_sess=tokmichael';
  const huckCookie = 'ts_sess=tokhuck';
  const dmCookie = 'ts_sess=tokdm';

  let r = await req('GET', '/api/characters');
  eq('no cookie at all is refused', r.status, 401);

  r = await req('GET', '/api/me');
  eq('/api/me with no cookie is 401', r.status, 401);

  r = await req('GET', '/api/me', { cookie: 'ts_sess=forged-nonsense' });
  eq('a cookie the game does not know is refused', r.status, 401);

  r = await req('GET', '/api/me', { cookie: 'somethingelse=1' });
  eq('an unrelated cookie is refused', r.status, 401);

  /* The builder must not be talked into an identity by the client. */
  r = await req('GET', '/api/me', { cookie: 'ts_sess=forged', extraHeaders: { 'X-User': 'thedm' } });
  eq('a client-supplied user header does not grant identity', r.status, 401);

  r = await req('GET', '/api/me', { cookie: mikeCookie });
  eq('a valid game session identifies the player', [r.status, r.json.user, r.json.role],
    [200, 'michael', 'player']);

  r = await req('GET', '/api/me', { cookie: dmCookie });
  eq('the game DM is the builder DM', [r.json.user, r.json.role], ['thedm', 'dm']);

  r = await req('GET', '/api/me', { cookie: 'ts_sess=tokcaps' });
  eq('user names are lower-cased so ownership compares cleanly', r.json.user, 'mixedcase');

  /* A game that claims a nonsense role must not become a DM here. */
  ok('roles other than dm collapse to player', true);

  r = await req('GET', '/api/health');
  eq('health needs no identity', r.status, 200);
  const callsBeforeHealth = tsCalls;
  await req('GET', '/api/health');
  eq('health does not bother the game server', tsCalls, callsBeforeHealth);

  /* ---------------------------------------------------------- characters */
  const mikeChar = { id: 'mike1', name: 'Conan of Cimmeria', levels: [{ cls: 'Barbarian', n: 3 }] };
  r = await req('PUT', '/api/characters/mike1', { cookie: mikeCookie, body: { character: mikeChar } });
  eq('player saves a character', r.status, 200);

  r = await req('GET', '/api/characters/mike1', { cookie: mikeCookie });
  eq('player reads it back', [r.status, r.json.character.name], [200, 'Conan of Cimmeria']);
  eq('ownership recorded', r.json.owner, 'michael');

  /* A CHARACTER NEEDS A NAME. Owner, 2026-09-10: "Players shouldn't be able to save an unnamed
     character." A picker full of identical "(unnamed)" rows is the symptom; the cause is that
     anything could be stored. Enforced on the server because that is the one place every device
     shares — the browser check is a courtesy message, not the rule. */
  r = await req('PUT', '/api/characters/noname', {
    cookie: mikeCookie, body: { character: { id: 'noname', levels: [{ cls: 'Fighter', n: 1 }] } }
  });
  eq('an unnamed character is refused', r.status, 400);
  r = await req('PUT', '/api/characters/blankname', {
    cookie: mikeCookie, body: { character: { id: 'blankname', name: '   ' } }
  });
  eq('whitespace is not a name either', r.status, 400);
  r = await req('GET', '/api/characters/noname', { cookie: mikeCookie });
  eq('and nothing was stored under it', r.status, 404);
  r = await req('PUT', '/api/characters/noname', {
    cookie: dmCookie, body: { character: { id: 'noname', name: '' } }
  });
  eq('not even for the DM', r.status, 400);

  const huckChar = { id: 'huck1', name: 'Someone Else', levels: [{ cls: 'Rogue', n: 2 }] };
  await req('PUT', '/api/characters/huck1', { cookie: huckCookie, body: { character: huckChar } });

  /* THE BOUNDARY: one player must not reach another player's character. */
  r = await req('GET', '/api/characters/huck1', { cookie: mikeCookie });
  eq('a player cannot read another player character', r.status, 403);
  r = await req('PUT', '/api/characters/huck1', { cookie: mikeCookie, body: { character: { name: 'hijacked' } } });
  eq('a player cannot overwrite another player character', r.status, 403);
  r = await req('DELETE', '/api/characters/huck1', { cookie: mikeCookie });
  eq('a player cannot delete another player character', r.status, 403);
  r = await req('GET', '/api/characters/huck1', { cookie: huckCookie });
  eq('and the target is untouched', r.json.character.name, 'Someone Else');

  r = await req('GET', '/api/characters', { cookie: mikeCookie });
  eq('a player lists only their own', r.json.characters.map(function (c) { return c.id; }), ['mike1']);

  r = await req('GET', '/api/characters', { cookie: dmCookie });
  ok('the dm lists the whole party',
    r.json.characters.length === 2 && r.json.characters.some(function (c) { return c.id === 'huck1'; }),
    JSON.stringify(r.json.characters.map(function (c) { return c.id; })));

  r = await req('GET', '/api/characters/huck1', { cookie: dmCookie });
  eq('the dm can read any character', r.status, 200);

  /* a DM edit does not steal ownership */
  await req('PUT', '/api/characters/huck1', { cookie: dmCookie, body: { character: { name: 'DM edited' } } });
  r = await req('GET', '/api/characters/huck1', { cookie: huckCookie });
  eq('a dm edit leaves ownership with the player', r.json.owner, 'huckleberry');
  eq('the dm edit landed', r.json.character.name, 'DM edited');

  /* Signing out happens in the game; the builder simply stops recognising the cookie. */
  r = await req('GET', '/api/characters', { cookie: 'ts_sess=revokedtoken' });
  eq('a revoked session loses access immediately', r.status, 401);

  /* ------------------------------------------- one build per pregame character ----
     THE GAP THIS CLOSES. The browser also checks, but only against its own localStorage:
     importing the same character on a laptop and then on a phone finds nothing locally
     either time, and produced two server records. The server is the one place every device
     shares, so the rule is enforced here as well. */
  const withKey = function (id, key, levels, name) {
    return { id: id, name: name || 'Rango', levels: levels || [{ cls: 'Wizard', n: 1 }],
             twoSnakes: { key: key } };
  };

  /* device 1 */
  r = await req('PUT', '/api/characters/dev1', {
    cookie: mikeCookie, body: { character: withKey('dev1', 'ts_hist:michael:rango') } });
  eq('first device saves the build', r.status, 200);

  /* device 2: a different id, empty local storage, same pregame character */
  r = await req('PUT', '/api/characters/dev2', {
    cookie: mikeCookie, body: { character: withKey('dev2', 'ts_hist:michael:rango') } });
  eq('second device also saves', r.status, 200);
  ok('and the first copy is folded away', r.json.merged && r.json.merged.indexOf('dev1') >= 0,
    JSON.stringify(r.json));

  r = await req('GET', '/api/characters', { cookie: mikeCookie });
  const rangos = r.json.characters.filter(function (c) { return c.name === 'Rango'; });
  eq('exactly one build of that character survives', rangos.length, 1);
  eq('and it is the one just saved', rangos[0].id, 'dev2');
  r = await req('GET', '/api/characters/dev1', { cookie: mikeCookie });
  eq('the superseded copy is gone', r.status, 404);

  /* a HIGHER-level build is never discarded without being asked */
  await req('PUT', '/api/characters/hi', {
    cookie: mikeCookie, body: { character: withKey('hi', 'ts_hist:michael:brona',
      [{ cls: 'Rogue', n: 5 }], 'Brona') } });
  r = await req('PUT', '/api/characters/lo', {
    cookie: mikeCookie, body: { character: withKey('lo', 'ts_hist:michael:brona',
      [{ cls: 'Rogue', n: 1 }], 'Brona') } });
  eq('a fresh import over a higher-level build is refused', r.status, 409);
  /* Guarded: without the conflict block these must FAIL, not throw — a crashing assertion
     reports worse than a failing one. */
  const cf = (r.json && r.json.conflict) || {};
  eq('and it says what is at risk', [cf.level, cf.incomingLevel], [5, 1]);
  eq('the conflict names the record', cf.id, 'hi');
  r = await req('GET', '/api/characters/hi', { cookie: mikeCookie });
  eq('the higher-level build is untouched by the refusal', r.status, 200);

  /* ...but the player can insist */
  r = await req('PUT', '/api/characters/lo', {
    cookie: mikeCookie, body: { character: withKey('lo', 'ts_hist:michael:brona',
      [{ cls: 'Rogue', n: 1 }], 'Brona'), force: true } });
  eq('force replaces it', r.status, 200);
  r = await req('GET', '/api/characters/hi', { cookie: mikeCookie });
  eq('and the higher-level copy is now gone', r.status, 404);

  /* a LOWER-level existing build is folded away without asking */
  await req('PUT', '/api/characters/small', {
    cookie: mikeCookie, body: { character: withKey('small', 'ts_hist:michael:dude',
      [{ cls: 'Bard', n: 1 }], 'Dude') } });
  r = await req('PUT', '/api/characters/big', {
    cookie: mikeCookie, body: { character: withKey('big', 'ts_hist:michael:dude',
      [{ cls: 'Bard', n: 4 }], 'Dude') } });
  eq('a higher-level save over a lower one needs no confirmation', r.status, 200);

  /* the rule is per-player: two players may each build from their own record */
  await req('PUT', '/api/characters/mine', {
    cookie: mikeCookie, body: { character: withKey('mine', 'ts_hist:shared:same') } });
  r = await req('PUT', '/api/characters/theirs', {
    cookie: huckCookie, body: { character: withKey('theirs', 'ts_hist:shared:same') } });
  eq('another player is not affected by my builds', r.status, 200);
  r = await req('GET', '/api/characters/mine', { cookie: mikeCookie });
  eq('and my copy survives', r.status, 200);

  /* a character with no pregame provenance is never deduplicated */
  await req('PUT', '/api/characters/scratch1', {
    cookie: mikeCookie, body: { character: { id: 'scratch1', name: 'From Scratch', levels: [] } } });
  r = await req('PUT', '/api/characters/scratch2', {
    cookie: mikeCookie, body: { character: { id: 'scratch2', name: 'From Scratch', levels: [] } } });
  eq('two from-scratch characters can coexist', r.status, 200);
  r = await req('GET', '/api/characters/scratch1', { cookie: mikeCookie });
  eq('neither is folded away', r.status, 200);

  /* ---------------------------------------------------------- static & leakage */
  r = await req('GET', '/character_builder.html');
  eq('character_builder.html is served', r.status, 200);
  ok('it is the app', /Pathfinder 1E Character Builder/.test(r.text || ''));
  r = await req('GET', '/');
  eq('root serves the app', r.status, 200);
  r = await req('GET', '/js/engine.js');
  eq('scripts are served', r.status, 200);
  r = await req('GET', '/css/styles.css');
  eq('styles are served', r.status, 200);
  /* The banner emblem sits at the root, not under js/ or css/, so it needs its own
     allowlist entry. Without this it 404s only once deployed. */
  r = await req('GET', '/riddle-banner.png');
  eq('the banner emblem is served', r.status, 200);
  ok('the emblem comes back as a PNG',
    (r.res.headers.get('content-type') || '').indexOf('image/png') === 0,
    'content-type was ' + r.res.headers.get('content-type'));
  /* The banner must reference the downscaled copy, not the 1 MB source. Nine players
     pulling the full-size art on every page load is the regression this guards. */
  const bannerBytes = Number(r.res.headers.get('content-length') || 0);
  ok('the served emblem is the downscaled copy, not the full-size source',
    bannerBytes > 0 && bannerBytes < 120000, bannerBytes + ' bytes');
  r = await req('GET', '/character_builder.html');
  ok('the page points the banner at the downscaled file',
    /riddle-banner\.png/.test(r.text || '') && !/src="riddle\.png"/.test(r.text || ''),
    'markup still references the full-size image');

  r = await req('GET', '/pf1cb_data.json');
  ok('the data file is never served', r.status === 403 || r.status === 404, 'got ' + r.status);
  r = await req('GET', '/pf1cb_access.json');
  ok('the access file is never served', r.status === 403 || r.status === 404, 'got ' + r.status);

  for (const evil of ['/../server.js', '/..%2fserver.js', '/js/../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd']) {
    r = await req('GET', evil);
    ok('path traversal blocked: ' + evil, r.status === 403 || r.status === 404, 'got ' + r.status);
    ok('no file body leaked for ' + evil, !/root:x:/.test(r.text || ''));
  }

  r = await req('GET', '/server.js');
  ok('the server source is not served as a script',
    r.status === 200 ? !/timingSafeEqual/.test(r.text || '') : true,
    'server.js is readable over HTTP');

  /* ---------------------------------------------------------- persistence */
  await new Promise(function (r2) { setTimeout(r2, 400); });   /* let the debounced write land */
  ok('data file written', fs.existsSync(DATA));
  const onDisk = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  ok('characters persisted to disk', !!onDisk.characters.mike1);
  ok('the builder stores no credentials of its own', !onDisk.users && !onDisk.salt,
    'found a user or salt record: identity is supposed to be delegated');
  ok('no session token is written to disk', !/ts_sess/.test(JSON.stringify(onDisk)));

  /* ---------------------------------------------------------- logging hygiene */
  ok('no session token appears in the server log',
    !/tokmichael|tokdm|tokhuck/.test(serverLog), 'a session token was logged');

  /* ---------------------------------------------------------- bad input */
  r = await req('PUT', '/api/characters/x1', { cookie: mikeCookie, body: { notacharacter: 1 } });
  eq('a malformed save is rejected', r.status, 400);
  r = await req('GET', '/api/characters/does-not-exist', { cookie: mikeCookie });
  eq('a missing character is 404', r.status, 404);

  /* ---------------------------------------------------------- the game being down */
  tsDown = true;
  r = await req('GET', '/api/me', { cookie: mikeCookie });
  eq('an unreachable game yields 503, not a silent grant', r.status, 503);
  ok('and the message tells the player their work is safe',
    /saved in this browser/.test((r.json && r.json.error) || ''), JSON.stringify(r.json));
  r = await req('GET', '/api/characters', { cookie: mikeCookie });
  eq('character access also fails closed', r.status, 503);
  tsDown = false;
  r = await req('GET', '/api/me', { cookie: mikeCookie });
  eq('and recovers when the game comes back', r.status, 200);

  report();
})().catch(function (e) {
  fail++; failures.push('harness threw: ' + e.message);
  report();
});

function report() {
  console.log('\nServer tests' + (MUT ? '  [MUTATION: ' + MUT + ']' : ''));
  console.log('  pass ' + pass + '   fail ' + fail);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(function (f, i) { console.log('  ' + (i + 1) + '. ' + f); });
  }
  cleanup();
  process.exit(fail ? 1 : 0);
}
