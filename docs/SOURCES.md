# Sources and provenance

Checked October 29, 2026.

- Official MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk . Current v2 split packages; installed 2.4.0 API used by tests.
- APIs.guru directory: https://github.com/APIs-guru/openapi-directory . Community definitions can be stale or incomplete. Contributed definitions are CC0; publicly sourced definitions retain upstream considerations.
- Catalog: https://api.apis.guru/v2/list.json . 2,529 entries observed, not distinct platforms or verified integrations.
- GitHub official specs: https://github.com/github/rest-api-description . MIT; documents reference and path limitations. Preset uses the catalog snapshot.
- Stripe official specs: https://github.com/stripe/openapi . MIT; recommends latest GA specs. Preset reports its older catalog snapshot.
- Playwright MCP: https://github.com/microsoft/playwright-mcp . Candidate local browser connector, not phone access.
- Reference servers: https://github.com/modelcontextprotocol/servers . Candidate local filesystem tools, with their own safety boundaries.

Exact preset source URLs, checksums and versions are in generated/report.json. No authenticated vendor testing is claimed. Free adapter code does not prove free vendor API access. No bank, payment instrument, social account, PC or phone was accessed during this build.

Swagger converter source: https://github.com/Mermade/oas-kit . BSD-3-Clause converter pinned at 7.0.8.
Free exchange endpoint policy: https://www.exchangerate-api.com/docs/free . Successful anonymous sample calls do not remove quotas or provider terms.
