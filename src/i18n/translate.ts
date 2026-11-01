import { MESSAGES, type MessageKey } from "./messages";
import type { Language } from "./languages";

export type MessageVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: MessageVars) => string;

const pluralRules = new Map<Language, Pick<Intl.PluralRules, "select">>();

/**
 * Hermes on Android has no Intl.PluralRules, so the CLDR "one" rule for our languages is written
 * out: English and Marathi use it for exactly 1, Hindi for 0 and 1.
 */
const fallbackRules = (language: Language): Pick<Intl.PluralRules, "select"> => ({
  select: (n) => ((language === "hi" ? n === 0 || n === 1 : n === 1) ? "one" : "other"),
});

/**
 * The message in `language` with `{name}` filled in. A message written as "one|other"
 * (e.g. "{count} visitor|{count} visitors") picks its form from `vars.count`.
 */
export function translate(language: Language, key: MessageKey, vars?: MessageVars): string {
  let text: string = MESSAGES[key][language];
  if (text.includes("|")) {
    const [one, other] = text.split("|");
    let rules = pluralRules.get(language);
    if (!rules) {
      rules = typeof Intl.PluralRules === "function" ? new Intl.PluralRules(language) : fallbackRules(language);
      pluralRules.set(language, rules);
    }
    text = rules.select(Number(vars?.count ?? 0)) === "one" ? one : other;
  }
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
}

// The language in use, for code outside React (the API client's own messages, booking reminders).
let current: Language = "en";
export const setCurrentLanguage = (language: Language) => {
  current = language;
};
export const currentLanguage = () => current;
/** `translate` in the language in use. */
export const say: Translate = (key, vars) => translate(current, key, vars);

/** The locale for Intl date and number formats; digits stay 0–9 in every language. */
export const intlLocale = (language: Language) => `${language}-IN-u-nu-latn`;
