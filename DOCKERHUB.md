![TrustSource](https://raw.githubusercontent.com/TrustSource/ts-scan/main/docs/img/trustsource-logo.png)

# TrustSource MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that connects LLM agents like Claude to the [TrustSource](https://www.trustsource.io/) platform. Manage SBOMs, run compliance checks, track vulnerabilities, and handle risk management — all through natural language.

## Quick Start

```bash
docker run -i --rm \
  -e TS_API_KEY=your-api-key \
  trustsource/ts-mcp
```

The server supports two transport modes: **stdio** (default, for local use) and **Streamable HTTP** (for server deployment with multiple concurrent clients).

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `TS_API_KEY` | **Yes** | — | TrustSource API key |
| `TS_ACCESS_MODE` | No | `read` | Access tier: `read`, `readwrite`, or `full` |
| `TS_TRANSPORT` | No | `stdio` | Transport: `stdio` or `http` |
| `TS_HTTP_PORT` | No | `3000` | HTTP listen port (for `http` transport) |
| `TS_API_BASE_URL` | No | `https://api.trustsource.io/v2` | API base URL |
| `TS_LOG_LEVEL` | No | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |

## Client Setup (Claude Desktop)

```json
{
  "mcpServers": {
    "trustsource": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "TS_API_KEY", "trustsource/ts-mcp"],
      "env": {
        "TS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

16 domain-grouped tools covering the full TrustSource API v2:

| Tool | Description |
|---|---|
| `projects` | Manage projects, retrieve parts lists and SBOMs |
| `modules` | Manage modules, retrieve parts lists and SBOMs |
| `products` | Product lifecycle management |
| `scans` | Submit scans, import SBOMs (CycloneDX, SPDX) |
| `reports` | Compliance, vulnerability, license, and EOL reports |
| `releases` | Published SBOMs, notice files, CSAF/VEX advisories |
| `compliance-check` | License and component compliance checks |
| `approvals` | Compliance approval workflows |
| `vulnerabilities` | CVE/CWE lookup and search |
| `risks` | Risk assessments and task tracking |
| `psirt` | Product Security Incident Response advisories |
| `deepscan` | Repository deep scans |
| `tests` | SARIF test result imports |
| `company` | Company FOSS compliance settings |
| `users` | User activity and API usage statistics |
| `account` | API key authorization status |

## Access Modes

- **`read`** (default) — list and view resources only
- **`readwrite`** — create and update resources
- **`full`** — all operations including delete, retire, and approve/reject

## Get Your API Key

1. Sign in at [app.trustsource.io](https://app.trustsource.io/)
2. Navigate to **Company Admin** > **Scanners & API**
3. Create a new API key

Free subscriptions are available — see [trustsource.io/editions](https://www.trustsource.io/editions) for details.

## Support

For questions, issues, or feedback reach out to [support@trustsource.io](mailto:support@trustsource.io).

## Links

- [Source code & documentation](https://github.com/trustsource/ts-mcp)
- [TrustSource platform](https://www.trustsource.io/)
- [TrustSource API documentation](https://api.trustsource.io/v2)

## License

[Apache-2.0](https://github.com/trustsource/ts-mcp/blob/main/LICENSE)
