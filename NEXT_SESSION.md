# NEXT SESSION — Pathfinder 1E Character Builder

**Updated 2026-09-09.** Everything below was checked in the session that wrote it, not recalled.

> **Read this first, then `CHANGES.md` entries (j) back to (a).** `README.md` is the reference
> for what the app does; this file is the state of play and the traps.

---

## Where it stands

| | |
|---|---|
| **Live** | https://reunion2027-twosnakes.com/builder/ |
| **Build stamp** | `6f694c524094` (`GET /api/build`) — moved 2026-09-10 by (k)+(l) |
| **Git** | `12acd4e`, 7 commits, **0 unpushed** — but the working tree is **DIRTY**: 5 modified + untracked `class_table_tests.js` (the class-table fixes, uncommitted and undeployed; see Open items 1) |
| **Remote** | `git@github.com:two-snakes2027/pf1e-character-builder.git` (private) |
| **Tests** | **695** assertions, **20** mutations all proven to fail |
| **Stored characters** | 1 (Rango, `__dm__`) |
| **Services** | `two-snakes`, `pf1cb`, `caddy` — all active |

Source of truth is this Mac + GitHub. `/opt/pf1cb` on the VPS is a **deployed copy, not a repo** —
never edit there.

---

## Architecture in one screen

```
reunion2027-twosnakes.com
  /            -> two-snakes  :3000   the game (separate repo, separate deploy)
  /builder/*   -> pf1cb       :8732   this app, prefix stripped by Caddy handle_path
```

**Identity is delegated. This app has no passwords.** `whoAmI()` forwards the caller's cookie to
the game's `/me` and trusts the answer. One login for both; signing out of the game locks the
builder in the same instant. If the game is down the builder fails **closed** (503), never open.

**Import reads the game's `/data/get`**, so the game's own `canRead()` decides what is visible —
a player sees their own `ts_char:` + `ts_hist:` records, the DM sees all, and `ts_apikey` and
every `ts_user:` PIN record are refused. Nothing on this side can widen that.

**Same origin is the whole trick.** It is what lets the `ts_sess` cookie reach both apps.
Consequence: **the builder's own API calls must stay RELATIVE** (`api/me`, not `/api/me`) or they
leave the builder and land next to the game's `/api/chat`.

`js/engine.js` never touches the DOM; `js/ui.js` never computes a rule. That split is what makes
the test suites possible — keep it.

---

## Scope, and why it is where it is

`RIDDLE_OF_STEEL.md` §2 is marked RESOLVED and decides most of it: build a legal 1st, level to
3rd, free multiclassing, **+2 STR / +2 CON** to everyone, ladder **3 → 7**.

- **Levels 1–7 only.** Nothing past 7 exists in the class tables.
- **Spells 0–4 only.** A 7th-level character cannot cast above 4th. This is deliberate, not a gap.
- **Humans only** (owner, locked). The other six Core races are absent, not hidden.
- **Warn, never block.** Illegal choices are reported and permitted. The DM decides.

---

## Open items

1. ~~Four APG class tables are unverified.~~ **CLOSED 2026-09-09 — and it was worse than the
   flag said.** All 12 casting classes were checked cell-for-cell against d20pfsrd *and*
   Archives of Nethys (agreeing everywhere). **29 cells were wrong across seven classes** — three
   of the four flagged ones, plus Cleric, Druid, Bard, Paladin and Ranger, none of which was
   flagged. Witch's tables were correct. See CHANGES (k). `class_table_tests.js` now pins every
   value, so this cannot silently drift again. **DEPLOYED 2026-09-10 22:21 UTC** — the suite
   passes 124/124 when run against the bytes downloaded from production, so the corrected cells
   are live, not merely committed.

   **Verified:** spells/day, spells known, per-level BAB and saves, hit die, skill ranks,
   proficiencies and class skills, for all 12 casting classes, levels 1-7.
   **Not verified:** the `features[]` prose (names and level placement were read, wording was
   not line-checked against the book), and the five non-casting classes — Barbarian, Fighter,
   Monk, Rogue, Cavalier — whose pages were never scraped. Their BAB/save/skill entries have
   never been checked against a source.
2. **Level-1 overwrite gap.** A re-import overwrites the build on file unless that build is a
   *higher level*. A level-1 build carrying feats, skill ranks or armour is overwritten without a
   prompt, because the rule is level-based as specified. Extend to "any real work" if it bites.
3. **Feats and spells are a large working subset** of Core + APG, not the complete lists. Custom
   entries and free text cover the rest.
4. **Weapon matching under-matches on purpose.** A pregame "broad sword" lands in gear with its
   description rather than being assigned a stat block it may not deserve.
5. `pf1cb_access.json` is still in `.gitignore` though the access-code system is gone. Harmless.
6. **Non-ability Arduin mods are inert.** `E.abilityScores` reads only the six ability keys, so
   Boomer's `maxHp: -2` ("Congenital Analgesia") is imported, listed on the Arduin card, and
   never reaches HP. One live case today. Not fixed — the owner has not asked.
7. **12 of the 38 live Two Snakes characters have no Arduin stored at all** (Hakim, Ziggerdoo,
   Huck Finis, Rango, Brona, Dude, Miscy, Houndog, Mel the Swell, Gorgar, Bitumen, Will Wist).
   The importer carries one whenever it exists — verified on all 26 that have one — so this is a
   gap on the Two Snakes side, not here.

---

## Operations

```bash
./run.sh            # local, port 8732
./test.sh           # all suites + the mutation runs that prove they can fail
node devproxy.js    # local stand-in for Caddy + the game; see below
```

**Deploy** (the exact command used all session):

```bash
rsync -a --exclude 'backups/' --exclude 'pf1cb_data.json*' --exclude 'devproxy.js' \
  --exclude '.git' --exclude '.claude' --exclude '.DS_Store' \
  ./ root@172.234.254.210:/opt/pf1cb/
ssh root@172.234.254.210 'chown -R deploy:deploy /opt/pf1cb && systemctl restart pf1cb'
```

Back up `/opt/pf1cb/pf1cb_data.json` into `/opt/pf1cb/backups/` first when players have work in
it. A restart costs nobody anything — the browser holds the working copy.

**`devproxy.js` is the only honest way to test a change before deploying.** It reproduces the
three things that exist only in production: the `/builder/` prefix being stripped, one shared
origin for the cookie, and `/me` + `/data/get` belonging to the game. Point it at real data with
`PF1CB_SNAPSHOT=/path/to/blob.json`. **Dev only — excluded from every deploy.**

`journalctl -u pf1cb` · `systemctl status pf1cb` · Caddy route in `/etc/caddy/Caddyfile`
(backups: `/etc/caddy/Caddyfile.pre-builder.*`).

---

## Traps this project has already paid for

**Read these before editing. Each one cost real time in the session that wrote this file.**

1. **A tab open across a deploy runs old code.** It imported a character three times with
   all-10 scores and no spells, and saved it twice *hours* after the fix was live. The served
   files were correct throughout. `GET /api/build` + `js/staleguard.js` now catch it, and the
   stamp hashes **every served file** — an HTML-only stamp would have missed it, because the
   stale assets were `ui.js` and `import_twosnakes.js`.

2. **`node --check` is not a completeness check.** A line-numbered edit removed `wireTab2`,
   `renderSkills` and everything between. The file stayed syntactically valid, so the check
   passed while tab 2 was dead. **Assert the functions still exist**, not just that it parses.

3. **A 4-space search string matches inside a 6-space line.** `'    </div>'` occurs inside
   `'      </div>'`. That truncated a card, left a stray `</div>`, closed `<section>` early, and
   dropped four cards *out* of tab 2 while the page still looked plausible. **Move markup by
   matching `<div>` depth, and check every panel's balance afterwards** — and then check the
   *served* page, not just the local file.

4. **Duplicate prevention in the browser only stops one device.** `findByTwoSnakesKey` scans
   localStorage; a laptop and a phone each find nothing and each write a record. The rule is now
   also in the server's PUT handler, which is the one place every device shares.

5. **Diagnose from the user's screen, not from a path you invented.** "Spells are not showing"
   was true — they were on tab 2 while the owner was on tab 1, looking at a card headed
   *Spellcasting* with no spells in it. Two exchanges were spent verifying paths nobody was on.
   **Ask for a screenshot early.**

6. **`ssh host 'cmd'` allocates no TTY** (`nano` → *Error opening terminal*), macOS is **zsh**
   (`read -rsp` is bash and silently yields empty), `sudo -u deploy` **cannot write to /etc**,
   and `printf '%s'` with no newline makes `read` return non-zero, which `set -e` turns into a
   silent exit. All four broke a one-liner handed to the owner. **Test the literal command.**

7. **A flag marks suspicion, not safety — and its absence proves nothing.** Four class tables
   carried `verify: true`; seven were wrong. Cleric and Druid had an invented orison progression
   sitting in plain sight, unflagged, through 564 passing assertions. When you check the flagged
   thing, check its unflagged neighbours by the same method — it costs one more loop iteration.

8. **Verify the instrument, especially when it agrees with you.** Fetching these tables through
   a summarising model returned the Oracle table *shifted three rows down* — i.e. the file's own
   wrong numbers, relabelled onto other levels. Trusting it would have "confirmed" the bug. The
   hand-written replacement parser then had three bugs of its own (dropped literal `0` cells,
   mis-sliced AoN's two-section tables, right-aligned rows with a collapsed trailing cell), each
   producing a plausible wrong answer. **Every one surfaced as a value that made no sense — none
   as an error.** A parser that reports numbers is not a parser that reports *correct* numbers.

9. **Never print a secret.** The DM PIN was leaked into a transcript by `cat`-ing a temp file
   after being careful everywhere else. It has been rotated. Compare secrets by **hash**.

---

## Files

```
character_builder.html   the page (served at /builder/)
css/styles.css           light, dark, print
js/data/core.js          abilities, 35 skills, race, sizes, carry, XP, wealth-by-level
js/data/classes.js       17 classes, levels 1-7  <- 4 flagged verify:true
js/data/equipment.js     73 weapons, armor, shields, 56 gear, 31 magic items
js/data/feats.js         233 feats with machine-readable prerequisites
js/data/spells.js        212 spells, levels 0-4
js/engine.js             all derivation + rules checking, no DOM
js/storage.js            local draft + explicit server commit + delegated identity
js/staleguard.js         stale-tab detector
js/import_twosnakes.js   Two Snakes -> PF1E mapping
js/ui.js                 the four tabs
server.js                identity delegation, per-player storage, one-build-per-character
devproxy.js              LOCAL ONLY — stand-in for Caddy + the game
engine_tests.js / import_tests.js / server_tests.js / class_table_tests.js / test.sh
```

**Tab layout:** 1 Combat & Stats (+ Spellcasting **and Spells**) · 2 Skills, Feats & Abilities ·
3 Items & Wealth · 4 Notes & Background.

---

## Saving, in one paragraph

Editing writes a **local draft** only. The **Save** button (or ⌘/Ctrl-S) is the only thing that
writes the server. The badge reads `saved` / `unsaved changes` / `saving…` / `save failed`, and
closing with unsaved work raises the browser's confirm. What another device sees, and what comes
back next sign-in, is the last **committed** version.
