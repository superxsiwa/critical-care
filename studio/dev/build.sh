#!/usr/bin/env bash
# dev/build.sh <output-binary>: the studio as ONE program, the Angular app built and embedded. The
# embed folder (backend/internal/web/dist) is put back to its committed placeholder afterwards, so
# `go run` and `go test` keep serving "not built" and never pick up a stale build.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(realpath -m "${1:?usage: dev/build.sh <output-binary>}")"
EMBED="$ROOT/backend/internal/web/dist"
export GOTOOLCHAIN=go1.27.3
clean() { find "$EMBED" -mindepth 1 ! -name README.txt -exec rm -rf {} +; }
trap clean EXIT
cd "$ROOT/frontend"
[[ -d node_modules ]] || pnpm install --frozen-lockfile >/dev/null
pnpm exec ng build --configuration production >/dev/null
clean
# -L: the app's pictures, fonts and icons are linked from mobile/ (one copy: the app's).
cp -rL dist/casestudio/browser/. "$EMBED/"
COMMIT="$(git -C "$ROOT" rev-parse --short HEAD)"
[[ -n "$(git -C "$ROOT" status --porcelain -- .)" ]] && COMMIT="$COMMIT+"
cd "$ROOT/backend"
CGO_ENABLED=0 go build -trimpath -ldflags "-X main.version=$COMMIT" -o "$OUT" ./cmd/casestudio
echo "built $OUT ($COMMIT)"
