const MAX_STRING_LENGTH = 10_000;
const MAX_ID_LENGTH = 256;
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB

const SUSPICIOUS_PATTERNS = [
  /[<>{}].*[<>{}]/,        // nested angle/curly brackets (HTML/template injection)
  /(\$\{|`.*`)/,           // template literal injection
  /[\x00-\x08\x0b\x0c\x0e-\x1f]/, // control characters (except \t, \n, \r)
];

const ID_PATTERN = /^[a-zA-Z0-9._:@\/-]+$/;

export function validateId(value: string, name: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${name} must not be empty`;
  }
  if (value.length > MAX_ID_LENGTH) {
    return `${name} exceeds maximum length of ${MAX_ID_LENGTH} characters`;
  }
  if (!ID_PATTERN.test(value)) {
    return `${name} contains invalid characters — only alphanumeric, dots, colons, @, slashes, and hyphens are allowed`;
  }
  return null;
}

export function validateStringParam(
  value: string,
  name: string,
): string | null {
  if (value.length > MAX_STRING_LENGTH) {
    return `${name} exceeds maximum length of ${MAX_STRING_LENGTH} characters`;
  }
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(value)) {
      return `${name} contains suspicious patterns that are not allowed`;
    }
  }
  return null;
}

export function validateJsonBody(body: string, name: string): string | null {
  if (body.length > MAX_BODY_SIZE) {
    return `${name} exceeds maximum size of ${MAX_BODY_SIZE / 1024 / 1024} MB`;
  }
  try {
    JSON.parse(body);
  } catch {
    return `${name} is not valid JSON`;
  }
  return null;
}

export function validateSbomDocument(
  body: string,
  format: "cyclonedx" | "spdx",
): string | null {
  const jsonError = validateJsonBody(body, `${format} document`);
  if (jsonError) return jsonError;

  const doc = JSON.parse(body);

  if (format === "cyclonedx") {
    if (!doc.bomFormat || doc.bomFormat !== "CycloneDX") {
      return "CycloneDX document must have bomFormat set to 'CycloneDX'";
    }
    if (!doc.specVersion) {
      return "CycloneDX document must have a specVersion field";
    }
  }

  if (format === "spdx") {
    if (!doc.spdxVersion) {
      return "SPDX document must have an spdxVersion field";
    }
    if (!doc.SPDXID) {
      return "SPDX document must have an SPDXID field";
    }
  }

  return null;
}
