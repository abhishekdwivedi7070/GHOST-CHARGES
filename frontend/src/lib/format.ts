export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatInterval(days: number): string {
  if (days >= 350 && days <= 380) return "yearly";
  if (days >= 85 && days <= 95) return "quarterly";
  if (days >= 26 && days <= 35) return "monthly";
  if (days >= 6 && days <= 8) return "weekly";
  return `every ${days}d`;
}

export function inferCategory(merchantNorm: string): string {
  const name = merchantNorm.toUpperCase();
  const rules: [RegExp, string][] = [
    [/NETFLIX|SPOTIFY|HULU|DISNEY|HBO|YOUTUBE/, "Streaming"],
    [/ADOBE|GITHUB|OPENAI|MICROSOFT|APPLE|GOOGLE|DROPBOX|SLACK|ZOOM|ANTHROPIC/, "Software"],
    [/PLANET FITNESS|LA FITNESS|PELOTON|EQUINOX/, "Fitness"],
    [/AMAZON|AMZN/, "Shopping"],
    [/UBER|LYFT/, "Transport"],
    [/STARBUCKS|DOORDASH/, "Food"],
    [/COMCAST|VERIZON|AT&T/, "Utilities"],
  ];

  for (const [pattern, category] of rules) {
    if (pattern.test(name)) return category;
  }
  return "Other";
}
