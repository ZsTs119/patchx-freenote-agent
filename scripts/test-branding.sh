#!/usr/bin/env bash
set -euo pipefail

# Display-copy compatibility only. No live login, account data or webhook sends.
go test -p 1 -parallel 1 ./internal/cli -run 'Test(RootHelpIncludesCommandAndGlobalFlags|VersionPlainOutput|VersionJSONOutput|MCPConfigPrintsSecretFreeJSON|MCPLoginBrowserOAuthStoresCredentialAndDoesNotLeak|MCPLoginAlreadyLoggedInAndForceReplacement|MCPServeWritesJSONRPCToStdoutOnly|MCPServeInitializeReportsBuildVersion|MCPServeUsesRemoteProxyWhenCredentialExists|SetupAutoWritesCursorConfigWithExistingMCPOAuth)$'
go test -p 1 -parallel 1 ./internal/oauthflow -run '^TestCallbackServerSuccessAndFailurePagesDoNotLeakQuery$'
go test -p 1 -parallel 1 ./internal/mcp ./internal/remotemcp ./internal/renderdoc ./internal/webhook -run 'Test(InitializeAndToolsList|UnauthenticatedToolCallReturnsAuthRequired|EveryV1ToolMapsForbiddenAndServerError|ProxyMapsMalformedRemoteResponseToJSONRPCError|InferTitle|BuiltInTemplatesRender|RenderGenericPayload|RegistryLoadsAliasWithDotsFromConfigFile)$'
