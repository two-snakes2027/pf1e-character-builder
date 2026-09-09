/* Two Snakes -> PF1E import tests.
   Runs against the REAL two_snakes_data.json when it is present (it is gitignored and carries
   secrets, so nothing from it is ever printed here beyond character names and derived counts),
   and against a small built-in fixture otherwise, so the suite still runs anywhere.

   node import_tests.js
   node import_tests.js --mutate=<name>    to prove a check can fail */
const fs = require('fs'), path = require('path');
global.window = {};
['core', 'classes', 'equipment', 'feats', 'spells'].forEach(function (f) { require('./js/data/' + f + '.js'); });
require('./js/engine.js');
require('./js/import_twosnakes.js');
const PF = global.window.PF, E = PF.ENGINE, I = PF.IMPORT, D = PF.DATA;

const mutArg = process.argv.find(function (a) { return a.indexOf('--mutate=') === 0; });
const MUT = mutArg ? mutArg.split('=')[1] : null;
if (MUT === 'nostats') {   /* the old behaviour: leave every score at 10 */
  const o = I.toCharacter;
  I.toCharacter = function (rec) {
    const ch = o(rec);
    ch.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    return ch;
  };
}
if (MUT === 'nospells') {
  const o = I.toCharacter;
  I.toCharacter = function (rec) { const ch = o(rec); ch.spells.known = []; return ch; };
}
if (MUT === 'dropgear') {
  const o = I.toCharacter;
  I.toCharacter = function (rec) { const ch = o(rec); ch.items = []; ch.weapons = []; return ch; };
}
if (MUT === 'dropard') {
  const o = I.toCharacter;
  I.toCharacter = function (rec) { const ch = o(rec); ch.arduin = null; return ch; };
}
if (MUT === 'weaponmatch') { I.matchWeapon = function () { return null; }; }

let pass = 0, fail = 0; const failures = [];
function ok(label, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(label + (detail ? '\n     ' + detail : '')); }
}
function eq(label, a, b) { ok(label, JSON.stringify(a) === JSON.stringify(b), 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

/* ------------------------------------------------------------------ fixture */
const FIXTURE = {
  'ts_char:fixture': {
    status: 'captured', encounterCount: 12,
    charData: {
      name: 'Fixture Druid', cls: 'Druid', land: 'Hyrkania', landd: 'Grass and horses.',
      god: 'Erlik', godd: 'The bright one.', trade: 'Herdsman', alignment: 'True Neutral',
      gender: 'female', turnNo: 40, placesVisited: ['a', 'b'],
      stats: { str: 18, con: 14, dex: 12, int: 16, wis: 17, chr: 12, luck: 8 },
      sheet: {
        hp: 10, maxHp: 10, ac: 11, bab: 0, fort: 4, ref: 1, will: 5, init: 1,
        skills: ['Survival', 'Perception', 'Knowledge (Nature)', 'Heal', 'Track', 'Ride', 'Stealth'],
        spells: ['Entangle', 'Obscuring Mist'],
        /* Two Snakes writes its own flavour text for spells. It differs from the PF1E rules
           and must never reach the builder — names only, details from the rulebook data. */
        spellDescs: {
          'Entangle': 'TWOSNAKES FLAVOUR: the grass itself hates them, and closes like a fist.',
          'Obscuring Mist': 'TWOSNAKES FLAVOUR: a cold breath rolls off the river and blinds all.'
        },
        classFeature: 'Wild Empathy — can calm a beast others could not approach',
        wealth: { cp: 3, sp: 6, gp: 0, pp: 0 },
        arduin: {
          title: 'Mountain Man', chartKey: 'HolyMan', roll: 17,
          text: 'The mountains were always your home. +2 to Str, Toughness free, climb is a class skill.',
          mods: { str: 2 }
        }
      },
      inv: [
        { name: 'wooden-hafted sickle', desc: 'Curved iron blade on a carved oak handle.' },
        { name: 'belt knife', desc: 'Plain iron knife.' },
        { name: 'rough-spun green robes', desc: 'Wool dyed with weld and woad.' },
        { name: 'waterskin', desc: 'Cured hide flask.' }
      ]
    }
  }
};

/* ------------------------------------------------------------------ fixture checks */
(function () {
  const roster = I.extractRoster(FIXTURE);
  eq('fixture roster length', roster.length, 1);
  eq('fixture roster key is the full data key', roster[0].key, 'ts_char:fixture');
  eq('fixture player parsed from the key', roster[0].player, 'fixture');
  eq('a ts_char record is the current slot', roster[0].slot, 'current');
  eq('a ts_char record is not archived', roster[0].archived, false);
  eq('fixture roster name', roster[0].name, 'Fixture Druid');

  const ch = I.toCharacter(roster[0]);

  /* identity carried */
  eq('name carried', ch.name, 'Fixture Druid');
  eq('gender carried', ch.gender, 'female');
  eq('homeland carried', ch.homeland, 'Hyrkania');
  eq('deity carried', ch.deity, 'Erlik');
  eq('alignment carried', ch.alignment, 'True Neutral');
  eq('race is forced to Human', ch.race, 'Human');
  eq('class seeded at 1 level', ch.levels, [{ cls: 'Druid', n: 1 }]);

  /* Ability scores ARE imported (owner, 2026-09-09). chr -> cha; luck has no PF1E home. */
  eq('pregame ability scores become the base scores', ch.abilities.base,
    { str: 18, dex: 12, con: 14, int: 16, wis: 17, cha: 12 });
  ok('pregame stats also kept as reference', ch.twoSnakes.pregameStats.str === 18
    && ch.twoSnakes.pregameStats.cha === 12, 'chr should map to cha');
  eq('luck has no PF1E home but is retained for reference', ch.twoSnakes.pregameStats.luck, 8);
  ok('luck never leaks into an ability score',
    Object.keys(ch.abilities.base).indexOf('luck') < 0
    && Object.values(ch.abilities.base).indexOf(8) < 0);

  /* The point buy is now visibly over budget, and the rules check must SAY so rather than
     quietly accept it — that message is what tells the player what to trim. */
  const dImp = E.derive(ch);
  ok('an imported sheet is reported as over the point-buy budget',
    dImp.warnings.some(function (w) { return /over budget/.test(w.msg); }),
    JSON.stringify(dImp.warnings.map(function (w) { return w.msg; })));
  /* 18 imported + 2 wheel + 2 from this fixture's Arduin = 22; CON 14 + 2 wheel = 16. */
  ok('the house +2/+2 and the Arduin both stack on top of the imported scores',
    dImp.abilities.str === 22 && dImp.abilities.con === 16,
    'str ' + dImp.abilities.str + ' con ' + dImp.abilities.con);

  /* Current HP carries; maximum stays derived. */
  eq('current hit points carry across', ch.hp.current, 10);
  (function () {
    /* A run that ended in death recorded 0 hp. The rebuilt character must not open dead. */
    const dead = JSON.parse(JSON.stringify(FIXTURE['ts_char:fixture']));
    dead.charData.sheet.hp = 0; dead.status = 'dead';
    const dch = I.toCharacter(I.extractRoster({ 'ts_char:d': dead })[0]);
    eq('a dead run does not import 0 current hp', dch.hp.current, null);
    ok('and the derived sheet gives it full hit points', E.derive(dch).hp.current > 0);
    const neg = JSON.parse(JSON.stringify(FIXTURE['ts_char:fixture']));
    neg.charData.sheet.hp = -4;
    eq('negative hp is ignored too', I.toCharacter(I.extractRoster({ 'ts_char:n': neg })[0]).hp.current, null);
  })();

  /* Known spells become real entries so each can show its own summary. */
  ok('known spells are imported as entries', ch.spells.known.length === 2,
    JSON.stringify(ch.spells.known));
  ok('Entangle matched the Core data', ch.spells.known.indexOf('Entangle') >= 0);
  ok('Obscuring Mist matched the Core data', ch.spells.known.indexOf('Obscuring Mist') >= 0);
  /* NAMES ONLY. The pregame's own spell prose is different from the Pathfinder rules, so
     nothing from spellDescs may survive the import — the summary must come from D.SPELLS. */
  ok('no Two Snakes spell flavour text rides along with the import',
    !/TWOSNAKES FLAVOUR/.test(JSON.stringify(ch)),
    'pregame spell prose leaked into the imported character');
  ok('imported spells are plain names, not objects',
    ch.spells.known.every(function (x) { return typeof x === 'string'; }),
    JSON.stringify(ch.spells.known));
  (function () {
    const ent = D.SPELL_BY_NAME['Entangle'];
    ok('the displayed detail comes from the Pathfinder data', !!ent && ent.save === 'Reflex partial'
      && ent.rng === 'Long' && ent.dur === '1 min./lvl (D)',
      ent ? [ent.save, ent.rng, ent.dur].join(' | ') : 'Entangle missing from the spell data');
  })();
  ok('every imported spell that matched has a summary to show',
    ch.spells.known.every(function (n) {
      const def = D.SPELL_BY_NAME[n];
      return !def || (def.save && def.rng && def.dur && def.ct && def.comp);
    }));
  eq('house +2/+2 bump is present', { str: ch.abilities.house.str, con: ch.abilities.house.con }, { str: 2, con: 2 });

  /* named gear kept, weapons recognised */
  const weaponNames = ch.weapons.map(function (w) { return w.name; });
  ok('sickle recognised as a weapon', weaponNames.indexOf('Sickle') >= 0, 'got ' + JSON.stringify(weaponNames));
  const itemNames = ch.items.map(function (i) { return i.name; });
  ok('robes kept as an item', itemNames.indexOf('rough-spun green robes') >= 0, JSON.stringify(itemNames));
  ok('waterskin kept as an item', itemNames.indexOf('waterskin') >= 0, JSON.stringify(itemNames));
  ok('gear descriptions survive as notes',
    ch.items.some(function (i) { return /Wool dyed/.test(i.note); }));
  eq('nothing from the pregame inventory is lost',
    ch.weapons.length + ch.items.length, 4);

  /* arduin */
  ok('arduin carried', !!ch.arduin && ch.arduin.title === 'Mountain Man');
  eq('arduin roll carried', ch.arduin ? ch.arduin.roll : null, 17);
  eq('arduin mods carried', ch.arduin ? ch.arduin.mods : null, { str: 2 });

  /* the arduin STR +2 must actually reach the derived sheet */
  const d = E.derive(ch);
  eq('arduin +2 STR reaches the sheet', d.abilities.str, 18 /* imported */ + 2 /* house */ + 2 /* arduin */);

  /* coin */
  eq('coin carried', ch.wealth, { pp: 0, gp: 0, sp: 6, cp: 3 });

  /* skills: mapped as hints, not as ranks */
  const spent = Object.keys(ch.skills).reduce(function (s, k) { return s + ch.skills[k].ranks; }, 0);
  eq('no skill ranks are auto-spent', spent, 0);
  ok('Knowledge (Nature) normalised to PF1E casing',
    ch.twoSnakes.skillHints.indexOf('Knowledge (nature)') >= 0, JSON.stringify(ch.twoSnakes.skillHints));
  ok('Track maps onto Survival', ch.twoSnakes.skillHints.indexOf('Survival') >= 0);
  ok('skill hints are deduplicated',
    ch.twoSnakes.skillHints.length === new Set(ch.twoSnakes.skillHints).size);

  /* pregame prose lands somewhere a player will read it */
  ok('background mentions the homeland', /Hyrkania/.test(ch.notes.background));
  ok('background mentions the trade', /Herdsman/.test(ch.notes.background));
  ok('background carries the three years', /THE THREE YEARS/.test(ch.notes.background));
  ok('class feature preserved as a special',
    ch.specials.some(function (s) { return /Wild Empathy/.test(s.text); }));
  ok('an unmatched spell name is still kept', I.matchSpell('Zzzz Not A Spell') === null);
  eq('a loosely written name still matches', I.matchSpell('cure light wounds'), 'Cure Light Wounds');
  eq('punctuation and case are tolerated', I.matchSpell('Mage-Armor'), 'Mage Armor');

  /* the imported character must survive derivation with no crash and be a valid shape */
  ok('derives without throwing', !!d && typeof d.ac.total === 'number');
  ok('warnings are produced, not exceptions', Array.isArray(d.warnings));
})();

/* --------------------------------------------- archived characters (ts_hist) ------
   §2 has each player pick one of their CAPTURED characters. A captured run is normally
   already archived under ts_hist:<player>:<name>, so an import that read only ts_char:
   would hide most of what a player may actually choose from. */
(function () {
  const hist = JSON.parse(JSON.stringify(FIXTURE['ts_char:fixture']));
  hist.status = 'captured'; hist.encounterCount = 30;
  hist.charData.name = 'Archived Rogue'; hist.charData.cls = 'Rogue';
  const blob = {
    'ts_char:pat': FIXTURE['ts_char:fixture'],
    'ts_hist:pat:archived_rogue': hist,
    'ts_user:pat': { pin: 'should never appear' },
    'ts_world_lore': { entries: [] }
  };
  const roster = I.extractRoster(blob);
  eq('both key spaces are read', roster.length, 2);

  /* A captured character sits in ts_char AND ts_hist at the same time; it must be listed once. */
  const dupBlob = {
    'ts_char:pat': FIXTURE['ts_char:fixture'],
    'ts_hist:pat:fixture_druid': FIXTURE['ts_char:fixture']
  };
  const deduped = I.extractRoster(dupBlob);
  eq('a character in both key spaces is listed once', deduped.length, 1);
  eq('and it is the live slot that survives', deduped[0].slot, 'current');
  /* the same name under a DIFFERENT player is a different character */
  const twoPlayers = {
    'ts_char:pat': FIXTURE['ts_char:fixture'],
    'ts_char:sam': FIXTURE['ts_char:fixture']
  };
  eq('same name, different players, both kept', I.extractRoster(twoPlayers).length, 2);
  ok('the archived character is present',
    roster.some(function (r) { return r.name === 'Archived Rogue'; }),
    JSON.stringify(roster.map(function (r) { return r.name; })));
  const arch = roster.find(function (r) { return r.name === 'Archived Rogue'; });
  eq('archived flag set', arch.archived, true);
  eq('archived slot label', arch.slot, 'archived');
  eq('archived player parsed', arch.player, 'pat');
  eq('archived status carried', arch.status, 'captured');
  eq('the current slot sorts first', roster[0].slot, 'current');
  ok('non-character keys are ignored',
    !roster.some(function (r) { return /never appear/.test(JSON.stringify(r)); }));
  /* an archived record must build a character just like a current one */
  const ch = I.toCharacter(arch);
  eq('archived record still maps its class', ch.levels, [{ cls: 'Rogue', n: 1 }]);
  eq('archived record imports its scores too', ch.abilities.base.str, 18);
})();

/* --------------------------------------------- the live feed ---------------------
   fetchLive must go to the game's own /data/get with the session cookie and must not
   accept a payload from anywhere else. */
(function () {
  const calls = [];
  global.fetch = function (url, opts) {
    calls.push({ url: url, credentials: opts && opts.credentials });
    return Promise.resolve({
      ok: true, status: 200,
      json: function () { return Promise.resolve({ 'ts_char:pat': FIXTURE['ts_char:fixture'] }); }
    });
  };
  let result = null;
  I.fetchLive().then(function (r) { result = r; });
  /* resolve the microtask queue */
  return Promise.resolve().then(function () {}).then(function () {
    eq('fetchLive calls the game data endpoint', calls[0] && calls[0].url, '/data/get');
    eq('fetchLive sends the session cookie', calls[0] && calls[0].credentials, 'same-origin');
  });
})();

(function () {
  /* a 401 from the game is reported as an auth problem, not a generic failure */
  global.fetch = function () { return Promise.resolve({ ok: false, status: 401 }); };
  return I.fetchLive().then(function () {
    ok('401 should reject', false, 'it resolved instead');
  }, function (e) {
    eq('401 is surfaced as an auth error', e.code, 'AUTH');
  });
})();

/* ------------------------------------------------------------------ shape tolerance */
(function () {
  /* a bare charData */
  const bare = I.extractRoster(FIXTURE['ts_char:fixture'].charData);
  eq('accepts a bare charData', bare.length, 1);
  /* a single record */
  const one = I.extractRoster(FIXTURE['ts_char:fixture']);
  eq('accepts a single ts_char record', one.length, 1);
  /* string-encoded records, which is how the data file stores some of them */
  const strEncoded = { 'ts_char:x': JSON.stringify(FIXTURE['ts_char:fixture']) };
  eq('accepts string-encoded records', I.extractRoster(strEncoded).length, 1);
  /* junk */
  eq('junk yields nothing rather than throwing', I.extractRoster({ foo: 1 }).length, 0);
  eq('null yields nothing', I.extractRoster(null).length, 0);
})();

/* ------------------------------------------------------------------ weapon matcher */
(function () {
  eq('plain longsword', I.matchWeapon('a fine longsword'), 'Longsword');
  eq('inverted name form', I.matchWeapon('a short sword, notched'), 'Sword, short');
  eq('sickle', I.matchWeapon('wooden-hafted sickle'), 'Sickle');
  eq('dagger', I.matchWeapon('bone-handled dagger'), 'Dagger');
  eq('non-weapon returns null', I.matchWeapon('rough-spun green robes'), null);
  eq('waterskin is not a weapon', I.matchWeapon('waterskin'), null);
})();

/* ------------------------------------------------------------------ REAL production data */
(function () {
  const real = path.join(process.env.HOME, 'Documents', 'Two_Snakes', 'two_snakes_data.json');
  if (!fs.existsSync(real)) {
    console.log('  (real two_snakes_data.json not present — fixture-only run)');
    return;
  }
  let blob;
  try { blob = JSON.parse(fs.readFileSync(real, 'utf8')); }
  catch (e) { ok('real data parses', false, e.message); return; }

  const roster = I.extractRoster(blob);
  ok('real roster is non-empty', roster.length > 0, 'found ' + roster.length);
  console.log('  real roster: ' + roster.length + ' characters — '
    + roster.map(function (r) { return r.name; }).join(', '));

  let derived = 0;
  roster.forEach(function (rec) {
    const ch = I.toCharacter(rec);
    ok(rec.name + ': name carried', !!ch.name);
    ok(rec.name + ': race forced Human', ch.race === 'Human');
    const st = (rec.charData || {}).stats || {};
    if (st.str) {
      ok(rec.name + ': ability scores imported', ch.abilities.base.str === st.str,
        'base str ' + ch.abilities.base.str + ' vs pregame ' + st.str);
      ok(rec.name + ': chr mapped onto cha', ch.abilities.base.cha === (st.chr !== undefined ? st.chr : st.cha));
    }
    ok(rec.name + ': every score is a sane number',
      ['str','dex','con','int','wis','cha'].every(function (k) {
        const v = ch.abilities.base[k];
        return typeof v === 'number' && isFinite(v) && v > 0 && v < 40;
      }), JSON.stringify(ch.abilities.base));
    ok(rec.name + ': spells are entries, not prose',
      Array.isArray(ch.spells.known));
    ok(rec.name + ': spells are name-only strings',
      ch.spells.known.every(function (x) { return typeof x === 'string'; }));
    /* whatever prose the pregame stored for this character's spells must not have come along */
    const descs = ((rec.charData || {}).sheet || {}).spellDescs || {};
    const leaked = Object.keys(descs).filter(function (k) {
      const text = String(descs[k] || '').slice(0, 40);
      return text.length > 20 && JSON.stringify(ch).indexOf(text) >= 0;
    });
    ok(rec.name + ': no pregame spell prose carried over', leaked.length === 0, leaked.join(', '));
    ok(rec.name + ': provenance recorded', !!ch.twoSnakes && !!ch.twoSnakes.importedAt);
    ok(rec.name + ': class mapped to a real PF1E class',
      ch.levels.length === 0 || !!D.CLASS_BY_NAME[ch.levels[0].cls],
      'got ' + JSON.stringify(ch.levels));
    const invCount = ((rec.charData || {}).inv || []).length;
    ok(rec.name + ': every inventory line survives',
      ch.weapons.length + ch.items.length === invCount,
      invCount + ' in, ' + (ch.weapons.length + ch.items.length) + ' out');
    let d;
    try { d = E.derive(ch); derived++; }
    catch (e) { ok(rec.name + ': derives without throwing', false, e.message); return; }
    ok(rec.name + ': AC is a number', typeof d.ac.total === 'number' && !isNaN(d.ac.total));
    ok(rec.name + ': HP is a positive number', d.hp.max > 0, 'hp ' + d.hp.max);
    /* A substring search over prose is the wrong instrument here: "Set-worshipping" contains
       "pin". Inspect the KEYS the import produced, and look for token-shaped VALUES, instead
       of grepping the whole blob as text. */
    const badKeys = [];
    (function walk(o, trail) {
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        if (/^(pin|apikey|api_key|token|secret|password|auth)$/i.test(k)) badKeys.push(trail + k);
        walk(o[k], trail + k + '.');
      });
    })(ch, '');
    ok(rec.name + ': no credential-named field rode along', badKeys.length === 0, badKeys.join(', '));
    const tokenish = [];
    (function walk2(o) {
      if (typeof o === 'string') {
        if (/sk-ant-[A-Za-z0-9_-]{8,}/.test(o) || /^[A-Za-z0-9_-]{40,}$/.test(o)) tokenish.push('(value withheld)');
        return;
      }
      if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk2(o[k]); });
    })(ch);
    ok(rec.name + ': no token-shaped value rode along', tokenish.length === 0, tokenish.length + ' found');
  });
  ok('every real character derived', derived === roster.length, derived + ' of ' + roster.length);
})();

console.log('\nTwo Snakes import tests' + (MUT ? '  [MUTATION: ' + MUT + ']' : ''));
console.log('  pass ' + pass + '   fail ' + fail);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(function (f, i) { console.log('  ' + (i + 1) + '. ' + f); });
}
process.exit(fail ? 1 : 0);
