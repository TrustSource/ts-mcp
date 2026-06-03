# TrustSource MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes the [TrustSource](https://www.trustsource.io/) REST API v2 as domain-grouped tools for LLM agents. It lets Claude and other MCP-capable assistants manage SBOMs, run compliance checks, track vulnerabilities, and handle risk management — all through natural language.

## Quick Start

```bash
docker run -i --rm \
  -e TS_API_KEY=your-api-key \
  trustsource/mcp-server
```

That's it. The server speaks MCP over stdio and is ready to be used by any MCP client.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `TS_API_KEY` | **Yes** | — | TrustSource API key ([how to obtain one](#api-key)) |
| `TS_ACCESS_MODE` | No | `read` | Access tier: `read`, `readwrite`, or `full` |
| `TS_API_BASE_URL` | No | `https://api.trustsource.io/v2` | TrustSource API base URL |
| `TS_LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

## MCP Client Setup

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "trustsource": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "TS_API_KEY", "trustsource/mcp-server"],
      "env": {
        "TS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

Add to your project or user `.claude/settings.json`:

```json
{
  "mcpServers": {
    "trustsource": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "TS_API_KEY",
        "-e", "TS_ACCESS_MODE=readwrite",
        "trustsource/mcp-server"
      ],
      "env": {
        "TS_API_KEY": "your-api-key"
      }
    }
  }
}
```

To enable write operations, set `TS_ACCESS_MODE` to `readwrite` or `full` as shown above.

## Available Tools

The server exposes 16 domain-grouped tools. Each tool bundles related API operations as actions.

| Tool | Description |
|---|---|
| `account` | Check API key authorization status |
| `projects` | List, create, update, delete projects; retrieve parts lists and SBOMs |
| `modules` | List, create, update, delete modules; retrieve parts lists and SBOMs |
| `products` | Manage products, misuse reports, support contacts, solutions, photos, documents |
| `scans` | Submit dependency scans, view results, import SBOMs (CycloneDX, SPDX) |
| `tests` | Import SARIF test results for security analysis |
| `reports` | Retrieve compliance, vulnerability, license, CVE, dashboard, and EOL reports |
| `releases` | Access published SBOMs, notice files, and CSAF/VEX advisories |
| `compliance-check` | Check license compatibility and component compliance against FOSS policies |
| `approvals` | List, view, approve, and reject compliance approval requests |
| `company` | Retrieve company FOSS compliance settings and policies |
| `vulnerabilities` | Look up CVE/CWE details, search by keyword or component |
| `psirt` | Access Product Security Incident Response CSAF/VEX advisories |
| `deepscan` | Trigger and retrieve repository deep scans for license and security analysis |
| `risks` | List, create, update, delete risk assessments and tasks |
| `users` | View user activity and API usage statistics |

## Example Prompts

Once the MCP server is connected, you can ask Claude things like:

- **"List all my TrustSource projects"** — calls `projects` with the list action
- **"Show the SBOM for project abc-123"** — retrieves the full software bill of materials
- **"Check if the MIT license is compliant with our company policy"** — runs a compliance check
- **"Find CVEs related to log4j"** — searches the vulnerability database
- **"Get the compliance report for module xyz"** — pulls a formatted compliance report
- **"Show all pending approval requests and summarize them"** — lists open approval workflows
- **"Trigger a deep scan on repository github.com/org/repo"** — starts a license and security deep scan
- **"What risks are tracked for project abc-123?"** — retrieves risk assessments and tasks

## Access Modes

The `TS_ACCESS_MODE` environment variable controls which operations the server exposes. This lets you enforce least-privilege access.

### `read` (default)

Only GET operations. The agent can list and view resources but cannot modify anything.

*Examples:* list projects, view SBOMs, read reports, search vulnerabilities, check compliance

### `readwrite`

GET plus create and update operations. The agent can add new resources and modify existing ones.

*Examples:* everything in `read`, plus: create projects, submit scans, import SBOMs, create risk assessments, update products

### `full`

All operations including destructive and approval actions. Use with caution.

*Examples:* everything in `readwrite`, plus: delete projects/modules, retire products, approve/reject compliance requests

Actions that require a higher access mode than configured are not registered as tools — the agent cannot see or call them.

## Development

### Prerequisites

- Node.js >= 20
- npm

### Build and Run

```bash
# Install dependencies
npm install

# Generate tool definitions from the OpenAPI spec and domain mapping
npm run codegen

# Build TypeScript
npm run build

# Run in development mode (tsx, no build step)
npm run dev

# Run the built server
npm start
```

### Docker

```bash
# Build the Docker image locally
npm run docker:build

# Run it
docker run -i --rm -e TS_API_KEY=your-key trustsource/mcp-server
```

## API Key

To obtain a TrustSource API key:

1. Log in to [TrustSource](https://app.trustsource.io/)
2. Navigate to **Company Admin** > **Scanners & API**
3. Create a new API key or copy an existing one

The API key is validated on server startup. If it is missing or invalid, the server exits with a clear error message.

## License

[Apache-2.0](LICENSE)
