#!/usr/bin/env bash
# The Case Studio's gate: everything must pass with no output from gofmt and no warnings.
set -euo pipefail
export GOTOOLCHAIN=go1.27.3
cd "$(dirname "$0")/../backend"
step() { printf '== %s\n' "$*"; }
step gofmt;        test -z "$(gofmt -l .)" || { gofmt -l .; exit 1; }
step "go vet";     go vet ./...
step "go build";   CGO_ENABLED=0 go build -o /dev/null ./cmd/casestudio
step "sqlc diff";  go tool sqlc diff
step "go test";    go test -count=1 ./...
step "contract: the app's side"
(cd ../../mobile && PATH="$HOME/development/flutter/bin:$PATH" flutter test test/contract | tail -1)
echo "== all checks passed"
