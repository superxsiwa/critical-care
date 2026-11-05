#!/usr/bin/env bash
# The Case Studio's gate: everything must pass, with no output from gofmt or Prettier and no
# warnings from the Angular build.
#   backend:  gofmt, go vet, go build, sqlc diff, go test
#   frontend: Prettier, the tests' types, ng build (0 warnings), Playwright (unit guards + e2e
#             against the real binary, built with the app embedded by dev/build.sh)
#   contract: the app's side of the case package (Flutter)
set -euo pipefail
export GOTOOLCHAIN=go1.27.3
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
step() { printf '== %s\n' "$*"; }

cd "$ROOT/backend"
step gofmt;        test -z "$(gofmt -l .)" || { gofmt -l .; exit 1; }
step "go vet";     go vet ./...
step "go build";   CGO_ENABLED=0 go build -o /dev/null ./cmd/casestudio
step "sqlc diff";  go tool sqlc diff
step "go test";    go test -count=1 ./...

cd "$ROOT/frontend"
step "pnpm install"; pnpm install --frozen-lockfile >/dev/null
step prettier;     pnpm exec prettier --check "src/**/*.{ts,css,html}" "tests/**/*.ts" "public/*.{html,css}" playwright.config.ts >/dev/null
step "tsc (tests)"; pnpm exec tsc -p tests/tsconfig.json
step "ng build (0 warnings)"
log=$(pnpm exec ng build 2>&1) || { echo "$log"; exit 1; }
if grep -qiE "warning|▲" <<<"$log"; then echo "$log"; echo "the build has warnings"; exit 1; fi
step "playwright (unit + e2e)"
pnpm exec playwright test

step "contract: the app's side"
(cd "$ROOT/../mobile" && PATH="$HOME/development/flutter/bin:$PATH" flutter test test/contract | tail -1)
echo "== all checks passed"
