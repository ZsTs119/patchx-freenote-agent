#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export GOMAXPROCS=1

# The six cases in the 2026-10-19 WorkBuddy authorization checklist.
go test -p=1 -parallel=1 ./internal/remotemcp -run '^(TestProxyClassifiesTokenFailures|TestProxyPreservesIDAndRefreshesOnceOnUnauthorized)$' -count=1 -v
go test -p=1 -parallel=1 ./internal/oauthflow -run '^(TestRefreshFailureKeepsRetryableCredential|TestExpiredRefreshCredentialRequiresLogin|TestRefreshProviderRotatesAndStoresTokens)$' -count=1 -v
go test -p=1 -parallel=1 ./internal/cli -run '^TestWorkBuddyConnectorLocalFlows$' -count=1 -v
