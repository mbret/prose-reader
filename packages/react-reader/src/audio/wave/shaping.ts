import {
  DEFAULT_STATE_BASE_LEVEL,
  DEFAULT_STATE_HILL_SPREAD,
  DEFAULT_STATE_PEAK_LEVEL,
  DEFAULT_STATE_TEXTURE_AMOUNT,
  IDLE_LEVEL,
} from "./constants"

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  if (edge0 === edge1) return Number(value >= edge1)

  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1)

  return normalized * normalized * (3 - 2 * normalized)
}

const getDefaultTexture = (progress: number) => {
  const lowFrequency = Math.sin(progress * Math.PI * 6 + 0.8)
  const highFrequency = Math.sin(progress * Math.PI * 14 + 1.7)

  return clamp(0.5 + lowFrequency * 0.3 + highFrequency * 0.2, 0, 1)
}

export const getDefaultDisplayBars = (numBars: number) =>
  Array.from({ length: numBars }, (_, index) => {
    const progress = numBars === 1 ? 0.5 : index / (numBars - 1)
    const centerDistance = Math.abs(progress - 0.5) * 2
    const hillProfile =
      1 - smoothstep(DEFAULT_STATE_HILL_SPREAD, 1, centerDistance)
    const texture = getDefaultTexture(progress)
    const texturedHill =
      hillProfile *
      (1 -
        DEFAULT_STATE_TEXTURE_AMOUNT +
        texture * DEFAULT_STATE_TEXTURE_AMOUNT)

    return clamp(
      DEFAULT_STATE_BASE_LEVEL + DEFAULT_STATE_PEAK_LEVEL * texturedHill,
      0,
      1,
    )
  })

const getAverage = (values: number[]) => {
  if (values.length === 0) return 0

  return values.reduce((total, value) => total + value, 0) / values.length
}

export const hasMeaningfulBars = (values: number[]) =>
  values.some((value) => value > 0.001)

export const getNormalizedDisplayBarCount = (value: number) => {
  const safeValue = Math.max(1, Math.floor(value))

  return safeValue % 2 === 0 ? safeValue + 1 : safeValue
}

export const getMirroredBars = (values: number[], displayBarCount: number) => {
  const normalizedDisplayBarCount =
    getNormalizedDisplayBarCount(displayBarCount)
  const centerOutSeedCount = Math.floor(normalizedDisplayBarCount / 2) + 1

  const centerOutSeed = Array.from(
    { length: centerOutSeedCount },
    (_, index) => {
      const start = Math.floor((index * values.length) / centerOutSeedCount)
      const end = Math.max(
        start + 1,
        Math.floor(((index + 1) * values.length) / centerOutSeedCount),
      )
      const average = getAverage(values.slice(start, end))

      return clamp(average, 0, 1)
    },
  )

  const centerBar = centerOutSeed[0] ?? IDLE_LEVEL
  const outerBars = centerOutSeed.slice(1)

  return [...outerBars.slice().reverse(), centerBar, ...outerBars]
}

export const resolveGradientColors = (
  element: HTMLElement,
  {
    topVariable,
    topFallback,
    bottomVariable,
    bottomFallback,
  }: {
    topVariable: string
    topFallback: string
    bottomVariable: string
    bottomFallback: string
  },
) => {
  const styles = window.getComputedStyle(element)
  const topColor = styles.getPropertyValue(topVariable).trim() || topFallback
  const bottomColor =
    styles.getPropertyValue(bottomVariable).trim() || bottomFallback

  return {
    topColor,
    bottomColor,
  }
}
