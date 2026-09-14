export type CategoryRule = {
  keyword: string;
  category: string;
};

export function matchCategory(
  merchantNorm: string,
  merchantRaw: string,
  rules: CategoryRule[],
): string | null {
  const haystacks = [merchantNorm.toUpperCase(), merchantRaw.toUpperCase()];

  for (const rule of rules) {
    const keyword = rule.keyword.trim().toUpperCase();
    if (!keyword) continue;
    if (haystacks.some((text) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}
