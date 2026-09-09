# Deploying the Pathfinder 1E Character Builder

The owner chose VPS hosting alongside Two Snakes. **This has not been deployed.** Everything
below is written and tested locally; putting it on the live box is a deliberate act that should
happen when you want it, not as a side effect of building it.

The Two Snakes VPS is the source of truth for that game. This app is **completely separate**:
its own port, its own data file, its own access codes. It never reads `two_snakes_data.json`
and never writes anything the Two Snakes server owns. A player moves data across by exporting
from Two Snakes and pasting into the importer.

## 1. Before you touch the VPS

```bash
cd ~/Documents/"Pathfinder 1E CB"
./test.sh          # must end "All suites pass and every mutation is caught."
```

## 2. Pick a port and decide how it is reached

`server.js` defaults to **8732**. Two Snakes is already on the box; do not reuse its port.

Two options:

- **Subdomain via the existing reverse proxy** — e.g. `builder.reunion2027-twosnakes.com`
  proxying to `127.0.0.1:8732`. Preferred: the players get TLS from the same setup Two Snakes
  already uses, and the app is never exposed directly.
- **A path on the existing host** — `/builder/` proxied to `127.0.0.1:8732`. Workable, but the
  app assumes it is served from the root (`/api/...`, `/js/...`), so the proxy must strip the
  prefix.

**Do not open 8732 to the internet directly.** There is no TLS in `server.js`; access codes
would cross the network in the clear. It is written to sit behind the proxy that already
terminates TLS for Two Snakes.

## 3. Copy the app up

```bash
rsync -av --delete \
  --exclude 'backups/' --exclude 'pf1cb_data.json' --exclude 'pf1cb_access.json' \
  --exclude '.git' --exclude 'node_modules' --exclude '.DS_Store' \
  ~/Documents/"Pathfinder 1E CB"/ root@<vps>:/opt/pf1cb/
```

`server.js` serves from an **allowlist** — `character_builder.html`, `js/`, `css/` and nothing else — so the
test suites and `server.js` itself are not reachable over HTTP even though they sit in the
directory. (This was a real bug found in testing: a denylist served `/server.js` as a script.)

## 4. Create the access codes

On the VPS:

```bash
cd /opt/pf1cb
cat > pf1cb_access.json <<'EOF'
{
  "dm": "<a long random code>",
  "players": {
    "michael": "<code>",
    "huckleberry": "<code>"
  }
}
EOF
node server.js        # prints: Ingested N access code(s)
```

The server hashes each code (salted SHA-256) into `pf1cb_data.json` and tells you to delete the
plaintext file. **Do that:**

```bash
rm pf1cb_access.json
```

Codes are never written to the data file in plain text and never appear in the logs — there is a
test for both. Give each player their own code out of band. To add a player later, write a fresh
`pf1cb_access.json` containing only the new entries and restart; existing users are untouched.

The DM account (`dm`) can read and edit every character. Players see only their own.

## 5. Run it as a service

```ini
# /etc/systemd/system/pf1cb.service
[Unit]
Description=Pathfinder 1E Character Builder
After=network.target

[Service]
WorkingDirectory=/opt/pf1cb
ExecStart=/usr/bin/node /opt/pf1cb/server.js
Environment=PF1CB_PORT=8732
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now pf1cb
systemctl status pf1cb
curl -s localhost:8732/api/health
```

## 6. Verify what is actually being served

```bash
curl -s https://<host>/api/health                       # {"ok":true,...}
curl -s -o /dev/null -w '%{http_code}\n' https://<host>/pf1cb_data.json    # 404
curl -s -o /dev/null -w '%{http_code}\n' https://<host>/server.js          # 404
curl -s -o /dev/null -w '%{http_code}\n' https://<host>/engine_tests.js    # 404
curl -s https://<host>/api/characters                   # {"error":"not signed in"}
```

Then sign in as a player in a browser, make an edit, and confirm the badge reads
`synced · <name>`.

## 7. Backups

`pf1cb_data.json` holds every character and the password hashes.

```bash
# /etc/cron.daily/pf1cb-backup
cp /opt/pf1cb/pf1cb_data.json /opt/pf1cb/backups/pf1cb_$(date +%F).json
```

Writes are atomic (temp file then rename), so a backup taken mid-write still gets a complete
file. Players can also hit **Export** for a personal copy at any time.

## 8. Updating

The app is offline-first: a restart mid-session costs nobody their work, because the browser
holds the working copy and re-pushes on the next edit.

```bash
rsync ...            # as in step 3
systemctl restart pf1cb
```

`pf1cb_data.json` is excluded from the rsync, so an update never touches player data.

## Rolling back

```bash
systemctl stop pf1cb
cp /opt/pf1cb/backups/pf1cb_<date>.json /opt/pf1cb/pf1cb_data.json
# restore the previous app files
systemctl start pf1cb
```
