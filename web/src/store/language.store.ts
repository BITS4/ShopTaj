import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { locales, type Locale } from '@/i18n'

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof locales.en.translations
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale, t: locales[locale].translations }),
      t: locales.en.translations,
    }),
    {
      name: 'shoptaj-lang',
      onRehydrateStorage: () => (state) => {
        if (state) state.t = locales[state.locale].translations
      },
    },
  ),
)

export const useT = () => useLanguageStore((s) => s.t)
