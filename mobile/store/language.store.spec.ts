import { beforeEach, describe, expect, it } from 'vitest'
import { LOCALES, useLanguageStore } from './language.store'

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState({ locale: 'en' })
  })

  it('offers each supported locale exactly once', () => {
    expect(LOCALES.map(({ key }) => key)).toEqual(['en', 'ru', 'tg'])
  })

  it('changes the active locale', () => {
    useLanguageStore.getState().setLocale('tg')

    expect(useLanguageStore.getState().locale).toBe('tg')
  })
})
