# Compatibility boundaries

Supported generation: OpenAPI 3.0/3.1 JSON or YAML with local bundled references. Path, query and header parameters with scalar types; scalar arrays using form/simple styles; JSON request bodies; form bodies using bracket notation. Reachable schema definitions and validation are preserved. Request body parameters may use objects, arrays and local component schemas.

Not a full OpenAPI implementation. Swagger 2.0 must be converted first. External references are rejected. Unresolved parameter refs, objects in query parameters, unsupported styles, cookie parameters, multipart/file uploads, binary/streaming responses, parameter content encoding, server variables and operation-specific servers without a configured base are rejected or skipped. Complex form conventions may differ by provider. There is no AWS SigV4 or custom request signing. No automatic pagination, retry/backoff, response-schema validation or business-semantic validation is implemented.

OpenAPI 3.1 schema vocabulary is broader than the current Ajv draft-7 validation setup. Generation/schema compilation tests do not certify full 3.1 semantics. Runtime errors fail the call rather than bypassing validation. OpenAPI 3.0 patterns use non-Unicode regular expression mode for compatibility with legacy published patterns.

The eight preset specs are catalog snapshots, not assurances of freshness. Stripe's catalog version is 2022-11-15; Notion's catalog has only eight paths. SendGrid's legacy catalog spec advertises HTTP, overridden to its explicit HTTPS API origin. Many DigitalOcean references and Stripe complex-query operations are skipped. Source checksums and counts appear in generated/report.json. Examine skipped arrays in generated manifests to see exact reasons.

Auth: declared OpenAPI security names map to config auth keys. Header API keys, query API keys, HTTP basic/bearer, OAuth2 and OpenID access tokens are implemented. An explicit headers map covers incomplete specs (GitHub/Notion). OAuth scopes are described by the spec but not negotiated or validated locally; the provider enforces them. Basic auth uses the env token as username with an empty password, or usernameEnv plus env password when configured. Empty security alternatives permit anonymous access.

A local configuration is a trust boundary. Anyone who can edit it or the generated manifests can redirect subsequent authenticated requests. Restrict file permissions and review diffs. Query API keys can appear in provider access logs. Credentials must never be committed to Git.
