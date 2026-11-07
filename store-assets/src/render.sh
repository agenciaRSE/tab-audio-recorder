#!/bin/sh
# Renders the Chrome Web Store graphics into store-assets/<lang>/ with agent-browser.
# Usage (from the repo root): sh store-assets/src/render.sh
set -e
PORT=8765
python -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; agent-browser --session store-assets close >/dev/null 2>&1' EXIT
sleep 1
AB="agent-browser --session store-assets"

shot() { # id lang width height file
  mkdir -p "store-assets/$2"
  $AB set viewport "$3" "$4" >/dev/null
  $AB open "http://127.0.0.1:$PORT/store-assets/src/shots.html?id=$1&lang=$2" >/dev/null
  $AB wait "body[data-ready]" >/dev/null
  $AB screenshot "store-assets/$2/$5" >/dev/null
  echo "store-assets/$2/$5"
}

for lang in en es; do
  shot 1 "$lang" 1280 800 screenshot-1-record-1280x800.png
  shot 2 "$lang" 1280 800 screenshot-2-formats-1280x800.png
  shot 3 "$lang" 1280 800 screenshot-3-shortcut-1280x800.png
  shot 4 "$lang" 1280 800 screenshot-4-private-1280x800.png
  shot small "$lang" 440 280 small-promo-440x280.png
  shot marquee "$lang" 1400 560 marquee-1400x560.png
done
