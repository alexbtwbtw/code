import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { en, type TranslationKey } from './en'
import { pt } from './pt'

type Language = 'en' | 'pt'

interface I18nContext {
  lang: Language
  t: (key: TranslationKey) => string
  setLang: (lang: Language) => void
}

const I18nCtx = createContext<I18nContext | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('pt')

  const t = (key: TranslationKey): string =>
    (lang === 'pt' ? pt[key] : en[key]) ?? key

  return (
    <I18nCtx.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nCtx.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>')
  return ctx
}
