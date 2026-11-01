import type { Language } from "./languages";

/** One message in every language. A missing language is a type error, so nothing ships half translated. */
export type Entry = Record<Language, string>;

/** Declares a group of messages (one file per area of the app, see app/i18n/messages.ts). */
export const defineMessages = <T extends Record<string, Entry>>(messages: T) => messages;
