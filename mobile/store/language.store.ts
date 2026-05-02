import { create } from 'zustand'

export type Locale = 'en' | 'ru' | 'tg'

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const LOCALES: { key: Locale; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯' },
]

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}))
