import { describe, it, expect, beforeEach } from 'vitest'
import { en } from '../i18n/en'
import { pt } from '../i18n/pt'
import { renderHook, act } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider, useTranslation } from '../i18n/context'

// ── Key parity ────────────────────────────────────────────────────────────────

describe('i18n key parity', () => {
  const enKeys = Object.keys(en) as string[]
  const ptKeys = new Set(Object.keys(pt))

  it('every key in en.ts exists in pt.ts', () => {
    const missing = enKeys.filter(k => !ptKeys.has(k))
    if (missing.length > 0) {
      // Report all missing keys for easy fixing
      expect(missing).toEqual([])
    }
  })

  it('en and pt have the same number of keys', () => {
    expect(Object.keys(pt).length).toBe(enKeys.length)
  })

  it('no key in pt.ts is an empty string (raw key shown to user)', () => {
    const emptyKeys = Object.entries(pt)
      .filter(([, v]) => v === '')
      .map(([k]) => k)
    expect(emptyKeys).toEqual([])
  })
})

// ── useTranslation ────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(LanguageProvider, null, children)
}

describe('useTranslation', () => {
  it('throws when used outside LanguageProvider', () => {
    // renderHook without wrapper — should throw
    expect(() => {
      renderHook(() => useTranslation())
    }).toThrow('useTranslation must be used inside <LanguageProvider>')
  })

  it('defaults to Portuguese (pt) language', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    expect(result.current.lang).toBe('pt')
  })

  it('t() returns Portuguese string by default', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    // 'appName' key — verify it returns a non-empty string
    const value = result.current.t('appName')
    expect(typeof value).toBe('string')
    expect(value.length).toBeGreaterThan(0)
    // PT value should match pt.appName
    expect(value).toBe(pt['appName'])
  })

  it('t() returns English string after switching to EN', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    act(() => result.current.setLang('en'))
    expect(result.current.lang).toBe('en')
    expect(result.current.t('appName')).toBe(en['appName'])
  })

  it('setLang switches language back to PT', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper })
    act(() => result.current.setLang('en'))
    act(() => result.current.setLang('pt'))
    expect(result.current.lang).toBe('pt')
    expect(result.current.t('appName')).toBe(pt['appName'])
  })
})
