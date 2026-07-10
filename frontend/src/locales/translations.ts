import en from './en.json';
import ro from './ro.json';

export const translations = { en, ro };

export type Language = 'en' | 'ro';

// This allows TypeScript to automatically map all your JSON keys!
export type TranslationKeys = {
  [K in keyof typeof en]: `${K}.${keyof (typeof en)[K] & string}` | `${K}.${string}.[${number}]` // Added array support
}[keyof typeof en];