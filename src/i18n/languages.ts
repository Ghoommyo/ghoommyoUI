/** The languages the website and apps are translated into (plans/phase-30-languages.md). */
export const LANGUAGE_CODES = ["en", "hi", "mr"] as const;
export type Language = (typeof LANGUAGE_CODES)[number];

/** Each language in its own script, as the picker shows it. */
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
  { code: "mr", name: "मराठी" },
];

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);

/** The best match for a list of preferred languages (`Accept-Language`, navigator.languages): hi, mr, else en. */
export function pickLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const code = tag.trim().slice(0, 2).toLowerCase();
    if (code === "en" || code === "hi" || code === "mr") return code;
  }
  return "en";
}
