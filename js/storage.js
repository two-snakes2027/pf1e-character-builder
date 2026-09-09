/* Pathfinder 1E Character Builder — persistence.
   Characters live in localStorage under one key per character. Every accessor is wrapped:
   a private window, cleared site data, or a browser that blocks storage must degrade to an
   in-memory session rather than throwing on load.

   When the page is served by server.js the remote-sync block at the bottom of this file
   layers server persistence on top, without changing any caller above it. */
(function () {
  const PF = (window.PF = window.PF || {});
  const S = (PF.STORE = {});
  const KEY = 'pf1cb:char:';
  const LAST = 'pf1cb:last';
  const memory = {};                     /* fallback when localStorage is unavailable */
  let storageOk = true;

  try {
    const probe = '__pf1cb_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
  } catch (e) { storageOk = false; }

  S.available = function () { return storageOk; };

  function lsSet(k, v) {
    if (!storageOk) { memory[k] = v; return; }
    try { window.localStorage.setItem(k, v); } catch (e) { storageOk = false; memory[k] = v; }
  }
  function lsGet(k) {
    if (!storageOk) return memory[k] === undefined ? null : memory[k];
    try { return window.localStorage.getItem(k); } catch (e) { return memory[k] === undefined ? null : memory[k]; }
  }
  function lsDel(k) {
    if (!storageOk) { delete memory[k]; return; }
    try { window.localStorage.removeItem(k); } catch (e) { delete memory[k]; }
  }
  function lsKeys() {
    if (!storageOk) return Object.keys(memory);
    try { return Object.keys(window.localStorage); } catch (e) { return Object.keys(memory); }
  }

  S.list = function () {
    return lsKeys()
      .filter(function (k) { return k.indexOf(KEY) === 0; })
      .map(function (k) {
        try {
          const c = JSON.parse(lsGet(k));
          return { id: c.id, name: c.name || '(unnamed)', savedAt: c.savedAt || 0, levels: c.levels || [] };
        } catch (e) { return null; }
      })
      .filter(Boolean)
      .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
  };

  S.load = function (id) {
    const raw = lsGet(KEY + id);
    if (!raw) return null;
    try { return S.migrate(JSON.parse(raw)); } catch (e) { return null; }
  };

  S.save = function (ch) {
    ch.savedAt = Date.now();
    lsSet(KEY + ch.id, JSON.stringify(ch));
    lsSet(LAST, ch.id);
    return ch.savedAt;
  };

  S.remove = function (id) {
    lsDel(KEY + id);
    if (lsGet(LAST) === id) lsDel(LAST);
  };

  S.lastId = function () { return lsGet(LAST); };
  S.setLast = function (id) { lsSet(LAST, id); };

  /* Fill in any field a newer version of the app added, so an old save still opens. */
  S.migrate = function (ch) {
    const blank = PF.ENGINE.blankCharacter();
    const out = Object.assign({}, blank, ch);
    /* deep-fill the nested objects */
    ['abilities', 'hp', 'wealth', 'acMisc', 'saveMisc', 'notes', 'spells'].forEach(function (k) {
      out[k] = Object.assign({}, blank[k], ch[k] || {});
    });
    ['base', 'racial', 'house', 'levelUp', 'misc'].forEach(function (k) {
      out.abilities[k] = Object.assign({}, blank.abilities[k], (ch.abilities && ch.abilities[k]) || {});
    });
    ['levels', 'feats', 'specials', 'weapons', 'items', 'magic', 'traits', 'languages'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (!out.skills || typeof out.skills !== 'object') out.skills = {};
    out.race = 'Human';                                /* house rule: humans only */
    return out;
  };

  /* ------------------------------------------------------------------ file export */
  S.exportBlob = function (ch) {
    return new Blob([JSON.stringify(ch, null, 2)], { type: 'application/json' });
  };

  S.download = function (ch) {
    const name = (ch.name || 'character').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_');
    const url = URL.createObjectURL(S.exportBlob(ch));
    const a = document.createElement('a');
    a.href = url; a.download = 'pf1e_' + name + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  };

  S.readFile = function (file, cb) {
    const r = new FileReader();
    r.onload = function () {
      try {
        const parsed = JSON.parse(r.result);
        cb(null, S.migrate(parsed));
      } catch (e) { cb(new Error('That file is not a character export this app can read.')); }
    };
    r.onerror = function () { cb(new Error('Could not read that file.')); };
    r.readAsText(file);
  };
})();

/* ====================================================================== remote sync
   The app is offline-first on purpose: localStorage is the working copy, so a dropped
   connection at the table never blocks a player mid-build. When the page is served by
   server.js, every local save is also queued to the server, and a boot pull merges the
   server's copies in (newest savedAt wins). A static/file:// deployment simply never
   finds /api/me and stays local, with no error shown. */
(function () {
  const PF = window.PF, S = PF.STORE;
  const R = (S.remote = {
    active: false, user: null, role: null, status: 'local', lastError: null, pending: 0
  });
  const listeners = [];
  S.onRemoteChange = function (fn) { listeners.push(fn); };
  function announce() { listeners.forEach(function (f) { try { f(R); } catch (e) { /* ignore */ } }); }

  /* The builder is served under /builder/ on the same origin as the game, so its own API
     must be addressed RELATIVELY: an absolute '/api/me' would leave the builder entirely and
     land on the game's router next to /api/chat. Derive the base from the current path so it
     works at the site root during local development and under /builder/ in production. */
  const API_BASE = (function () {
    try { return window.location.pathname.replace(/[^/]*$/, ''); }
    catch (e) { return '/'; }
  })();
  S.apiBase = function () { return API_BASE; };

  function api(method, path, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    });
  }

  /* Is there a server behind this page at all? */
  S.probe = function () {
    return api('GET', 'api/me').then(function (res) {
      if (res.status === 200) {
        return res.json().then(function (j) {
          R.active = true; R.user = j.user; R.role = j.role; R.status = 'signed-in';
          announce(); return R;
        });
      }
      if (res.status === 401) { R.active = true; R.status = 'signed-out'; announce(); return R; }
      R.active = false; R.status = 'local'; announce(); return R;
    }).catch(function () {
      R.active = false; R.status = 'local'; announce(); return R;
    });
  };

  /* There is no login here. Identity comes from the Two Snakes session, which the server
     verifies by asking the game. Signing in and out both happen in the game. */
  S.gameUrl = function () {
    const base = API_BASE;
    /* /builder/ -> /   ·  / -> /  */
    return base.replace(/builder\/?$/, '') || '/';
  };

  /* Pull every character this account can see and merge by savedAt. */
  S.pullAll = function () {
    if (!R.active || R.status !== 'signed-in') return Promise.resolve(0);
    R.status = 'syncing'; announce();
    return api('GET', 'api/characters').then(function (res) {
      if (res.status !== 200) throw new Error('list failed');
      return res.json();
    }).then(function (j) {
      return Promise.all((j.characters || []).map(function (row) {
        const localRaw = S.load(row.id);
        if (localRaw && (localRaw.savedAt || 0) >= (row.savedAt || 0)) return null;  /* ours is newer */
        return api('GET', 'api/characters/' + encodeURIComponent(row.id))
          .then(function (r) { return r.status === 200 ? r.json() : null; })
          .then(function (d) {
            if (!d || !d.character) return null;
            const ch = S.migrate(d.character);
            ch.savedAt = d.savedAt;
            ch.remoteOwner = d.owner;
            window.localStorage && S.saveLocalOnly(ch);
            return ch.id;
          });
      }));
    }).then(function (ids) {
      R.status = 'signed-in'; R.lastError = null; announce();
      return ids.filter(Boolean).length;
    }).catch(function (e) {
      R.status = 'error'; R.lastError = e.message; announce();
      return 0;
    });
  };

  /* Push one character. Failures are retried on the next save rather than surfaced as
     modal errors — the local copy is authoritative for the player either way. */
  const queue = new Map();
  let flushTimer = null;
  S.push = function (ch) {
    if (!R.active || R.status !== 'signed-in') return;
    if (PF.ENGINE.isPristine(ch)) return;      /* an untouched placeholder is not worth a row */
    queue.set(ch.id, ch);
    R.pending = queue.size; announce();
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 900);
  };

  function flush() {
    const batch = Array.from(queue.values());
    queue.clear();
    if (!batch.length) return;
    R.status = 'syncing'; announce();
    Promise.all(batch.map(function (ch) {
      return api('PUT', 'api/characters/' + encodeURIComponent(ch.id), { character: ch })
        .then(function (res) {
          if (res.status !== 200) { queue.set(ch.id, ch); throw new Error('save rejected (' + res.status + ')'); }
        });
    })).then(function () {
      R.pending = queue.size; R.status = 'signed-in'; R.lastError = null; announce();
    }).catch(function (e) {
      R.pending = queue.size; R.status = 'error'; R.lastError = e.message; announce();
    });
  }

  S.removeRemote = function (id) {
    if (!R.active || R.status !== 'signed-in') return Promise.resolve();
    return api('DELETE', 'api/characters/' + encodeURIComponent(id)).catch(function () { /* local delete stands */ });
  };

  /* The original save, without the push — used by the pull so a pull does not echo back. */
  S.saveLocalOnly = S.save;
  S.save = function (ch) {
    const at = S.saveLocalOnly(ch);
    S.push(ch);
    return at;
  };
  const localRemove = S.remove;
  S.remove = function (id) { localRemove(id); S.removeRemote(id); };
})();
