/* Pathfinder 1E Character Builder — engine tests.
   Every expected value here is worked by hand from the Core Rulebook, NOT read back out of
   the engine. Run:  node engine_tests.js
   To prove the suite can fail, run it against a deliberately broken engine:
        node engine_tests.js --mutate=<name>
   which patches one formula before testing. A mutation that produces no failure means the
   suite does not actually cover that formula. */
global.window = {};
['core', 'classes', 'equipment', 'feats', 'spells'].forEach(function (f) { require('./js/data/' + f + '.js'); });
require('./js/engine.js');
const PF = global.window.PF, E = PF.ENGINE, D = PF.DATA;

/* ------------------------------------------------------------------ mutation harness */
const mutArg = process.argv.find(function (a) { return a.indexOf('--mutate=') === 0; });
const MUT = mutArg ? mutArg.split('=')[1] : null;
if (MUT === 'bab') { E.babFor = function (p, n) { return n; }; }
if (MUT === 'save') { E.saveFor = function (q, n) { return q === 'good' ? 2 + n : Math.floor(n / 3); }; }
if (MUT === 'mod') { E.mod = function (s) { return Math.floor(s / 2) - 5 + 1; }; }
if (MUT === 'crit') {
  const orig = E.weaponLine;
  E.weaponLine = function (ch, w, d) { const r = orig(ch, w, d); r.threat = '20'; return r; };
}
if (MUT === 'skillrank') { const o = E.skillRankBudget; E.skillRankBudget = function (ch) { const r = o(ch); r.total += 5; return r; }; }
if (MUT === 'hp') { const o = E.hitPoints; E.hitPoints = function (ch, c) { const r = o(ch, c); r.max += 5; return r; }; }
if (MUT === 'ac') { const o = E.derive; E.derive = function (ch) { const d = o(ch); d.ac.total += 2; return d; }; }
if (MUT === 'bonusspells') {
  const o = E.castingSummary;
  E.castingSummary = function (ch, m) {
    const r = o(ch, m); r.forEach(function (c) { Object.keys(c.slots).forEach(function (k) { if (k !== '0') c.slots[k] += 1; }); });
    return r;
  };
}

/* ------------------------------------------------------------------ tiny harness */
let pass = 0, fail = 0; const failures = [];
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; failures.push(label + '\n     expected ' + e + '\n     actual   ' + a); }
}
function has(label, list, substr) {
  const hit = list.some(function (w) { return (w.msg || '').indexOf(substr) >= 0; });
  if (hit) pass++; else { fail++; failures.push(label + '\n     no warning containing: ' + substr); }
}
function hasNot(label, list, substr) {
  const hit = list.some(function (w) { return (w.msg || '').indexOf(substr) >= 0; });
  if (!hit) pass++; else { fail++; failures.push(label + '\n     unexpected warning containing: ' + substr); }
}

function mk(over) {
  const c = E.blankCharacter();
  Object.assign(c, over || {});
  return c;
}

/* ============================================================ 1. HUMAN FIGHTER 3
   base STR 16 DEX 14 CON 14 INT 10 WIS 12 CHA 8, +2/+2 house bump -> STR 18 CON 16.
   Hand-worked: mods +4/+2/+3/0/+1/-1. BAB full 3. Fort 2+floor(3/2)=3, Ref floor(3/3)=1,
   Will 1. HP 10 + 6 + 6 = 22 base rolls, +3 CON x3 = 31. Unarmored AC 10+2=12.
   CMB 3+4=7. CMD 10+3+4+2=19. Skill ranks (2+0 INT)x3 + 3 human = 9. */
(function () {
  const ch = mk({ name: 'Test Fighter', levels: [{ cls: 'Fighter', n: 3 }] });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const d = E.derive(ch);
  eq('F3 ability scores', d.abilities, { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 });
  eq('F3 ability mods', d.mods, { str: 4, dex: 2, con: 3, int: 0, wis: 1, cha: -1 });
  eq('F3 BAB', d.babBase, 3);
  eq('F3 Fort', d.saves.fort.total, 6);
  eq('F3 Ref', d.saves.ref.total, 3);
  eq('F3 Will', d.saves.will.total, 2);
  eq('F3 HP max', d.hp.max, 31);
  eq('F3 AC unarmored', d.ac.total, 12);
  eq('F3 touch AC', d.ac.touch, 12);
  eq('F3 flat-footed AC', d.ac.flatFooted, 10);
  eq('F3 initiative', d.init, 2);
  eq('F3 CMB', d.cmb, 7);
  eq('F3 CMD', d.cmd, 19);
  eq('F3 speed', d.speed, 30);
  eq('F3 skill rank budget', d.skillRanks.total, 9);
  eq('F3 attack sequence', d.attackSeq, [3]);
})();

/* ============================================================ 2. FULL PLATE + SHIELD
   Full plate (+9, maxDex 1, ACP -7) + heavy steel shield (+2, ACP -2).
   AC = 10 + 9 + 2 + min(DEX 2, 1) = 22. Touch = 10 + 1 = 11. Flat = 10+9+2 = 21.
   ACP -9, but Fighter 3 armor training reduces by 1 -> -8. Speed 20. */
(function () {
  const ch = mk({ name: 'Armored', levels: [{ cls: 'Fighter', n: 3 }], armor: 'Full plate', shield: 'Shield, heavy steel' });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const d = E.derive(ch);
  eq('Plate AC', d.ac.total, 22);
  eq('Plate touch AC', d.ac.touch, 11);
  eq('Plate flat-footed AC', d.ac.flatFooted, 21);
  eq('Plate max DEX applied', d.ac.dex, 1);
  eq('Plate ACP: full plate -6, heavy steel shield -2, fighter armor training +1', d.acp, -7);
  eq('Plate speed', d.speed, 20);
  eq('Plate arcane spell failure', d.asf, 50);
})();

/* ============================================================ 3. MULTICLASS SAVES/BAB
   Fighter 2 / Rogue 1: BAB 2 + floor(3/4)=0 -> 2.
   Fort: fighter good 2+1=3, rogue poor floor(1/3)=0 -> 3.
   Ref:  fighter poor floor(2/3)=0, rogue good 2+0=2 -> 2.
   Will: 0 + 0 = 0.  Each class contributes separately (CRB p.31). */
(function () {
  const ch = mk({ name: 'Multi', levels: [{ cls: 'Fighter', n: 2 }, { cls: 'Rogue', n: 1 }] });
  ch.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const d = E.derive(ch);
  eq('F2/R1 BAB', d.babBase, 2);
  eq('F2/R1 Fort base', d.saves.fort.base, 3);
  eq('F2/R1 Ref base', d.saves.ref.base, 2);
  eq('F2/R1 Will base', d.saves.will.base, 0);
  eq('F2/R1 total level', d.level, 3);
  /* Skill ranks: fighter 2+2 = 4, rogue 8 = 8, +3 human = 15 */
  eq('F2/R1 skill ranks', d.skillRanks.total, 15);
})();

/* ============================================================ 4. BAB ATTACK SEQUENCE */
(function () {
  eq('seq +6', E.attackSequence(6), [6, 1]);
  eq('seq +11', E.attackSequence(11), [11, 6, 1]);
  eq('seq +5', E.attackSequence(5), [5]);
  eq('seq +0', E.attackSequence(0), [0]);
  eq('BAB three-quarter at 7', E.babFor('threeq', 7), 5);
  eq('BAB half at 7', E.babFor('half', 7), 3);
  eq('BAB full at 7', E.babFor('full', 7), 7);
  eq('good save at 7', E.saveFor('good', 7), 5);
  eq('poor save at 7', E.saveFor('poor', 7), 2);
})();

/* ============================================================ 5. WEAPONS
   Fighter 3, STR 18 (+4). Longsword +1: attack 3+4+1 = 8, damage 1d8+5, threat 19-20 x2.
   Greatsword two-handed: damage 2d6 + floor(4*1.5)=6.
   Improved Critical (longsword) doubles 19-20 to 17-20. */
(function () {
  const ch = mk({
    name: 'Swordsman', levels: [{ cls: 'Fighter', n: 3 }],
    weapons: [
      { name: 'Longsword', enh: 1, equipped: true },
      { name: 'Greatsword', hands: 'two', equipped: false },
      { name: 'Longbow', equipped: false }
    ]
  });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  let d = E.derive(ch);
  eq('Longsword+1 attack', d.weapons[0].attack, 8);
  eq('Longsword+1 damage', d.weapons[0].damage, '1d8 +5');
  eq('Longsword threat', d.weapons[0].threat, '19-20');
  eq('Longsword crit mult', d.weapons[0].crit, 'x2');
  eq('Longsword type', d.weapons[0].type, 'S');
  eq('Greatsword two-handed damage', d.weapons[1].damage, '2d6 +6');
  eq('Longbow attack uses DEX', d.weapons[2].attack, 5);
  eq('Longbow range', d.weapons[2].range, '100 ft.');
  eq('Longbow damage no STR', d.weapons[2].damage, '1d8');

  ch.feats.push({ name: 'Improved Critical', choice: 'Longsword' });
  d = E.derive(ch);
  eq('Improved Critical longsword 19-20 -> 17-20', d.weapons[0].threat, '17-20');

  /* Falchion 18-20 doubled is 15-20; a 20 weapon doubled is 19-20. */
  const ch2 = mk({ levels: [{ cls: 'Fighter', n: 8 }], weapons: [{ name: 'Falchion', hands: 'two' }, { name: 'Warhammer' }] });
  ch2.feats = [{ name: 'Improved Critical', choice: 'Falchion' }, { name: 'Improved Critical', choice: 'Warhammer' }];
  const d2 = E.derive(ch2);
  eq('Improved Critical falchion 18-20 -> 15-20', d2.weapons[0].threat, '15-20');
  eq('Improved Critical warhammer 20 -> 19-20', d2.weapons[1].threat, '19-20');
})();

/* ============================================================ 6. NON-PROFICIENCY
   A wizard wielding a longsword is not proficient: -4 on the attack roll. */
(function () {
  const ch = mk({ name: 'Wiz', levels: [{ cls: 'Wizard', n: 4 }], weapons: [{ name: 'Longsword' }, { name: 'Dagger' }] });
  ch.abilities.base = { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const d = E.derive(ch);
  eq('Wizard longsword not proficient', d.weapons[0].proficient, false);
  eq('Wizard longsword attack has -4', d.weapons[0].attack, 2 + 0 - 4);
  eq('Wizard dagger IS proficient', d.weapons[1].proficient, true);
  has('non-proficiency warned', d.warnings, 'not proficient');
})();

/* ============================================================ 7. SPELLS PER DAY
   Wizard 7 with INT 18 (+4). Base table 4/4/3/2/1 for levels 0-4.
   Bonus spells for a +4 modifier: +1 at each of levels 1-4 (CRB p.17).
   -> 4 / 5 / 4 / 3 / 2. */
(function () {
  const ch = mk({ name: 'Wiz7', levels: [{ cls: 'Wizard', n: 7 }] });
  ch.abilities.base = { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const d = E.derive(ch);
  const c = d.casting[0];
  eq('Wizard 7 slots', c.slots, { 0: 4, 1: 5, 2: 4, 3: 3, 4: 2 });
  eq('Wizard 7 max spell level', c.maxSpellLevel, 4);
  eq('Wizard 7 save DC base', c.saveDcBase, 14);
  eq('Wizard 7 concentration', c.concentration, 11);
  eq('Wizard BAB at 7 is half', d.babBase, 3);

  /* Cleric 5, WIS 16 (+3): base 5/3/2/1, +1 bonus at levels 1-3, +1 domain at 1-3. */
  const cl = mk({ name: 'Cle5', levels: [{ cls: 'Cleric', n: 5 }] });
  cl.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 };
  cl.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const dc = E.derive(cl).casting[0];
  eq('Cleric 5 slots incl. domain', dc.slots, { 0: 5, 1: 5, 2: 4, 3: 3 });

  /* A low casting ability does not grant bonus spells. */
  const lw = mk({ levels: [{ cls: 'Wizard', n: 7 }] });
  lw.abilities.base = { str: 10, dex: 10, con: 10, int: 11, wis: 10, cha: 10 };
  lw.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  eq('Wizard INT 11 gets no bonus slots', E.derive(lw).casting[0].slots, { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 });
})();

/* ============================================================ 8. SKILLS
   Rogue 3, DEX 16 base (no house DEX bump) -> +3. Stealth is a rogue class skill.
   5 ranks -> 5 + 3 DEX + 3 class = 11. Leather armor ACP 0 so no penalty.
   Knowledge (arcana) is NOT a rogue class skill -> ranks + INT only. */
(function () {
  const ch = mk({ name: 'Sneak', levels: [{ cls: 'Rogue', n: 3 }], armor: 'Leather' });
  ch.abilities.base = { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  ch.skills = { Stealth: { ranks: 3, misc: 0 }, 'Knowledge (arcana)': { ranks: 2, misc: 0 } };
  const d = E.derive(ch);
  const st = d.skills.find(function (s) { return s.name === 'Stealth'; });
  const ka = d.skills.find(function (s) { return s.name === 'Knowledge (arcana)'; });
  eq('Stealth is a class skill', st.isClass, true);
  eq('Stealth total (3 ranks + 3 DEX + 3 class)', st.total, 9);
  eq('Knowledge (arcana) not a rogue class skill', ka.isClass, false);
  eq('Knowledge (arcana) total (2 + 2 INT)', ka.total, 4);
  /* Rogue 8 + INT 2 = 10/level x3 = 30, +3 human = 33 */
  eq('Rogue 3 skill ranks', d.skillRanks.total, 33);

  /* Armor check penalty reaches ACP skills only. */
  const hv = mk({ levels: [{ cls: 'Rogue', n: 3 }], armor: 'Chainmail' });
  hv.abilities.base = { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 10 };
  hv.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  hv.skills = { Stealth: { ranks: 3, misc: 0 }, Bluff: { ranks: 3, misc: 0 } };
  const dh = E.derive(hv);
  eq('Chainmail ACP is -5', dh.acp, -5);
  eq('Stealth takes the ACP', dh.skills.find(function (s) { return s.name === 'Stealth'; }).acp, -5);
  eq('Bluff does not take the ACP', dh.skills.find(function (s) { return s.name === 'Bluff'; }).acp, 0);
})();

/* ============================================================ 9. FEAT PREREQUISITES */
(function () {
  /* Power Attack needs STR 13 and BAB +1. A wizard 1 with STR 10 fails both. */
  const ch = mk({ levels: [{ cls: 'Wizard', n: 1 }], feats: [{ name: 'Power Attack', choice: '' }] });
  ch.abilities.base = { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const d = E.derive(ch);
  has('Power Attack STR prereq caught', d.warnings, 'needs STR 13');
  has('Power Attack BAB prereq caught', d.warnings, 'needs base attack bonus +1');

  /* A fighter 3 with STR 18 meets them. */
  const f = mk({ levels: [{ cls: 'Fighter', n: 3 }], feats: [{ name: 'Power Attack', choice: '' }] });
  f.abilities.base = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 };
  const df = E.derive(f);
  hasNot('Power Attack passes for a fighter', df.warnings, 'needs STR 13');

  /* Chained feats: Great Cleave needs Power Attack AND Cleave. */
  const g = mk({ levels: [{ cls: 'Fighter', n: 4 }], feats: [{ name: 'Great Cleave', choice: '' }] });
  g.abilities.base = { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 };
  const dg = E.derive(g);
  has('Great Cleave missing Power Attack', dg.warnings, 'needs the Power Attack feat');
  has('Great Cleave missing Cleave', dg.warnings, 'needs the Cleave feat');

  /* Duplicate feats are flagged. */
  const dup = mk({ levels: [{ cls: 'Fighter', n: 3 }], feats: [{ name: 'Dodge', choice: '' }, { name: 'Dodge', choice: '' }] });
  dup.abilities.base = { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 10 };
  has('duplicate feat flagged', E.derive(dup).warnings, 'Duplicate feat');
})();

/* ============================================================ 10. FEAT EFFECTS FEED THE SHEET */
(function () {
  const ch = mk({ levels: [{ cls: 'Fighter', n: 3 }] });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const before = E.derive(ch);
  ch.feats = [
    { name: 'Improved Initiative', choice: '' }, { name: 'Dodge', choice: '' },
    { name: 'Toughness', choice: '' }, { name: 'Iron Will', choice: '' }
  ];
  const after = E.derive(ch);
  eq('Improved Initiative adds +4', after.init - before.init, 4);
  eq('Dodge adds +1 AC', after.ac.total - before.ac.total, 1);
  eq('Iron Will adds +2 Will', after.saves.will.total - before.saves.will.total, 2);
  eq('Toughness adds 3 hp at level 3', after.hp.max - before.hp.max, 3);
  /* Toughness gives +1/HD once HD exceeds 3. */
  const l7 = mk({ levels: [{ cls: 'Fighter', n: 7 }], feats: [{ name: 'Toughness', choice: '' }] });
  l7.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  eq('Toughness at 7 HD is +7', E.hitPoints(l7, 0).toughness, 7);
})();

/* ============================================================ 11. ENCUMBRANCE
   STR 18 -> light load 100 lb. Full plate (50) + tower shield (45) + greatsword (8) = 103
   -> medium load: max DEX 3, ACP -3 extra, speed capped. */
(function () {
  const ch = mk({ levels: [{ cls: 'Fighter', n: 3 }], armor: 'Full plate', shield: 'Shield, tower', weapons: [{ name: 'Greatsword' }] });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const d = E.derive(ch);
  eq('light load limit at STR 18', d.carry.light, 100);
  eq('total weight', d.carry.current, 103);
  eq('load level', d.loadLevel, 'medium');
  has('encumbrance warned', d.warnings, 'medium load');

  const light = mk({ levels: [{ cls: 'Rogue', n: 1 }], armor: 'Leather' });
  light.abilities.base = { str: 14, dex: 14, con: 12, int: 12, wis: 10, cha: 10 };
  light.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  eq('leather alone is a light load', E.derive(light).loadLevel, 'light');
})();

/* ============================================================ 12. MAGIC ITEMS */
(function () {
  const ch = mk({ levels: [{ cls: 'Fighter', n: 5 }] });
  ch.abilities.base = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };
  const before = E.derive(ch);
  ch.magic = [
    { name: 'Belt of Giant Strength +2', slot: 'Belt' },
    { name: 'Cloak of Resistance +1', slot: 'Shoulders' },
    { name: 'Ring of Protection +1', slot: 'Ring (1)' },
    { name: 'Amulet of Natural Armor +1', slot: 'Neck' }
  ];
  const after = E.derive(ch);
  eq('Belt +2 raises STR 18 -> 20', after.abilities.str, 20);
  eq('STR 20 modifier is +5', after.mods.str, 5);
  eq('Cloak +1 raises all saves', after.saves.fort.total - before.saves.fort.total, 1);
  eq('Ring +1 and Amulet +1 give +2 AC', after.ac.total - before.ac.total, 2);
  eq('deflection reaches touch AC', after.ac.touch - before.ac.touch, 1);
  eq('natural armor does NOT reach touch AC', after.ac.natural, 1);

  /* Two belts do not stack — the better one wins. */
  ch.magic.push({ name: 'Belt of Giant Strength +2', slot: 'Belt' });
  eq('same-type enhancement does not stack', E.derive(ch).abilities.str, 20);
})();

/* ============================================================ 13. MONK unarmored AC and speed
   Monk 6, WIS 16 (+3), DEX 14 (+2), no armor: AC = 10 + 2 DEX + 3 WIS + 1 (level 4+) = 16.
   Fast movement at 6th is +20 -> speed 50. Monk has all-good saves. */
(function () {
  const ch = mk({ name: 'Monk', levels: [{ cls: 'Monk', n: 6 }] });
  ch.abilities.base = { str: 12, dex: 14, con: 12, int: 10, wis: 16, cha: 10 };
  ch.abilities.house = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const d = E.derive(ch);
  eq('Monk 6 unarmored AC', d.ac.total, 16);
  eq('Monk 6 speed', d.speed, 50);
  eq('Monk 6 all saves good', [d.saves.fort.base, d.saves.ref.base, d.saves.will.base], [5, 5, 5]);
  /* Armor switches the monk bonus off entirely. */
  ch.armor = 'Chain shirt';
  const d2 = E.derive(ch);
  eq('armored monk loses the WIS AC bonus', d2.ac.monk, 0);
  eq('armored monk loses fast movement', d2.speed, 30);
})();

/* ============================================================ 14. VALIDATION WARNINGS */
(function () {
  /* Point buy over budget. 18/16/16/14/14/14 is far past 20 points. */
  const ch = mk({ levels: [{ cls: 'Fighter', n: 3 }], pointBuyBudget: 20 });
  ch.abilities.base = { str: 18, dex: 16, con: 16, int: 14, wis: 14, cha: 14 };
  has('point buy over budget', E.derive(ch).warnings, 'over budget');

  /* Skill ranks over the character-level cap. */
  const sk = mk({ levels: [{ cls: 'Rogue', n: 2 }] });
  sk.skills = { Stealth: { ranks: 5, misc: 0 } };
  has('skill rank cap', E.derive(sk).warnings, 'the cap is your character level');

  /* Alignment vs. class. */
  const pal = mk({ levels: [{ cls: 'Paladin', n: 3 }], alignment: 'Chaotic Evil' });
  has('paladin alignment', E.derive(pal).warnings, 'Paladin requires Lawful Good');
  const mk2 = mk({ levels: [{ cls: 'Monk', n: 3 }], alignment: 'Chaotic Good' });
  has('monk alignment', E.derive(mk2).warnings, 'Monk requires a lawful alignment');
  const bar = mk({ levels: [{ cls: 'Barbarian', n: 3 }], alignment: 'Lawful Good' });
  has('barbarian alignment', E.derive(bar).warnings, 'Barbarian must be nonlawful');

  /* Level past the campaign ceiling. */
  const hi = mk({ levels: [{ cls: 'Fighter', n: 9 }] });
  has('level over 7 warned', E.derive(hi).warnings, 'past the Riddle of Steel ceiling');

  /* APG classes carry the unverified-table notice. */
  const orc = mk({ levels: [{ cls: 'Oracle', n: 3 }] });
  has('APG table flagged for spot-check', E.derive(orc).warnings, 'flagged for a book spot-check');

  /* A clean Core character produces no 'warn' severity findings. */
  const clean = mk({ name: 'Clean', alignment: 'Neutral Good', levels: [{ cls: 'Fighter', n: 3 }], pointBuyBudget: 20 });
  clean.abilities.base = { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 10 };
  clean.feats = [{ name: 'Power Attack', choice: '' }, { name: 'Dodge', choice: '' },
                 { name: 'Weapon Focus', choice: 'Longsword' }, { name: 'Toughness', choice: '' }];
  clean.skills = { Climb: { ranks: 3, misc: 0 }, Intimidate: { ranks: 3, misc: 0 }, Ride: { ranks: 3, misc: 0 } };
  const dcl = E.derive(clean);
  const hard = dcl.warnings.filter(function (w) { return w.sev === 'warn'; });
  eq('clean level-3 fighter has no hard warnings', hard.map(function (w) { return w.msg; }), []);
})();

/* ============================================================ 15. FEAT SLOT COUNTING
   Human Fighter 3: 1 (1st) + 1 (3rd) = 2 general, +1 human, + fighter 1st and 2nd = 2.
   Total 5. */
(function () {
  const ch = mk({ levels: [{ cls: 'Fighter', n: 3 }] });
  eq('human fighter 3 feat slots', E.featsEarned(ch), 5);
  const r = mk({ levels: [{ cls: 'Rogue', n: 3 }] });
  eq('human rogue 3 feat slots', E.featsEarned(r), 3);
  const w = mk({ levels: [{ cls: 'Wizard', n: 5 }] });
  eq('human wizard 5 feat slots (incl. Scribe Scroll + 5th)', E.featsEarned(w), 6);
})();

/* ============================================================ 16. WEALTH AND XP */
(function () {
  const ch = mk({ levels: [{ cls: 'Fighter', n: 3 }] });
  ch.wealth = { pp: 1, gp: 25, sp: 30, cp: 40 };
  const d = E.derive(ch);
  eq('wealth in gp', d.wealthGp, 10 + 25 + 3 + 0.4);
  eq('XP threshold for level 3', D.XP_MEDIUM[3], 5000);
  eq('wealth by level 3', D.WEALTH_BY_LEVEL[3], 3000);
  /* 100 coins weigh 2 lb. */
  const only = mk({ levels: [{ cls: 'Fighter', n: 1 }] });
  only.wealth = { pp: 0, gp: 100, sp: 0, cp: 0 };
  eq('100 coins weigh 2 lb', E.totalWeight(only), 2);
})();

/* ============================================================ REPORT */
console.log('\nPathfinder 1E Character Builder — engine tests' + (MUT ? '  [MUTATION: ' + MUT + ']' : ''));
console.log('  pass ' + pass + '   fail ' + fail);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(function (f, i) { console.log('  ' + (i + 1) + '. ' + f); });
}
process.exit(fail ? 1 : 0);
