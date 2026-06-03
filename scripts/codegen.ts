import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

interface PathEntry {
  path: string;
  methods: string[];
  minAccessMode?: string;
}

interface DomainDef {
  description: string;
  minAccessMode: string;
  paths: PathEntry[];
}

interface DomainMapping {
  domains: Record<string, DomainDef>;
}

interface OpenApiParam {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: { type?: string; enum?: string[] };
}

interface OpenApiOperation {
  summary?: string;
  description?: string;
  parameters?: OpenApiParam[];
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: unknown }>;
  };
  tags?: string[];
}

interface OpenApiPathItem {
  [method: string]: OpenApiOperation;
}

interface OpenApiSpec {
  paths: Record<string, OpenApiPathItem>;
}

function buildActionName(method: string, path: string): string {
  const parts = path
    .replace(/^\//, "")
    .split("/")
    .filter((p) => !p.startsWith("{"))
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, "_"));

  const prefix =
    method === "get"
      ? "get"
      : method === "post"
        ? "create"
        : method === "delete"
          ? "delete"
          : method;

  const lastPart = parts[parts.length - 1] ?? "resource";

  // For paths with an ID parameter at the end, adjust verb
  const hasIdParam = path.endsWith("}");
  if (method === "get" && !hasIdParam) return `list_${lastPart}`;
  if (method === "get" && hasIdParam) return `get_${lastPart}`;
  if (method === "post" && hasIdParam) return `update_${lastPart}`;
  if (method === "post" && !hasIdParam) return `${prefix}_${lastPart}`;
  if (method === "delete") return `delete_${lastPart}`;

  return `${prefix}_${lastPart}`;
}

function extractParams(
  spec: OpenApiSpec,
  path: string,
  method: string,
): OpenApiParam[] {
  const pathItem = spec.paths[path];
  if (!pathItem) return [];
  const operation = pathItem[method] as OpenApiOperation | undefined;
  if (!operation) return [];

  return (operation.parameters ?? []).filter(
    (p) => p.name !== "x-api-key" && p.in !== "header",
  );
}

function getOperationMeta(
  spec: OpenApiSpec,
  path: string,
  method: string,
): { summary: string; description: string; hasBody: boolean } {
  const pathItem = spec.paths[path];
  const operation = pathItem?.[method] as OpenApiOperation | undefined;
  return {
    summary: operation?.summary ?? "",
    description: operation?.description ?? "",
    hasBody: !!operation?.requestBody,
  };
}

function generateToolCode(
  domainName: string,
  domain: DomainDef,
  spec: OpenApiSpec,
): string {
  const actions: string[] = [];

  for (const pathEntry of domain.paths) {
    for (const method of pathEntry.methods) {
      const actionName = buildActionName(method, pathEntry.path);
      const params = extractParams(spec, pathEntry.path, method);
      const meta = getOperationMeta(spec, pathEntry.path, method);
      const accessMode = pathEntry.minAccessMode ?? domain.minAccessMode;

      actions.push(
        JSON.stringify({
          name: actionName,
          method: method.toUpperCase(),
          path: pathEntry.path,
          summary: meta.summary,
          description: meta.description,
          minAccessMode: accessMode,
          hasBody: meta.hasBody,
          params: params.map((p) => ({
            name: p.name,
            in: p.in,
            description: p.description ?? "",
            required: p.required ?? false,
            type: p.schema?.type ?? "string",
          })),
        }),
      );
    }
  }

  return `  {
    name: ${JSON.stringify(domainName)},
    description: ${JSON.stringify(domain.description)},
    minAccessMode: ${JSON.stringify(domain.minAccessMode)},
    actions: [
${actions.map((a) => `      ${a}`).join(",\n")}
    ],
  }`;
}

function main() {
  const mappingPath = resolve(ROOT, "domain-mapping.yaml");
  const specPath = resolve(ROOT, "ts-api", "openapi.yaml");
  const outputPath = resolve(ROOT, "src", "generated-tools.ts");

  const mapping: DomainMapping = parseYaml(readFileSync(mappingPath, "utf-8"));
  const spec: OpenApiSpec = parseYaml(readFileSync(specPath, "utf-8"));

  // Verify all mapped paths exist in the spec
  const missingPaths: string[] = [];
  for (const [name, domain] of Object.entries(mapping.domains)) {
    for (const pathEntry of domain.paths) {
      if (!spec.paths[pathEntry.path]) {
        missingPaths.push(`${name}: ${pathEntry.path}`);
      }
    }
  }
  if (missingPaths.length > 0) {
    console.error("Paths in domain-mapping.yaml not found in OpenAPI spec:");
    for (const p of missingPaths) console.error(`  - ${p}`);
    process.exit(1);
  }

  // Check for unmapped paths
  const mappedPaths = new Set<string>();
  for (const domain of Object.values(mapping.domains)) {
    for (const pe of domain.paths) {
      mappedPaths.add(pe.path);
    }
  }
  const unmapped = Object.keys(spec.paths).filter(
    (p) => !mappedPaths.has(p),
  );
  if (unmapped.length > 0) {
    console.warn("Unmapped API paths (not included in any domain tool):");
    for (const p of unmapped) console.warn(`  - ${p}`);
  }

  const domainEntries = Object.entries(mapping.domains).map(
    ([name, domain]) => generateToolCode(name, domain, spec),
  );

  const output = `// AUTO-GENERATED by scripts/codegen.ts — DO NOT EDIT
import type { AccessMode } from "./config.js";

export interface ActionParam {
  name: string;
  in: "path" | "query";
  description: string;
  required: boolean;
  type: string;
}

export interface ToolAction {
  name: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  minAccessMode: AccessMode;
  hasBody: boolean;
  params: ActionParam[];
}

export interface DomainTool {
  name: string;
  description: string;
  minAccessMode: AccessMode;
  actions: ToolAction[];
}

export const DOMAIN_TOOLS: DomainTool[] = [
${domainEntries.join(",\n")}
];
`;

  writeFileSync(outputPath, output, "utf-8");
  console.log(
    `Generated ${Object.keys(mapping.domains).length} domain tools → ${outputPath}`,
  );
}

main();
