/**
 * This detector intentionally stays filename-only and conservative.
 *
 * Future improvements should consider archive sequence context before widening
 * detection. For example, a spread such as `p002-003.jpg` is safer to split
 * when neighboring resources make the sequence plausible, like `p001.jpg` and
 * `p004.jpg`.
 */
export type DetectedPageSpread = {
  firstPageLabel: string
  secondPageLabel: string
}

const MAX_DETECTED_PAGE_NUMBER = 2000

const numberFromPageLabel = (label: string): number | undefined => {
  const value = Number.parseInt(label, 10)

  if (!Number.isFinite(value)) return undefined
  if (value < 0 || value > MAX_DETECTED_PAGE_NUMBER) return undefined

  return value
}

const detectPageLabelsFromBasename = (basenameWithoutExtension: string) => {
  const explicitPageRangeMatch =
    /(?:^|[\s._(-]|\[)p\s*(\d{1,5})\s*[-_~]\s*(?:p\s*)?(\d{1,5})(?=$|[^\d])/i.exec(
      basenameWithoutExtension,
    )

  if (explicitPageRangeMatch) return explicitPageRangeMatch

  return /(?:^|[\s._(]|\[)(0\d{1,4})\s*[-_~]\s*(0\d{1,4})(?=$|[^\d])/i.exec(
    basenameWithoutExtension,
  )
}

export const detectPageSpreadFromBasename = (
  basename: string,
): DetectedPageSpread | undefined => {
  const basenameWithoutExtension = basename.replace(/\.[^.]+$/, ``)
  const match = detectPageLabelsFromBasename(basenameWithoutExtension)

  if (!match) return undefined

  const [, firstPageLabel, secondPageLabel] = match

  if (firstPageLabel === undefined || secondPageLabel === undefined) {
    return undefined
  }

  const firstPageNumber = numberFromPageLabel(firstPageLabel)
  const secondPageNumber = numberFromPageLabel(secondPageLabel)

  if (firstPageNumber === undefined || secondPageNumber === undefined) {
    return undefined
  }

  if (secondPageNumber !== firstPageNumber + 1) {
    return undefined
  }

  return {
    firstPageLabel,
    secondPageLabel,
  }
}
