# Pathfinder 1E Character Builder

A standalone character builder for **The Riddle of Steel**, the four-day Pathfinder 1E game in
Albuquerque, Spring 2027. Nothing here depends on the Two Snakes app at runtime — it only reads
a Two Snakes export when a player chooses to import their captured character.

```bash
./run.sh          # http://localhost:8732
./test.sh         # every suite + the mutation runs that prove they can fail
```

It also runs with no server at all: open `character_builder.html` directly, or serve the folder statically.
In that mode characters live in the browser and travel by Export / Load file.

---

## The banner

The header carries the emblem and the title in the Two Snakes house style — Cinzel in `#CC0000`
over `#0D0D0D`, with `mix-blend-mode: lighten` dropping the emblem's black so only the red
linework floats, exactly as `two_snakes.html` does it.

The band stays dark in **both** themes on purpose. `lighten` resolves to white over a light
backdrop, which would erase the emblem entirely. One faithful treatment beats two divergent ones.

`riddle.png` (768×1024, 1.05 MB) is kept as the source. The banner and favicon use
`riddle-banner.png` — 168×224, **29 KB**, generated with `sips -Z 224`, which covers a 3×
display at the 54px render size. A server test asserts the served image is under 120 KB so the
full-size file cannot creep back in.

Cinzel and JetBrains Mono come from Google Fonts. With no network the fallback stacks take over
and nothing breaks — worth knowing if you run this offline at the table.

## What it covers

**Core Rulebook + Advanced Player's Guide**, scoped to what this campaign can reach.

| | |
|---|---|
| Classes | 17 — the 11 Core plus the APG's Alchemist, Cavalier, Inquisitor, Oracle, Summoner, Witch |
| Levels | **1–7**, with free multiclassing |
| Races | **Human only** — house rule, locked. The Hyborian Age has no elves or dwarves. Homeland is flavour. |
| Skills | all 35 |
| Feats | 233, with machine-readable prerequisites |
| Spells | 212, **levels 0–4 only** |
| Weapons | 73, full Core table |
| Armor | 13 suits + 7 shields |
| Gear | 56 items, 31 magic items |

**Why levels 1–7 and spells 0–4.** `RIDDLE_OF_STEEL.md` §2 fixes the ladder: built as a legal
1st, levelled to 3rd, then 4 / 5 / 6 across the four days, with 7 earned after Doom. A 7th-level
character cannot cast above 4th level, so nothing higher is carried. This is a deliberate scope
line, not an omission.

## The four tabs

1. **Combat & Stats** — abilities with point buy, HP, AC (with touch and flat-footed and a full
   source breakdown), initiative, speed, saving throws, BAB, CMB, CMD, and every weapon's attack
   bonus, full-attack routine, damage, threat range, crit multiplier, damage type and range.
2. **Skills, Feats & Abilities** — the skill table with every contributing term shown separately,
   feats with live prerequisite checking, class features granted automatically by class and
   level, a box for the rolled **Arduin** special ability, and free-form other abilities.
3. **Items & Wealth** — carried weight against the encumbrance thresholds, coin, gear, a magic
   item section whose worn items feed the numbers on tab 1, gear value against wealth-by-level,
   and XP.
4. **Notes & Background** — background, appearance, personality, allies, session notes, and the
   provenance panel for an imported character.

## House rules baked in

- **+2 STR / +2 CON** to every character (§2, the three years at the wheel). Shown as a separate
  term on the ability block, never folded into the point buy.
- **Humans only.**
- **Milestone advancement**, so an XP total below the medium-track threshold is a note, not a
  complaint.

## Warn, never block

Nothing in the app prevents an illegal choice. Unmet feat prerequisites, over-budget point buy,
skill ranks past the level cap, non-proficient weapons, alignment/class conflicts, over-guideline
wealth — all appear in the **Rules Check** panel and none of them stop you. The DM decides.

Two consequences worth knowing:

- A feat you don't qualify for is *marked* in the picker, not hidden.
- A non-proficient weapon's −4 is already inside the attack bonus shown.

## Importing from Two Snakes

**Import from Two Snakes** accepts a whole `two_snakes_data.json`, a single `ts_char:` record, or
one bare `charData` object, pasted or chosen as a file. It carries across name, gender, alignment,
homeland, deity, class as a starting suggestion, named gear, coin, and the rolled Arduin.

**It deliberately does not copy the pregame ability scores.** Those sheets were characterization,
never stat blocks — a typical one is 18/12/14/16/17/12, which no point buy can produce. §2 says
"rebuild to PF1E-legal, keeping identity and named gear", so the pregame line is shown on the
Notes tab for reference while you do a real point buy alongside it. The pregame `luck` stat has
no PF1E equivalent and is kept as reference only.

## Accuracy, honestly

The Core tables — classes, BAB and save progressions, skills, weapons, armor, the combat maths —
were entered carefully and are covered by 112 hand-worked tests.

**Four APG class tables (Inquisitor, Oracle, Summoner, Witch) are flagged `verify: true`** in
`js/data/classes.js`. They were entered from recall with lower confidence than the Core ones, and
the app says so on screen: any character with levels in them shows *"this class table was entered
from recall and is flagged for a book spot-check"*. Check spells per day and spells known against
the APG before those characters see play. The flag is in the data, not in anyone's memory.

The feat and spell lists are a large working subset, not exhaustive. Anything missing can be
added as a custom item or a free-text special ability.

## Testing

`./test.sh` runs three suites and then re-runs them against deliberately broken code:

- `engine_tests.js` — 112 checks, every expected value worked by hand from the CRB
- `import_tests.js` — 128 checks, run against the **real** `two_snakes_data.json` when present
- `server_tests.js` — 52 checks over real HTTP, including the cross-player authorization boundary

Each suite takes `--mutate=<name>`, which breaks one formula before testing. A mutation that
produces no failure means that formula is not actually covered. `test.sh` fails the run if any
mutation passes.

## Files

```
character_builder.html   the app shell
css/styles.css        light + dark + print
js/data/core.js       abilities, skills, races, sizes, carrying capacity, XP, wealth-by-level
js/data/classes.js    17 classes, levels 1-7
js/data/equipment.js  weapons, armor, shields, gear, magic items
js/data/feats.js      233 feats with prerequisites
js/data/spells.js     212 spells, levels 0-4
js/engine.js          all derivation and rules checking — pure, no DOM
js/storage.js         localStorage + offline-first server sync
js/import_twosnakes.js
js/ui.js              the four tabs
server.js             optional server: login, per-player storage, DM sees the party
```

`js/engine.js` never touches the DOM and `js/ui.js` never computes a rule. That split is what
makes the test suites possible.

## Deploying

See `DEPLOY.md`.
