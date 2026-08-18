#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# Build and serve the extension, then register it with Rancher directly via
# the Steve API - a scriptable stand-in for the UI-driven "Developer Load"
# dialog (@rancher/shell shell/dialog/DeveloperLoadExtensionDialog.vue).
# Mirrors the exact resource shape that dialog creates
# (POST /v1/catalog.cattle.io.uiplugin), including the ui-extensions-version
# metadata annotation - without it Rancher's plugin loader rejects the
# extension with "apiAnnotationMissing" regardless of prime status (see
# shell/config/uiplugins.js shouldNotLoadPlugin).
# ---------------------------------------------------------------------------

TEST_BASE_URL=${TEST_BASE_URL:-https://127.0.0.1.sslip.io}
CATTLE_BOOTSTRAP_PASSWORD=${CATTLE_BOOTSTRAP_PASSWORD:-password}
EXTENSION_SERVER_PORT=${EXTENSION_SERVER_PORT:-8080}
EXTENSION_NAME=virtual-clusters

PKG_VERSION=$(python3 -c "import json; print(json.load(open('pkg/virtual-clusters/package.json'))['version'])")
EXTENSIONS_VERSION_RANGE=$(python3 -c "import json; print(json.load(open('pkg/virtual-clusters/package.json'))['rancher']['annotations']['catalog.cattle.io/ui-extensions-version'])")

echo "Building the extension.........."
yarn build-pkg "$EXTENSION_NAME"

echo "Serving the extension on port ${EXTENSION_SERVER_PORT}.........."
PORT="$EXTENSION_SERVER_PORT" nohup node node_modules/@rancher/shell/scripts/serve-pkgs > serve-pkgs.log 2>&1 &
sleep 3
curl -s "http://127.0.0.1:${EXTENSION_SERVER_PORT}/" | head -20

EXTENSION_URL="http://127.0.0.1:${EXTENSION_SERVER_PORT}"

echo "Logging in to Rancher.........."
TOKEN=""
for i in $(seq 1 60); do
  TOKEN=$(curl -sk -X POST "${TEST_BASE_URL}/v3-public/localProviders/local?action=login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"${CATTLE_BOOTSTRAP_PASSWORD}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")
  [ -n "$TOKEN" ] && break
  sleep 5
done
if [ -z "$TOKEN" ]; then
  echo "Failed to obtain an admin token"
  exit 1
fi

echo "Registering the extension with Rancher.........."
curl -sk -X POST "${TEST_BASE_URL}/v1/catalog.cattle.io.uiplugin" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"catalog.cattle.io.uiplugin\",
    \"metadata\": { \"name\": \"${EXTENSION_NAME}\", \"namespace\": \"cattle-ui-plugin-system\" },
    \"spec\": {
      \"plugin\": {
        \"name\": \"${EXTENSION_NAME}\",
        \"version\": \"${PKG_VERSION}\",
        \"endpoint\": \"${EXTENSION_URL}\",
        \"noCache\": true,
        \"noAuth\": true,
        \"metadata\": {
          \"catalog.cattle.io/ui-extensions-version\": \"${EXTENSIONS_VERSION_RANGE}\"
        }
      }
    }
  }"

echo
echo "Extension registered, served at ${EXTENSION_URL}"
