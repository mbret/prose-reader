const AUDIO_VISUALIZER_LEVEL_COUNT = 80
const AUDIO_VISUALIZER_NOISE_FLOOR = 0.035

export const getIdleVisualizerLevels = () =>
  Array.from({ length: AUDIO_VISUALIZER_LEVEL_COUNT }, () => 0)

export const getVisualizerLevels = (data: ArrayLike<number>) => {
  if (data.length === 0) return getIdleVisualizerLevels()

  const bucketSize = Math.max(
    1,
    Math.floor(data.length / AUDIO_VISUALIZER_LEVEL_COUNT),
  )

  return Array.from({ length: AUDIO_VISUALIZER_LEVEL_COUNT }, (_, index) => {
    const start = index * bucketSize
    const end = Math.min(data.length, start + bucketSize)

    if (start >= data.length || start === end) return 0

    let total = 0

    for (let cursor = start; cursor < end; cursor += 1) {
      total += data[cursor] ?? 0
    }

    const average = total / (end - start)
    const normalizedAverage = average / 255
    const gatedAverage =
      (normalizedAverage - AUDIO_VISUALIZER_NOISE_FLOOR) /
      (1 - AUDIO_VISUALIZER_NOISE_FLOOR)

    return Math.max(0, Math.min(1, gatedAverage))
  })
}
