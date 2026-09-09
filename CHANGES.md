# CHANGES — Pathfinder 1E Character Builder

Newest first. Each entry says what changed, why, and how to undo it.

---

## 2026-09-09 — (j) SPELLS LIVE ON TAB 1

The full spell list — per-spell school, effect, casting time, range, duration, save, SR,
components and computed DC — now sits on **tab 1 directly under Spellcasting**, where the owner
looked for it. Tab 2 was already the fullest tab even without spells. The compact duplicate
summary added in (i) is gone; the real list is right beneath the slots.

**Two self-inflicted breakages while doing it, both from editing HTML and JS by naive text
search.** Worth recording because the pattern is the same one twice:

1. **`node --check` is not a completeness check.** A python edit cut a block from `ui.js` by
   line number and removed `wireTab2`, `renderSkills` and everything between. The file was still
   *syntactically valid*, so `--check` passed cleanly while tab 2 was dead. Restored from the
   pushed commit and redone with content-anchored boundaries plus a brace-balance assertion.

2. **A 4-space search string matched inside a 6-space line.** Extracting the spells card ended
   at `'    </div>\n'`, which occurs as a substring of `'      </div>\n'`. That truncated the
   card and left a stray `</div>`, which closes `<section>` early — so Skills, Feats, Class
   Features and Arduin all fell OUT of tab 2 and rendered orphaned outside any panel. The page
   still looked plausible; only a DOM query found it.

The move is now done by **matching `<div>` depth**, with assertions that the extracted block is
balanced, contains the fields it should, and swallows no named function — and every panel's
div balance is checked before writing, and again against the served page after deploying.

**Verified live:** p1–p4 all balanced; skills, feats, class features and Arduin back inside p2;
Spellcasting and Spells both in p1; 4 spell entries rendering for Rango.

---

## 2026-09-09 — (i) SPELLS WHERE PEOPLE LOOK · SKILL RANKS · SEIZED GEAR

**"Spells are not displayed" — and the spells were rendering perfectly.** On tab 2. The owner
was on **tab 1**, which carries a card headed **SPELLCASTING** that showed slots and nothing
else. Looking at the card called Spellcasting and seeing no spells is a completely reasonable
way to conclude the spells are missing. The information architecture was wrong, not the code.

I made this worse by diagnosing from the wrong evidence twice: first I checked a **fresh
import** when the owner was looking at a **saved character reloaded from the server**, and
declared it fine; then I verified the live files and the stored record and still could not
reproduce it. Both times the correct move was to ask what was on screen. A screenshot settled
it in seconds.

**Fixed:** the tab 1 Spellcasting card now lists the spells themselves, grouped by level, with a
button that jumps to the full detail on tab 2. Tab 2 keeps the per-spell summaries.

**Also fixed, visible in that same screenshot:** slot lines read **"1th 2"**. The level was being
concatenated with a hardcoded `'th'`, so every level was wrong except 4th. Now a lookup table —
1st, 2nd, 3rd, 4th. And a wizard's 0-level spells were labelled **orisons**; arcane casters call
them cantrips. `zeroLabel` is set per class (divine → orisons, everything else → cantrips).

### One rank per pregame skill (owner)

Every skill on the Two Snakes sheet now earns exactly **1 rank**. A rank is the smallest unit
that actually means "this character can do this": it switches on the +3 class-skill bonus and
lifts a trained-only skill out of unusable. One rank stays inside the 1st-level cap, so an
import is not instantly illegal on that axis — the skill-point budget is separate and the rules
check reports it plainly. Rango picks up Spellcraft, Knowledge (arcana), Knowledge (history),
Linguistics, Stealth and Survival (his "Track").

### Imported gear is seized (owner)

These characters come out of three years at the wheel and the Main Game opens with their
possessions taken. Items import as `name (seized)` with a note saying what happened. **Weapons
keep their rulebook name** — renaming them would break the weapon-table lookup that produces
attack and damage — so they carry a `seized` badge in the weapons table instead, and none
arrive equipped. Tab 3 shows a banner with the count and what it means.

**Tests:** engine 112 · import 379 · server 73 = **564**, all 15 mutations caught, including two
new ones: `noskillranks` and `notseized`.

---

## 2026-09-09 — (h) ONE BUILD PER PREGAME CHARACTER, ENFORCED ON THE SERVER

**Found by making the mistake.** Entry (g) stopped a re-import from creating a second file —
but only in the browser that already held the first, because `findByTwoSnakesKey` scans
*localStorage*. I then imported Rango through the API while the owner's own import already sat
on the server, and produced exactly the duplicate (g) was supposed to prevent.

That is not just my slip. **Importing on a laptop and again on a phone** finds nothing locally
either time and writes two server records. With nine players on their own devices it was going
to happen. The client check cannot see other devices; the server is the one place they share.

**The rule now lives in the PUT handler**, keyed on `twoSnakes.key`, and mirrors the client's:

- a save that supersedes **lower- or equal-level** copies of the same pregame character folds
  them away silently and reports `merged: [ids]`
- a save that would discard a **higher-level** build is refused with **409** carrying the
  conflicting id, name, level and class line, so the UI can ask instead of the server guessing
- `force: true` carries out the replacement once the player has said so
- it is **per owner** — two players may each build from the same shared record
- a character with **no** `twoSnakes` provenance is never deduplicated, so from-scratch builds
  are untouched

The server computes level straight off the stored shape (`levelOf`); it has no engine and needs
none for this.

**Client:** `S.commit(ch, force)` passes the flag, surfaces a 409 as a typed `CONFLICT` error,
and `conflictModal()` names the level and classes at risk before offering to replace. A silent
fold-in is reported too, so a player is told when a stale copy from another device was absorbed.

**Tests:** server 56 → **73**. The two-device case, the higher-level refusal, `force`, the
per-owner boundary, and the from-scratch exemption. Mutation-proved by making the server ignore
`twoSnakes.key` — seven assertions fail. One of them originally *threw* rather than failing;
guarded, because a crashing assertion reports worse than a failing one (the same fix entry (c)
needed).

**Live:** deployed after backing up `pf1cb_data.json`; the owner's Rango (Wizard 1, saved 04:15)
survived intact. My duplicate was deleted before the deploy.

---

## 2026-09-09 — (g) STALE-TAB GUARD · RE-IMPORT OVERWRITES

**The bug that caused this.** A tab left open across the (f) deploy imported Rango three times
using the *previous* version's code — all-10 ability scores, no spells — and saved it to the
server twice more **two hours after the fix was live**. The served files were correct the whole
time. Nothing in the app could tell, and the remedy was a spoken "hard-reload", which is a hope
rather than a mechanism. A fix nobody loads is not deployed.

Two Snakes had already been bitten by this and built `GET /build` for it. **The difference here
is that this app is not one file:** the stale assets were `js/ui.js` and `js/import_twosnakes.js`,
so a stamp over `character_builder.html` alone would have missed the very bug that motivated it.

**`GET /api/build` hashes every file the server will actually serve** — the allowlisted files
plus everything under `js/` and `css/` — keyed on mtime+size so it is cheap to re-check.
**Proved on the live box:** appending one comment to `js/ui.js` moved the stamp
`403e0a8e…` → `09194910…` and restoring it moved it back.

**`js/staleguard.js`** compares the stamp against the one the tab loaded with, on a 5-minute
timer and on window focus / tab-visible — the moments a left-open tab is picked back up. It
**fails open always** (a blip, a 404 mid-restart, or an empty stamp is never treated as stale)
and **once stale, never flips back**. The banner is built in JS and appended to `<body>` so it
cannot be styled away, is not a modal, and its exit is the reload button.

**Import from a stale tab is refused, not warned** — it is the one action that looks like it
worked while silently producing a character with no scores and no spells. **Save is only warned**,
never blocked: the character on screen is the player's real work and losing it would be worse
than storing an old-shaped record.

### Re-import overwrites (owner)

One Two Snakes character should not become a pile of near-identical files — that is how three
Rangos happened. A re-import now **replaces** the build already on file, reusing its id so the
stored record is overwritten rather than multiplied, and clearing any extra copies.

**Unless the build on file is a HIGHER LEVEL than the import** (owner) — an import always
arrives at level 1, so replacing a level-3 build throws away levelling the pregame record cannot
give back. That case is a confirmed choice naming the level and classes at risk.

*Known gap, stated rather than hidden:* a level-1 build carrying feats, skill ranks or armour is
overwritten without a prompt, because the rule is level-based as specified. Say the word if that
should also prompt.

**Also fixed:** `HEAD` returned 405, which silently misled my own `curl -I` check of the cache
headers into reading an error response instead of the file's. It now serves headers without a body.

**Duplicates cleared:** all three stored Rangos deleted through the API with a DM session — never
by hand-editing the data file under a running server. Store is empty and ready for a clean import.

---

## 2026-09-09 — (f) EXPLICIT SAVE · RICHER IMPORT · SPELL SUMMARIES

**1. Saving is explicit.** The server used to be written on a 900ms debounce after every edit,
so the status badge churned on every keystroke and the stored copy moved while the player was
still deciding. Now `S.commit()` writes the server and only the **Save** button (or ⌘/Ctrl-S)
calls it.

The browser still writes a **draft** on every edit — that is a refresh/crash net, not a save,
and the UI says "unsaved changes" while one exists. What another device sees, and what comes
back next sign-in, is the last **committed** version. Closing the tab with unsaved work now
raises the browser's own confirm dialog.

The badge shows `saved` / `unsaved changes` / `saving…` / `save failed` and only re-renders on
a real transition, not per keystroke. Verified: seven ability edits plus a rename, waited 2.2s
(well past the old auto-push), server **unchanged**; pressed Save, it landed; wiped local
storage and reloaded, and the saved version came back with the unsaved rename correctly gone.

**2. Ability scores, hit points and known spells now import** (owner). This reverses the
original call, which left every score at 10 because a pregame line like 18/12/14/16/17/12 is far
outside any point buy. It still is — the difference is that the rules check now *says so* ("Point
buy spends 33 of 20 points — 13 over budget") and the player trims from a real starting point
instead of a row of tens. Warn, never block, doing its job.

`chr` maps to `cha`; `luck` has no PF1E equivalent and stays reference-only. Current HP carries
across **unless the run ended at or below 0** — a character being rebuilt should not open dead.
Every derived Vital Statistic (AC, saves, initiative, CMB/CMD) now recomputes close to the
pregame sheet *because* the scores came across; copying those outputs directly would be wrong,
since the first armour or class change would contradict them.

**3. Spells import as NAMES ONLY** (owner, explicitly). Two Snakes writes its own flavour text
and it differs from the Pathfinder rules, so nothing from `spellDescs` is read. Names are matched
case- and punctuation-insensitively against the Core+APG data, and every detail shown comes from
there. Pinned by tests that plant a `TWOSNAKES FLAVOUR` string in the fixture and assert it never
appears in the imported character, plus the same check across all 17 real characters — and
mutation-proved by deliberately carrying the prose across (3 assertions fire).

**4. Each spell now carries its essential line**: school, effect, then Casting / Range / Duration
/ Save / SR / Components as a fact strip, plus the computed save DC per casting class. Grouped by
spell level, with anything above the character's caster level badged, and anything absent from
the Core/APG data kept and labelled rather than dropped.

### Bugs found while doing it

10. **The status badge went stale after an import.** `renderSync()` is not part of `renderAll()`,
    so an import set `dirty = true` and then re-rendered everything *except* the badge, which
    kept reading "saved" over unsaved work.
11. **A dead character imported at 0 current HP.** Faithful to the record, useless on a sheet
    being rebuilt for the Main Game.
12. Two test expectations of mine were wrong, not the code: I forgot the fixture's Arduin grants
    +2 STR when predicting the imported total.

**Tests:** engine 112 · import 333 · server 56 = **501**, all 13 mutations caught. The
`copystats` mutation is now inverted to `nostats`, and `nospells` is new.

---

## 2026-09-09 — (e) RENAMED, WIRED TO TWO SNAKES, AND DEPLOYED

**Live at https://reunion2027-twosnakes.com/builder/**

**1. `index.html` → `character_builder.html`.** The static allowlist and the `/` default in
`server.js` follow it, and `server_tests.js` asserts the new name.

**2. Identity is delegated to Two Snakes — the builder has no passwords at all.** The
access-code system (hashes, salt, `pf1cb_access.json`, `/api/login`, `/api/logout`) is gone.
`whoAmI()` forwards the caller's cookie to the game's `/me` and trusts the answer.

Why this is better than what it replaced: one login instead of two, no second set of codes to
distribute or leak, and a player cannot assume another identity here without a valid game
session. Signing out of the game locks the builder in the same instant — verified against the
live site, 401 immediately after `/logout`. If the game is unreachable the builder fails
**closed** (503), never open, and says the player's work is safe in their browser.

**3. The import is Two Snakes characters only.** The paste box is gone. `I.fetchLive()` reads
`/data/get`, so the game's own `canRead()` decides what is visible — a player sees their own
records, the DM sees everyone's, and it refuses `ts_apikey` and every `ts_user:` PIN record.
Nothing on this side can widen that. **Building from scratch is untouched:** New works signed
out, and the sign-in prompt says so.

**4. Both key spaces are read.** `ts_char:<player>` is only the current slot; finished runs are
archived under `ts_hist:<player>:<name>` with the same shape. Reading only `ts_char` would have
hidden most of what §2 lets a player choose from — on the live box it is the difference between
8 and 52 records. A captured character exists in **both** at once, so the roster deduplicates by
player+name and keeps the live slot; that took the local corpus from 26 rows to 17 real people.

**5. Relative API paths.** Served under `/builder/`, an absolute `/api/me` would leave the
builder entirely and land next to the game's `/api/chat`. The client derives its base from
`location.pathname`, so it works at the site root locally and under `/builder/` in production.

**6. `devproxy.js`** — a local stand-in for the production Caddy + game pair, so the `/builder/`
deployment could be exercised end to end (prefix stripping, shared cookie, real `/data/get`
scoping) before it touched the VPS. Dev only; explicitly excluded from the deploy.

### Deployment

`/opt/pf1cb`, `pf1cb.service` on 127.0.0.1:8732 (hardened unit: `ProtectSystem=strict`, one
writable path), Caddy `handle_path /builder/*`. The Caddyfile was backed up and **validated
before reload**, and the game's route was re-verified 200 immediately after. Port 8732 is not
reachable from outside; `server.js`, the data file, the test suites and `backups/` all 404.

### Tests

Engine 112 · import 234 · server 56 = **402**, plus the mutation runs. The server suite was
rewritten around a stub game server, so the delegation itself is under test: no cookie, an
unknown cookie, a revoked cookie, a **client-supplied `X-User` header** (must not grant
identity — mutation-proved), lower-casing, the cross-player boundary, and the game being down.

**Undo.** `systemctl disable --now pf1cb`, restore `/etc/caddy/Caddyfile.pre-builder.*` and
reload Caddy. The game is unaffected either way.

---

## 2026-09-08 — (d) LAYOUT DENSITY

Three requested changes, all to `index.html`, `css/styles.css` and `js/ui.js`.

**1. Classes & levels moved beside Race.** It was a separate row under a rule at the bottom of
the identity card; it is now a cell in the identity grid, immediately after Race. The cell spans
two grid tracks because a multiclass line ("Fighter 2 / Rogue 1") does not fit a 140px track.
The `<hr>` and the old row are gone. On a phone the box wraps and the Edit button drops to a
second line rather than overflowing.

**2. Rules Check collapses.** A Show/Hide control in the heading, with `aria-expanded` and
`aria-controls` on it. Collapsed, the heading still carries the severity badge and a count of
the remaining notes, so nothing is hidden without a trace.

The state lives in a module variable seeded from `localStorage`, deliberately **not** in the
render path: the panel is rebuilt on every recompute, so a state held inside the render would
spring back open on every keystroke. Verified it survives a skill edit, an ability edit and a
full reload. The `localStorage` read and write are both wrapped — a browser blocking storage
loses the preference, not the feature.

**3. Ability Scores and Vital Statistics made denser.** Measured against the previous values by
re-applying the old sizes in the live page rather than estimating:

| | before | after | saved |
|---|---|---|---|
| Ability grid | 156px | 133px | **−23px** |
| Vital statistics | 202px | 156px | **−46px** |
| Rules Check, collapsed | 141px | 54px | **−87px** |

Sixty-nine pixels off the always-visible stats, and 156px in total with the rules check folded.
Score type dropped 26→21px, vital values 27→21px, with padding, gaps, labels and sub-lines
scaled to match; the current-HP input came down 24→19px so it still lines up with its neighbours.

**Also fixed:** typing a character name left the *"The character has no name yet"* warning
sitting on screen. The name binding only redrew the identity strip, never re-derived, so the
rules check went stale while the player looked straight at the name they had typed. Name and
alignment now trigger a recompute like the other rules-bearing fields.

**Undo.** Restore `backups/index.html.*`, `backups/styles.css.*` and `backups/ui.js.*` from this
date.

---

## 2026-09-08 — (c) DOWNSCALED BANNER IMAGE

**What.** The banner and favicon now use `riddle-banner.png` (168×224, **29 KB**) instead of
`riddle.png` (768×1024, 1.05 MB) — a **97.3% reduction**. Generated with `sips -Z 224`; 224px
tall covers a 3× display at the 54px render box (which renders 40.5×54 at 1×, so 162px at 3×).
The full-size original is kept untouched as the source.

Files: `index.html`, `server.js`, `server_tests.js`, `css/styles.css` (comment only), plus the
new `riddle-banner.png`. Original backed up to `backups/riddle.png.original.bak`.

**Guarded against regression.** `server_tests.js` now asserts the served emblem is under 120 KB
and that `index.html` references `riddle-banner.png` and no longer `src="riddle.png"`. Swapping
the full-size file back in fails the suite rather than quietly costing every player 1 MB a load.

**Also fixed:** static responses were sent without `Content-Length` (Node fell back to chunked
encoding). Added — it is what made the size assertion possible, and browsers get real progress
and better caching from it.

**A factual correction to entry (b).** I claimed the emblem's black surround was "baked in, not
an alpha channel". I had not measured it. Decoding the PNG shows **65.9% of pixels are fully
transparent** and the near-opaque dark pixels are 13.2% — interior linework, not a background
rectangle. The dark band is still correct (lighten over white erases the emblem regardless), but
the reason given was invented rather than checked. Entry (b) now carries the correction inline,
because a confident wrong statement in this file outlives the session that wrote it.

**Undo.** In `index.html` point the `<img>` and the icon link back at `riddle.png` with
`width="768" height="1024"`, and revert the two `server_tests.js` assertions.

---

## 2026-09-08 — (b) BANNER

**What.** A banner across the top of the app carrying `riddle.png` and the title
**The Riddle of Steel**, reproducing the Two Snakes header treatment.

**Copied from `two_snakes.html`** (read, not guessed): the `.zia` header composition — emblem
beside a title block — with `.at`'s Cinzel 600 in `--red` `#CC0000` at `letter-spacing:.05em`,
`.as2`'s JetBrains Mono subtitle in `--as` `#A89880`, on the `--ni` `#0D0D0D` ground, and
`.header-logo`'s `object-fit:contain` + `mix-blend-mode:lighten`. Cinzel and JetBrains Mono now
load from Google Fonts, the same pairing that app uses, with real fallback stacks.

Files: `index.html`, `css/styles.css`, `server.js`, `server_tests.js`.

**One deliberate difference from Two Snakes, and why.** Two Snakes drops the emblem's black with
`mix-blend-mode: lighten`, which only works over a dark backdrop; that app is dark-only, so it
never has to care. This app has a light theme, and `lighten` resolves to white there, which would
have erased the emblem completely. **The banner therefore keeps its own dark band in both themes**
rather than running two different treatments. Verified in both.

> **Correction (entry c, same day).** This entry originally said the black was "baked in — the
> glow sits on opaque black, not transparency". That was asserted without measuring and it is
> wrong. The image is **66% fully transparent**: the surround is not a black rectangle, and the
> black is interior linework (13% of pixels are near-opaque dark). The conclusion above is
> unaffected — lighten over white still erases everything — but the stated reason was not.
> Because the surround really is transparent, a light-theme variant with no blend mode would
> also work; it is simply a different look from Two Snakes.

The `<h1>` moved from the control bar into the banner, so the page has exactly one and the title
is not printed twice.

**Undo.** Restore `backups/index.html.*`, `backups/styles.css.*` and `backups/server.js.*` from
this date, and revert the `server_tests.js` addition.

### Two bugs found while doing it

8. **`riddle.png` would have 404'd once deployed.** The static allowlist was `index.html`,
   `favicon.ico`, `js/` and `css/`; the emblem sits at the root and matched none of them. It
   worked locally only because nothing had exercised it. Added to `SERVE_FILES`, with a
   `server_tests.js` check on both the status and the `image/png` content type so it cannot
   regress silently.

9. **The page scrolled sideways on a phone** — 420px of content in a 375px viewport. Pre-existing,
   not caused by the banner, but the banner made it visible: the dark band stopped short of the
   right edge. A grid item defaults to `min-width:auto`, so the saves table forced its card past
   the viewport instead of scrolling inside its own `.tbl-wrap`. Fixed with `min-width:0` on
   `.cols > *`, `.card` and `.tbl-wrap`. All three tabs now measure exactly 375 on a 375 viewport
   and the wide tables still scroll internally.

**Print.** The banner stays as the sheet header but drops the black band, the blend mode and the
animation — over white, `lighten` would have erased the emblem there too. Title prints black.

---

## 2026-09-08 — (a) INITIAL BUILD

**What.** A standalone Pathfinder 1E character builder for The Riddle of Steel, in
`~/Documents/Pathfinder 1E CB`. Four tabs, Core Rulebook + Advanced Player's Guide data scoped
to levels 1–7, an optional server for VPS hosting, and an importer for Two Snakes characters.

**Owner decisions this was built against** (asked and answered at the start of the session):
- Data depth: full tables, feats and spells as a large searchable subset with a custom escape hatch
- Hosting: on the VPS next to Two Snakes, with its own login
- Import: yes — import the captured character, then rebuild
- Strictness: **warn, never block**
- Races: **humans only** (owner, mid-session)

**Scope decided by `RIDDLE_OF_STEEL.md` §2, not by me.** §2 is marked RESOLVED and fixes the
ladder at 3 → 7 with free multiclassing and a +2 STR/+2 CON bump. So: levels 1–7 only, and
because a 7th-level character cannot cast above 4th level, spells stop at level 4. This cut the
spell list by more than half and removed every feat gated above +6 BAB.

**Files created.**

| File | What |
|---|---|
| `index.html` | app shell, four tabs |
| `css/styles.css` | light, dark and print |
| `js/data/core.js` | abilities, 35 skills, races, sizes, carry, XP, wealth-by-level |
| `js/data/classes.js` | 17 classes (11 CRB + 6 APG), levels 1–7 |
| `js/data/equipment.js` | 73 weapons, 13 armors, 7 shields, 56 gear, 31 magic items |
| `js/data/feats.js` | 233 feats with machine-readable prerequisites |
| `js/data/spells.js` | 212 spells, levels 0–4 |
| `js/engine.js` | all derivation + rules checking; no DOM |
| `js/storage.js` | localStorage + offline-first server sync |
| `js/import_twosnakes.js` | Two Snakes → PF1E mapping |
| `js/ui.js` | the four tabs |
| `server.js` | optional server: login, per-player storage, DM sees the party |
| `engine_tests.js` | 112 checks, hand-worked from the CRB |
| `import_tests.js` | 128 checks, run against real production data |
| `server_tests.js` | 52 checks over real HTTP |
| `README.md`, `DEPLOY.md`, `run.sh`, `test.sh`, `.gitignore` | |

**Undo.** Delete the directory. Nothing outside it was touched — no Two Snakes file was
modified, and `two_snakes_data.json` was only ever read.

---

### Bugs found and fixed during the build

Each of these was found by running the thing, not by reading it.

1. **Encumbrance armor-check penalty was stacking with the armor's own.** The engine added the
   two. Pathfinder applies the *worse* of the two (CRB p.171), not the sum. Caught by
   `engine_tests.js` test 8 (chainmail on a STR 10 rogue). Fixed in `E.derive`:
   `acp = Math.min(acp, loadEff.acp)`.

2. **Every keystroke destroyed the input being typed in.** Any edit triggered a full re-render,
   which replaced the focused element — typing "16" lost focus after the "1". Affected the
   ability grid, skills table, gear rows, saves and AC. Fixed generally: every dynamic input
   carries a stable `data-fk`, and `recompute()` captures and restores focus and caret.

3. **`server.js` was serving its own source over HTTP.** The static handler was a denylist
   (block `pf1cb_data.json`, etc.), so `/server.js` returned 200 with the full source. Replaced
   with an **allowlist**: `index.html`, `js/`, `css/`, nothing else. Caught by `server_tests.js`.

4. **The print stylesheet lost to the dark theme.** The print block set variables on plain
   `:root`, which is outranked by `:root:not([data-theme="light"])`. Anyone in dark mode would
   have printed a black page. Fixed by matching the specificity explicitly.

5. **Hidden elements rendered as empty bars.** `.wmsg { display: flex }` overrides the UA's
   `[hidden] { display: none }`. Visible as a stray olive bar in the sign-in modal. Fixed with a
   global `[hidden] { display: none !important; }`.

6. **A fresh device pushed a blank placeholder character to the server.** On boot with an empty
   local store the app saved an empty character before the sync pull landed, so every new device
   seeded a junk row. Fixed with `E.isPristine()`: the placeholder is not persisted, is never
   pushed, and is replaced by the newest pulled character when one arrives.

7. **A test used the wrong instrument.** `import_tests.js` grepped the whole import blob for
   `/pin/i` to check no credential rode along, and fired on "Set-wors**hipp**ing" in the Stygia
   description. Replaced with a walk over JSON *keys* plus a token-shape check on values. This
   is the "a word list is the errand" trap: a substring match over prose cannot answer a
   structural question.

Also corrected: one test expectation of mine was simply wrong — full plate is ACP −6, not −7.
The code was right and the test was wrong.

---

### Known limits, stated rather than hidden

- **Four APG class tables are flagged `verify: true`** — Inquisitor, Oracle, Summoner, Witch.
  Entered from recall with lower confidence than the Core tables. The app displays a
  spot-check notice on any character with levels in them. The flag lives in the data
  (`js/data/classes.js`), so it cannot be forgotten. Verify against the APG before play.
- Feats and spells are a large working subset of Core + APG, not the complete lists.
- Not deployed. `DEPLOY.md` has the procedure; running it is a separate decision.
- The importer under-matches weapons on purpose: a pregame "broad sword" lands in gear with its
  description intact rather than being assigned a stat block it may not deserve.
