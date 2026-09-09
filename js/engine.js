/* Pathfinder 1E Character Builder — derivation engine.
   Pure functions: given a character object, produce every derived number plus a list of
   rules warnings. Nothing here writes to the DOM and nothing here blocks: illegal states
   are reported as warnings, never prevented (owner decision: warn, never block). */
(function () {
  const PF = (window.PF = window.PF || {});
  const D = PF.DATA;
  const E = (PF.ENGINE = {});

  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  /* ------------------------------------------------------------------ basics */
  E.mod = function (score) { return Math.floor((score - 10) / 2); };
  E.sign = function (n) { return (n >= 0 ? '+' : '') + n; };

  E.blankCharacter = function () {
    return {
      v: 1, id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: '', player: '', race: 'Human', homeland: '', deity: '', gender: '',
      alignment: '', age: '', height: '', weight: '', eyes: '', hair: '',
      levels: [],                       /* [{cls:'Fighter', n:3}] in the order taken */
      abilities: {
        base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        racial: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        house:  { str: 2, dex: 0, con: 2, int: 0, wis: 0, cha: 0 },  /* RIDDLE OF STEEL §2 */
        levelUp: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        misc:   { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
      },
      pointBuyBudget: 20,
      hp: { rolls: [], maxFirst: true, favoredHp: 0, current: null, temp: 0, nonlethal: 0, misc: 0 },
      skills: {},                       /* {'Perception': {ranks:5, misc:0}} */
      favoredSkillRanks: 0,
      feats: [],                        /* [{name:'Power Attack', choice:''}] */
      specials: [],                     /* [{name, text}] free-form class/other abilities */
      arduin: null,                     /* {title, text, roll, chartKey, mods:{}} */
      traits: [],
      languages: ['Common'],
      armor: 'None', shield: 'None', armorEnh: 0, shieldEnh: 0,
      armorMw: false, shieldMw: false,
      weapons: [],                      /* [{name, enh, mw, equipped, hands, note}] */
      items: [],                        /* [{name, qty, w, c, note}] */
      magic: [],                        /* [{name, slot, note}] */
      spells: { known: [], prepared: {}, notes: '' },
      wealth: { pp: 0, gp: 0, sp: 0, cp: 0 },
      xp: 0,
      acMisc: { natural: 0, deflection: 0, dodge: 0, misc: 0 },
      saveMisc: { fort: 0, ref: 0, will: 0 },
      initMisc: 0, speedMisc: 0, babMisc: 0, cmbMisc: 0, cmdMisc: 0,
      notes: { background: '', appearance: '', personality: '', allies: '', goals: '', session: '' },
      twoSnakes: null                   /* provenance of an imported pregame character */
    };
  };

  /* A character nobody has touched yet. Used so a fresh device does not persist — or push
     to the server — an empty placeholder before the sync pull has had a chance to land. */
  E.isPristine = function (ch) {
    if (!ch) return true;
    if ((ch.name || '').trim()) return false;
    if ((ch.player || '').trim()) return false;
    if ((ch.levels || []).length) return false;
    if ((ch.feats || []).length || (ch.weapons || []).length) return false;
    if ((ch.items || []).length || (ch.magic || []).length || (ch.specials || []).length) return false;
    if (ch.arduin) return false;
    if (ch.twoSnakes) return false;
    if (ch.xp) return false;
    if (Object.keys(ch.skills || {}).some(function (k) { return (ch.skills[k].ranks || 0) > 0; })) return false;
    if (Object.keys(ch.notes || {}).some(function (k) { return (ch.notes[k] || '').trim(); })) return false;
    if (ch.armor !== 'None' || ch.shield !== 'None') return false;
    const w = ch.wealth || {};
    if (w.pp || w.gp || w.sp || w.cp) return false;
    const b = (ch.abilities || {}).base || {};
    if (['str', 'dex', 'con', 'int', 'wis', 'cha'].some(function (k) { return b[k] !== 10; })) return false;
    return true;
  };

  /* ------------------------------------------------------------------ levels */
  E.totalLevel = function (ch) {
    return (ch.levels || []).reduce(function (s, l) { return s + (l.n || 0); }, 0);
  };

  E.babFor = function (prog, n) {
    if (prog === 'full') return n;
    if (prog === 'threeq') return Math.floor(n * 3 / 4);
    return Math.floor(n / 2);
  };

  E.saveFor = function (quality, n) {
    return quality === 'good' ? 2 + Math.floor(n / 2) : Math.floor(n / 3);
  };

  /* Full attack routine from a total BAB: +6/+1 etc. */
  E.attackSequence = function (bab) {
    if (bab < 1) return [0];
    const out = [];
    for (let b = bab; b > 0; b -= 5) out.push(b);
    return out;
  };

  /* ------------------------------------------------------------------ abilities */
  E.abilityScores = function (ch) {
    const a = ch.abilities, out = {};
    const itemBonus = E.magicAbilityBonuses(ch);
    ABIL.forEach(function (k) {
      out[k] = (a.base[k] || 0) + (a.racial[k] || 0) + (a.house[k] || 0) +
               (a.levelUp[k] || 0) + (a.misc[k] || 0) + (itemBonus[k] || 0) +
               (ch.arduin && ch.arduin.mods && ch.arduin.mods[k] ? ch.arduin.mods[k] : 0);
    });
    return out;
  };

  E.abilityMods = function (ch) {
    const s = E.abilityScores(ch), m = {};
    ABIL.forEach(function (k) { m[k] = E.mod(s[k]); });
    return m;
  };

  /* Enhancement bonuses from worn magic items — highest per ability, they do not stack. */
  E.magicAbilityBonuses = function (ch) {
    const best = {};
    (ch.magic || []).forEach(function (mi) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === mi.name; });
      if (!def || !def.eff) return;
      ABIL.forEach(function (k) {
        if (def.eff[k]) best[k] = Math.max(best[k] || 0, def.eff[k]);
      });
    });
    return best;
  };

  E.pointBuySpent = function (ch) {
    return ABIL.reduce(function (sum, k) {
      const v = ch.abilities.base[k];
      const cost = D.POINT_BUY_COST[v];
      return sum + (cost === undefined ? 0 : cost);
    }, 0);
  };

  /* Number of +1 ability increases earned: one at every 4th character level. */
  E.abilityIncreasesEarned = function (ch) { return Math.floor(E.totalLevel(ch) / 4); };
  E.abilityIncreasesSpent = function (ch) {
    return ABIL.reduce(function (s, k) { return s + (ch.abilities.levelUp[k] || 0); }, 0);
  };

  /* ------------------------------------------------------------------ defence / offence */
  E.armorDef = function (ch) { return D.ARMOR.find(function (a) { return a.name === ch.armor; }) || D.ARMOR[0]; };
  E.shieldDef = function (ch) { return D.SHIELDS.find(function (s) { return s.name === ch.shield; }) || D.SHIELDS[0]; };

  E.magicEffectTotal = function (ch, key) {
    let best = 0;
    (ch.magic || []).forEach(function (mi) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === mi.name; });
      if (def && def.eff && def.eff[key]) best = Math.max(best, def.eff[key]);
    });
    return best;
  };

  E.derive = function (ch) {
    const d = {};
    const mods = E.abilityMods(ch);
    const scores = E.abilityScores(ch);
    const lvl = E.totalLevel(ch);
    const armor = E.armorDef(ch), shield = E.shieldDef(ch);
    d.abilities = scores; d.mods = mods; d.level = lvl;

    /* --- BAB and saves, summed per class --- */
    let bab = 0, fort = 0, ref = 0, will = 0;
    (ch.levels || []).forEach(function (entry) {
      const c = D.CLASS_BY_NAME[entry.cls];
      if (!c) return;
      bab += E.babFor(c.bab, entry.n);
      fort += E.saveFor(c.saves.fort, entry.n);
      ref  += E.saveFor(c.saves.ref, entry.n);
      will += E.saveFor(c.saves.will, entry.n);
    });
    d.babBase = bab + (ch.babMisc || 0);

    const featSave = { fort: 0, ref: 0, will: 0 };
    (ch.feats || []).forEach(function (f) {
      const def = D.FEAT_BY_NAME[f.name];
      if (def && def.eff) {
        if (def.eff.fort) featSave.fort += def.eff.fort;
        if (def.eff.ref) featSave.ref += def.eff.ref;
        if (def.eff.will) featSave.will += def.eff.will;
      }
    });
    const cloak = E.magicEffectTotal(ch, 'saveAll');
    d.saves = {
      fort: { base: fort, ability: mods.con, feat: featSave.fort, item: cloak, misc: ch.saveMisc.fort || 0 },
      ref:  { base: ref,  ability: mods.dex, feat: featSave.ref,  item: cloak, misc: ch.saveMisc.ref || 0 },
      will: { base: will, ability: mods.wis, feat: featSave.will, item: cloak, misc: ch.saveMisc.will || 0 }
    };
    ['fort', 'ref', 'will'].forEach(function (k) {
      const s = d.saves[k];
      s.total = s.base + s.ability + s.feat + s.item + s.misc;
    });

    /* --- encumbrance --- */
    const carryLight = D.CARRY_LIGHT[Math.min(30, Math.max(1, scores.str))] || 0;
    const load = E.totalWeight(ch);
    d.carry = { light: carryLight, medium: carryLight * 2, heavy: carryLight * 3, current: load };
    d.loadLevel = load <= carryLight ? 'light' : (load <= carryLight * 2 ? 'medium' : 'heavy');
    const loadEff = D.LOAD_EFFECTS[d.loadLevel];

    /* --- AC --- */
    const armorMaxDex = armor.mx === null ? 99 : armor.mx;
    const shieldMaxDex = shield.mx === null ? 99 : shield.mx;
    const loadMaxDex = loadEff.maxDex === null ? 99 : loadEff.maxDex;
    const maxDex = Math.min(armorMaxDex, shieldMaxDex, loadMaxDex);
    const dexToAc = Math.min(mods.dex, maxDex);

    const bracers = E.magicEffectTotal(ch, 'armorBonus');
    const armorBonus = Math.max(armor.ac + (ch.armorEnh || 0), bracers);
    const shieldBonus = shield.ac + (ch.shieldEnh || 0);
    const natural = (ch.acMisc.natural || 0) + E.magicEffectTotal(ch, 'natural');
    const deflect = (ch.acMisc.deflection || 0) + E.magicEffectTotal(ch, 'deflect');
    let dodge = ch.acMisc.dodge || 0;
    (ch.feats || []).forEach(function (f) {
      const def = D.FEAT_BY_NAME[f.name];
      if (def && def.eff && def.eff.ac) dodge += def.eff.ac;
    });
    /* Monk AC bonus (WIS + level scaling) applies only when unarmored and unencumbered. */
    let monkAc = 0;
    const monkLv = E.classLevel(ch, 'Monk');
    if (monkLv && ch.armor === 'None' && ch.shield === 'None' && d.loadLevel === 'light') {
      monkAc = Math.max(0, mods.wis) + (monkLv >= 4 ? Math.floor(monkLv / 4) : 0);
    }
    d.ac = {
      base: 10, armor: armorBonus, shield: shieldBonus, dex: dexToAc, size: 0,
      natural: natural, deflection: deflect, dodge: dodge, monk: monkAc,
      misc: ch.acMisc.misc || 0, maxDex: maxDex === 99 ? null : maxDex
    };
    d.ac.total = 10 + armorBonus + shieldBonus + dexToAc + natural + deflect + dodge + monkAc + (ch.acMisc.misc || 0);
    d.ac.touch = 10 + dexToAc + deflect + dodge + monkAc + (ch.acMisc.misc || 0);
    d.ac.flatFooted = 10 + armorBonus + shieldBonus + natural + deflect + (ch.acMisc.misc || 0);

    /* --- armor check penalty & arcane spell failure --- */
    /* Armor and shield check penalties stack with each other. Encumbrance does NOT stack
       with armor — you apply whichever is worse (CRB p.171). */
    let acp = (armor.acp || 0) + (shield.acp || 0);
    if (ch.armorMw) acp = Math.min(0, acp + 1);
    if (ch.shieldMw) acp = Math.min(0, acp + 1);
    acp = Math.min(acp, loadEff.acp);
    /* Fighter armor training reduces ACP. */
    const fighterLv = E.classLevel(ch, 'Fighter');
    if (fighterLv >= 3) acp = Math.min(0, acp + Math.floor((fighterLv - 3) / 4 + 1));
    d.acp = Math.min(0, acp);
    d.asf = (armor.asf || 0) + (shield.asf || 0);

    /* --- initiative --- */
    let init = mods.dex + (ch.initMisc || 0);
    (ch.feats || []).forEach(function (f) {
      const def = D.FEAT_BY_NAME[f.name];
      if (def && def.eff && def.eff.init) init += def.eff.init;
    });
    if (E.classLevel(ch, 'Inquisitor') >= 2) init += mods.wis;   /* Cunning Initiative */
    d.init = init;

    /* --- speed --- */
    let speed = 30;
    if (armor.type === 'medium' || armor.type === 'heavy') speed = 20;
    if (d.loadLevel !== 'light') speed = Math.min(speed, 20);
    const barbLv = E.classLevel(ch, 'Barbarian');
    if (barbLv >= 1 && armor.type !== 'heavy' && d.loadLevel !== 'heavy') speed += 10;
    if (monkLv >= 3 && ch.armor === 'None' && d.loadLevel === 'light') {
      speed += monkLv >= 6 ? 20 : 10;
    }
    (ch.feats || []).forEach(function (f) {
      const def = D.FEAT_BY_NAME[f.name];
      if (def && def.eff && def.eff.speed) speed += def.eff.speed;
    });
    speed += E.magicEffectTotal(ch, 'speed') + (ch.speedMisc || 0);
    d.speed = speed;
    d.speedRun = speed * 4;

    /* --- CMB / CMD --- */
    const agile = E.hasFeat(ch, 'Agile Maneuvers');
    const cmbAbility = agile ? mods.dex : mods.str;
    d.cmb = d.babBase + cmbAbility + (ch.cmbMisc || 0);
    d.cmd = 10 + d.babBase + mods.str + mods.dex + deflect + dodge + (ch.cmdMisc || 0);

    /* --- hit points --- */
    d.hp = E.hitPoints(ch, mods.con);

    /* --- attack routine --- */
    d.attackSeq = E.attackSequence(d.babBase);
    d.melee = d.babBase + mods.str;
    d.ranged = d.babBase + mods.dex;

    /* --- weapons --- */
    d.weapons = (ch.weapons || []).map(function (w) { return E.weaponLine(ch, w, d); });

    /* --- skills --- */
    d.skills = E.skillTable(ch, d);
    d.skillRanks = E.skillRankBudget(ch);

    /* --- spellcasting --- */
    d.casting = E.castingSummary(ch, mods);

    /* --- money & weight --- */
    d.wealthGp = E.wealthInGp(ch);
    d.gearValueGp = E.gearValue(ch);

    d.warnings = E.validate(ch, d);
    return d;
  };

  E.classLevel = function (ch, name) {
    let n = 0;
    (ch.levels || []).forEach(function (l) { if (l.cls === name) n += l.n || 0; });
    return n;
  };

  E.hasFeat = function (ch, name) {
    return (ch.feats || []).some(function (f) { return f.name === name; });
  };

  /* Hit points: level 1 is the class's full hit die by default, later levels use entered
     rolls (or the PF average, rounded up, when a roll is blank). */
  E.hitPoints = function (ch, conMod) {
    const perLevel = E.levelSequence(ch);
    let total = 0; const detail = [];
    perLevel.forEach(function (cls, i) {
      const c = D.CLASS_BY_NAME[cls];
      const hd = c ? c.hd : 8;
      let roll;
      if (i === 0 && ch.hp.maxFirst) roll = hd;
      else if (ch.hp.rolls[i] !== undefined && ch.hp.rolls[i] !== null && ch.hp.rolls[i] !== '') roll = Number(ch.hp.rolls[i]);
      else roll = Math.floor(hd / 2) + 1;              /* PF average, rounded up */
      const line = roll + conMod;
      total += line;
      detail.push({ level: i + 1, cls: cls, hd: hd, roll: roll, con: conMod, total: line });
    });
    let toughness = 0;
    if (E.hasFeat(ch, 'Toughness')) toughness = Math.max(3, perLevel.length);
    const favored = ch.hp.favoredHp || 0;
    const misc = ch.hp.misc || 0;
    return {
      detail: detail, fromLevels: total, toughness: toughness, favored: favored, misc: misc,
      max: Math.max(perLevel.length, total + toughness + favored + misc),
      current: ch.hp.current === null || ch.hp.current === undefined
        ? Math.max(perLevel.length, total + toughness + favored + misc) : ch.hp.current,
      temp: ch.hp.temp || 0, nonlethal: ch.hp.nonlethal || 0
    };
  };

  /* Expand [{cls:'Fighter',n:2},{cls:'Rogue',n:1}] into ['Fighter','Fighter','Rogue']. */
  E.levelSequence = function (ch) {
    const out = [];
    (ch.levels || []).forEach(function (l) {
      for (let i = 0; i < (l.n || 0); i++) out.push(l.cls);
    });
    return out;
  };

  /* ------------------------------------------------------------------ weapons */
  E.weaponLine = function (ch, w, d) {
    const def = D.WEAPON_BY_NAME[w.name] || {
      name: w.name, cat: 'custom', hand: w.hands || 'one', dmg: w.dmg || '—',
      cr: 20, cm: 2, rng: 0, t: w.t || '—', sp: [], w: 0, c: 0
    };
    const mods = d.mods;
    const ranged = def.hand === 'ranged';
    const finesseable = (def.sp || []).indexOf('finesse') >= 0 || def.hand === 'light';
    const useDex = ranged || (E.hasFeat(ch, 'Weapon Finesse') && finesseable && w.useFinesse !== false);

    let atk = d.babBase + (useDex ? mods.dex : mods.str);
    const enh = Math.max(w.enh || 0, 0);
    atk += enh;
    if (!enh && w.mw) atk += 1;                      /* masterwork does not stack with enhancement */

    /* Weapon Focus on this weapon */
    let focus = 0;
    (ch.feats || []).forEach(function (f) {
      if ((f.name === 'Weapon Focus' || f.name === 'Greater Weapon Focus') && f.choice === w.name) focus += 1;
    });
    atk += focus;

    /* Proficiency */
    const prof = E.isProficient(ch, def);
    if (!prof) atk -= 4;

    /* Damage */
    let dmgBonus = enh;
    if (ranged) {
      if (/composite|sling/i.test(def.name)) dmgBonus += mods.str;
    } else if (w.hands === 'two' || def.hand === 'two') {
      dmgBonus += Math.floor(mods.str * 1.5);
    } else if (w.offHand) {
      dmgBonus += Math.floor(mods.str / 2);
    } else {
      dmgBonus += mods.str;
    }
    (ch.feats || []).forEach(function (f) {
      const fd = D.FEAT_BY_NAME[f.name];
      if (fd && fd.eff && fd.eff.weaponDamage && f.choice === w.name) dmgBonus += fd.eff.weaponDamage;
    });

    /* Threat range, doubled by Improved Critical / keen */
    let low = def.cr;
    const impCrit = (ch.feats || []).some(function (f) { return f.name === 'Improved Critical' && f.choice === w.name; });
    if (impCrit || w.keen) low = 20 - ((20 - def.cr) + 1) * 2 + 1;
    const threat = low >= 20 ? '20' : low + '-20';

    return {
      name: w.name + (enh ? ' +' + enh : (w.mw ? ' (mw)' : '')),
      baseName: w.name,
      equipped: !!w.equipped,
      attack: atk,
      attackSeq: E.attackSequence(d.babBase).map(function (b, i) {
        return atk - (d.babBase - b);
      }),
      damage: def.dmg + (dmgBonus ? ' ' + E.sign(dmgBonus) : ''),
      damageBonus: dmgBonus,
      threat: threat, crit: 'x' + def.cm,
      type: def.t, range: def.rng ? def.rng + ' ft.' : '—',
      hand: def.hand, cat: def.cat, special: (def.sp || []).join(', ') || '—',
      ranged: ranged,
      weight: def.w, proficient: prof, usesDex: useDex, note: w.note || ''
    };
  };

  E.isProficient = function (ch, def) {
    if (def.cat === 'custom' || def.cat === 'unarmed') return true;
    const classes = (ch.levels || []).map(function (l) { return D.CLASS_BY_NAME[l.cls]; }).filter(Boolean);
    for (const c of classes) {
      const wl = (c.prof && c.prof.weapons) || [];
      if (wl.indexOf('martial') >= 0 && (def.cat === 'simple' || def.cat === 'martial')) return true;
      if (wl.indexOf('simple') >= 0 && def.cat === 'simple') return true;
      for (const entry of wl) {
        if (def.name.toLowerCase().indexOf(entry.toLowerCase()) >= 0) return true;
      }
    }
    if (def.cat === 'simple' && E.hasFeat(ch, 'Simple Weapon Proficiency')) return true;
    const named = (ch.feats || []).some(function (f) {
      return (f.name === 'Martial Weapon Proficiency' || f.name === 'Exotic Weapon Proficiency') && f.choice === def.name;
    });
    return named;
  };

  /* ------------------------------------------------------------------ skills */
  E.classSkillSet = function (ch) {
    const set = {};
    (ch.levels || []).forEach(function (l) {
      const c = D.CLASS_BY_NAME[l.cls];
      if (c) c.classSkills.forEach(function (s) { set[s] = true; });
    });
    return set;
  };

  E.skillRankBudget = function (ch) {
    const mods = E.abilityMods(ch);
    let total = 0;
    E.levelSequence(ch).forEach(function (cls) {
      const c = D.CLASS_BY_NAME[cls];
      const base = c ? c.skillRanks : 2;
      total += Math.max(1, base + mods.int);
    });
    /* Human: +1 skill rank per level. */
    if (ch.race === 'Human') total += E.totalLevel(ch);
    total += ch.favoredSkillRanks || 0;
    const spent = Object.keys(ch.skills || {}).reduce(function (s, k) {
      return s + (Number(ch.skills[k].ranks) || 0);
    }, 0);
    return { total: total, spent: spent, left: total - spent };
  };

  E.skillTable = function (ch, d) {
    const cs = E.classSkillSet(ch);
    const mods = d.mods;
    const itemBonus = {};
    (ch.magic || []).forEach(function (mi) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === mi.name; });
      if (def && def.eff && def.eff.skill) {
        Object.keys(def.eff.skill).forEach(function (k) {
          itemBonus[k] = Math.max(itemBonus[k] || 0, def.eff.skill[k]);
        });
      }
    });
    const featBonus = {};
    (ch.feats || []).forEach(function (f) {
      if (f.name === 'Skill Focus' && f.choice) featBonus[f.choice] = (featBonus[f.choice] || 0) + 3;
      const pairs = {
        Acrobatic: ['Acrobatics', 'Fly'], Alertness: ['Perception', 'Sense Motive'],
        'Animal Affinity': ['Handle Animal', 'Ride'], Athletic: ['Climb', 'Swim'],
        Deceitful: ['Bluff', 'Disguise'], 'Deft Hands': ['Disable Device', 'Sleight of Hand'],
        'Magical Aptitude': ['Spellcraft', 'Use Magic Device'], Persuasive: ['Diplomacy', 'Intimidate'],
        'Self-Sufficient': ['Heal', 'Survival'], Stealthy: ['Escape Artist', 'Stealth']
      };
      if (pairs[f.name]) pairs[f.name].forEach(function (s) { featBonus[s] = (featBonus[s] || 0) + 2; });
    });

    return D.SKILLS.map(function (sk) {
      const rec = (ch.skills || {})[sk.name] || { ranks: 0, misc: 0 };
      const ranks = Number(rec.ranks) || 0;
      const isClass = !!cs[sk.name];
      const classBonus = (isClass && ranks > 0) ? 3 : 0;
      const acp = sk.acp ? d.acp : 0;
      const total = ranks + mods[sk.ab] + classBonus + (featBonus[sk.name] || 0) +
                    (itemBonus[sk.name] || 0) + (Number(rec.misc) || 0) + acp;
      return {
        name: sk.name, ab: sk.ab, trainedOnly: sk.tr, isClass: isClass, ranks: ranks,
        ability: mods[sk.ab], classBonus: classBonus, feat: featBonus[sk.name] || 0,
        item: itemBonus[sk.name] || 0, misc: Number(rec.misc) || 0, acp: acp,
        total: total, usable: !sk.tr || ranks > 0
      };
    });
  };

  /* ------------------------------------------------------------------ spellcasting */
  E.castingSummary = function (ch, mods) {
    const out = [];
    (ch.levels || []).forEach(function (entry) {
      const c = D.CLASS_BY_NAME[entry.cls];
      if (!c || !c.casting) return;
      const cast = c.casting;
      const n = entry.n;
      const abilityMod = mods[cast.ability];
      const table = cast.spd[n] || {};
      const slots = {};
      Object.keys(table).forEach(function (lv) {
        const L = Number(lv);
        let base = table[lv];
        /* Bonus spells for a high casting ability (CRB p.17), 1st level and up only. */
        if (L > 0 && abilityMod >= L) base += Math.floor((abilityMod - L) / 4) + 1;
        if (cast.domainSlot && L > 0) base += 1;
        slots[L] = base;
      });
      const maxLv = Object.keys(table).map(Number).reduce(function (a, b) { return Math.max(a, b); }, -1);
      out.push({
        cls: c.name, type: cast.type, ability: cast.ability, abilityMod: abilityMod,
        casterLevel: n, slots: slots, known: cast.known ? cast.known[n] : null,
        maxSpellLevel: maxLv, cantripsAtWill: !!cast.cantripsAtWill,
        spellbook: !!cast.spellbook, extracts: !!cast.extracts,
        listKey: D.CLASS_SPELL_KEY[c.name],
        saveDcBase: 10 + abilityMod,
        concentration: n + abilityMod,
        unverified: !!c.verify,
        minAbilityOk: (10 + maxLv) <= (E.abilityScores(ch)[cast.ability] || 0)
      });
    });
    return out;
  };

  /* ------------------------------------------------------------------ money & weight */
  E.wealthInGp = function (ch) {
    const w = ch.wealth || {};
    return (w.pp || 0) * 10 + (w.gp || 0) + (w.sp || 0) * 0.1 + (w.cp || 0) * 0.01;
  };

  E.totalWeight = function (ch) {
    let t = 0;
    const armor = E.armorDef(ch), shield = E.shieldDef(ch);
    t += armor.w || 0; t += shield.w || 0;
    (ch.weapons || []).forEach(function (w) {
      const def = D.WEAPON_BY_NAME[w.name];
      t += (def ? def.w : (Number(w.w) || 0)) * (w.qty || 1);
    });
    (ch.items || []).forEach(function (i) { t += (Number(i.w) || 0) * (Number(i.qty) || 1); });
    (ch.magic || []).forEach(function (m) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === m.name; });
      t += def ? (def.w || 0) : (Number(m.w) || 0);
    });
    /* 50 coins weigh 1 lb. */
    const w = ch.wealth || {};
    t += ((w.pp || 0) + (w.gp || 0) + (w.sp || 0) + (w.cp || 0)) / 50;
    return Math.round(t * 100) / 100;
  };

  E.gearValue = function (ch) {
    let v = 0;
    const armor = E.armorDef(ch), shield = E.shieldDef(ch);
    v += armor.c || 0; v += shield.c || 0;
    if (ch.armorEnh) v += D.ENHANCEMENT.armor[ch.armorEnh] || 0;
    if (ch.shieldEnh) v += D.ENHANCEMENT.armor[ch.shieldEnh] || 0;
    if (ch.armorMw && !ch.armorEnh) v += D.ENHANCEMENT.masterworkArmor;
    (ch.weapons || []).forEach(function (w) {
      const def = D.WEAPON_BY_NAME[w.name];
      v += (def ? def.c : 0) * (w.qty || 1);
      if (w.enh) v += D.ENHANCEMENT.weapon[w.enh] || 0;
      else if (w.mw) v += D.ENHANCEMENT.masterworkWeapon;
    });
    (ch.items || []).forEach(function (i) { v += (Number(i.c) || 0) * (Number(i.qty) || 1); });
    (ch.magic || []).forEach(function (m) {
      const def = D.MAGIC_ITEMS.find(function (x) { return x.name === m.name; });
      v += def ? (def.c || 0) : (Number(m.c) || 0);
    });
    return Math.round(v * 100) / 100;
  };

  /* ------------------------------------------------------------------ validation
     Every finding is a warning. Nothing here prevents a change. */
  E.validate = function (ch, d) {
    const out = [];
    const warn = function (sev, where, msg) { out.push({ sev: sev, where: where, msg: msg }); };
    const lvl = d.level;

    if (!ch.name) warn('info', 'Identity', 'The character has no name yet.');
    if (lvl === 0) { warn('warn', 'Class', 'No class levels taken — every derived number below is for a 0-level character.'); }
    if (lvl > 7) warn('warn', 'Class', 'Character level ' + lvl + ' is past the Riddle of Steel ceiling of 7. The tables here stop at 7.');

    /* point buy */
    const spent = E.pointBuySpent(ch);
    if (spent > ch.pointBuyBudget) {
      warn('warn', 'Abilities', 'Point buy spends ' + spent + ' of ' + ch.pointBuyBudget + ' points — ' + (spent - ch.pointBuyBudget) + ' over budget.');
    }
    ABIL.forEach(function (k) {
      const base = ch.abilities.base[k];
      if (base < 7 || base > 18) warn('warn', 'Abilities', k.toUpperCase() + ' base score ' + base + ' is outside the 7-18 point buy range.');
    });

    /* ability increases */
    const earned = E.abilityIncreasesEarned(ch), used = E.abilityIncreasesSpent(ch);
    if (used > earned) warn('warn', 'Abilities', 'Spent ' + used + ' level-up ability increases but only ' + earned + ' earned (one per 4th level).');
    if (used < earned) warn('info', 'Abilities', earned - used + ' level-up ability increase(s) still unspent.');

    /* skills */
    const budget = d.skillRanks;
    if (budget.spent > budget.total) warn('warn', 'Skills', 'Spent ' + budget.spent + ' skill ranks of ' + budget.total + ' available — ' + (budget.spent - budget.total) + ' over.');
    d.skills.forEach(function (s) {
      if (s.ranks > lvl) warn('warn', 'Skills', s.name + ' has ' + s.ranks + ' ranks; the cap is your character level (' + lvl + ').');
      if (s.trainedOnly && s.ranks === 0 && s.misc > 0) warn('info', 'Skills', s.name + ' is trained-only and has no ranks, so it cannot be used.');
    });

    /* feats */
    const featsEarned = E.featsEarned(ch);
    if (ch.feats.length > featsEarned) warn('warn', 'Feats', 'Has ' + ch.feats.length + ' feats but earned ' + featsEarned + '.');
    if (ch.feats.length < featsEarned) warn('info', 'Feats', (featsEarned - ch.feats.length) + ' feat slot(s) unspent.');
    ch.feats.forEach(function (f) {
      const missing = E.featPrereqProblems(ch, d, f);
      missing.forEach(function (m) { warn('warn', 'Feats', f.name + ': ' + m); });
    });
    const seen = {};
    ch.feats.forEach(function (f) {
      const key = f.name + '|' + (f.choice || '');
      if (seen[key]) warn('warn', 'Feats', 'Duplicate feat: ' + f.name + (f.choice ? ' (' + f.choice + ')' : '') + '.');
      seen[key] = true;
    });

    /* proficiency & armor */
    d.weapons.forEach(function (w) {
      if (!w.proficient) warn('warn', 'Weapons', w.baseName + ': not proficient — the -4 penalty is already in the attack bonus shown.');
    });
    const armor = E.armorDef(ch);
    if (armor.type !== 'none') {
      const ok = (ch.levels || []).some(function (l) {
        const c = D.CLASS_BY_NAME[l.cls];
        if (!c) return false;
        const al = (c.prof && c.prof.armor) || [];
        return al.indexOf('all') >= 0 || al.some(function (x) { return x.indexOf(armor.type) === 0; });
      }) || E.hasFeat(ch, 'Armor Proficiency, ' + armor.type.charAt(0).toUpperCase() + armor.type.slice(1));
      if (!ok) warn('warn', 'Armor', 'Not proficient with ' + armor.type + ' armor — the armor check penalty also applies to attack rolls.');
    }
    if (d.asf > 0) {
      const arcane = (ch.levels || []).some(function (l) {
        const c = D.CLASS_BY_NAME[l.cls];
        return c && c.casting && c.casting.arcaneFailure;
      });
      if (arcane) warn('info', 'Armor', 'Arcane spell failure is ' + d.asf + '% in this armor and shield.');
    }

    /* encumbrance */
    if (d.loadLevel !== 'light') {
      warn('info', 'Load', 'Carrying a ' + d.loadLevel + ' load (' + d.carry.current + ' lb. of ' + d.carry.light + ' lb. light limit): max DEX ' + D.LOAD_EFFECTS[d.loadLevel].maxDex + ', ACP ' + D.LOAD_EFFECTS[d.loadLevel].acp + ', speed reduced.');
    }

    /* alignment vs. class */
    (ch.levels || []).forEach(function (l) {
      const c = D.CLASS_BY_NAME[l.cls];
      if (!c || !ch.alignment) return;
      if (c.name === 'Paladin' && ch.alignment !== 'Lawful Good') warn('warn', 'Alignment', 'Paladin requires Lawful Good; this character is ' + ch.alignment + '.');
      if (c.name === 'Monk' && ch.alignment.indexOf('Lawful') !== 0) warn('warn', 'Alignment', 'Monk requires a lawful alignment; this character is ' + ch.alignment + '.');
      if (c.name === 'Barbarian' && ch.alignment.indexOf('Lawful') === 0) warn('warn', 'Alignment', 'Barbarian must be nonlawful; this character is ' + ch.alignment + '.');
      if (c.name === 'Druid' && ch.alignment.indexOf('Neutral') < 0 && ch.alignment !== 'True Neutral') warn('warn', 'Alignment', 'Druid must be neutral on at least one axis; this character is ' + ch.alignment + '.');
    });

    /* casting ability high enough to cast the levels it has slots for */
    d.casting.forEach(function (c) {
      if (!c.minAbilityOk && c.maxSpellLevel > 0) {
        warn('warn', 'Spells', c.cls + ': ' + c.ability.toUpperCase() + ' must be at least ' + (10 + c.maxSpellLevel) + ' to cast ' + c.maxSpellLevel + '-level spells.');
      }
      if (c.unverified) {
        warn('info', 'Spells', c.cls + ': this class table was entered from recall and is flagged for a book spot-check (APG). Verify slots and spells known before play.');
      }
    });

    /* wealth */
    const wbl = D.WEALTH_BY_LEVEL[lvl];
    if (wbl) {
      const total = d.wealthGp + d.gearValueGp;
      if (total > wbl * 1.25) warn('info', 'Wealth', 'Total wealth ' + Math.round(total) + ' gp is above the level ' + lvl + ' guideline of ' + wbl + ' gp.');
    }

    /* XP */
    const xpNeed = D.XP_MEDIUM[lvl];
    if (ch.xp && xpNeed !== undefined && ch.xp < xpNeed) {
      warn('info', 'XP', 'XP ' + ch.xp + ' is below the medium-track threshold of ' + xpNeed + ' for level ' + lvl + '. (The Riddle of Steel advances on milestones, so this is expected.)');
    }

    /* Arduin */
    if (!ch.arduin) warn('info', 'Arduin', 'No Arduin special ability rolled yet.');

    return out;
  };

  /* One feat at 1st level and every odd level, +1 human bonus, + fighter bonus feats. */
  E.featsEarned = function (ch) {
    const lvl = E.totalLevel(ch);
    if (lvl === 0) return 0;
    let n = 1 + Math.floor((lvl - 1) / 2);
    if (ch.race === 'Human') n += 1;
    const f = E.classLevel(ch, 'Fighter');
    if (f >= 1) n += 1 + Math.floor(f / 2);            /* 1st, then every even level */
    const m = E.classLevel(ch, 'Monk');
    if (m >= 1) n += 1 + (m >= 2 ? 1 : 0) + (m >= 6 ? 1 : 0);
    const r = E.classLevel(ch, 'Ranger');
    if (r >= 2) n += 1 + (r >= 6 ? 1 : 0);             /* combat style feats */
    if (r >= 3) n += 1;                                /* Endurance */
    const w = E.classLevel(ch, 'Wizard');
    if (w >= 1) n += 1 + (w >= 5 ? 1 : 0);             /* Scribe Scroll + 5th */
    const s = E.classLevel(ch, 'Sorcerer');
    if (s >= 3) n += 1 + (s >= 7 ? 1 : 0);             /* bloodline feats */
    const cav = E.classLevel(ch, 'Cavalier');
    if (cav >= 6) n += 1;
    const inq = E.classLevel(ch, 'Inquisitor');
    if (inq >= 3) n += 1 + (inq >= 6 ? 1 : 0);         /* teamwork feats */
    return n;
  };

  E.featPrereqProblems = function (ch, d, f) {
    const def = D.FEAT_BY_NAME[f.name];
    const out = [];
    if (!def) return out;
    const pre = def.pre || {};
    const scores = d.abilities;
    if (pre.ab) {
      Object.keys(pre.ab).forEach(function (k) {
        if ((scores[k] || 0) < pre.ab[k]) out.push('needs ' + k.toUpperCase() + ' ' + pre.ab[k] + ' (has ' + (scores[k] || 0) + ').');
      });
    }
    if (pre.bab !== undefined && d.babBase < pre.bab) out.push('needs base attack bonus +' + pre.bab + ' (has +' + d.babBase + ').');
    if (pre.lvl !== undefined && d.level < pre.lvl) out.push('needs character level ' + pre.lvl + ' (is ' + d.level + ').');
    if (pre.feats) {
      pre.feats.forEach(function (r) {
        if (!E.hasFeat(ch, r)) out.push('needs the ' + r + ' feat.');
      });
    }
    if (pre.skills) {
      Object.keys(pre.skills).forEach(function (k) {
        const s = d.skills.find(function (x) { return x.name === k; });
        const ranks = s ? s.ranks : 0;
        if (ranks < pre.skills[k]) out.push('needs ' + pre.skills[k] + ' rank(s) in ' + k + ' (has ' + ranks + ').');
      });
    }
    if (pre.cl !== undefined) {
      const maxCl = d.casting.reduce(function (a, c) { return Math.max(a, c.casterLevel); }, 0);
      if (maxCl < pre.cl) out.push('needs caster level ' + pre.cl + ' (highest is ' + maxCl + ').');
    }
    if (pre.cls && E.classLevel(ch, pre.cls) === 0) out.push('is a ' + pre.cls + ' feat and there are no ' + pre.cls + ' levels here.');
    if (pre.text) out.push('check by hand — ' + pre.text);
    return out;
  };
})();
