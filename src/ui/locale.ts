import { locale, setLocale, type Locale } from '@engine/chronicle/render';

const STORAGE_KEY = 'valley.locale';

export function savedLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function loadLocale(): Locale {
  const selected = savedLocale();
  setLocale(selected);
  return selected;
}

export function setSavedLocale(selected: Locale): void {
  setLocale(selected);
  try { localStorage.setItem(STORAGE_KEY, selected); } catch { /* modo privado: no se puede persistir */ }
}

export function currentLocale(): Locale {
  return locale();
}
