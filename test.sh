#!/bin/sh
# Every suite, plus the mutation runs that prove each suite can fail.
set -e
echo "=== engine ==="; node engine_tests.js
echo "=== import ==="; node import_tests.js
echo "=== server ==="; node server_tests.js
echo "=== class tables ==="; node class_table_tests.js
echo
echo "=== mutation checks (each MUST fail) ==="
for m in bab save mod crit skillrank hp ac bonusspells pointbuy; do
  if node engine_tests.js --mutate="$m" >/dev/null 2>&1; then
    echo "  !! engine --mutate=$m PASSED — that formula is not covered"; exit 1
  else echo "  ok engine --mutate=$m fails as it should"; fi
done
for m in nostats nospells noskillranks notseized dropgear dropard weaponmatch nomagic; do
  if node import_tests.js --mutate="$m" >/dev/null 2>&1; then
    echo "  !! import --mutate=$m PASSED — that mapping is not covered"; exit 1
  else echo "  ok import --mutate=$m fails as it should"; fi
done
for m in spd known prof skills; do
  if node class_table_tests.js --mutate="$m" >/dev/null 2>&1; then
    echo "  !! class table --mutate=$m PASSED — that table is not covered"; exit 1
  else echo "  ok class table --mutate=$m fails as it should"; fi
done
echo
echo "All suites pass and every mutation is caught."
