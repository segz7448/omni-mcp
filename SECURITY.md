# Security

Early development. Do not use this release for financial transactions, destructive administration or production secrets without an independent review.

Report security issues privately to the repository owner through a private channel. Do not put secrets or exploit details into public issues. A dedicated advisory intake has not yet been set up.

The defaults restrict methods and network destinations, not the full meaning or consequences of a vendor operation. A GET endpoint may still mutate state; a local allowlist does not replace human approval. API responses may contain prompt injection and private records. MCP clients must treat them as untrusted data.

Only import reviewed specs and keep config/manifests private from untrusted modification. Description text from specs is not sanitized for model instructions. Do not use this server as a public unauthenticated service, expose local stdio over a socket, or share a process/environment across users.

Network guards validate DNS addresses used for the socket and reject redirects; they are defense in depth, not a substitute for OS-level egress restrictions. Loopback is an explicit development-only exception. Response redaction catches literal credential values, not every transformation. There is no request log containing tokens, no telemetry, and no built-in credential persistence.
