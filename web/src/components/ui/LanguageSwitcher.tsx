'use client'
import { locales, type Locale } from '@/i18n'
import { useLanguageStore } from '@/store/language.store'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguageStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent text-sm font-medium transition-colors"
      >
        <span>{locales[locale].flag}</span>
        <span className="hidden sm:inline">{locales[locale].label}</span>
        <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-md border bg-background shadow-lg z-50 overflow-hidden">
          {(Object.entries(locales) as [Locale, typeof locales.en][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setLocale(key); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent transition-colors ${locale === key ? 'bg-primary/10 text-primary font-semibold' : ''}`}
            >
              <span className="text-base">{val.flag}</span>
              <span>{val.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
