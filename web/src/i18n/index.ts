import en from './en'
import ru from './ru'
import tg from './tg'

export const locales = {
  en: { label: 'English', flag: '🇬🇧', translations: en },
  ru: { label: 'Русский', flag: '🇷🇺', translations: ru },
  tg: { label: 'Тоҷикӣ', flag: '🇹🇯', translations: tg },
}

export type Locale = keyof typeof locales
export { en, ru, tg }
