# Architecture

A stdio transport connects an MCP client to a single local process:

```
MCP client -> four discovery/execution tools -> local operation index
                                          -> input validation
                                          -> method allowlist
                                          -> environment credential resolver
                                          -> pinned-DNS HTTPS request -> provider
```

## Offline generation

A bundled JSON/YAML OpenAPI document is compiled to an operation manifest. The compiler merges path and operation parameters, preserves reachable component schemas, records security requirements, normalizes names, and reports skipped operations. Shared definitions are stored once per manifest to avoid disk duplication. Compilation never calls the vendor API.

## Runtime

Only explicitly configured manifests are loaded. Tool discovery is paged. Validators compile lazily for the selected operation. The model cannot change configuration, choose a URL, supply authorization headers, access environment variables, or import new specs through the MCP interface. A direct per-operation tool registration mode is not implemented.

The engine maps schema-validated arguments into HTTP requests, injects credentials from the process environment, checks the configured mutation allowlist, and returns a bounded response. No background jobs, outbound telemetry, cloud accounts or shared auth service are part of this code.

## Scaling truth

Catalog entries are discovery candidates. A provider becomes useful only after spec import, compatibility checks, current auth setup, and real contract tests. Many entries share a vendor; many need unsupported auth/signing/serialization. The current catalog is not an integration count. Memory is proportional to configured manifests, not the entire directory. Runtime performance at thousands of simultaneously loaded providers has not been benchmarked.

## Distribution

Source install works now. Package metadata includes a CLI binary; a clean package tarball can be created with npm pack. This does not publish anything to npm. The CLI will need its own package-name availability/release review before publication.
