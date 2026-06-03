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

export interface ServerConfig {
  apiKey: string;
  apiBaseUrl: string;
  accessMode: AccessMode;
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

  return {
    apiKey,
    apiBaseUrl:
      process.env.TS_API_BASE_URL ?? "https://api.trustsource.io/v2",
    accessMode: rawMode as AccessMode,
    logLevel:
      (process.env.TS_LOG_LEVEL as ServerConfig["logLevel"]) ?? "info",
  };
}
