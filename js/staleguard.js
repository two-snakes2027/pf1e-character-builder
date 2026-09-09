/* Pathfinder 1E Character Builder — stale-tab guard.

   THE BUG THIS EXISTS FOR. On 2026-09-09 a tab left open across a deploy imported a character
   using the previous version's code — all-10 ability scores, no spells — and saved it to the
   server twice more, two hours after the fix was live. Nothing in the app could tell, and the
   only remedy was a spoken "hard-reload", which is a hope rather than a mechanism.

   A fix nobody loads is not deployed.

   Two rules, both borrowed from the same guard in Two Snakes:

     FAILS OPEN, ALWAYS. A network blip, a 404 from a server mid-restart, or an empty stamp
     must never nag or block. Only a stamp that positively DIFFERS from the one this tab
     loaded with counts as stale.

     ONCE STALE, ALWAYS STALE. It never flips back on a later flaky response.

   The banner is built in JS and appended to <body> so it cannot be styled away or left out of
   a screen, and it is not a modal — the page stays readable and its exit IS the reload button. */
(function () {
  const PF = (window.PF = window.PF || {});
  const G = (PF.STALE = {});

  let atLoad = null;
  let stale = false;
  let timer = null;

  function endpoint() {
    /* Same relative base as the rest of the API: under /builder/ this is /builder/api/build. */
    let base = '/';
    try { base = window.location.pathname.replace(/[^/]*$/, ''); } catch (e) { /* default */ }
    return base + 'api/build';
  }

  function fetchStamp() {
    return fetch(endpoint(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.build) || null; })
      .catch(function () { return null; });
  }

  G.isStale = function () { return stale; };

  /* Resolves true when this tab is known to be running old code. */
  G.check = function () {
    if (stale) return Promise.resolve(true);
    return fetchStamp().then(function (b) {
      if (!b || !atLoad || b === atLoad) return false;
      stale = true;
      showBanner();
      return true;
    });
  };

  G.start = function () {
    fetchStamp().then(function (b) {
      atLoad = b;
      if (!atLoad) return;                     /* no stamp to compare against; stay quiet */
      clearInterval(timer);
      timer = setInterval(G.check, 5 * 60 * 1000);
      /* The moments that matter most are when a tab is picked back up after being left. */
      window.addEventListener('focus', function () { G.check(); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') G.check();
      });
    });
  };

  function showBanner() {
    if (document.getElementById('pf1cb-stale-bar')) return;
    const d = document.createElement('div');
    d.id = 'pf1cb-stale-bar';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:11000;background:#8b0000;'
      + 'color:#fff;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
      + 'padding:11px 16px;display:flex;align-items:center;justify-content:center;gap:14px;'
      + 'flex-wrap:wrap;text-align:center;box-shadow:0 2px 14px rgba(0,0,0,.55);';

    const msg = document.createElement('span');
    msg.textContent = 'This tab is running an older version of the builder. Reload before you '
      + 'import or save — an out-of-date tab imports characters wrongly and quietly.';
    d.appendChild(msg);

    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Reload now';
    b.style.cssText = 'background:#fff;color:#8b0000;border:none;border-radius:6px;'
      + 'padding:6px 14px;font-weight:700;cursor:pointer;font-size:13px;';
    b.onclick = function () { window.location.reload(true); };
    d.appendChild(b);

    document.body.appendChild(d);
    /* Push the page down so the banner never covers the header it sits over. */
    try { document.body.style.paddingTop = d.offsetHeight + 'px'; } catch (e) { /* cosmetic */ }
  }

  G._showBannerForTest = showBanner;
})();
