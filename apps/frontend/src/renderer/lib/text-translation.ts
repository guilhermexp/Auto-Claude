const MAX_CHARS_PER_REQUEST = 1800

const translationCache = new Map<string, string>()
const inFlightTranslations = new Map<string, Promise<string>>()

interface TextSegment {
  text: string
  translatable: boolean
}

function splitByCodeFence(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const codeFenceRegex = /```[\s\S]*?```/g
  let lastIndex = 0

  for (const match of text.matchAll(codeFenceRegex)) {
    const matchIndex = match.index ?? 0

    if (matchIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, matchIndex),
        translatable: true,
      })
    }

    segments.push({
      text: match[0],
      translatable: false,
    })

    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      translatable: true,
    })
  }

  return segments
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text]
  }

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const remaining = text.length - start

    if (remaining <= maxChars) {
      chunks.push(text.slice(start))
      break
    }

    const window = text.slice(start, start + maxChars)

    let splitOffset = window.lastIndexOf('\n\n')
    if (splitOffset < maxChars * 0.4) {
      splitOffset = window.lastIndexOf('\n')
    }
    if (splitOffset < maxChars * 0.3) {
      splitOffset = window.lastIndexOf('. ')
    }
    if (splitOffset < maxChars * 0.3) {
      splitOffset = maxChars
    }

    const end = start + splitOffset
    chunks.push(text.slice(start, end))
    start = end
  }

  return chunks
}

function isMostlyCodeOrPath(text: string): boolean {
  const trimmed = text.trim()

  if (!trimmed) {
    return true
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return true
  }

  if (!trimmed.includes(' ')) {
    if (/^[./~\\]/.test(trimmed) || /[\\/]/.test(trimmed)) {
      return true
    }

    if (/^[\w.-]+\.(ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rb|java|kt|swift|yml|yaml|sql|sh|css|scss|html)$/i.test(trimmed)) {
      return true
    }
  }

  return false
}

async function requestTranslation(text: string, targetLanguage: string): Promise<string> {
  const bridge = typeof window !== 'undefined' ? window.electronAPI : undefined
  if (!bridge?.translateText) {
    throw new Error('Translation bridge is unavailable')
  }

  const translated = await bridge.translateText(text, targetLanguage)
  return translated || text
}

async function translateSegment(text: string, targetLanguage: string): Promise<string> {
  if (!text.trim() || isMostlyCodeOrPath(text)) {
    return text
  }

  const chunks = splitIntoChunks(text, MAX_CHARS_PER_REQUEST)
  const translatedChunks: string[] = []

  for (const chunk of chunks) {
    if (!chunk.trim() || isMostlyCodeOrPath(chunk)) {
      translatedChunks.push(chunk)
      continue
    }

    const translated = await requestTranslation(chunk, targetLanguage)
    translatedChunks.push(translated)
  }

  return translatedChunks.join('')
}

async function translateTextInternal(text: string, targetLanguage: string): Promise<string> {
  const segments = splitByCodeFence(text)
  const translatedSegments: string[] = []

  for (const segment of segments) {
    if (!segment.translatable) {
      translatedSegments.push(segment.text)
      continue
    }

    translatedSegments.push(await translateSegment(segment.text, targetLanguage))
  }

  return translatedSegments.join('')
}

export async function translateText(text: string, targetLanguage: string = 'pt'): Promise<string> {
  const normalizedText = text.trim()

  if (!normalizedText) {
    return text
  }

  const cacheKey = `${targetLanguage}:${text}`

  const cachedTranslation = translationCache.get(cacheKey)
  if (cachedTranslation !== undefined) {
    return cachedTranslation
  }

  const inFlight = inFlightTranslations.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const translationPromise = translateTextInternal(text, targetLanguage)
    .then((translatedText) => {
      translationCache.set(cacheKey, translatedText)
      return translatedText
    })
    .finally(() => {
      inFlightTranslations.delete(cacheKey)
    })

  inFlightTranslations.set(cacheKey, translationPromise)
  return translationPromise
}
