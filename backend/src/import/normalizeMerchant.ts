const ALIASES: { test: RegExp; name: string }[] = [
  { test: /^(AMZN|AMAZON)\b/, name: "AMAZON" },
  { test: /^NETFLIX\b/, name: "NETFLIX" },
  { test: /^SPOTIFY\b/, name: "SPOTIFY" },
  { test: /^HULU\b/, name: "HULU" },
  { test: /^DISNEY\b/, name: "DISNEY" },
  { test: /^HBO\b/, name: "HBO" },
  { test: /^YOUTUBE\b/, name: "YOUTUBE" },
  { test: /^ADOBE\b/, name: "ADOBE" },
  { test: /^MICROSOFT\b/, name: "MICROSOFT" },
  { test: /^GITHUB\b/, name: "GITHUB" },
  { test: /^PLANET FITNESS\b/, name: "PLANET FITNESS" },
  { test: /^LA FITNESS\b/, name: "LA FITNESS" },
  { test: /^PELOTON\b/, name: "PELOTON" },
  { test: /^STARBUCKS\b/, name: "STARBUCKS" },
  { test: /^UBER\b/, name: "UBER" },
  { test: /^LYFT\b/, name: "LYFT" },
  { test: /^OPENAI\b/, name: "OPENAI" },
  { test: /^DOORDASH\b/, name: "DOORDASH" },
  { test: /^APPLE\b/, name: "APPLE" },
  { test: /^GOOGLE\b/, name: "GOOGLE" },
  { test: /^DROPBOX\b/, name: "DROPBOX" },
  { test: /^SLACK\b/, name: "SLACK" },
  { test: /^ZOOM\b/, name: "ZOOM" },
];

/**
 * Rule-based merchant cleanup. Not AI.
 * "AMZN Mktp US*2K3F9" → "AMAZON"
 */
export function normalizeMerchant(raw: string): string {
  let value = raw.normalize("NFKC").trim().toUpperCase();

  // Order IDs and store codes: *2K3F9, #12345
  value = value.replace(/\*[A-Z0-9]+/g, " ");
  value = value.replace(/#\s*[A-Z0-9]+/g, " ");

  // Punctuation → space (keep letters, numbers, &, spaces)
  value = value.replace(/[^A-Z0-9&\s]/g, " ");
  value = value.replace(/\s+/g, " ").trim();

  // Trailing leftover codes like 2K3F9 (mixed letters+digits, not a real word)
  value = value.replace(/\s+[A-Z0-9]*\d[A-Z0-9]*$/g, "").trim();

  if (!value) {
    return "UNKNOWN";
  }

  for (const alias of ALIASES) {
    if (alias.test.test(value)) {
      return alias.name;
    }
  }

  return value;
}
