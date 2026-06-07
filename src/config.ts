export const ACCESS_MODES = ["read", "readwrite", "full"] as const;
export type AccessMode = (typeof ACCESS_MODES)[number];

const ACCESS_MODE_RANK: Record<AccessMode, number> = {
  read: 0,
  readwrite: 1,
  full: 2,
};

export function isAccessAllowed(
  required: AccessMode,
  current: AccessMode,
): boolean {
  return ACCESS_MODE_RANK[current] >= ACCESS_MODE_RANK[required];
}

export const TRANSPORTS = ["stdio", "http"] as const;
export type TransportMode = (typeof TRANSPORTS)[number];

export interface ServerConfig {
  apiKey: string;
  apiBaseUrl: string;
  accessMode: AccessMode;
  transport: TransportMode;
  httpPort: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): ServerConfig {
  const apiKey = process.env.TS_API_KEY;
  if (!apiKey) {
    console.error(
      "[FATAL] TS_API_KEY environment variable is required. " +
        "Obtain an API key from your TrustSource company settings under Scanners & API.",
    );
    process.exit(1);
  }

  const rawMode = process.env.TS_ACCESS_MODE ?? "read";
  if (!ACCESS_MODES.includes(rawMode as AccessMode)) {
    console.error(
      `[FATAL] TS_ACCESS_MODE must be one of: ${ACCESS_MODES.join(", ")}. Got: "${rawMode}"`,
    );
    process.exit(1);
  }

  const rawTransport = process.env.TS_TRANSPORT ?? "stdio";
  if (!TRANSPORTS.includes(rawTransport as TransportMode)) {
    console.error(
      `[FATAL] TS_TRANSPORT must be one of: ${TRANSPORTS.join(", ")}. Got: "${rawTransport}"`,
    );
    process.exit(1);
  }

  const httpPort = parseInt(process.env.TS_HTTP_PORT ?? "3000", 10);

  return {
    apiKey,
    apiBaseUrl:
      process.env.TS_API_BASE_URL ?? "https://api.trustsource.io/v2",
    accessMode: rawMode as AccessMode,
    transport: rawTransport as TransportMode,
    httpPort,
    logLevel:
      (process.env.TS_LOG_LEVEL as ServerConfig["logLevel"]) ?? "info",
  };
}
