#!/usr/bin/env bash
#
# Opens an ngrok tunnel to the Next.js API and points the mobile app at it.
#
# Free ngrok hands out a new hostname on every restart, so the URL is read back
# from ngrok's local API and written into mobile/.env automatically.
#
#   ./scripts/tunnel.sh            # tunnel port 3200
#   ./scripts/tunnel.sh 3000       # tunnel a different port
#
set -euo pipefail

PORT="${1:-3200}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/mobile/.env"
NGROK_API="http://127.0.0.1:4040/api/tunnels"

if ! command -v ngrok >/dev/null 2>&1; then
  cat >&2 <<'EOF'
ngrok is not installed.

  brew install ngrok
  ngrok config add-authtoken <token from https://dashboard.ngrok.com>

EOF
  exit 1
fi

if ! curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/filters" \
  -H "x-api-key: $(grep -E '^API_KEY=' "$ROOT/ui/.env.local" 2>/dev/null | cut -d= -f2-)"; then
  echo "Warning: nothing is answering on port $PORT." >&2
  echo "Start the API first:  cd ui && npm run dev -- --port $PORT" >&2
  echo >&2
fi

echo "Starting ngrok on port $PORT..."
ngrok http "$PORT" --log=stdout >"$ROOT/.ngrok.log" 2>&1 &
NGROK_PID=$!
trap 'kill $NGROK_PID 2>/dev/null || true' EXIT

URL=""
for _ in $(seq 1 30); do
  sleep 1
  URL=$(curl -sf "$NGROK_API" 2>/dev/null \
    | python3 -c 'import json,sys; ts=json.load(sys.stdin)["tunnels"]; print(next((t["public_url"] for t in ts if t["public_url"].startswith("https")), ""))' \
    2>/dev/null) || URL=""
  [ -n "$URL" ] && break
done

if [ -z "$URL" ]; then
  echo "Could not read the tunnel URL. See $ROOT/.ngrok.log" >&2
  exit 1
fi

# Rewrite only the URL line, preserving the API key.
if [ -f "$ENV_FILE" ]; then
  python3 - "$ENV_FILE" "$URL" <<'PY'
import sys, pathlib
path, url = pathlib.Path(sys.argv[1]), sys.argv[2]
lines = path.read_text().splitlines()
out, seen = [], False
for line in lines:
    if line.startswith("EXPO_PUBLIC_API_URL="):
        out.append(f"EXPO_PUBLIC_API_URL={url}")
        seen = True
    else:
        out.append(line)
if not seen:
    out.append(f"EXPO_PUBLIC_API_URL={url}")
path.write_text("\n".join(out) + "\n")
PY
  echo "Updated $ENV_FILE"
else
  echo "No $ENV_FILE yet — copy mobile/.env.example first." >&2
fi

cat <<EOF

  Tunnel:  $URL
  Test it: curl -H "ngrok-skip-browser-warning: true" -H "x-api-key: <key>" $URL/api/filters

  Now restart Expo so it picks up the new URL:
      cd mobile && npx expo start --clear

  Leave this running. Ctrl-C closes the tunnel.

EOF

wait $NGROK_PID
