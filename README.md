# omni-mcp

A local-first OpenAPI-to-MCP gateway. One local process, your API credentials, no hosted control plane.

**Early development, not 1,000 verified integrations.** The current batch generates operation schemas from 30 spec manifests across 19 provider families: GitHub, Stripe, Slack, Notion, DigitalOcean, SendGrid, Spotify, Zoom, Plaid, bunq, Twitter, GitLab, Asana, Trello, Bitbucket, Wikimedia and ExchangeRate-API, plus official PayPal and Square specs. Some specs are old or incomplete. Generated does not mean live-tested. No authenticated vendor calls have been tested. Anonymous sample calls through the actual engine returned HTTP 200 with expected data for GitHub, Wikimedia and ExchangeRate-API only. PayPal and Square were not live-tested. Twitter spec retrieval failed. See [verification evidence](docs/public-verification.json).

The long-term goal is broad platform coverage without writing each connector by hand. APIs.guru's catalog returned 2,529 API entries when checked on October 29, 2026. Those are API definitions, not necessarily distinct companies, compatible APIs, or working integrations. No claim of 5,000 supported platforms is made.

## Categories and the free-only boundary

The source catalog is categorized. Snapshot counts (entries can have several labels):

| Category | API entries, pricing unverified |
|---|---:|
| Cloud | 955 |
| Media | 340 |
| Open data | 318 |
| Analytics | 284 |
| Developer tools | 168 |
| Financial, including banking candidates | 72 |
| Messaging | 62 |
| Collaboration | 38 |
| Payment | 32 |
| Social | 18 |
| IoT | 18 |

A bundled `catalog/candidates.json` snapshot provides all 2,529 categorized discovery candidates, with `pricingStatus: unverified` and `enabledByDefault: false` on every entry. It is metadata only, not activated connectors.

Full source counts: [catalog report](docs/catalog-report.json). These are **not free verified integration counts**. No pricing audit has been completed. The default configuration activates only three anonymous, read-only public API operations (one each for GitHub, Wikimedia and ExchangeRate-API), which are smoke-tested through this gateway. It activates zero device connectors. Other providers remain opt-in. The 30 spec-generation presets are opt-in compatibility samples, not a free-services recommendation. A free adapter cannot remove bank/payment charges or commercial API costs.

There are two connector classes in one gateway: generated HTTP operations and explicitly allowlisted local stdio MCP servers. [Local connector guide](docs/LOCAL-SERVERS.md) explains the security boundary. Reviewed references are listed in `local-servers.json`, disabled by default; filesystem and memory have isolated read-only proof tests, Playwright remains untested. **No phone connector is implemented.** This does not yet fulfill the goal of thousands of verified free integrations; that requires continuing provider-by-provider checks.

## Community server candidates

The separate community sweep found **4820 deduplicated upstream repositories**. Sources contributed: official 11, awesome 4623, smithery 2, glama 3, pulsemcp 4, mcp-so 4, npm 217, pypi 2. Source counts overlap. This is not an exhaustive directory crawl, and these are not installed, verified or free-certified integrations. See [sweep method and limits](docs/COMMUNITY-CATALOG.md) and [machine-readable summary](docs/community-report.json).

Approximate community category counts: other 2157, developer_tools 577, pc_browser 138, cloud 156, database 155, messaging 184, pc_files 58, memory 376, search 343, finance 492, social 75, productivity 140, banking 2, payments 1. Categories overlap and are derived from source headings/keywords, not a provider audit. These are separate from the API-definition counts above; do not add them together as an integration total.

The gateway actually tested two external reference servers: filesystem 2.1.0 and memory 2.0.1, using Node 24 and only temporary, read-only fixtures. [Evidence](docs/local-verification.json), [opt-in configuration](omni.local.example.json). They are not bundled runtime dependencies or enabled defaults. Older GitHub/Postgres/Puppeteer/SQLite reference servers are archived, not presented as current maintained choices.

## Payments scope

Official PayPal and Square specs are included as **sandbox-targeted, opt-in generated adapters**, not verified financial integrations. Venmo means PayPal Checkout merchant rails; Cash App Pay means Square Web Payments SDK tokenization plus Payments API. Neither provides consumer wallet/P2P access. Full frontend consent flows are not implemented, merchant approval/accounts may be required, and processing fees can apply. PayPal Invoicing is excluded for an unsupported regex dialect. [Exact boundaries and sources](docs/PAYMENT-RAILS.md), [payment-method metadata](catalog/payment-rails.json).

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

The public release is [omni-mcp-gateway@0.1.1](https://www.npmjs.com/package/omni-mcp-gateway). To start immediately with three bundled public read-only operations and no API keys:

```sh
npx --yes omni-mcp-gateway@0.1.1 serve
```

The default config bundles only the anonymous GitHub repository lookup, Wikimedia pageview query and ExchangeRate-API latest-rates operation. Each is called through the gateway with no credentials and returned HTTP 200 with expected data in the verification run recorded in [docs/public-verification.json](docs/public-verification.json). This is a one-operation smoke test per service, not whole-provider certification. Other generated presets require your own credentials and reviewed configuration; community candidates and local MCP servers are not bundled or enabled automatically. To use a custom config, pass `--config /absolute/path/omni.config.json`.

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

Add that compiled file to your local config. Import is an explicit user action, not an agent-accessible tool. Review every spec and destination before using it. Swagger 2.0 is converted to OpenAPI 3.0 first with external-reference retrieval blocked. The compiler supports a subset of OpenAPI 3.0/3.1. Unsupported operations are skipped with reasons, not silently advertised as supported. See [compatibility](docs/COMPATIBILITY.md).

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
npm run generate      # network access, refreshes 30 specs and provenance report
npm test              # additionally validates every generated operation schema
npm audit
```

Tests include an actual spawned stdio MCP server/client session, tool discovery, schema inspection, a call through the gateway to a real local HTTP fixture, auth injection/redaction, a real allowlisted local upstream stdio process, path/query encoding, JSON/form bodies, blocked mutations, network policy and redirect handling. A separate out-of-box MCP session exercises each bundled anonymous connector against its real public API. **The HTTP fixture is not a live vendor integration. Separate live smoke tests cover one public read each for GitHub, Wikimedia and ExchangeRate-API; Twitter spec retrieval failed.** Generated schema tests skip when generated files are absent.

Generation counts, source URLs, source hashes, skipped counts and authenticated-test status are recorded in [generated/report.json](generated/report.json). Full vendor-generated files are deliberately not committed or packaged. Three compact manifests for the explicitly listed, anonymous read-only defaults are bundled; they are generated with `npm run generate` then `npm run build:defaults`. Read the [architecture](docs/ARCHITECTURE.md), [compatibility notes](docs/COMPATIBILITY.md), [security notes](SECURITY.md), and [source notes](docs/SOURCES.md).

## Roadmap

- Fresh official provider specs and provider-specific contract tests.
- Wider parameter/media-type support and modern replacements for old snapshots.
- Explicit OAuth workflows, scoped credentials, token refresh and OS keychain support.
- Verified provider manifests, license checks, regression CI and compatibility scorecards.
- Further reviewed releases, installation guides and compatibility testing.
- Optional stateless hosted transport, only after multi-user isolation and auth design.

"Serverless" here means **no server you deploy**: your MCP client launches the local process. This is not a Cloudflare Worker or a deployed remote MCP service.

## License

Project code: MIT. Upstream specs, SDKs and dependencies keep their own licenses. Vendor names are for identification, not affiliation or endorsement.
