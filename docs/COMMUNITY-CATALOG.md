# Community candidate sweep

This is public-source discovery, not a security audit, certification, or thousands of installed connectors. `catalog/community-candidates.json` records upstream repository, observed source pages, category, package metadata where available, pricing status, installation status and verification status. Every swept entry remains disabled and unverified. Individually tested reference connectors have separate evidence in local-servers.json and docs/local-verification.json; do not infer that a whole monorepo was tested.

The sweep uses a public awesome-list snapshot and official reference list, a small sample of detail pages from Smithery/Glama/PulseMCP/mcp.so, npm's first 250 keyword results and four direct PyPI project lookups. PyPI search returned a browser challenge. HTML directories were not exhaustively crawled and their headline listing counts are not imported as actual records. Deduplication is case-insensitive repository identity and collapses monorepo subservers; it does not detect forks or validate all repositories still exist. Source provenance is preserved in each entry and snapshot hashes in metadata. Category labels are approximate mappings from list headings/keywords.

The source documents' descriptions are not copied into execution instructions. Discovered commands are not installed or run. A directory listing does not prove author identity, maintained code, a permissive license, free API access or safe execution. Unknown pricing is never upgraded to free. Do not enable a candidate just because the catalog contains it.

## Current official reference status

The current official modelcontextprotocol/servers list marks GitHub, PostgreSQL, Puppeteer, SQLite and the old Brave Search implementation as **archived**. They are not recommended as current official maintained defaults. Brave's provider-maintained replacement is linked by that source. Prefer current provider repositories, and review them independently. Playwright is a separate Microsoft-maintained project, not the archived Puppeteer reference server.

## Tested opt-in connectors

Latest official filesystem 2.1.0 and memory 2.0.1 were separately installed in an isolated prefix and tested through the gateway. These releases require Node >=24 even though the gateway itself supports Node 22+. Read-only operations were allowlisted. Filesystem read a temporary fixture and rejected a path outside the allowed directory. Memory read an empty temporary graph. No real user files, phone data, bank/payment accounts or persistent graph were used.

See docs/LOCAL-SERVERS.md for install/config boundaries. No automatic install, no blanket allowlist, no arbitrary child-process tool, and no claim of phone pairing.
