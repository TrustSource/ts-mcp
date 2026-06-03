# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-03

### Added

- Initial MCP server implementation with stdio transport
- 16 domain-based tools covering the full TrustSource API v2
- Three-tier access control via `TS_ACCESS_MODE` (read, readwrite, full)
- Input validation: ID format checks, string length limits, suspicious pattern detection, SBOM structure validation (CycloneDX, SPDX)
- API key validation on startup with early exit on failure
- Structured JSON logging to stderr
- Code generation pipeline: OpenAPI spec + domain-mapping.yaml → TypeScript tool definitions
- Dockerfile with multi-stage build
- Domain mapping file for codegen configuration
- CI workflow: build validation and codegen consistency check
- Docker publish workflow with ts-scan quality gate (scan + upload + wait-for-analysis)
- Weekly OpenAPI spec sync workflow with auto-PR creation
