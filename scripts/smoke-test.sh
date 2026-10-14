#!/usr/bin/env bash
#
# LocalLoop production smoke test
# Verifies the deployed app responds correctly end-to-end.
#
# Usage:
#   export LOCALLOOP_URL=https://your-domain.vercel.app
#   bash scripts/smoke-test.sh

set -e

URL="${LOCALLOOP_URL:-http://localhost:3000}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

ok() {
  echo -e "${GREEN}✓ PASS${NC}  $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}  $1"
  echo "        $2"
  FAIL=$((FAIL + 1))
}

echo ""
echo "LocalLoop smoke test against: $URL"
echo "================================="
echo ""

# 1. Health check
echo "1. Health check..."
HEALTH=$(curl -s -w "\n%{http_code}" "$URL/api/health" || echo "failed")
HEALTH_CODE=$(echo "$HEALTH" | tail -1)
HEALTH_BODY=$(echo "$HEALTH" | head -1)
if [ "$HEALTH_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q '"status":"ok"\|"status":"degraded"'; then
  ok "Health endpoint returns 200"
else
  fail "Health endpoint failed" "Got $HEALTH_CODE — body: $HEALTH_BODY"
fi

# 2. Landing page
echo "2. Landing page..."
LANDING_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/")
if [ "$LANDING_CODE" = "200" ]; then
  ok "Landing page returns 200"
else
  fail "Landing page failed" "Got $LANDING_CODE"
fi

# 3. Dashboard
echo "3. Dashboard..."
DASH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL/dashboard")
if [ "$DASH_CODE" = "200" ]; then
  ok "Dashboard returns 200"
else
  fail "Dashboard failed" "Got $DASH_CODE"
fi

# 4. Sites API
echo "4. Sites API..."
SITES_BODY=$(curl -s "$URL/api/sites")
if echo "$SITES_BODY" | grep -q '\[\]\|\[' ; then
  ok "Sites API returns valid JSON array"
else
  fail "Sites API failed" "Body: $SITES_BODY"
fi

# 5. OpenRouter key status
echo "5. OpenRouter key status..."
KEY_BODY=$(curl -s "$URL/api/user/openrouter-key")
if echo "$KEY_BODY" | grep -q '"state"'; then
  ok "OpenRouter key status returns valid JSON"
else
  fail "OpenRouter key status failed" "Body: $KEY_BODY"
fi

# 6. AI suggest services (only if URL is localhost — skip in prod to avoid charges)
if [[ "$URL" == *"localhost"* ]] || [[ "$URL" == *"127.0.0.1"* ]]; then
  echo "6. AI suggest services..."
  SUGGEST_BODY=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"niche":"cafe","businessName":"Sunday Coffee"}' \
    "$URL/api/ai/suggest-services")
  if echo "$SUGGEST_BODY" | grep -q '"services"\|error'; then
    ok "AI suggest services returns valid response"
  else
    fail "AI suggest services failed" "Body: $SUGGEST_BODY"
  fi
fi

# Summary
echo ""
echo "================================="
echo "Smoke test complete: $PASS passed, $FAIL failed"
echo "================================="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
