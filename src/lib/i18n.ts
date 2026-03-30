export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function parseMultilingualJson(
  json: string,
  locale: string,
  fallback = DEFAULT_LOCALE
): string {
  try {
    const obj = JSON.parse(json) as Record<string, string>;
    return obj[locale] ?? obj[fallback] ?? Object.values(obj)[0] ?? "";
  } catch {
    return json;
  }
}

export function buildMultilingualJson(
  existing: string,
  locale: string,
  value: string
): string {
  try {
    const obj = JSON.parse(existing) as Record<string, string>;
    obj[locale] = value;
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ [locale]: value });
  }
}
