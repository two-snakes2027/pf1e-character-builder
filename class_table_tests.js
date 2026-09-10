/* Pathfinder 1E Character Builder — class table tests.

   These pin the DATA, not the engine. The engine suites check that a formula turns a table
   into slots correctly; nothing checked that the table itself was right, which is how 29 wrong
   cells sat in js/data/classes.js across 564 passing assertions until 2026-09-09.

   Every expected value below was scraped from d20pfsrd.com AND aonprd.com (Archives of Nethys)
   on 2026-09-09 and is included ONLY where the two sources agreed cell-for-cell. Levels 1-7,
   the Riddle of Steel ceiling. Do not "fix" a failure here by editing this file — check the
   book first; a mismatch means the data changed, and this file is the record of what the
   sources said.

   Run:  node class_table_tests.js
   Prove it can fail:  node class_table_tests.js --mutate=<spd|known|prof|skills>
*/
global.window = {};
['core', 'classes', 'equipment', 'feats', 'spells', 'magic_import'].forEach(function (f) { require('./js/data/' + f + '.js'); });
const D = global.window.PF.DATA;

const mutArg = process.argv.find(function (a) { return a.indexOf('--mutate=') === 0; });
const MUT = mutArg ? mutArg.split('=')[1] : null;
if (MUT === 'spd') { D.CLASS_BY_NAME['Summoner'].casting.spd[6][2] = 9; }
if (MUT === 'known') { D.CLASS_BY_NAME['Oracle'].casting.known[4][1] = 9; }
if (MUT === 'prof') { D.CLASS_BY_NAME['Witch'].prof.weapons = ['club', 'dagger']; }
if (MUT === 'skills') { D.CLASS_BY_NAME['Summoner'].classSkills = ['Craft', 'Fly']; }

let pass = 0; const fails = [];
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fails.push({ label: label, expected: e, actual: a }); }
}

/* ---------------------------------------------------------------- the verified tables */
const BOOK = {
  'Bard': {
    spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
    known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } },
  },
  'Cleric': {
    spd: { 1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 }, 5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 } },
  },
  'Druid': {
    spd: { 1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 }, 5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 } },
  },
  'Paladin': {
    spd: { 1: {}, 2: {}, 3: {}, 4: { 1: 0 }, 5: { 1: 1 }, 6: { 1: 1 }, 7: { 1: 1, 2: 0 } },
  },
  'Ranger': {
    spd: { 1: {}, 2: {}, 3: {}, 4: { 1: 0 }, 5: { 1: 1 }, 6: { 1: 1 }, 7: { 1: 1, 2: 0 } },
  },
  'Sorcerer': {
    spd: { 1: { 1: 3 }, 2: { 1: 4 }, 3: { 1: 5 }, 4: { 1: 6, 2: 3 }, 5: { 1: 6, 2: 4 }, 6: { 1: 6, 2: 5, 3: 3 }, 7: { 1: 6, 2: 6, 3: 4 } },
    known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 2 }, 3: { 0: 5, 1: 3 }, 4: { 0: 6, 1: 3, 2: 1 }, 5: { 0: 6, 1: 4, 2: 2 }, 6: { 0: 7, 1: 4, 2: 2, 3: 1 }, 7: { 0: 7, 1: 5, 2: 3, 3: 2 } },
  },
  'Wizard': {
    spd: { 1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 }, 5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 } },
  },
  'Alchemist': {
    spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
  },
  'Inquisitor': {
    spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
    known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } },
  },
  'Oracle': {
    spd: { 1: { 1: 3 }, 2: { 1: 4 }, 3: { 1: 5 }, 4: { 1: 6, 2: 3 }, 5: { 1: 6, 2: 4 }, 6: { 1: 6, 2: 5, 3: 3 }, 7: { 1: 6, 2: 6, 3: 4 } },
    known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 2 }, 3: { 0: 5, 1: 3 }, 4: { 0: 6, 1: 3, 2: 1 }, 5: { 0: 6, 1: 4, 2: 2 }, 6: { 0: 7, 1: 4, 2: 2, 3: 1 }, 7: { 0: 7, 1: 5, 2: 3, 3: 2 } },
  },
  'Summoner': {
    spd: { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3, 2: 1 }, 5: { 1: 4, 2: 2 }, 6: { 1: 4, 2: 3 }, 7: { 1: 4, 2: 3, 3: 1 } },
    known: { 1: { 0: 4, 1: 2 }, 2: { 0: 5, 1: 3 }, 3: { 0: 6, 1: 4 }, 4: { 0: 6, 1: 4, 2: 2 }, 5: { 0: 6, 1: 4, 2: 3 }, 6: { 0: 6, 1: 4, 2: 4 }, 7: { 0: 6, 1: 5, 2: 4, 3: 2 } },
  },
  'Witch': {
    spd: { 1: { 0: 3, 1: 1 }, 2: { 0: 4, 1: 2 }, 3: { 0: 4, 1: 2, 2: 1 }, 4: { 0: 4, 1: 3, 2: 2 }, 5: { 0: 4, 1: 3, 2: 2, 3: 1 }, 6: { 0: 4, 1: 3, 2: 3, 3: 2 }, 7: { 0: 4, 1: 4, 2: 3, 3: 2, 4: 1 } },
  },};

Object.keys(BOOK).forEach(function (name) {
  const c = D.CLASS_BY_NAME[name];
  if (!c) { fails.push({ label: name + ' exists', expected: 'a class', actual: 'undefined' }); return; }
  const cast = c.casting || {};
  ['spd', 'known'].forEach(function (kind) {
    if (!BOOK[name][kind]) return;
    Object.keys(BOOK[name][kind]).forEach(function (lv) {
      eq(name + ' ' + kind + ' level ' + lv, (cast[kind] || {})[lv] || {}, BOOK[name][kind][lv]);
    });
  });
});

/* ------------------------------------------------- proficiencies and skills that were wrong */
eq('Witch is proficient with all simple weapons',
   D.CLASS_BY_NAME['Witch'].prof.weapons, ['simple']);
eq('Witch wears no armour and carries no shield',
   D.CLASS_BY_NAME['Witch'].prof.armor, []);
eq('Inquisitor carries the four APG bows/crossbows',
   ['hand crossbow', 'longbow', 'repeating crossbow', 'shortbow'].filter(function (w) {
     return D.CLASS_BY_NAME['Inquisitor'].prof.weapons.indexOf(w) >= 0;
   }).length, 4);
eq('Summoner has Knowledge (all) — ten of them',
   D.CLASS_BY_NAME['Summoner'].classSkills.filter(function (s) {
     return s.indexOf('Knowledge') === 0;
   }).length, 10);

/* --------------------------------------------------- nothing is still awaiting a spot-check */
eq('no class table is still flagged verify:true',
   D.CLASSES.filter(function (c) { return c.verify; }).map(function (c) { return c.name; }), []);

console.log('\nPathfinder 1E Character Builder — class table tests');
console.log('  pass ' + pass + '   fail ' + fails.length);
if (fails.length) {
  console.log('\nFailures:');
  fails.forEach(function (f, i) {
    console.log('  ' + (i + 1) + '. ' + f.label + '\n     expected ' + f.expected + '\n     actual   ' + f.actual);
  });
  process.exit(1);
}
