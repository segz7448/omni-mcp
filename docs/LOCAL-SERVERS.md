# Local stdio connectors

The gateway can spawn explicitly configured local MCP servers, discover their tools and proxy only exact allowlisted tool names through the same search/describe/call interface. Commands are local configuration, not model-supplied arguments. The included test starts a real child MCP server, calls it and closes it. That fixture proves routing, not PC/phone access.

Example shape (not active configuration):

```json
{
  "platforms": [],
  "upstreams": [
    {
      "id": "mydevice",
      "command": "/absolute/path/to/reviewed-mcp-server",
      "args": [],
      "allowTools": ["EXACT_REVIEWED_READ_TOOL_NAME"],
      "inheritEnv": []
    }
  ]
}
```

Upstream commands can execute arbitrary code as your OS user. Review the software, pin versions and run with least privilege. A tool allowlist does not sandbox a child process. PATH/HOME and basic OS environment values are inherited for launching; additional variables require explicit inheritEnv entries. Upstream stderr is drained but not forwarded because programs may print secrets. Upstream tool results are not covered by HTTP credential redaction and may contain private data or prompt injection.

Local tools are not subject to the HTTP engine's method/network gates. Their explicit allowTools list is their execution boundary. Review every allowed tool's effects; annotations are advisory. A gateway cannot make a harmful third-party server safe. Connections are closed on gateway stdin end, SIGINT and SIGTERM. No automatic restarts or installs occur.

local-servers.json contains candidate references only. Playwright remains an untested candidate. Filesystem and memory have separately installed, isolated read-only proof tests. Phone pairing/ADB/iOS support is not implemented.

## Tested reference setup, opt-in

After reviewing the packages and their current advisories, install the pinned versions in your own chosen prefix:

```sh
npm install --prefix /YOUR/REVIEWED/PREFIX --save-exact @modelcontextprotocol/server-filesystem@2.1.0 @modelcontextprotocol/server-memory@2.0.1
```

These releases require a Node 24 runtime. Adapt `omni.local.example.json` with absolute paths and explicit permitted directory. Set MEMORY_FILE_PATH outside source control before starting the gateway if enabling memory. The gateway does not perform this installation. No write tools are enabled by the example. `scripts/verify-local.js` is an opt-in test against a separately installed prefix and a separately supplied Node 24 runtime; it creates only temporary fixtures and removes them afterward.
