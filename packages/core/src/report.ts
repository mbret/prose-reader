const ROOT_NAMESPACE = `@prose-reader/core`

const getWindow = () => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window
}

const wrap = (str: string) => `[${str}]`

const time = (name: string, targetDuration = 0) => {
  let tick = 0
  const t0 = performance.now()
  // const t0 = Date.now()
  // console.time(name)

  return () => {
    tick++
    const t1 = performance.now()
    // const t1 = Date.now()
    // console.timeEnd(name)
    Report.logMetric(
      { name: `${name} - tick ${tick}`, duration: t1 - t0 },
      targetDuration,
    )
  }
}

const createReport = (namespace?: string) => ({
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  log: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      if (namespace) console.log(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.log(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  warn: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      if (namespace)
        console.warn(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.warn(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  info: (...data: any[]) => {
    if (getWindow()?.__PROSE_READER_DEBUG) {
      if (namespace)
        console.info(wrap(ROOT_NAMESPACE), wrap(namespace), ...data)
      else console.info(wrap(ROOT_NAMESPACE), ...data)
    }
  },
  debug: namespace
    ? Function.prototype.bind.call(
        console.debug,
        console,
        wrap(`${ROOT_NAMESPACE}`),
        wrap(namespace),
      )
    : Function.prototype.bind.call(
        console.debug,
        console,
        wrap(`${ROOT_NAMESPACE}`),
      ),
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  error: (...data: any[]) => {
    console.error(...data)
  },
  time,
  logMetric: (
    performanceEntry: PerformanceEntry | { name: string; duration: number },
    targetDuration = 0,
  ) => {
    // const duration = typeof performanceEntry === 'number' ? performanceEntry : performanceEntry.duration;
    if (getWindow()?.__PROSE_READER_DEBUG) {
      if (performanceEntry.duration <= targetDuration) {
        // console.log(`[prose-reader] [metric] `, `${performanceEntry.name} took ${duration}ms`);
      } else {
        console.warn(
          `[prose-reader] [metric] `,
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
    { disable }: { disable?: boolean } = {},
  ) => {
    if (disable || !getWindow()?.__PROSE_READER_DEBUG) return functionToMeasure

    return (...args: Parameters<F>): ReturnType<F> => {
      const t0 = performance.now()

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const response = functionToMeasure(...(args as any))

      if (response?.then) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return response.then((res: any) => {
          const t1 = performance.now()
          Report.logMetric({ name, duration: t1 - t0 }, targetDuration)

          return res
        })
      }

      const t1 = performance.now()

      Report.logMetric({ name, duration: t1 - t0 }, targetDuration)

      return response
    }
  },
})

export const Report = {
  ...createReport(),
  namespace: (namespace: string) => createReport(namespace),
}
