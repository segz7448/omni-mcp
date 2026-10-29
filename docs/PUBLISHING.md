# npm release readiness, not publication

Release status: omni-mcp-gateway@0.1.0 is publicly available and latest. The initial release entered npm staged processing before becoming visible; no second upload was needed. On October 29, 2026, the public npm registry returned E404 for both omni-mcp-local (the current package name) and omni-mcp. That means no currently retrievable package record, not ownership, name reservation or permission to publish. Names may become unavailable before release.

Before publication:

1. The owner chooses the final npm package name, npm account/organization, initial version and release scope. GitHub credentials are not npm credentials.
2. The owner explicitly approves publication of the reviewed package/version. No approval has been assumed from the GitHub publication request.
3. Authenticate the selected npm identity using an interactive login with 2FA or a suitable granular publishing token. Persistent tokens belong in a secret store, never source files or chat. For CI, consider npm trusted publishing after setting up the correct identity/repository relationship. Do not put a publish workflow in place without that setup and approval.
4. Recheck registry availability and package contents, run clean-clone tests, npm audit, npm pack --dry-run and a tarball install. Review licenses, API-spec provenance, included metadata, example configs and all dependency advisories. Free API access remains unverified except explicitly documented policy checks.
5. Choose the version once. npm name/version pairs cannot be reused after publication, even if unpublished. The reviewed package currently uses 0.1.0; a prerelease tag may better reflect its status.
6. After explicit release approval, publish the exact reviewed tarball using the chosen public access and dist-tag. Verify npm metadata, integrity, installed CLI and an actual client session before announcing an npx command.

Already checked locally: package tarball generation/installation, CLI startup, lockfile, MIT project license, no automatic installs or publish scripts, and current dependency audit. Full provider contract testing, phone support, automatic OAuth and a security review are not complete. No production-readiness claim is made.

Official references:
- https://docs.npmjs.com/cli/v11/commands/npm-publish
- https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification

Release choice updated: omni-mcp-gateway@0.1.0, public tag latest. npm rejected omni-mcp for similarity to omnimcp. Registry absence alone did not establish eligibility.
