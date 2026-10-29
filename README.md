# omni-mcp

A local-first OpenAPI-to-MCP gateway. One local process, your API credentials, no hosted control plane.

**Early development, not 1,000 verified integrations.** The first batch generates operation schemas from eight public specs: GitHub, Stripe, Slack, Notion, DigitalOcean, SendGrid, Spotify and Zoom. Some specs are old or incomplete. Generated does not mean live-tested. No authenticated vendor calls have been tested.

The long-term goal is broad platform coverage without writing each connector by hand. APIs.guru's catalog returned 2,529 API entries when checked on October 29, 2026. Those are API definitions, not necessarily distinct companies, compatible APIs, or working integrations. No claim of 5,000 supported platforms is made.

## Run from source

Requires Node.js 22+ and an MCP client that supports local stdio servers.

```sh
git clone https://github.com/segz7448/omni-mcp.git
cd omni-mcp
npm ci
npm run generate
cp omni.config.example.json omni.config.json
# Supply your own credentials to the process environment, outside source control.
# Remove platforms you do not use from omni.config.json.
node src/cli.js serve --config omni.config.json
```

The server is quiet on stdout except MCP protocol messages. Running it directly waits for a client; it is not a web interface.

Example client configuration (replace both absolute paths):

```json
{
  "mcpServers": {
    "omni": {
      "command": "node",
      "args": ["/absolute/path/omni-mcp/src/cli.js", "serve", "--config", "/absolute/path/omni-mcp/omni.config.json"]
    }
  }
}
```

Credentials must be available in that process's environment. Desktop clients do not always inherit terminal environment variables. Use your client's secret/environment settings. Never commit keys. No account, central token store, OAuth broker, or hosting subscription is required by this project. Provider fees and API quotas still apply.

A registry release has **not** been published. `npx omni-mcp` is not an installation instruction for this repo. `npm link` makes the local `omni-mcp` executable available for development. A reviewed npm release is future work.

## Four MCP tools, many discoverable operations

Thousands of full tool schemas would waste the model's context. The server exposes four stable MCP tools:

1. `platforms`: configured providers and generation counts.
2. `search_operations`: paged search over enabled operations, up to 50 per call.
3. `describe_operation`: complete argument schema for one operation.
4. `call_operation`: validate arguments, apply credentials, execute the HTTP request.

These are generated API operations behind a dispatcher, not thousands of individual entries in `tools/list`.

Example sequence:

```json
{"name":"search_operations","arguments":{"platform":"github","query":"repos/get"}}
{"name":"describe_operation","arguments":{"name":"github__repos_get"}}
{"name":"call_operation","arguments":{"name":"github__repos_get","arguments":{"path":{"owner":"octocat","repo":"Hello-World"}}}}
```

Always use the actual returned operation name and schema. Arguments are grouped as `path`, `query`, `header`, and `body`. Response objects include `status`, `ok`, and `data`. HTTP failures return MCP `isError: true`.

## Your own OpenAPI document

```sh
node src/cli.js generate --spec ./bundled-openapi.yaml --id myapi --out ./generated/myapi.json
# Optional: --base-url https://api.example.com/v1
```

Add that compiled file to your local config. Import is an explicit user action, not an agent-accessible tool. Review every spec and destination before using it. The generator supports a subset of OpenAPI 3.0/3.1. Unsupported operations are skipped with reasons, not silently advertised as supported. See [compatibility](docs/COMPATIBILITY.md).

Discover more definitions:

```sh
node src/cli.js catalog-sync --out catalog.json
```

This saves catalog metadata only. It does not download or activate every API. Specs are not executable code, but their destinations and descriptions are untrusted input. Do not import documents you have not reviewed.

## Authentication and safety

- API keys, HTTP bearer/basic auth, and **already-obtained** OAuth access tokens can come from environment variables.
- There is no automatic OAuth login, consent, refresh, scope negotiation or revocation workflow. Provider OAuth apps still need their own setup. Expired tokens must be replaced outside the server.
- No arbitrary URL/header/credential MCP tool is exposed. Destinations come from local configuration and reviewed generated files.
- Only GET and HEAD operations are enabled by default. To enable a mutation, add its exact generated name to that platform's `allowWriteOperations` array. This is a coarse technical gate, not user consent to perform a particular transaction. Some GET APIs can have side effects too. Review each operation.
- Private/reserved network addresses are blocked, including DNS answers. HTTPS is required. Redirects are not followed. Local HTTP is allowed only for loopback destinations when explicitly configured with `allowLocalhost: true` (for development tests).
- Request bodies are limited to 1 MiB; responses to 1 MiB; requests time out after 15 seconds. No automatic retries for mutations.
- Literal credential values are redacted from response text on a best-effort basis. Encoded or transformed echoes may not be caught. There is no protection against a malicious API returning sensitive business data or prompt injection. Treat results as data, not instructions.

## Tests and current coverage

```sh
npm run check
npm test
npm run generate      # network access, refreshes eight specs and provenance report
npm test              # additionally validates every generated operation schema
npm audit
```

Tests include an actual spawned stdio MCP server/client session, tool discovery, schema inspection, a call through the gateway to a real local HTTP fixture, auth injection/redaction, path/query encoding, JSON/form bodies, blocked mutations, network policy and redirect handling. **The HTTP fixture is not a live vendor integration.** Generated schema tests skip when generated files are absent.

Generation counts, source URLs, source hashes, skipped counts and authenticated-test status are recorded in [generated/report.json](generated/report.json). Vendor-generated files are deliberately not committed or packaged. Run the generator to produce them locally, under the original sources' terms. Read the [architecture](docs/ARCHITECTURE.md), [compatibility notes](docs/COMPATIBILITY.md), [security notes](SECURITY.md), and [source notes](docs/SOURCES.md).

## Roadmap

- Fresh official provider specs and provider-specific contract tests.
- Swagger 2.0 conversion and wider parameter/media-type support.
- Explicit OAuth workflows, scoped credentials, token refresh and OS keychain support.
- Verified provider manifests, license checks, regression CI and compatibility scorecards.
- Reviewed npm release for `npx` installation.
- Optional stateless hosted transport, only after multi-user isolation and auth design.

"Serverless" here means **no server you deploy**: your MCP client launches the local process. This is not a Cloudflare Worker or a deployed remote MCP service.

## License

Project code: MIT. Upstream specs, SDKs and dependencies keep their own licenses. Vendor names are for identification, not affiliation or endorsement.
