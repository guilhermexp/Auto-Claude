import { useCallback, useRef, useState } from 'react'
import { translateText } from '../lib/text-translation'

export interface TranslationEntry {
  key: string
  text: string
}

interface UseTextTranslationResult {
  isEnabled: boolean
  isTranslating: boolean
  lastError: string | null
  toggleEnabled: () => void
  clearError: () => void
  getText: (key: string, fallback: string) => string
  ensureTranslations: (entries: TranslationEntry[]) => Promise<void>
}

export function useTextTranslation(targetLanguage: string = 'pt'): UseTextTranslationResult {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [translatedByKey, setTranslatedByKey] = useState<Record<string, string>>({})

  const translatedByKeyRef = useRef<Record<string, string>>({})
  const pendingKeysRef = useRef(new Set<string>())
  const activeJobsRef = useRef(0)

  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  const toggleEnabled = useCallback(() => {
    setIsEnabled((previous) => !previous)
    setLastError(null)
  }, [])

  const getText = useCallback(
    (key: string, fallback: string) => {
      if (!isEnabled) {
        return fallback
      }

      return translatedByKey[key] ?? fallback
    },
    [isEnabled, translatedByKey]
  )

  const ensureTranslations = useCallback(
    async (entries: TranslationEntry[]) => {
      if (!isEnabled || entries.length === 0) {
        return
      }

      const pendingEntries = entries.filter((entry) => {
        if (!entry.text.trim()) {
          return false
        }

        if (pendingKeysRef.current.has(entry.key)) {
          return false
        }

        return translatedByKeyRef.current[entry.key] === undefined
      })

      if (pendingEntries.length === 0) {
        return
      }

      pendingEntries.forEach((entry) => {
        pendingKeysRef.current.add(entry.key)
      })
      activeJobsRef.current += 1
      setIsTranslating(true)

      try {
        const updates: Record<string, string> = {}
        let hasFailures = false

        await Promise.all(
          pendingEntries.map(async (entry) => {
            try {
              updates[entry.key] = await translateText(entry.text, targetLanguage)
            } catch {
              hasFailures = true
              updates[entry.key] = entry.text
            }
          })
        )

        if (Object.keys(updates).length > 0) {
          setTranslatedByKey((previous) => {
            const merged = { ...previous, ...updates }
            translatedByKeyRef.current = merged
            return merged
          })
        }

        if (hasFailures) {
          setLastError('TRANSLATION_PARTIAL_FAILURE')
        }
      } finally {
        pendingEntries.forEach((entry) => {
          pendingKeysRef.current.delete(entry.key)
        })
        activeJobsRef.current = Math.max(0, activeJobsRef.current - 1)
        if (activeJobsRef.current === 0) {
          setIsTranslating(false)
        }
      }
    },
    [isEnabled, targetLanguage]
  )

  return {
    isEnabled,
    isTranslating,
    lastError,
    toggleEnabled,
    clearError,
    getText,
    ensureTranslations,
  }
}
