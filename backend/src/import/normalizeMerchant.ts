const ALIASES: { test: RegExp; name: string }[] = [
  { test: /\b(AMZN|AMAZON)\b/, name: "AMAZON" },
  { test: /\bNETFLIX\b/, name: "NETFLIX" },
  { test: /\bSPOTIFY\b/, name: "SPOTIFY" },
  { test: /\bHULU\b/, name: "HULU" },
  { test: /\bDISNEY\b/, name: "DISNEY" },
  { test: /\bHBO\b/, name: "HBO" },
  { test: /\bYOUTUBE\b/, name: "YOUTUBE" },
  { test: /\bADOBE\b/, name: "ADOBE" },
  { test: /\bMICROSOFT\b/, name: "MICROSOFT" },
  { test: /\bGITHUB\b/, name: "GITHUB" },
  { test: /\bPLANET FITNESS\b/, name: "PLANET FITNESS" },
  { test: /\bLA FITNESS\b/, name: "LA FITNESS" },
  { test: /\bPELOTON\b/, name: "PELOTON" },
  { test: /\bSTARBUCKS\b/, name: "STARBUCKS" },
  { test: /\bUBER\b/, name: "UBER" },
  { test: /\bLYFT\b/, name: "LYFT" },
  { test: /\bRAPIDO\b/, name: "RAPIDO" },
  { test: /\bOPENAI\b/, name: "OPENAI" },
  { test: /\bDOORDASH\b/, name: "DOORDASH" },
  { test: /\bAPPLE\b/, name: "APPLE" },
  { test: /\bGOOGLE\b/, name: "GOOGLE" },
  { test: /\bDROPBOX\b/, name: "DROPBOX" },
  { test: /\bSLACK\b/, name: "SLACK" },
  { test: /\bZOOM\b/, name: "ZOOM" },
  { test: /\bAIRTEL\b/, name: "AIRTEL" },
  { test: /\bJIO\b/, name: "JIO" },
  { test: /\bKREDITBEE\b/, name: "KREDITBEE" },
  { test: /\bLAZYPAY\b/, name: "LAZYPAY" },
  { test: /\bPAYU\b/, name: "PAYU" },
  { test: /\bZOMATO\b/, name: "ZOMATO" },
  { test: /\bBLINKIT\b/, name: "BLINKIT" },
];

/**
 * Rule-based merchant cleanup. Not AI.
 * "AMZN Mktp US*2K3F9" → "AMAZON"
 */
export function normalizeMerchant(raw: string): string {
  let value = raw.normalize("NFKC").trim().toUpperCase();

  // Indian UPI: "UPI/Rapido/509119121061/NA" → RAPIDO
  const upi = /^UPI[/\-]([^/\-]+)(?:[/\-].*)?$/.exec(value);
  if (upi?.[1]) {
    value = upi[1];
  }

  value = value.replace(/\bSENT USING PAYT\w*\b/g, " ");
  value = value.replace(/\bPAYMENT FROM PH\w*\b/g, " ");
  value = value.replace(/\bNA\b/g, " ");

  // Order IDs and store codes: *2K3F9, #12345
  value = value.replace(/\*[A-Z0-9]+/g, " ");
  value = value.replace(/#\s*[A-Z0-9]+/g, " ");
  value = value.replace(/\b\d{6,}\w*/g, " ");
  value = value.replace(/\b(PCD|CYBS|UPI)\b/g, " ");

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
