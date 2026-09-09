/* Pathfinder 1E Character Builder — UI.
   Renders the four tabs from a character object and writes edits straight back into it.
   All rules maths lives in engine.js; nothing here recomputes a number itself. */
(function () {
  const PF = window.PF, D = PF.DATA, E = PF.ENGINE, S = PF.STORE, IMP = PF.IMPORT;

  let CH = null;            /* current character */
  let DER = null;           /* last derivation */
  let onlyRanked = false;
  let dirty = false;          /* edited since the last successful Save */
  let saving = false;
  /* Collapsed state for the Rules Check panel. Kept outside render, because the panel is
     rebuilt on every recompute and would otherwise spring open on each keystroke. */
  let warnsCollapsed = (function () {
    try { return window.localStorage.getItem('pf1cb:warnsCollapsed') === '1'; }
    catch (e) { return false; }
  })();

  const $ = function (id) { return document.getElementById(id); };
  const el = function (tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = txt;
    return n;
  };
  const sign = E.sign;
  const esc = function (s) { return String(s === undefined || s === null ? '' : s); };

  /* ================================================================ boot */
  function boot() {
    fillStaticSelects();
    wireChrome();
    wireBindings();
    wireTabs();
    wireTab1(); wireTab2(); wireTab3();

    wireAuth();

    const last = S.lastId();
    const loaded = last ? S.load(last) : null;
    /* Do not persist the boot placeholder. It is written on the first real edit, and this
       leaves the sync pull free to replace it with the player's actual character. */
    CH = loaded || E.blankCharacter();
    if (!S.available()) {
      toast('This browser is not storing data, so work here lasts only for this tab. Use Export to keep a character.', 'warn', 9000);
    }
    render();

    /* Is there a server behind this page? If so, sign in and pull; if not, stay local
       and say nothing — a file:// or static deployment is a supported way to run this. */
    if (PF.STALE) PF.STALE.start();

    S.probe().then(function (r) {
      renderSync();
      if (r.active && r.status === 'signed-out') openLogin();
      else if (r.active && r.status === 'signed-in') {
        S.pullAll().then(function (n) { afterPull(n); });
      }
    });
  }

  /* If this device was empty and the pull brought characters in, open the newest instead of
     leaving the player looking at a blank placeholder. */
  function afterPull(n) {
    if (n && E.isPristine(CH)) {
      const list = S.list();
      if (list.length) {
        const c = S.load(list[0].id);
        if (c) { CH = c; S.setLast(c.id); render(); }
      }
    }
    renderPicker();
    dirty = false;
    renderSync();
    if (n) toast('Loaded ' + n + ' saved character(s) from the server.', 'info');
  }

  function wireAuth() {
    S.onRemoteChange(renderSync);
    $('btnAuth').onclick = function () {
      if (S.remote.status === 'signed-in') { window.location.href = S.gameUrl(); }
      else { openLogin(); }
    };
  }

  function renderSync() {
    const R = S.remote, badge = $('syncBadge'), btn = $('btnAuth');
    if (!R.active) { badge.hidden = true; btn.hidden = true; return; }
    badge.hidden = false; btn.hidden = false;
    let label, cls;
    if (saving) { label = 'saving…'; cls = 'warn'; }
    else if (R.status === 'signed-out') { label = 'not signed in'; cls = 'warn'; }
    else if (R.status === 'error') { label = 'save failed'; cls = 'bad'; }
    else if (dirty) { label = 'unsaved changes'; cls = 'warn'; }
    else { label = 'saved'; cls = 'ok'; }
    badge.textContent = label + (R.user ? ' · ' + R.user + (R.role === 'dm' ? ' (DM)' : '') : '');
    badge.className = 'badge ' + cls;
    const sv = $('btnSave');
    if (sv) { sv.textContent = saving ? 'Saving…' : (dirty ? 'Save *' : 'Save'); sv.disabled = !!saving; }
    badge.title = R.lastError ? R.lastError + ' — your local copy is safe; it will retry on the next edit.' : '';
    btn.textContent = R.status === 'signed-in' ? 'Back to Two Snakes' : 'Sign in to Two Snakes';
  }

  /* There is no password here. The builder trusts the Two Snakes session, so signing in
     means signing in to the game and coming back. */
  function openLogin() {
    modal('Sign in through Two Snakes', function (body) {
      body.appendChild(el('p', '',
        'The character builder uses your Two Snakes sign-in — there is no second password. '
        + 'Sign in to the game, then come back here.'));
      body.appendChild(el('p', 'tiny',
        'Until you do, you can still build a character from scratch: it is saved in this '
        + 'browser and will sync once you are signed in. Importing a pregame character needs '
        + 'the sign-in, because the list comes from your own Two Snakes records.'));
      const a = document.createElement('a');
      a.href = S.gameUrl();
      a.className = 'btn primary';
      a.textContent = 'Go to Two Snakes →';
      a.style.display = 'inline-block';
      a.style.textDecoration = 'none';
      body.appendChild(a);
    }, [{ label: 'Work offline for now', fn: function (close) { close(); } }]);
  }

  function fillStaticSelects() {
    const al = $('fAlign');
    al.appendChild(new Option('—', ''));
    D.ALIGNMENTS.forEach(function (a) { al.appendChild(new Option(a, a)); });

    const hl = $('fHome');
    hl.appendChild(new Option('—', ''));
    D.HOMELANDS.forEach(function (h) { hl.appendChild(new Option(h, h)); });

    const pb = $('pbBudget');
    D.POINT_BUY_BUDGETS.forEach(function (b) {
      pb.appendChild(new Option(b.label + ' (' + b.points + ')', b.points));
    });

    const ar = $('selArmor');
    D.ARMOR.forEach(function (a) {
      ar.appendChild(new Option(a.name + (a.type !== 'none' ? '  (' + a.type + ', +' + a.ac + ')' : ''), a.name));
    });
    const sh = $('selShield');
    D.SHIELDS.forEach(function (s) {
      sh.appendChild(new Option(s.name + (s.ac ? '  (+' + s.ac + ')' : ''), s.name));
    });
    [$('selArmorEnh'), $('selShieldEnh')].forEach(function (sel) {
      for (let i = 0; i <= 5; i++) sel.appendChild(new Option(i ? '+' + i : '—', i));
    });
  }

  /* ================================================================ chrome */
  function wireChrome() {
    $('btnNew').onclick = function () {
      CH = E.blankCharacter(); render(); dirty = false; renderSync();
      toast('New character started. Press Save when you want to keep it.', 'info', 5000);
    };
    $('btnExport').onclick = function () { S.download(CH); };
    $('btnPrint').onclick = function () { window.print(); };
    $('btnDelete').onclick = function () {
      confirmModal('Delete this character?',
        'This removes "' + (CH.name || 'the unnamed character') + '" from this browser. '
        + 'Export first if you want to keep a copy — this cannot be undone.',
        function () {
          S.remove(CH.id);
          const rest = S.list();
          CH = rest.length ? S.load(rest[0].id) : E.blankCharacter();
          if (!rest.length) S.saveLocalOnly(CH);
          render(); toast('Character deleted.', 'info');
        });
    };
    $('btnTheme').onclick = function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : (cur === 'light' ? '' : 'dark');
      if (next) document.documentElement.setAttribute('data-theme', next);
      else document.documentElement.removeAttribute('data-theme');
    };
    $('btnLoad').onclick = function () {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        S.readFile(inp.files[0], function (err, ch) {
          if (err) { toast(err.message, 'warn', 7000); return; }
          ch.id = ch.id || E.blankCharacter().id;
          CH = ch; S.saveLocalOnly(CH); render(); dirty = true; renderSync();
          toast('Loaded ' + (CH.name || 'character') + '. Press Save to keep it on the server.', 'info', 6000);
        });
      };
      inp.click();
    };
    $('btnSave').onclick = doSave;
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); doSave(); }
    });
    window.addEventListener('beforeunload', function (e) {
      if (!dirty) return;
      e.preventDefault(); e.returnValue = '';   /* browsers show their own wording */
    });
    $('btnImport').onclick = openImport;
    $('charPicker').onchange = function () {
      const id = $('charPicker').value;
      if (id === '__new__') { CH = E.blankCharacter(); render(); dirty = false; renderSync(); return; }
      const c = S.load(id);
      if (c) { CH = c; S.setLast(id); render(); dirty = false; renderSync(); }
    };
    $('btnEditLevels').onclick = openLevels;
  }

  function wireTabs() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.panel').forEach(function (x) { x.classList.remove('active'); });
        t.setAttribute('aria-selected', 'true');
        $(t.dataset.panel).classList.add('active');
      };
    });
  }

  /* Two-way binding for plain fields, including dotted paths like notes.background. */
  function wireBindings() {
    document.querySelectorAll('[data-bind]').forEach(function (node) {
      node.addEventListener('input', function () {
        const path = node.dataset.bind.split('.');
        let o = CH;
        for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
        let v = node.value;
        if (node.type === 'number') v = v === '' ? 0 : Number(v);
        o[path[path.length - 1]] = v;
        persist();
        if (node.dataset.bind === 'name') {
          /* The name feeds a rules-check line ("has no name yet"), so it needs a full
             recompute, not just a redraw of the identity strip — otherwise the warning
             sits there stale while the player looks straight at the name they typed. */
          recompute(); renderPicker();
        } else if (/^wealth\.|^xp$|^alignment$/.test(node.dataset.bind)) { recompute(); }
      });
    });
  }

  function readBindings() {
    document.querySelectorAll('[data-bind]').forEach(function (node) {
      const path = node.dataset.bind.split('.');
      let o = CH;
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]] || {};
      const v = o[path[path.length - 1]];
      node.value = v === undefined || v === null ? '' : v;
    });
  }

  let saveTimer = null;
  /* Local draft only — a refresh/crash net. The server is written by doSave(). */
  function persist() {
    if (!E.isPristine(CH)) markDirty();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { S.saveLocalOnly(CH); }, 250);
  }

  function markDirty() {
    if (dirty) return;                 /* only re-render the badge on the transition */
    dirty = true; renderSync();
  }

  function doSave() {
    if (saving) return;
    /* Unlike import, a save is NOT refused — the character on screen is the player's real work
       and losing it would be worse than storing an old-shaped record. Warn, then save. */
    if (PF.STALE && PF.STALE.isStale()) {
      toast('Heads up: this tab is running an older version. Saving anyway so nothing is lost — '
        + 'reload afterwards.', 'warn', 9000);
    }
    clearTimeout(saveTimer);
    S.saveLocalOnly(CH);
    if (E.isPristine(CH)) { toast('Nothing to save yet.', 'info'); return; }
    saving = true; renderSync();
    S.commit(CH).then(function (r) {
      saving = false; dirty = false; renderSync(); renderPicker();
      if (r && r.saved) toast('Saved.', 'info', 2200);
      else if (r && r.signedOut) toast('Saved in this browser. Sign in to Two Snakes to keep it on the server.', 'warn', 7000);
      else toast('Saved in this browser.', 'info', 3000);
    }).catch(function (e) {
      saving = false; renderSync();
      toast('Could not save to the server: ' + e.message
        + ' Your work is still here in this browser — try Save again.', 'warn', 9000);
    });
  }

  /* Re-rendering a panel replaces the very input the user is typing into, which would drop
     focus mid-keystroke. Capture who had focus and where the caret was, then put it back.
     Every dynamically built input carries a stable data-fk for this. */
  function captureFocus() {
    const a = document.activeElement;
    if (!a || !a.dataset || !a.dataset.fk) return null;
    return {
      fk: a.dataset.fk,
      start: a.selectionStart === undefined ? null : a.selectionStart,
      end: a.selectionEnd === undefined ? null : a.selectionEnd
    };
  }
  function restoreFocus(f) {
    if (!f) return;
    const n = document.querySelector('[data-fk="' + f.fk.replace(/"/g, '\\"') + '"]');
    if (!n) return;
    n.focus();
    if (f.start !== null && n.setSelectionRange && n.type !== 'number') {
      try { n.setSelectionRange(f.start, f.end); } catch (e) { /* unsupported input type */ }
    }
  }

  function recompute() {
    const f = captureFocus();
    DER = E.derive(CH);
    renderAll();
    restoreFocus(f);
    persist();
  }

  /* ================================================================ render */
  function render() { readBindings(); renderPicker(); recompute(); }

  function renderAll() {
    renderIdentity();
    renderWarnings();
    renderAbilities();
    renderVitals();
    renderSaves();
    renderAC();
    renderArmorControls();
    renderWeapons();
    renderCasting();
    renderSkills();
    renderFeats();
    renderClassFeatures();
    renderArduin();
    renderSpecials();
    renderSpells();
    renderLoad();
    renderMagic();
    renderGear();
    renderProvenance();
  }

  function renderPicker() {
    const sel = $('charPicker');
    const list = S.list();
    sel.innerHTML = '';
    list.forEach(function (c) {
      const lv = c.levels.reduce(function (s, l) { return s + l.n; }, 0);
      sel.appendChild(new Option(c.name + (lv ? '  (' + lv + ')' : ''), c.id));
    });
    if (!list.some(function (c) { return c.id === CH.id; })) {
      sel.appendChild(new Option((CH.name || '(unnamed)'), CH.id));
    }
    sel.appendChild(new Option('— New character —', '__new__'));
    sel.value = CH.id;
  }

  function renderIdentity() {
    const parts = (CH.levels || []).filter(function (l) { return l.n > 0; })
      .map(function (l) { return l.cls + ' ' + l.n; });
    $('classLine').textContent = parts.length ? parts.join(' / ') : 'No class levels';
    const lv = E.totalLevel(CH);
    $('levelBadge').textContent = 'Level ' + lv;
    $('levelBadge').className = 'badge' + (lv >= 1 && lv <= 7 ? ' ok' : (lv > 7 ? ' warn' : ''));
    $('xpBadge').textContent = (CH.xp || 0).toLocaleString() + ' XP';
  }

  function renderWarnings() {
    const host = $('warnbar');
    host.innerHTML = '';
    const ws = DER.warnings || [];
    if (!ws.length) return;
    const hard = ws.filter(function (w) { return w.sev === 'warn'; });
    const soft = ws.filter(function (w) { return w.sev !== 'warn'; });

    const card = el('div', 'card' + (warnsCollapsed ? ' collapsed' : ''));
    const h = el('h2');
    h.appendChild(document.createTextNode('Rules Check'));
    const b = el('span', 'badge ' + (hard.length ? 'warn' : 'ok'),
      hard.length ? hard.length + ' to look at' : 'nothing blocking');
    h.appendChild(b);
    if (warnsCollapsed && soft.length) {
      h.appendChild(el('span', 'badge', soft.length + ' note' + (soft.length === 1 ? '' : 's')));
    }
    h.appendChild(el('span', 'spacer'));
    if (!warnsCollapsed) {
      h.appendChild(el('span', 'hint', 'nothing here is enforced — the DM decides'));
    }

    const list = el('div', 'warnlist');
    hard.concat(soft).forEach(function (w) {
      const row = el('div', 'wmsg ' + (w.sev === 'warn' ? 'warn' : 'info'));
      row.appendChild(el('span', 'wtag', w.where));
      row.appendChild(el('span', '', w.msg));
      list.appendChild(row);
    });
    list.hidden = warnsCollapsed;

    const toggle = el('button', 'warn-toggle no-print');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(!warnsCollapsed));
    toggle.setAttribute('aria-controls', 'warnList');
    list.id = 'warnList';
    const setLabel = function () {
      toggle.innerHTML = '';
      toggle.appendChild(el('span', 'caret', '▾'));
      toggle.appendChild(document.createTextNode(warnsCollapsed ? 'Show' : 'Hide'));
    };
    setLabel();
    toggle.onclick = function () {
      warnsCollapsed = !warnsCollapsed;
      try { window.localStorage.setItem('pf1cb:warnsCollapsed', warnsCollapsed ? '1' : '0'); }
      catch (e) { /* storage unavailable; the choice just will not persist */ }
      renderWarnings();
    };
    h.appendChild(toggle);

    card.appendChild(h);
    card.appendChild(list);
    host.appendChild(card);
  }

  /* ---------------------------------------------------------------- tab 1 */
  function renderAbilities() {
    const host = $('abilityGrid');
    host.innerHTML = '';
    D.ABILITIES.forEach(function (a) {
      const box = el('div', 'abil');
      box.appendChild(el('div', 'ab-name', a.abbr));
      box.appendChild(el('div', 'ab-score', DER.abilities[a.key]));
      box.appendChild(el('div', 'ab-mod', sign(DER.mods[a.key])));

      const inp = document.createElement('input');
      inp.type = 'number'; inp.value = CH.abilities.base[a.key];
      inp.min = 3; inp.max = 20; inp.className = 'no-print';
      inp.dataset.fk = 'ab:' + a.key;
      inp.title = 'Point buy base score';
      inp.oninput = function () {
        CH.abilities.base[a.key] = Number(inp.value) || 0;
        recompute();
      };
      box.appendChild(inp);

      const bits = [];
      const h = CH.abilities.house[a.key], lu = CH.abilities.levelUp[a.key];
      const item = E.magicAbilityBonuses(CH)[a.key] || 0;
      const ard = (CH.arduin && CH.arduin.mods && CH.arduin.mods[a.key]) || 0;
      if (h) bits.push('wheel ' + sign(h));
      if (lu) bits.push('lvl ' + sign(lu));
      if (item) bits.push('item ' + sign(item));
      if (ard) bits.push('arduin ' + sign(ard));
      box.appendChild(el('div', 'ab-parts', bits.join(' · ') || ' '));

      /* level-up increase stepper */
      const st = el('div', 'row no-print');
      st.style.justifyContent = 'center'; st.style.gap = '4px'; st.style.marginTop = '4px';
      const minus = el('button', 'btn sm', '−');
      minus.onclick = function () {
        CH.abilities.levelUp[a.key] = Math.max(0, (CH.abilities.levelUp[a.key] || 0) - 1); recompute();
      };
      const plus = el('button', 'btn sm', '+');
      plus.onclick = function () {
        CH.abilities.levelUp[a.key] = (CH.abilities.levelUp[a.key] || 0) + 1; recompute();
      };
      st.appendChild(minus); st.appendChild(plus);
      box.appendChild(st);

      host.appendChild(box);
    });

    const spent = E.pointBuySpent(CH);
    $('pbBudget').value = CH.pointBuyBudget;
    $('pbBudget').onchange = function () { CH.pointBuyBudget = Number($('pbBudget').value); recompute(); };
    $('pbSpent').textContent = 'spent ' + spent + ' of ' + CH.pointBuyBudget;
    $('pbHint').textContent = spent > CH.pointBuyBudget ? '(over budget)' : '';
    const earned = E.abilityIncreasesEarned(CH), used = E.abilityIncreasesSpent(CH);
    $('incHint').textContent = 'level-up increases: ' + used + ' of ' + earned + ' used';
  }

  function renderVitals() {
    const host = $('vitals');
    host.innerHTML = '';
    const hp = DER.hp;
    const add = function (label, value, sub, hero) {
      const v = el('div', 'vital' + (hero ? ' hero' : ''));
      v.appendChild(el('div', 'v-label', label));
      v.appendChild(el('div', 'v-value', value));
      if (sub) v.appendChild(el('div', 'v-sub', sub));
      host.appendChild(v);
      return v;
    };
    add('Hit Points', hp.max, 'rolls ' + hp.fromLevels
      + (hp.toughness ? ' · tough +' + hp.toughness : '')
      + (hp.favored ? ' · fav +' + hp.favored : ''), true);
    add('Armor Class', DER.ac.total, 'touch ' + DER.ac.touch + ' · flat ' + DER.ac.flatFooted, true);
    add('Initiative', sign(DER.init), 'DEX ' + sign(DER.mods.dex));
    add('Speed', DER.speed + ' ft.', 'run ' + DER.speedRun + ' ft.');
    add('Base Attack', sign(DER.babBase), DER.attackSeq.map(sign).join(' / '));
    add('CMB', sign(DER.cmb), E.hasFeat(CH, 'Agile Maneuvers') ? 'DEX (agile)' : 'STR');
    add('CMD', DER.cmd, 'flat ' + (DER.cmd - Math.max(0, DER.mods.dex)));
    add('Melee', sign(DER.melee), 'BAB + STR');
    add('Ranged', sign(DER.ranged), 'BAB + DEX');

    /* current HP tracker */
    const v = el('div', 'vital');
    v.appendChild(el('div', 'v-label', 'Current HP'));
    const inp = document.createElement('input');
    inp.type = 'number'; inp.value = hp.current; inp.dataset.fk = 'hp:current';
    inp.style.cssText = 'width:100%;font-family:var(--serif);font-size:19px;font-weight:600;'
      + 'background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:1px 5px';
    inp.oninput = function () { CH.hp.current = inp.value === '' ? null : Number(inp.value); persist(); };
    v.appendChild(inp);
    v.appendChild(el('div', 'v-sub', 'of ' + hp.max));
    host.appendChild(v);
  }

  function renderSaves() {
    const tb = $('savesTable').querySelector('tbody');
    tb.innerHTML = '';
    [['Fortitude', 'fort', 'CON'], ['Reflex', 'ref', 'DEX'], ['Will', 'will', 'WIS']].forEach(function (row) {
      const s = DER.saves[row[1]];
      const tr = el('tr');
      tr.appendChild(el('td', '', row[0] + ' ('+ row[2] + ')'));
      [s.base, s.ability, s.feat, s.item].forEach(function (n) {
        tr.appendChild(el('td', 'num', sign(n)));
      });
      const miscTd = el('td', 'num');
      const mi = document.createElement('input');
      mi.type = 'number'; mi.value = s.misc; mi.dataset.fk = 'save:' + row[1];
      mi.oninput = function () { CH.saveMisc[row[1]] = Number(mi.value) || 0; recompute(); };
      miscTd.appendChild(mi); tr.appendChild(miscTd);
      tr.appendChild(el('td', 'num tot', sign(s.total)));
      tb.appendChild(tr);
    });
  }

  function renderAC() {
    const tb = $('acTable').querySelector('tbody');
    tb.innerHTML = '';
    const ac = DER.ac;
    const rows = [
      ['Base', 10, null], ['Armor', ac.armor, null], ['Shield', ac.shield, null],
      ['Dexterity', ac.dex, ac.maxDex !== null ? 'capped at +' + ac.maxDex : null],
      ['Natural armor', ac.natural, 'natural'], ['Deflection', ac.deflection, 'deflection'],
      ['Dodge', ac.dodge, 'dodge'], ['Monk', ac.monk, null], ['Misc', ac.misc, 'misc']
    ];
    rows.forEach(function (r) {
      if (!r[1] && r[0] !== 'Base' && r[0] !== 'Armor' && r[0] !== 'Dexterity' && !r[2]) return;
      const tr = el('tr');
      tr.appendChild(el('td', '', r[0]));
      if (r[2] === 'natural' || r[2] === 'deflection' || r[2] === 'dodge' || r[2] === 'misc') {
        const td = el('td', 'num');
        const inp = document.createElement('input');
        inp.type = 'number'; inp.value = CH.acMisc[r[2]] || 0; inp.dataset.fk = 'ac:' + r[2];
        inp.oninput = function () { CH.acMisc[r[2]] = Number(inp.value) || 0; recompute(); };
        td.appendChild(inp); tr.appendChild(td);
        tr.appendChild(el('td', 'tiny dim',
          r[1] !== (CH.acMisc[r[2]] || 0) ? 'with feats & items: ' + sign(r[1]) : ''));
      } else {
        tr.appendChild(el('td', 'num', sign(r[1])));
        tr.appendChild(el('td', 'tiny dim', r[2] || ''));
      }
      tb.appendChild(tr);
    });
    const tot = el('tr');
    tot.appendChild(el('td', '', 'Total'));
    tot.appendChild(el('td', 'num tot', ac.total));
    tot.appendChild(el('td', 'tiny dim', 'touch ' + ac.touch + ' · flat-footed ' + ac.flatFooted));
    tb.appendChild(tot);
  }

  function wireTab1() {
    $('selArmor').onchange = function () { CH.armor = $('selArmor').value; recompute(); };
    $('selShield').onchange = function () { CH.shield = $('selShield').value; recompute(); };
    $('selArmorEnh').onchange = function () { CH.armorEnh = Number($('selArmorEnh').value); recompute(); };
    $('selShieldEnh').onchange = function () { CH.shieldEnh = Number($('selShieldEnh').value); recompute(); };
    $('ckArmorMw').onchange = function () { CH.armorMw = $('ckArmorMw').checked; recompute(); };
    $('ckShieldMw').onchange = function () { CH.shieldMw = $('ckShieldMw').checked; recompute(); };
    $('btnAddWeapon').onclick = function () { toggleWeaponPicker(); };
  }

  function renderArmorControls() {
    $('selArmor').value = CH.armor; $('selShield').value = CH.shield;
    $('selArmorEnh').value = CH.armorEnh || 0; $('selShieldEnh').value = CH.shieldEnh || 0;
    $('ckArmorMw').checked = !!CH.armorMw; $('ckShieldMw').checked = !!CH.shieldMw;
    const a = E.armorDef(CH), s = E.shieldDef(CH);
    $('armorParts').innerHTML = '<b>Armor check penalty</b> ' + DER.acp
      + ' &nbsp;·&nbsp; <b>Max DEX</b> ' + (DER.ac.maxDex === null ? 'none' : '+' + DER.ac.maxDex)
      + ' &nbsp;·&nbsp; <b>Arcane spell failure</b> ' + DER.asf + '%'
      + ' &nbsp;·&nbsp; <b>Worn weight</b> ' + ((a.w || 0) + (s.w || 0)) + ' lb.';
  }

  function renderWeapons() {
    const tb = $('weaponTable').querySelector('tbody');
    tb.innerHTML = '';
    const ws = DER.weapons || [];
    $('weaponEmpty').hidden = ws.length > 0;
    $('weaponTable').hidden = ws.length === 0;

    ws.forEach(function (w, i) {
      const tr = el('tr');
      const eqTd = el('td');
      const eq = document.createElement('input');
      eq.type = 'checkbox'; eq.checked = w.equipped; eq.title = 'Equipped';
      eq.onchange = function () { CH.weapons[i].equipped = eq.checked; recompute(); };
      eqTd.appendChild(eq); tr.appendChild(eqTd);

      const nameTd = el('td');
      nameTd.appendChild(el('span', w.equipped ? 'rowmark' : '', w.name));
      if (!w.proficient) nameTd.appendChild(el('span', ' badge warn', 'not proficient'));
      if (w.usesDex && w.hand !== 'ranged') nameTd.appendChild(el('span', ' tiny dim', ' finesse'));
      if (w.note) nameTd.appendChild(el('div', 'tiny dim', w.note));
      tr.appendChild(nameTd);

      tr.appendChild(el('td', 'num tot', sign(w.attack)));
      tr.appendChild(el('td', 'num', w.attackSeq.map(sign).join(' / ')));
      tr.appendChild(el('td', '', w.damage));
      tr.appendChild(el('td', 'num', w.threat));
      tr.appendChild(el('td', 'num', w.crit));
      tr.appendChild(el('td', '', w.type));
      tr.appendChild(el('td', 'num', w.range));
      tr.appendChild(el('td', 'tiny dim', w.special));

      const act = el('td', 'no-print');
      const cfg = el('button', 'btn sm', '⚙');
      cfg.title = 'Enhancement, masterwork, two-handed';
      cfg.onclick = function () { openWeaponConfig(i); };
      const x = el('button', 'btn sm', '×');
      x.onclick = function () { CH.weapons.splice(i, 1); recompute(); };
      act.appendChild(cfg); act.appendChild(x);
      tr.appendChild(act);
      tb.appendChild(tr);
    });
  }

  function renderCasting() {
    const card = $('castingCard'), body = $('castingBody');
    const cs = DER.casting || [];
    card.hidden = cs.length === 0;
    if (!cs.length) return;
    body.innerHTML = '';
    cs.forEach(function (c) {
      const box = el('div', 'entry');
      const head = el('div', 'e-head');
      head.appendChild(el('span', 'e-name', c.cls));
      head.appendChild(el('span', 'e-meta',
        c.type + ' · ' + c.ability.toUpperCase() + ' ' + sign(c.abilityMod)
        + ' · CL ' + c.casterLevel + ' · concentration ' + sign(c.concentration)));
      if (c.unverified) head.appendChild(el('span', ' badge warn', 'verify vs. APG'));
      box.appendChild(head);

      const slots = Object.keys(c.slots).map(Number).sort(function (a, b) { return a - b; });
      const line = slots.map(function (L) {
        const n = c.slots[L];
        const label = L === 0 ? (c.cantripsAtWill ? 'cantrips at will' : 'orisons ' + n) : L + 'th ' + n;
        return label + (L > 0 ? ' (DC ' + (c.saveDcBase + L) + ')' : '');
      }).join('  ·  ');
      box.appendChild(el('div', 'e-body', line || 'No spell slots at this level.'));
      if (c.known) {
        const kn = Object.keys(c.known).map(Number).sort(function (a, b) { return a - b; })
          .map(function (L) { return L + ': ' + c.known[L]; }).join('  ·  ');
        box.appendChild(el('div', 'tiny dim', 'spells known — ' + kn));
      }
      body.appendChild(box);
    });
  }

  /* ---------------------------------------------------------------- tab 2 */
  function wireTab2() {
    $('ckOnlyRanked').onchange = function () { onlyRanked = $('ckOnlyRanked').checked; renderSkills(); };
    $('btnAddFeat').onclick = function () { toggleFeatPicker(); };
    $('btnAddSpecial').onclick = function () {
      CH.specials.push({ name: 'New ability', text: '' }); recompute();
    };
    $('btnArduin').onclick = openArduin;
    $('btnAddSpell').onclick = function () { toggleSpellPicker(); };
  }

  function renderSkills() {
    const tb = $('skillTable').querySelector('tbody');
    tb.innerHTML = '';
    const budget = DER.skillRanks;
    $('skillHint').textContent = budget.spent + ' of ' + budget.total + ' ranks spent'
      + (budget.left < 0 ? ' — ' + (-budget.left) + ' over' : ', ' + budget.left + ' left');
    const meter = $('skillMeter');
    const pct = budget.total ? Math.min(100, budget.spent / budget.total * 100) : 0;
    meter.className = 'meter no-print' + (budget.left < 0 ? ' over' : '');
    meter.firstElementChild.style.width = pct + '%';

    DER.skills.forEach(function (s) {
      if (onlyRanked && !s.ranks) return;
      const tr = el('tr');
      if (s.trainedOnly && !s.ranks) tr.className = 'muted-row';
      tr.appendChild(el('td', 'rowmark', s.isClass ? '★' : ''));
      const nm = el('td', '', s.name);
      if (s.trainedOnly) nm.appendChild(el('span', ' tiny dim', ' trained'));
      tr.appendChild(nm);
      tr.appendChild(el('td', 'tiny dim', s.ab.toUpperCase()));

      const rk = el('td', 'num');
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = 0; inp.value = s.ranks; inp.dataset.fk = 'sk:' + s.name + ':r';
      inp.oninput = function () {
        if (!CH.skills[s.name]) CH.skills[s.name] = { ranks: 0, misc: 0 };
        CH.skills[s.name].ranks = Number(inp.value) || 0;
        recompute();
      };
      rk.appendChild(inp); tr.appendChild(rk);

      tr.appendChild(el('td', 'num', sign(s.ability)));
      tr.appendChild(el('td', 'num', s.classBonus ? '+3' : '—'));
      tr.appendChild(el('td', 'num', s.feat ? sign(s.feat) : '—'));
      tr.appendChild(el('td', 'num', s.item ? sign(s.item) : '—'));

      const ms = el('td', 'num');
      const mi = document.createElement('input');
      mi.type = 'number'; mi.value = s.misc; mi.dataset.fk = 'sk:' + s.name + ':m';
      mi.oninput = function () {
        if (!CH.skills[s.name]) CH.skills[s.name] = { ranks: 0, misc: 0 };
        CH.skills[s.name].misc = Number(mi.value) || 0;
        recompute();
      };
      ms.appendChild(mi); tr.appendChild(ms);

      tr.appendChild(el('td', 'num', s.acp ? String(s.acp) : '—'));
      tr.appendChild(el('td', 'num tot', sign(s.total)));
      tb.appendChild(tr);
    });
  }

  function renderFeats() {
    const host = $('featList');
    host.innerHTML = '';
    const earned = E.featsEarned(CH);
    $('featHint').textContent = CH.feats.length + ' of ' + earned + ' slots used';
    $('featEmpty').hidden = CH.feats.length > 0;

    CH.feats.forEach(function (f, i) {
      const def = D.FEAT_BY_NAME[f.name];
      const box = el('div', 'entry');
      const head = el('div', 'e-head');
      head.appendChild(el('span', 'e-name', f.name + (f.choice ? ' (' + f.choice + ')' : '')));
      if (def) head.appendChild(el('span', 'e-meta', def.src + ' · ' + def.type));
      const problems = E.featPrereqProblems(CH, DER, f);
      if (problems.length) head.appendChild(el('span', ' badge warn', 'prereq'));
      const x = el('button', 'btn sm e-x no-print', '×');
      x.onclick = function () { CH.feats.splice(i, 1); recompute(); };
      head.appendChild(x);
      box.appendChild(head);
      if (def) box.appendChild(el('div', 'e-body', def.benefit));
      if (def && def.multi) {
        const row = el('div', 'row no-print');
        row.style.marginTop = '5px';
        const inp = document.createElement('input');
        inp.placeholder = 'choice (weapon, skill, school…)';
        inp.value = f.choice || ''; inp.dataset.fk = 'feat:' + i + ':choice';
        inp.style.cssText = 'flex:1;background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:3px 7px;font-size:12px';
        inp.oninput = function () { CH.feats[i].choice = inp.value; persist(); };
        inp.onchange = function () { recompute(); };
        row.appendChild(inp);
        box.appendChild(row);
      }
      problems.forEach(function (p) {
        box.appendChild(el('div', 'tiny', '⚠ ' + p));
      });
      host.appendChild(box);
    });
  }

  function renderClassFeatures() {
    const host = $('classFeatures');
    host.innerHTML = '';
    let any = false;
    (CH.levels || []).forEach(function (entry) {
      const c = D.CLASS_BY_NAME[entry.cls];
      if (!c) return;
      const got = (c.features || []).filter(function (f) { return f.lvl <= entry.n; });
      if (!got.length) return;
      any = true;
      const h = el('div', 'row');
      h.appendChild(el('strong', '', c.name + ' ' + entry.n));
      h.appendChild(el('span', 'tiny dim', c.src + ' · d' + c.hd + ' · '
        + (c.bab === 'full' ? 'full BAB' : c.bab === 'threeq' ? '3/4 BAB' : '1/2 BAB')
        + ' · ' + c.skillRanks + '+INT skills'));
      host.appendChild(h);
      got.forEach(function (f) {
        const box = el('div', 'entry');
        const head = el('div', 'e-head');
        head.appendChild(el('span', 'e-name', f.name));
        head.appendChild(el('span', 'e-meta', 'level ' + f.lvl));
        box.appendChild(head);
        box.appendChild(el('div', 'e-body', f.text));
        host.appendChild(box);
      });
    });
    if (!any) host.appendChild(el('div', 'emptystate', 'Add class levels to see the features they grant.'));
  }

  function renderArduin() {
    const host = $('arduinBox');
    host.innerHTML = '';
    if (!CH.arduin) {
      host.appendChild(el('div', 'emptystate',
        'No Arduin rolled. Every character rolls one special ability at creation — press "Set / roll".'));
      return;
    }
    const a = CH.arduin;
    const box = el('div', 'arduin');
    box.appendChild(el('div', 'a-roll',
      (a.chartKey ? a.chartKey + ' chart' : 'Arduin') + (a.roll ? ' · rolled ' + a.roll : '')));
    box.appendChild(el('div', 'a-title', a.title));
    box.appendChild(el('div', 'a-text', a.text || ''));
    if (a.mods && Object.keys(a.mods).length) {
      box.appendChild(el('div', 'tiny', 'Applied to the sheet: '
        + Object.keys(a.mods).map(function (k) { return k.toUpperCase() + ' ' + sign(a.mods[k]); }).join(', ')));
    }
    const row = el('div', 'row no-print'); row.style.marginTop = '8px';
    const clr = el('button', 'btn sm', 'Clear');
    clr.onclick = function () { CH.arduin = null; recompute(); };
    row.appendChild(clr);
    box.appendChild(row);
    host.appendChild(box);
  }

  function renderSpecials() {
    const host = $('specialList');
    host.innerHTML = '';
    $('specialEmpty').hidden = CH.specials.length > 0;
    CH.specials.forEach(function (sp, i) {
      const box = el('div', 'entry');
      const head = el('div', 'e-head');
      const nm = document.createElement('input');
      nm.value = sp.name; nm.dataset.fk = 'sp:' + i + ':name';
      nm.style.cssText = 'font-weight:650;background:transparent;border:none;flex:1;padding:0';
      nm.oninput = function () { CH.specials[i].name = nm.value; persist(); };
      head.appendChild(nm);
      const x = el('button', 'btn sm no-print', '×');
      x.onclick = function () { CH.specials.splice(i, 1); recompute(); };
      head.appendChild(x);
      box.appendChild(head);
      const ta = document.createElement('textarea');
      ta.value = sp.text; ta.rows = 2; ta.dataset.fk = 'sp:' + i + ':text';
      ta.style.cssText = 'width:100%;background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:5px 8px;font-size:12.5px;margin-top:4px;resize:vertical';
      ta.oninput = function () { CH.specials[i].text = ta.value; persist(); };
      box.appendChild(ta);
      host.appendChild(box);
    });
  }

  function renderSpells() {
    const card = $('spellsCard');
    const cs = DER.casting || [];
    const list = (CH.spells && CH.spells.known) || [];
    /* Show the card whenever there are spells to show, even if the class levels do not
       currently grant casting — an imported character has spells before it has a caster level. */
    card.hidden = cs.length === 0 && list.length === 0;
    if (card.hidden) return;

    const maxLv = cs.reduce(function (a, c) { return Math.max(a, c.maxSpellLevel); }, 0);
    $('spellHint').textContent = cs.length
      ? (list.length + ' recorded · castable up to level ' + maxLv)
      : (list.length + ' recorded · no caster levels yet');

    const host = $('spellList');
    host.innerHTML = '';
    if (!list.length) {
      host.appendChild(el('div', 'emptystate', 'No spells recorded yet.'));
      return;
    }

    /* The class letters this character actually casts from, used to decide a spell's level. */
    const keys = cs.map(function (c) { return c.listKey; }).filter(Boolean);

    const byLevel = {};
    list.forEach(function (nm, i) {
      const def = D.SPELL_BY_NAME[nm];
      let lv = null;
      if (def) {
        /* prefer this character's own lists; fall back to the lowest level any class gets it */
        keys.forEach(function (k) {
          if (def.lv[k] !== undefined) lv = lv === null ? def.lv[k] : Math.min(lv, def.lv[k]);
        });
        if (lv === null) {
          Object.keys(def.lv).forEach(function (k) {
            lv = lv === null ? def.lv[k] : Math.min(lv, def.lv[k]);
          });
        }
      }
      const bucket = lv === null ? 'x' : lv;
      (byLevel[bucket] = byLevel[bucket] || []).push({ nm: nm, def: def, i: i, lv: lv });
    });

    const order = Object.keys(byLevel).filter(function (k) { return k !== 'x'; })
      .map(Number).sort(function (a, b) { return a - b; });
    if (byLevel.x) order.push('x');

    order.forEach(function (lv) {
      const heading = lv === 'x' ? 'Not found in the Core / APG data'
        : (lv === 0 ? 'Cantrips / Orisons' : 'Level ' + lv);
      const h = el('div', 'tiny', heading);
      h.style.cssText = 'margin:10px 0 4px;font-weight:700;letter-spacing:.06em;text-transform:uppercase';
      host.appendChild(h);

      byLevel[lv].forEach(function (row) {
        const box = el('div', 'entry');
        const head = el('div', 'e-head');
        head.appendChild(el('span', 'e-name', row.nm));
        if (row.def) head.appendChild(el('span', 'e-meta', row.def.school));
        if (lv !== 'x' && cs.length && lv > maxLv) {
          head.appendChild(el('span', ' badge warn', 'above your caster level'));
        }
        const x = el('button', 'btn sm e-x no-print', '×');
        x.title = 'Remove';
        x.onclick = function () { CH.spells.known.splice(row.i, 1); recompute(); };
        head.appendChild(x);
        box.appendChild(head);

        if (row.def) {
          /* The essential line: what it does, then the numbers you need at the table. */
          box.appendChild(el('div', 'e-body', row.def.desc));
          const facts = el('div', 'spellfacts');
          [['Casting', row.def.ct], ['Range', row.def.rng], ['Duration', row.def.dur],
           ['Save', row.def.save], ['SR', row.def.sr], ['Comp.', row.def.comp]
          ].forEach(function (pair) {
            if (!pair[1]) return;
            const f = el('span', 'sf');
            f.appendChild(el('b', '', pair[0]));
            f.appendChild(document.createTextNode(' ' + pair[1]));
            facts.appendChild(f);
          });
          box.appendChild(facts);
          if (cs.length) {
            const dcs = cs.filter(function (c) { return c.listKey && row.def.lv[c.listKey] !== undefined; })
              .map(function (c) {
                return c.cls + ' DC ' + (c.saveDcBase + row.def.lv[c.listKey]);
              });
            if (dcs.length) box.appendChild(el('div', 'tiny dim', 'Save DC — ' + dcs.join(' · ')));
          }
        } else {
          box.appendChild(el('div', 'tiny dim',
            'No Core or APG entry with this name, so there is no summary to show. '
            + 'Kept exactly as the pregame recorded it.'));
        }
        host.appendChild(box);
      });
    });
  }

  /* ---------------------------------------------------------------- tab 3 */
  function wireTab3() {
    $('btnAddMagic').onclick = function () { toggleMagicPicker(); };
    $('btnAddGear').onclick = function () { toggleGearPicker(); };
    $('btnAddCustom').onclick = function () {
      CH.items.push({ name: 'New item', qty: 1, w: 0, c: 0, note: '' }); recompute();
    };
  }

  function renderLoad() {
    const host = $('loadVitals');
    host.innerHTML = '';
    const c = DER.carry;
    const add = function (label, value, sub) {
      const v = el('div', 'vital');
      v.appendChild(el('div', 'v-label', label));
      v.appendChild(el('div', 'v-value', value));
      if (sub) v.appendChild(el('div', 'v-sub', sub));
      host.appendChild(v);
    };
    add('Carried', c.current + ' lb.', DER.loadLevel + ' load');
    add('Light Load', c.light + ' lb.', 'no penalty');
    add('Medium Load', c.medium + ' lb.', 'max DEX +3, ACP −3');
    add('Heavy Load', c.heavy + ' lb.', 'max DEX +1, ACP −6');
    add('Wealth', Math.round(DER.wealthGp * 100) / 100 + ' gp', 'coin on hand');
    add('Gear Value', Math.round(DER.gearValueGp) + ' gp', 'everything owned');
    const wbl = D.WEALTH_BY_LEVEL[DER.level];
    if (wbl) add('Level Guideline', wbl + ' gp', 'wealth by level ' + DER.level);

    const meter = $('loadMeter');
    const pct = c.heavy ? Math.min(100, c.current / c.heavy * 100) : 0;
    meter.className = 'meter' + (DER.loadLevel === 'heavy' ? ' over' : '');
    meter.firstElementChild.style.width = pct + '%';

    $('wealthParts').innerHTML = '<b>Total worth</b> '
      + Math.round((DER.wealthGp + DER.gearValueGp) * 100) / 100 + ' gp'
      + (wbl ? ' &nbsp;of a ' + wbl + ' gp guideline' : '');
  }

  function renderMagic() {
    const tb = $('magicTable').querySelector('tbody');
    tb.innerHTML = '';
    $('magicEmpty').hidden = CH.magic.length > 0;
    $('magicTable').hidden = CH.magic.length === 0;
    CH.magic.forEach(function (m, i) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === m.name; });
      const tr = el('tr');
      tr.appendChild(el('td', '', m.name));
      tr.appendChild(el('td', 'tiny dim', m.slot || (def && def.slot) || '—'));
      tr.appendChild(el('td', 'num', def ? def.c : '—'));
      tr.appendChild(el('td', 'num', def ? def.w : '—'));
      tr.appendChild(el('td', 'tiny dim', def ? def.desc : ''));
      const act = el('td', 'no-print');
      const x = el('button', 'btn sm', '×');
      x.onclick = function () { CH.magic.splice(i, 1); recompute(); };
      act.appendChild(x); tr.appendChild(act);
      tb.appendChild(tr);
    });
  }

  function renderGear() {
    const tb = $('gearTable').querySelector('tbody');
    tb.innerHTML = '';
    $('gearEmpty').hidden = CH.items.length > 0;
    $('gearTable').hidden = CH.items.length === 0;
    CH.items.forEach(function (it, i) {
      const tr = el('tr');
      const nmTd = el('td');
      const nm = document.createElement('input');
      nm.type = 'text'; nm.value = it.name; nm.dataset.fk = 'it:' + i + ':name';
      nm.oninput = function () { CH.items[i].name = nm.value; persist(); };
      nmTd.appendChild(nm); tr.appendChild(nmTd);

      [['qty', 1], ['w', 0], ['c', 0]].forEach(function (f) {
        const td = el('td', 'num');
        const inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.value = it[f[0]] === undefined ? f[1] : it[f[0]];
        inp.dataset.fk = 'it:' + i + ':' + f[0];
        inp.oninput = function () { CH.items[i][f[0]] = Number(inp.value) || 0; recompute(); };
        td.appendChild(inp); tr.appendChild(td);
      });

      tr.appendChild(el('td', 'num', Math.round((Number(it.w) || 0) * (Number(it.qty) || 1) * 100) / 100));

      const noteTd = el('td');
      const note = document.createElement('input');
      note.type = 'text'; note.value = it.note || ''; note.dataset.fk = 'it:' + i + ':note';
      note.oninput = function () { CH.items[i].note = note.value; persist(); };
      noteTd.appendChild(note); tr.appendChild(noteTd);

      const act = el('td', 'no-print');
      const x = el('button', 'btn sm', '×');
      x.onclick = function () { CH.items.splice(i, 1); recompute(); };
      act.appendChild(x); tr.appendChild(act);
      tb.appendChild(tr);
    });
  }

  function renderProvenance() {
    const card = $('provenanceCard'), body = $('provenanceBody');
    card.hidden = !CH.twoSnakes;
    if (!CH.twoSnakes) return;
    const t = CH.twoSnakes;
    body.innerHTML = '';
    const p = t.pregameStats || {};
    const line = ['str', 'dex', 'con', 'int', 'wis', 'cha']
      .filter(function (k) { return p[k] !== undefined; })
      .map(function (k) { return k.toUpperCase() + ' ' + p[k]; }).join('  ');
    const box = el('div', 'entry');
    box.appendChild(el('div', 'e-name', 'Imported from the Two Snakes pregame'
      + (t.pregameClass ? ' — played as a ' + t.pregameClass : '')));
    box.appendChild(el('div', 'e-body',
      'These are the numbers the pregame app carried. They were characterization, not a PF1E '
      + 'stat block, and are shown for reference only — the build above is a fresh, legal one, '
      + 'per §2 of the Riddle of Steel ("rebuild to PF1E-legal, keeping identity and named gear").'));
    if (line) box.appendChild(el('div', 'mono tiny', 'Pregame abilities: ' + line
      + (p.luck !== undefined ? '   (luck ' + p.luck + ' — no PF1E equivalent)' : '')));
    if (t.pregameSheet) {
      const s = t.pregameSheet;
      box.appendChild(el('div', 'mono tiny', 'Pregame sheet: HP ' + s.hp + ' · AC ' + s.ac
        + ' · BAB ' + s.bab + ' · Fort ' + s.fort + ' · Ref ' + s.ref + ' · Will ' + s.will));
    }
    if (t.skillHints && t.skillHints.length) {
      box.appendChild(el('div', 'tiny dim', 'Known for: ' + t.skillHints.join(', ')));
    }
    if (t.unmatchedSkills && t.unmatchedSkills.length) {
      box.appendChild(el('div', 'tiny dim', 'No PF1E equivalent: ' + t.unmatchedSkills.join(', ')));
    }
    box.appendChild(el('div', 'tiny dim', 'Imported ' + new Date(t.importedAt).toLocaleString()));
    body.appendChild(box);
  }

  /* ================================================================ pickers */
  function buildPicker(hostId, items, onPick, opts) {
    const host = $(hostId);
    host.hidden = false;
    host.innerHTML = '';
    const wrap = el('div', 'picker');
    const inp = document.createElement('input');
    inp.className = 'picker-input';
    inp.placeholder = (opts && opts.placeholder) || 'Type to search…';
    inp.style.cssText = 'width:100%;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:7px 10px';
    wrap.appendChild(inp);
    const list = el('div', 'picker-list');
    wrap.appendChild(list);
    host.appendChild(wrap);

    function draw() {
      const q = inp.value.toLowerCase().trim();
      list.innerHTML = '';
      const hits = items.filter(function (it) {
        return !q || it.search.indexOf(q) >= 0;
      }).slice(0, 60);
      if (!hits.length) { list.appendChild(el('div', 'picker-item dim', 'Nothing matches.')); return; }
      hits.forEach(function (it) {
        const row = el('div', 'picker-item' + (it.blocked ? ' blocked' : ''));
        row.appendChild(el('div', 'pi-name', it.label));
        if (it.meta) row.appendChild(el('div', 'pi-meta', it.meta));
        if (it.desc) row.appendChild(el('div', 'pi-desc', it.desc));
        row.onclick = function () { host.hidden = true; onPick(it.value); };
        list.appendChild(row);
      });
    }
    inp.oninput = draw;
    inp.onkeydown = function (e) { if (e.key === 'Escape') host.hidden = true; };
    draw();
    inp.focus();
  }

  function toggleWeaponPicker() {
    const host = $('weaponPicker');
    if (!host.hidden) { host.hidden = true; return; }
    const items = D.WEAPONS.map(function (w) {
      return {
        value: w.name, search: (w.name + ' ' + w.cat + ' ' + w.t).toLowerCase(),
        label: w.name,
        meta: w.cat + ' · ' + w.hand + ' · ' + w.dmg + ' · ' + (w.cr === 20 ? '20' : w.cr + '-20') + '/x' + w.cm
          + ' · ' + w.t + (w.rng ? ' · ' + w.rng + ' ft.' : '') + ' · ' + w.w + ' lb. · ' + w.c + ' gp',
        desc: (w.sp || []).join(', ')
      };
    });
    buildPicker('weaponPicker', items, function (name) {
      const def = D.WEAPON_BY_NAME[name];
      CH.weapons.push({
        name: name, enh: 0, mw: false, equipped: CH.weapons.length === 0,
        hands: def.hand === 'two' ? 'two' : 'one', qty: 1, note: ''
      });
      recompute();
    }, { placeholder: 'Search 73 weapons…' });
  }

  function toggleFeatPicker() {
    const host = $('featPicker');
    if (!host.hidden) { host.hidden = true; return; }
    const items = D.FEATS.map(function (f) {
      const problems = E.featPrereqProblems(CH, DER, { name: f.name, choice: '' })
        .filter(function (p) { return p.indexOf('check by hand') < 0; });
      return {
        value: f.name, search: (f.name + ' ' + f.type + ' ' + f.src + ' ' + f.benefit).toLowerCase(),
        label: f.name, blocked: problems.length > 0,
        meta: f.src + ' · ' + f.type + (problems.length ? ' · ' + problems[0] : ''),
        desc: f.benefit
      };
    }).sort(function (a, b) { return (a.blocked === b.blocked) ? 0 : (a.blocked ? 1 : -1); });
    buildPicker('featPicker', items, function (name) {
      CH.feats.push({ name: name, choice: '' });
      recompute();
    }, { placeholder: 'Search 233 feats — ones you do not qualify for are marked, not hidden…' });
  }

  function toggleSpellPicker() {
    const host = $('spellPicker');
    if (!host.hidden) { host.hidden = true; return; }
    const keys = (DER.casting || []).map(function (c) { return c.listKey; });
    const maxLv = (DER.casting || []).reduce(function (a, c) { return Math.max(a, c.maxSpellLevel); }, 0);
    const items = D.SPELLS.filter(function (s) {
      return keys.some(function (k) { return s.lv[k] !== undefined; });
    }).map(function (s) {
      const lv = keys.reduce(function (a, k) { return s.lv[k] !== undefined ? Math.min(a, s.lv[k]) : a; }, 9);
      return {
        value: s.name, search: (s.name + ' ' + s.school + ' ' + s.desc).toLowerCase(),
        label: s.name, blocked: lv > maxLv,
        meta: 'level ' + lv + ' · ' + s.school + ' · ' + s.ct + ' · ' + s.rng + ' · ' + s.dur,
        desc: s.desc, _lv: lv
      };
    }).sort(function (a, b) { return a._lv - b._lv || a.label.localeCompare(b.label); });
    buildPicker('spellPicker', items, function (name) {
      if (!CH.spells.known) CH.spells.known = [];
      CH.spells.known.push(name);
      recompute();
    }, { placeholder: 'Search your class spell lists…' });
  }

  function toggleMagicPicker() {
    const host = $('magicPicker');
    if (!host.hidden) { host.hidden = true; return; }
    const items = D.MAGIC_ITEMS.map(function (m) {
      return {
        value: m.name, search: (m.name + ' ' + m.slot + ' ' + m.desc).toLowerCase(),
        label: m.name, meta: m.slot + ' · ' + m.c + ' gp · ' + m.w + ' lb.', desc: m.desc
      };
    });
    buildPicker('magicPicker', items, function (name) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === name; });
      CH.magic.push({ name: name, slot: def.slot, note: '' });
      recompute();
    }, { placeholder: 'Search magic items…' });
  }

  function toggleGearPicker() {
    const host = $('gearPicker');
    if (!host.hidden) { host.hidden = true; return; }
    const items = D.GEAR.map(function (g) {
      return { value: g.name, search: g.name.toLowerCase(), label: g.name, meta: g.c + ' gp · ' + g.w + ' lb.' };
    });
    buildPicker('gearPicker', items, function (name) {
      const def = D.GEAR.find(function (x) { return x.name === name; });
      CH.items.push({ name: name, qty: 1, w: def.w, c: def.c, note: '' });
      recompute();
    }, { placeholder: 'Search adventuring gear…' });
  }

  /* Replaces every build previously imported from this same Two Snakes record, reusing the
     first one's id so the stored file is overwritten instead of multiplied. */
  function adoptImport(rec, existing) {
    existing = existing || [];
    const ch = IMP.toCharacter(rec);
    let replaced = 0;

    if (existing.length) {
      ch.id = existing[0].id;                 /* overwrite the file already on record */
      existing.slice(1).forEach(function (c) { S.remove(c.id); replaced++; });
      replaced++;
    }

    CH = ch; S.saveLocalOnly(CH); S.setLast(CH.id); dirty = true;
    document.querySelectorAll('.modal-back').forEach(function (n) { n.remove(); });
    render();
    renderSync();       /* renderAll does not touch the badge; without this it reads stale */
    renderPicker();
    toast((replaced ? 'Replaced your existing ' + (CH.name || 'character') + ' build'
                    : 'Imported ' + (CH.name || 'character'))
      + ' — ability scores, hit points and known spells came across. '
      + 'The rules check will show how far the scores sit outside a legal point buy. '
      + 'Press Save to keep it.', 'info', 11000);
  }

  function confirmReimport(rec, existing, higher, incomingLevel) {
    const lv = E.totalLevel(higher);
    modal('Replace a level ' + lv + ' ' + rec.name + '?', function (body) {
      body.appendChild(el('p', '',
        'The ' + rec.name + ' already on file is level ' + lv + ' — '
        + (higher.levels || []).map(function (l) { return l.cls + ' ' + l.n; }).join(' / ')
        + (higher.feats && higher.feats.length ? ', ' + higher.feats.length + ' feat(s)' : '')
        + '. A fresh import arrives at level ' + incomingLevel
        + ', so replacing it throws away that levelling. The pregame record cannot give it back.'));
      body.appendChild(el('p', 'tiny',
        'If you only meant to get back to that character, cancel and pick it from the '
        + 'character list in the top bar instead.'));
    }, [
      { label: 'Cancel', fn: function (close) { close(); } },
      {
        label: 'Replace it', primary: true, fn: function (close) {
          close(); adoptImport(rec, existing);
        }
      }
    ]);
  }

  /* ================================================================ modals */
  function modal(title, buildBody, buttons) {
    const back = el('div', 'modal-back');
    const m = el('div', 'modal');
    const head = el('div', 'modal-head');
    head.appendChild(el('h3', '', title));
    const xb = el('button', 'btn sm', '×');
    xb.onclick = close;
    head.appendChild(xb);
    m.appendChild(head);
    const body = el('div', 'modal-body');
    buildBody(body, close);
    m.appendChild(body);
    const foot = el('div', 'modal-foot');
    (buttons || [{ label: 'Close', primary: true, fn: close }]).forEach(function (b) {
      const btn = el('button', 'btn' + (b.primary ? ' primary' : ''), b.label);
      btn.onclick = function () { b.fn(close); };
      foot.appendChild(btn);
    });
    m.appendChild(foot);
    back.appendChild(m);
    back.onclick = function (e) { if (e.target === back) close(); };
    document.addEventListener('keydown', onKey);
    $('modalHost').appendChild(back);
    function close() {
      document.removeEventListener('keydown', onKey);
      if (back.parentNode) back.parentNode.removeChild(back);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    return close;
  }

  function confirmModal(title, text, onYes) {
    modal(title, function (body) { body.appendChild(el('p', '', text)); }, [
      { label: 'Cancel', fn: function (close) { close(); } },
      { label: 'Delete', primary: true, fn: function (close) { close(); onYes(); } }
    ]);
  }

  function openLevels() {
    modal('Classes & Levels', function (body, close) {
      const info = el('p', 'tiny',
        'The Riddle of Steel starts at 3rd (a fully realised 1st, then levelled) and ends at 7th. '
        + 'Multiclassing is free — add as many class rows as you like.');
      body.appendChild(info);

      const listHost = el('div');
      body.appendChild(listHost);

      function draw() {
        listHost.innerHTML = '';
        CH.levels.forEach(function (l, i) {
          const row = el('div', 'row');
          row.style.marginBottom = '6px';
          const sel = document.createElement('select');
          sel.style.cssText = 'flex:1;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:5px 8px';
          D.CLASSES.forEach(function (c) {
            const o = new Option(c.name + '  (' + c.src + ', d' + c.hd + ')', c.name);
            sel.appendChild(o);
          });
          sel.value = l.cls;
          sel.onchange = function () { CH.levels[i].cls = sel.value; recompute(); draw(); };
          const num = document.createElement('input');
          num.type = 'number'; num.min = 1; num.max = 20; num.value = l.n;
          num.style.cssText = 'width:70px;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:5px 8px;text-align:right';
          num.oninput = function () { CH.levels[i].n = Number(num.value) || 0; recompute(); };
          const x = el('button', 'btn sm', '×');
          x.onclick = function () { CH.levels.splice(i, 1); recompute(); draw(); };
          row.appendChild(sel); row.appendChild(num); row.appendChild(x);
          listHost.appendChild(row);
        });
        if (!CH.levels.length) listHost.appendChild(el('div', 'emptystate', 'No class levels yet.'));
      }
      draw();

      const add = el('button', 'btn', '+ Add a class');
      add.onclick = function () { CH.levels.push({ cls: 'Fighter', n: 1 }); recompute(); draw(); };
      body.appendChild(add);

      body.appendChild(el('hr', 'hr'));
      const hpHead = el('div', 'row');
      hpHead.appendChild(el('strong', '', 'Hit points per level'));
      body.appendChild(hpHead);
      const hpNote = el('p', 'tiny',
        'Level 1 takes the full hit die. Leave a level blank to use the Pathfinder average '
        + '(half the die, rounded up), or type the die you actually rolled.');
      body.appendChild(hpNote);

      const hpHost = el('div', 'row');
      E.levelSequence(CH).forEach(function (cls, i) {
        const c = D.CLASS_BY_NAME[cls];
        const f = el('div', 'field');
        f.style.maxWidth = '86px';
        f.appendChild(el('label', '', (i + 1) + '. ' + cls.slice(0, 4) + ' d' + (c ? c.hd : 8)));
        const inp = document.createElement('input');
        inp.type = 'number';
        if (i === 0 && CH.hp.maxFirst) { inp.value = c ? c.hd : 8; inp.disabled = true; inp.title = 'Max at 1st level'; }
        else { inp.value = CH.hp.rolls[i] === undefined ? '' : CH.hp.rolls[i]; }
        inp.oninput = function () { CH.hp.rolls[i] = inp.value === '' ? undefined : Number(inp.value); recompute(); };
        f.appendChild(inp);
        hpHost.appendChild(f);
      });
      body.appendChild(hpHost);

      const favRow = el('div', 'row');
      favRow.style.marginTop = '10px';
      const fh = el('div', 'field'); fh.style.maxWidth = '150px';
      fh.appendChild(el('label', '', 'Favored class HP'));
      const fhi = document.createElement('input'); fhi.type = 'number'; fhi.value = CH.hp.favoredHp || 0;
      fhi.oninput = function () { CH.hp.favoredHp = Number(fhi.value) || 0; recompute(); };
      fh.appendChild(fhi); favRow.appendChild(fh);
      const fs = el('div', 'field'); fs.style.maxWidth = '170px';
      fs.appendChild(el('label', '', 'Favored class skill ranks'));
      const fsi = document.createElement('input'); fsi.type = 'number'; fsi.value = CH.favoredSkillRanks || 0;
      fsi.oninput = function () { CH.favoredSkillRanks = Number(fsi.value) || 0; recompute(); };
      fs.appendChild(fsi); favRow.appendChild(fs);
      body.appendChild(favRow);
      body.appendChild(el('p', 'tiny',
        'Each level in your favored class grants either +1 hp or +1 skill rank. Split them here.'));
    }, [{ label: 'Done', primary: true, fn: function (close) { close(); } }]);
  }

  function openWeaponConfig(i) {
    const w = CH.weapons[i];
    modal('Configure ' + w.name, function (body) {
      const g = el('div', 'identity-grid');

      const enhF = el('div', 'field');
      enhF.appendChild(el('label', '', 'Enhancement'));
      const enh = document.createElement('select');
      for (let n = 0; n <= 5; n++) enh.appendChild(new Option(n ? '+' + n : '—', n));
      enh.value = w.enh || 0;
      enh.onchange = function () { CH.weapons[i].enh = Number(enh.value); recompute(); };
      enhF.appendChild(enh); g.appendChild(enhF);

      const handF = el('div', 'field');
      handF.appendChild(el('label', '', 'Held in'));
      const hand = document.createElement('select');
      hand.appendChild(new Option('One hand', 'one'));
      hand.appendChild(new Option('Two hands (×1.5 STR)', 'two'));
      hand.appendChild(new Option('Off hand (×0.5 STR)', 'off'));
      hand.value = w.offHand ? 'off' : (w.hands === 'two' ? 'two' : 'one');
      hand.onchange = function () {
        CH.weapons[i].hands = hand.value === 'two' ? 'two' : 'one';
        CH.weapons[i].offHand = hand.value === 'off';
        recompute();
      };
      handF.appendChild(hand); g.appendChild(handF);

      const mwF = el('div', 'field');
      mwF.appendChild(el('label', '', 'Masterwork'));
      const mw = document.createElement('input'); mw.type = 'checkbox'; mw.checked = !!w.mw;
      mw.onchange = function () { CH.weapons[i].mw = mw.checked; recompute(); };
      mwF.appendChild(mw); g.appendChild(mwF);

      const keenF = el('div', 'field');
      keenF.appendChild(el('label', '', 'Keen'));
      const keen = document.createElement('input'); keen.type = 'checkbox'; keen.checked = !!w.keen;
      keen.onchange = function () { CH.weapons[i].keen = keen.checked; recompute(); };
      keenF.appendChild(keen); g.appendChild(keenF);

      body.appendChild(g);

      const noteF = el('div', 'field'); noteF.style.marginTop = '10px';
      noteF.appendChild(el('label', '', 'Note'));
      const note = document.createElement('input'); note.value = w.note || '';
      note.oninput = function () { CH.weapons[i].note = note.value; persist(); };
      noteF.appendChild(note); body.appendChild(noteF);

      body.appendChild(el('p', 'tiny',
        'Masterwork gives +1 on attack rolls and does not stack with an enhancement bonus. '
        + 'Keen and Improved Critical both double the threat range and do not stack with each other.'));
    }, [{ label: 'Done', primary: true, fn: function (close) { close(); recompute(); } }]);
  }

  function openArduin() {
    modal('Arduin Special Ability', function (body) {
      body.appendChild(el('p', 'tiny',
        'Two Snakes rolled these from four d100 charts at character creation. If you imported a '
        + 'captured character the roll came across with it. Otherwise, paste or type the entry '
        + 'your DM gives you.'));
      const a = CH.arduin || { title: '', text: '', roll: '', chartKey: '', mods: {} };

      const g = el('div', 'identity-grid');
      const tF = el('div', 'field wide');
      tF.appendChild(el('label', '', 'Title'));
      const t = document.createElement('input'); t.value = a.title;
      tF.appendChild(t); g.appendChild(tF);

      const cF = el('div', 'field');
      cF.appendChild(el('label', '', 'Chart'));
      const c = document.createElement('select');
      ['', 'Warrior', 'Mage', 'HolyMan', 'SneakyType'].forEach(function (k) {
        c.appendChild(new Option(k || '—', k));
      });
      c.value = a.chartKey || '';
      cF.appendChild(c); g.appendChild(cF);

      const rF = el('div', 'field');
      rF.appendChild(el('label', '', 'Roll (d100)'));
      const r = document.createElement('input'); r.type = 'number'; r.value = a.roll || '';
      rF.appendChild(r); g.appendChild(rF);
      body.appendChild(g);

      const xF = el('div', 'field'); xF.style.marginTop = '10px';
      xF.appendChild(el('label', '', 'Text'));
      const x = document.createElement('textarea'); x.rows = 5; x.value = a.text;
      x.style.cssText = 'width:100%;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:7px 9px';
      xF.appendChild(x); body.appendChild(xF);

      const mF = el('div', 'field'); mF.style.marginTop = '10px';
      mF.appendChild(el('label', '', 'Numeric modifiers applied to the sheet'));
      const m = document.createElement('input');
      m.placeholder = 'e.g.  str +2, con -1';
      m.value = Object.keys(a.mods || {}).map(function (k) { return k + ' ' + sign(a.mods[k]); }).join(', ');
      mF.appendChild(m); body.appendChild(mF);
      body.appendChild(el('p', 'tiny',
        'Only clean flat numbers go here (str, dex, con, int, wis, cha). Anything conditional '
        + 'stays in the text for the DM to adjudicate.'));

      body._collect = function () {
        const mods = {};
        m.value.split(',').forEach(function (part) {
          const mm = /^\s*(str|dex|con|int|wis|cha)\s*([+-]?\d+)\s*$/i.exec(part);
          if (mm) mods[mm[1].toLowerCase()] = Number(mm[2]);
        });
        return {
          title: t.value.trim(), text: x.value.trim(),
          roll: r.value ? Number(r.value) : null, chartKey: c.value, mods: mods
        };
      };
      body._clear = function () { CH.arduin = null; };
    }, [
      { label: 'Clear', fn: function (close) { CH.arduin = null; close(); recompute(); } },
      {
        label: 'Save', primary: true, fn: function (close) {
          const body = document.querySelector('.modal-body');
          const v = body._collect();
          CH.arduin = v.title ? v : null;
          close(); recompute();
        }
      }
    ]);
  }

  /* Import is Two Snakes characters ONLY. There is no paste box: the list is fetched live
     from the game with the player's own session, so the game's canRead() decides what may be
     seen — your own current and archived characters, or everyone's if you are the DM. Building
     from scratch stays available through New. */
  function openImport() {
    /* An import from a stale tab is what produced three wrong Rangos on 2026-09-09: it looks
       like it worked and silently writes a character with no ability scores and no spells.
       This is the one place worth refusing rather than warning. */
    if (PF.STALE && PF.STALE.isStale()) return refuseStale('import');
    if (PF.STALE) {
      PF.STALE.check().then(function (isStale) {
        if (isStale) refuseStale('import'); else reallyOpenImport();
      });
      return;
    }
    reallyOpenImport();
  }

  function refuseStale(what) {
    modal('Reload before you ' + what, function (body) {
      body.appendChild(el('p', '',
        'This tab loaded an older version of the builder, and a stale tab ' + what + 's '
        + 'characters wrongly — it looks like it worked and quietly leaves out ability scores '
        + 'and spells.'));
      body.appendChild(el('p', 'tiny',
        'Nothing you have on screen is lost by reloading: the draft is kept in this browser.'));
      const b = el('button', 'btn primary', 'Reload now');
      b.onclick = function () { window.location.reload(true); };
      body.appendChild(b);
    }, [{ label: 'Not now', fn: function (close) { close(); } }]);
  }

  function reallyOpenImport() {
    modal('Import a Two Snakes character', function (body) {
      const status = el('div', 'tiny', 'Reading your Two Snakes characters…');
      body.appendChild(status);
      const results = el('div');
      results.style.marginTop = '10px';
      body.appendChild(results);

      IMP.fetchLive().then(function (roster) {
        status.remove();
        if (!roster.length) {
          results.appendChild(el('div', 'wmsg info',
            'Two Snakes has no characters recorded for you yet. Play a run first, or press '
            + 'New to build a character from scratch.'));
          return;
        }
        const mine = S.remote.role === 'dm';
        results.appendChild(el('div', 'tiny',
          roster.length + ' character' + (roster.length === 1 ? '' : 's') + ' available'
          + (mine ? ' (you are the DM, so this is the whole table)' : '')
          + '. §2 has you pick one of your captured characters.'));

        const capturable = roster.filter(function (r) { return r.status === 'captured'; }).length;
        if (!capturable) {
          results.appendChild(el('div', 'wmsg info',
            'None of these ended in capture. \u00a79 covers that case with a Tier-4 grant — '
            + 'import one anyway and talk to the DM, or press New to build from scratch.'));
        }

        roster.forEach(function (rec) {
          const row = el('div', 'picker-item');
          const nm = el('div', 'pi-name', rec.name + ' ');
          if (rec.status === 'captured') nm.appendChild(el('span', 'badge ok', 'captured'));
          else if (rec.status === 'dead') nm.appendChild(el('span', 'badge bad', 'died — needs the DM'));
          else if (rec.status) nm.appendChild(el('span', 'badge', rec.status));
          if (rec.archived) nm.appendChild(el('span', 'badge', ' archived'));
          row.appendChild(nm);
          row.appendChild(el('div', 'pi-meta',
            [rec.cls, rec.land, mine && rec.player ? 'player: ' + rec.player : '',
             rec.encounterCount ? rec.encounterCount + ' encounters' : ''].filter(Boolean).join(' · ')));
          row.onclick = function () {
            /* One Two Snakes character should not become a pile of near-identical files.
               If a build from this exact record already exists, say so and let the player
               choose — opening it is almost always what they meant. A second build is still
               allowed, because the same character at two different levels is legitimate. */
            /* A re-import REPLACES the build already on file for this character rather than
               adding another near-identical one (owner) — UNLESS the build on file is a
               HIGHER LEVEL than the import would produce, in which case replacing it would
               throw away levelling that the pregame record cannot give back, so it has to be
               a confirmed choice (owner). An import always arrives at level 1. */
            const existing = S.findByTwoSnakesKey(rec.key);
            const incomingLevel = E.totalLevel(IMP.toCharacter(rec));
            const higher = existing.filter(function (c) { return E.totalLevel(c) > incomingLevel; })
              .sort(function (a, b) { return E.totalLevel(b) - E.totalLevel(a); });
            document.querySelectorAll('.modal-back').forEach(function (n) { n.remove(); });
            if (higher.length) return confirmReimport(rec, existing, higher[0], incomingLevel);
            adoptImport(rec, existing);
          };
          results.appendChild(row);
        });
      }).catch(function (e) {
        status.remove();
        if (e && e.code === 'AUTH') {
          const w = el('div', 'wmsg warn');
          w.appendChild(el('span', 'wtag', 'Sign in'));
          w.appendChild(el('span', '',
            'You are not signed in to Two Snakes, so there is nothing to import from. '
            + 'Sign in to the game and come back — or press New to build from scratch.'));
          results.appendChild(w);
          const a = document.createElement('a');
          a.href = S.gameUrl(); a.className = 'btn primary';
          a.textContent = 'Go to Two Snakes →';
          a.style.cssText = 'display:inline-block;text-decoration:none;margin-top:10px';
          results.appendChild(a);
        } else {
          const w = el('div', 'wmsg warn');
          w.appendChild(el('span', 'wtag', 'Problem'));
          w.appendChild(el('span', '', 'Could not read your Two Snakes characters. '
            + (e && e.message ? e.message : '') + ' Your own work here is unaffected.'));
          results.appendChild(w);
        }
      });
    }, [{ label: 'Close', fn: function (close) { close(); } }]);
  }

  /* ================================================================ toast */
  function toast(msg, kind, ms) {
    const n = el('div', 'wmsg ' + (kind === 'warn' ? 'warn' : 'info'));
    n.appendChild(el('span', 'wtag', kind === 'warn' ? 'Note' : 'OK'));
    n.appendChild(el('span', '', msg));
    n.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:200;'
      + 'box-shadow:var(--shadow);max-width:min(560px,92vw)';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, ms || 4200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
