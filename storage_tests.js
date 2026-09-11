/* Pathfinder 1E Character Builder — local draft rules.

   These exist because of a real report (2026-09-10). The character picker showed FOUR rows
   reading "(unnamed)", indistinguishable from each other, alongside characters belonging to a
   login the browser had used earlier. The owner: "You should never save or have as a selection
   option more than one (unnamed) character. Players shouldn't be able to save an unnamed
   character."

   storage.js runs in the browser but is a plain IIFE over a window stub, so it can be driven
   here directly.

   node storage_tests.js
   node storage_tests.js --mutate=<nohusk|noscope>   to prove a check can fail */
'use strict';
const MUT = (process.argv.find(function (a) { return a.indexOf('--mutate=') === 0; }) || '').split('=')[1] || null;

/* A localStorage stand-in. storage.js enumerates it with Object.keys(), exactly as the real
   one allows, so the stub keeps its entries as OWN PROPERTIES rather than hiding them behind a
   Proxy — the first version of this file used a Proxy and Object.keys() came back empty, which
   made every assertion below fail for a reason that had nothing to do with the code under test. */
const LS = {
  setItem: function (k, v) { LS[k] = String(v); },
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(LS, k) && typeof LS[k] === 'string' ? LS[k] : null; },
  removeItem: function (k) { delete LS[k]; }
};
['setItem', 'getItem', 'removeItem'].forEach(function (m) {
  Object.defineProperty(LS, m, { enumerable: false, value: LS[m], writable: true });
});
global.window = { localStorage: LS };

['core', 'classes', 'equipment', 'feats', 'spells', 'magic_import'].forEach(function (f) { require('./js/data/' + f + '.js'); });
require('./js/engine.js');
require('./js/storage.js');
const E = global.window.PF.ENGINE;
const S = global.window.PF.STORE;

if (MUT === 'nohusk') { S.isHusk = function () { return false; }; }
if (MUT === 'noscope') { S.visibleToCurrentUser = function () { return true; }; }

let pass = 0; const fails = [];
function ok(label, cond, detail) { if (cond) pass++; else fails.push(label + (detail ? '\n     ' + detail : '')); }
function eq(label, a, b) { ok(label, JSON.stringify(a) === JSON.stringify(b), 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }

function reset() { Object.keys(LS).forEach(function (k) { delete LS[k]; }); S.remote.user = ''; }
function draft(over) { return Object.assign(E.blankCharacter(), over || {}); }

/* ---------------------------------------------------------------- husks */
reset();
S.save(draft({ id: 'a' }));                                   /* empty, unnamed */
S.save(draft({ id: 'b' }));                                   /* empty, unnamed */
S.save(draft({ id: 'c', name: 'Conan' }));                    /* named */
S.save(draft({ id: 'd', levels: [{ cls: 'Sorcerer', n: 1 }] }));  /* unnamed but real work */

eq('four drafts written', S.rawList().length, 4);
const removed = S.pruneHusks('a');
eq('the empty unnamed husks are swept, except the open one', removed, 1);
const ids = S.rawList().map(function (c) { return c.id; }).sort();
eq('the named character and the unnamed-with-work both survive', ids, ['a', 'c', 'd']);

/* THE RULE THE OWNER ASKED FOR: never two rows a person cannot tell apart. */
const labels = S.list().map(function (c) { return c.name; });
eq('no two picker rows carry the same label', labels.length, new Set(labels).size);
ok('an unnamed draft holding work says what is in it',
  labels.some(function (l) { return /unnamed/.test(l) && /Sorcerer 1/.test(l); }), labels.join(' | '));
eq('exactly one bare unnamed row remains',
  labels.filter(function (l) { return /^\(unnamed\)$/.test(l); }).length <= 1, true);

/* ---------------------------------------------------------------- one browser, two people */
reset();
S.remote.user = 'bill';
S.save(draft({ id: 'bills', name: 'Boots' }));
S.remote.user = 'james';
S.save(draft({ id: 'jamess', name: 'Flerg' }));

const jamesSees = S.list().map(function (c) { return c.name; });
eq('james sees only his own draft', jamesSees, ['Flerg']);
S.remote.user = 'bill';
const billSees = S.list().map(function (c) { return c.name; });
eq('bill sees only his own draft', billSees, ['Boots']);

/* Signed out, nothing is hidden — a draft is still that browser's own work. */
S.remote.user = '';
eq('signed out, every local draft is listed', S.list().length, 2);

/* A draft written before drafts recorded an owner belongs to nobody and is shown to everyone,
   because hiding somebody's unsaved work is worse than one stale row. */
reset();
S.remote.user = 'bill';
const legacy = draft({ id: 'old', name: 'Legacy' });
delete legacy.localOwner;
LS['pf1cb:char:old'] = JSON.stringify(legacy);
eq('a draft from before owners existed is still visible', S.list().length, 1);

/* pruneHusks must never reach into another person's drafts. */
reset();
S.remote.user = 'james';
S.save(draft({ id: 'jhusk' }));
S.remote.user = 'bill';
S.save(draft({ id: 'bhusk' }));
S.pruneHusks(null);
const left = S.rawList().map(function (c) { return c.id; });
ok('bill sweeping his own husks leaves james\'s alone', left.indexOf('jhusk') >= 0, left.join(','));
ok('and bill\'s own husk is gone', left.indexOf('bhusk') < 0, left.join(','));

console.log('\nLocal draft tests' + (MUT ? '  [MUTATION: ' + MUT + ']' : ''));
console.log('  pass ' + pass + '   fail ' + fails.length);
if (fails.length) { console.log('\nFailures:'); fails.forEach(function (f, i) { console.log('  ' + (i + 1) + '. ' + f); }); }
process.exit(fails.length ? 1 : 0);
