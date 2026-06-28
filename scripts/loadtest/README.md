# Load / abuse harness (k6)

The **live** half of the Stress & Attack stage. Proves the hardened endpoints
**shed** under load (429 / 409 / 503) instead of falling over (500 / pool
exhaustion). Pairs with the static `attack-proof-audit` workflow.

## ⚠️ Never point this at production
Load-testing prod is self-DoS. Run against **localhost** or a **staging/preview**
deploy only. (Default `BASE_URL` is `http://localhost:3001`.)

## Install k6
- macOS: `brew install k6`
- Windows: `winget install k6` (or `choco install k6`)
- Docs: https://k6.io/docs/

## Run

```bash
# 1) Start the app locally (dev server on 3001) or use a staging URL.
# 2) Grab a valid session cookie from your browser devtools (the `ss_auth=...`
#    cookie) so the authenticated write scenario can run. Optional — without it,
#    the write scenario just exercises the 401 path.

k6 run scripts/loadtest/endpoints.test.js \
  -e BASE_URL=http://localhost:3001 \
  -e SESSION_COOKIE="ss_auth=PASTE_HERE"
```

## What it asserts
- **write_abuse** (`POST /api/cocktails/create` at 30 req/s): every response is
  one of `200 / 409 / 429 / 503` and **never `500`**. That's the hardening
  working — rate limit (8/min), per-user cap (100), and pool-exhaustion shedding.
- **read_load** (`GET /api/cocktails` ramped to 50 VUs): responses are `200`
  (served from the data cache) or `503` (graceful shed), never a 500. Confirms
  the dynamic-route data cache absorbs the read storm.

## Cleanup
The write scenario creates rows named `loadtest-*`. Remove them with:

```bash
ATTACK_NAME_PREFIX=loadtest- npx tsx scripts/cleanup-attack-cocktails.ts --apply
```

(The cleanup script matches an exact name by default; pass the prefix env to
sweep load-test rows. Run dry first without `--apply`.)
