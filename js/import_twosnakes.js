/* Pathfinder 1E Character Builder — Two Snakes import.

   RIDDLE_OF_STEEL.md §2 (RESOLVED): each player takes ONE captured character out of the
   pregame and "rebuilds to PF1E-legal, keeping identity and named gear", then levels to 3rd
   and applies +2 STR / +2 CON.

   So this import deliberately does NOT copy the pregame ability scores into the build. Those
   sheets were characterization, never stat blocks — a typical one is 18/12/14/16/17/12, which
   no point buy can produce. They are carried into `twoSnakes.pregameStats` and shown as
   reference on the Notes tab, while the player does a real point buy alongside.

   What IS carried across: name, gender, alignment, homeland, deity, class as a starting
   suggestion, named gear, coin, the rolled Arduin, and the pregame's skills and spells as
   free-text hints. */
(function () {
  const PF = (window.PF = window.PF || {});
  const I = (PF.IMPORT = {});
  const D = PF.DATA;

  /* Two Snakes offers twelve paths; all twelve exist in this builder. */
  const CLASS_MAP = {
    Barbarian: 'Barbarian', Rogue: 'Rogue', Fighter: 'Fighter', Ranger: 'Ranger',
    Sorcerer: 'Sorcerer', Wizard: 'Wizard', Cleric: 'Cleric', Bard: 'Bard',
    Monk: 'Monk', Paladin: 'Paladin', Druid: 'Druid', Alchemist: 'Alchemist'
  };

  /* The pregame recorded skills as loose prose. Map what maps; carry the rest as a note. */
  const SKILL_ALIAS = {
    'knowledge (nature)': 'Knowledge (nature)', 'knowledge (religion)': 'Knowledge (religion)',
    'knowledge (arcana)': 'Knowledge (arcana)', 'knowledge (local)': 'Knowledge (local)',
    'knowledge (history)': 'Knowledge (history)', 'knowledge (geography)': 'Knowledge (geography)',
    'knowledge (dungeoneering)': 'Knowledge (dungeoneering)', 'knowledge (planes)': 'Knowledge (planes)',
    'knowledge (nobility)': 'Knowledge (nobility)', 'knowledge (engineering)': 'Knowledge (engineering)',
    perception: 'Perception', stealth: 'Stealth', survival: 'Survival', heal: 'Heal',
    intimidate: 'Intimidate', ride: 'Ride', climb: 'Climb', swim: 'Swim', bluff: 'Bluff',
    diplomacy: 'Diplomacy', acrobatics: 'Acrobatics', appraise: 'Appraise', disguise: 'Disguise',
    'escape artist': 'Escape Artist', fly: 'Fly', 'handle animal': 'Handle Animal',
    linguistics: 'Linguistics', perform: 'Perform', profession: 'Profession',
    'sense motive': 'Sense Motive', 'sleight of hand': 'Sleight of Hand', spellcraft: 'Spellcraft',
    'use magic device': 'Use Magic Device', 'disable device': 'Disable Device', craft: 'Craft',
    /* pregame vocabulary that is not a PF1E skill */
    track: 'Survival', tracking: 'Survival', lockpicking: 'Disable Device',
    'pick locks': 'Disable Device', sneak: 'Stealth', hide: 'Stealth', listen: 'Perception',
    spot: 'Perception', search: 'Perception', haggle: 'Appraise', barter: 'Appraise'
  };

  /* Accept: a /data/get payload, a whole two_snakes_data.json, a single ts_char record, or a
     bare charData.

     BOTH key spaces matter. `ts_char:<player>` is only the character a player currently has in
     their slot; every character they finished is archived under `ts_hist:<player>:<name>` with
     the same {charData, storyLog, status} shape. RIDDLE_OF_STEEL §2 has each player pick one of
     their CAPTURED characters, and a captured run is usually already in ts_hist — reading only
     ts_char would hide most of what a player is entitled to choose from. */
  I.extractRoster = function (blob) {
    const out = [];
    if (!blob || typeof blob !== 'object') return out;

    if (blob.charData) { out.push(normalizeRecord(blob)); return out; }
    if (blob.name && blob.stats) { out.push(normalizeRecord({ charData: blob })); return out; }

    Object.keys(blob).forEach(function (k) {
      const isChar = k.indexOf('ts_char:') === 0;
      const isHist = k.indexOf('ts_hist:') === 0;
      if (!isChar && !isHist) return;
      let v = blob[k];
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return; } }
      if (!v || !v.charData) return;
      const rec = normalizeRecord(v);
      const parts = k.split(':');
      rec.key = k;
      rec.player = parts[1] || '';
      rec.archived = isHist;
      rec.slot = isChar ? 'current' : 'archived';
      out.push(rec);
    });

    /* A player's current slot first, then archived, newest-looking first within each. */
    out.sort(function (a, b) {
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      return (b.encounterCount || 0) - (a.encounterCount || 0);
    });

    /* Deduplicate. A captured character sits in BOTH key spaces at once: it stays in the
       player's ts_char slot until they start a new one, and it is also archived to ts_hist.
       Listing it twice makes a player think there are two Miscys. The current slot is sorted
       first, so keeping the first occurrence per player+name keeps the live record and drops
       the archived copy of the same run. */
    const seen = {};
    return out.filter(function (r) {
      const key = (r.player || '') + '\u0000' + (r.name || '').toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  };

  /* Pull the signed-in player's own characters straight from the running game.

     This is what makes the import "Two Snakes characters only": there is no paste box any
     more, and the list is whatever /data/get returns for the caller's session. The game's
     own canRead() does the filtering — a player sees their own ts_char/ts_hist records, the
     DM sees everyone's, and it refuses ts_apikey and every ts_user: PIN record outright.
     Nothing here can widen that. */
  I.fetchLive = function () {
    return fetch('/data/get', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.status === 401) {
          const e = new Error('You are not signed in to Two Snakes.');
          e.code = 'AUTH'; throw e;
        }
        if (!res.ok) throw new Error('The game server answered ' + res.status + '.');
        return res.json();
      })
      .then(function (blob) { return I.extractRoster(blob); });
  };

  function normalizeRecord(rec) {
    const cd = rec.charData || {};
    return {
      key: '', name: cd.name || '(unnamed)', cls: cd.cls || '', land: cd.land || '',
      status: rec.status || '', encounterCount: rec.encounterCount || 0,
      charData: cd
    };
  }

  /* Build a fresh PF1E character from one pregame record. */
  I.toCharacter = function (rec) {
    const cd = rec.charData || rec;
    const ch = PF.ENGINE.blankCharacter();

    ch.name = cd.name || '';
    ch.gender = cd.gender || '';
    ch.homeland = cd.land || '';
    ch.deity = cd.god || '';
    ch.race = 'Human';

    if (cd.alignment && D.ALIGNMENTS.indexOf(cd.alignment) >= 0) ch.alignment = cd.alignment;

    /* Class is a suggestion, not a copy: §2 lets them multiclass freely. Seed 1 level so the
       sheet is not empty, and let the player rebuild from there. */
    const mapped = CLASS_MAP[cd.cls];
    if (mapped) ch.levels = [{ cls: mapped, n: 1 }];

    /* Arduin carries across whole, mods and all. */
    if (cd.sheet && cd.sheet.arduin && cd.sheet.arduin.title) {
      ch.arduin = {
        title: cd.sheet.arduin.title,
        text: cd.sheet.arduin.text || '',
        roll: cd.sheet.arduin.roll || null,
        chartKey: cd.sheet.arduin.chartKey || '',
        mods: cd.sheet.arduin.mods || {}
      };
    }

    /* Coin. */
    if (cd.sheet && cd.sheet.wealth) {
      const w = cd.sheet.wealth;
      ch.wealth = { pp: w.pp || 0, gp: w.gp || 0, sp: w.sp || 0, cp: w.cp || 0 };
    }

    /* Named gear — the part §2 explicitly says to keep. Weapons in the pregame inventory
       are matched against the weapon table where the name is recognisable; everything else
       becomes an item carrying its pregame description as a note. */
    (cd.inv || []).forEach(function (it) {
      const nm = (it.name || '').trim();
      if (!nm) return;
      const weapon = matchWeapon(nm);
      if (weapon) {
        ch.weapons.push({ name: weapon, enh: 0, mw: false, equipped: false, qty: 1, note: it.desc || nm });
      } else {
        ch.items.push({ name: nm, qty: 1, w: 0, c: 0, note: it.desc || '' });
      }
    });

    /* Pregame skills become suggestions: 0 ranks, but the name is preserved in the note so
       the player can see what the character was known for. */
    const skillHints = [], unmatched = [];
    (cd.sheet && cd.sheet.skills || []).forEach(function (s) {
      const key = String(s).toLowerCase().trim();
      const mapped2 = SKILL_ALIAS[key] || (D.SKILLS.some(function (x) { return x.name.toLowerCase() === key; })
        ? D.SKILLS.find(function (x) { return x.name.toLowerCase() === key; }).name : null);
      if (mapped2) { if (skillHints.indexOf(mapped2) < 0) skillHints.push(mapped2); }
      else unmatched.push(s);
    });

    /* Class feature and spells from the pregame become special-ability notes. */
    if (cd.sheet && cd.sheet.classFeature) {
      ch.specials.push({ name: 'Pregame class feature', text: cd.sheet.classFeature });
    }
    const pregameSpells = (cd.sheet && cd.sheet.spells) || [];
    if (pregameSpells.length) {
      ch.spells.notes = 'Knew in the pregame: ' + pregameSpells.join(', ') + '.';
    }

    /* Background seed. */
    const bits = [];
    if (cd.land) bits.push('Out of ' + cd.land + (cd.landd ? ' — ' + cd.landd : '') + '.');
    if (cd.trade) bits.push('Trade: ' + cd.trade + '.');
    if (cd.god) bits.push('Worships ' + cd.god + (cd.godd ? ' — ' + cd.godd : '') + '.');
    if (skillHints.length) bits.push('Known in the pregame for: ' + skillHints.join(', ') + '.');
    if (unmatched.length) bits.push('Pregame skills with no direct PF1E equivalent: ' + unmatched.join(', ') + '.');
    bits.push('');
    bits.push('THE THREE YEARS — mentored at the wheel. Whoever taught them is why they can '
      + 'do what they now do, and most of those people did not survive.');
    ch.notes.background = bits.join('\n');

    /* Provenance, including the pregame ability line kept purely for reference. */
    const st = cd.stats || {};
    ch.twoSnakes = {
      importedAt: new Date().toISOString(),
      key: rec.key || '',
      pregameClass: cd.cls || '',
      pregameStats: { str: st.str, dex: st.dex, con: st.con, int: st.int, wis: st.wis, cha: st.chr, luck: st.luck },
      pregameSheet: cd.sheet ? {
        hp: cd.sheet.maxHp, ac: cd.sheet.ac, bab: cd.sheet.bab,
        fort: cd.sheet.fort, ref: cd.sheet.ref, will: cd.sheet.will
      } : null,
      skillHints: skillHints,
      unmatchedSkills: unmatched,
      turnNo: cd.turnNo || 0,
      placesVisited: (cd.placesVisited || []).length
    };

    return ch;
  };

  function matchWeapon(name) {
    const n = name.toLowerCase();
    let best = null, bestLen = 0;
    D.WEAPONS.forEach(function (w) {
      /* compare against the bare noun: "Sword, short" -> "short sword" as well as "sword" */
      const parts = w.name.toLowerCase().split(',').map(function (p) { return p.trim(); });
      const forms = [w.name.toLowerCase()];
      if (parts.length === 2) forms.push(parts[1] + ' ' + parts[0]);
      forms.forEach(function (f) {
        if (f.length > 3 && n.indexOf(f) >= 0 && f.length > bestLen) { best = w.name; bestLen = f.length; }
      });
    });
    return best;
  }

  I.matchWeapon = matchWeapon;
})();
