/* eslint-disable @typescript-eslint/no-explicit-any */
let enabled = false

export const Report = {
  enable: (enable: boolean) => {
    enabled = enable
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  log: (...data: any[]) => {
    if (enabled) {
      console.log(`[prose-reader-streamer]`, ...data)
    }
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  warn: (...data: any[]) => {
    if (enabled) {
      console.warn(`[prose-reader-streamer]`, ...data)
    }
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  error: (...data: any[]) => {
    console.error(...data)
  },
  time: (label?: string | undefined) => {
    if (enabled) {
      console.time(`[prose-reader-streamer] [metric] ${label}`)
    }
  },
  timeEnd: (label?: string | undefined) => {
    if (enabled) {
      console.timeEnd(`[prose-reader-streamer] [metric] ${label}`)
    }
  },
  metric: (
    performanceEntry: { name: string; duration: number },
    targetDuration = Infinity,
  ) => {
    const duration =
      typeof performanceEntry === "number"
        ? performanceEntry
        : performanceEntry.duration
    if (enabled) {
      if (performanceEntry.duration <= targetDuration) {
        console.log(
          `[prose-reader-streamer] [metric] `,
          `${performanceEntry.name} took ${duration}ms`,
        )
      } else {
        console.warn(
          `[prose-reader-streamer] [metric] `,
          `${performanceEntry.name} took ${performanceEntry.duration}ms which is above the ${targetDuration}ms target for this function`,
        )
      }
    }
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  measurePerformance: <F extends (...args: any[]) => any>(
    name: string,
    targetDuration: number,
    functionToMeasure: F,
  ) => {
    return (...args: Parameters<F>): ReturnType<F> => {
      const t0 = performance.now()

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const response = functionToMeasure(...(args as any))

      if (response?.then) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return response.then((res: any) => {
          const t1 = performance.now()
          Report.metric({ name, duration: t1 - t0 }, targetDuration)
          return res
        })
      }

      const t1 = performance.now()

      Report.metric({ name, duration: t1 - t0 }, targetDuration)

      return response
    }
  },
}
