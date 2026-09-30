import { id } from "./id";
import { en } from "./en";
import type { Locale, I18nDictionary } from "../types";

export const translations: Record<Locale, I18nDictionary> = {
  id,
  en,
};

export { id, en };
