const ROOT_NAMESPACE = `@oboku/reader`

const wrap = (str: string) => `[${str}]`

const time = (name: string) => {
  let tick = 0
  // const t0 = performance.now();
  const t0 = Date.now()
  // console.time(name)

  return () => {
    tick++
    // const t1 = performance.now();
    const t1 = Date.now()
    // console.timeEnd(name)
    Report.logMetric({ name: `${name} - tick ${tick}`, duration: t1 - t0 });
  }
}

const createReport = (namespace?: string) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...data: any[]) => {
    if (window.__OBOKU_READER_DEBUG) {
      // eslint-disable-next-line no-console
      if (namespace) console.log(wrap(ROOT_NAMESPACE), wrap(namespace), ...data);
      else console.log(wrap(ROOT_NAMESPACE), ...data);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...data: any[]) => {
    if (window.__OBOKU_READER_DEBUG) {
      // eslint-disable-next-line no-console
      if (namespace) console.warn(wrap(ROOT_NAMESPACE), wrap(namespace), ...data);
      else console.warn(wrap(ROOT_NAMESPACE), ...data);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...data: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...data);
  },
  // time: (label?: string | undefined) => {
  //   if (window.__OBOKU_READER_DEBUG) {
  //     // eslint-disable-next-line no-console
  //     console.time(`[oboku-reader] [metric] ${label}`);
  //   }
  // },
  // timeEnd: (label?: string | undefined) => {
  //   if (window.__OBOKU_READER_DEBUG) {
  //     // eslint-disable-next-line no-console
  //     console.timeEnd(`[oboku-reader] [metric] ${label}`);
  //   }
  // },
  time,
  logMetric: (performanceEntry: PerformanceEntry | { name: string; duration: number }, targetDuration = 0) => {
    const duration = typeof performanceEntry === 'number' ? performanceEntry : performanceEntry.duration;
    if (window.__OBOKU_READER_DEBUG) {
      if (performanceEntry.duration <= targetDuration) {
        // eslint-disable-next-line no-console
        // console.log(`[oboku-reader] [metric] `, `${performanceEntry.name} took ${duration}ms`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[oboku-reader] [metric] `,
          `${performanceEntry.name} took ${performanceEntry.duration}ms which is above the ${targetDuration}ms target for this function`,
        );
      }
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  measurePerformance: <F extends (...args: any[]) => any>(name: string, targetDuration = 10, functionToMeasure: F, { disable }: { disable?: boolean } = {}) => {
    if (disable) return functionToMeasure
    return (...args: Parameters<F>): ReturnType<F> => {
      const t0 = performance.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = functionToMeasure(...(args as any));

      if (response && response.then) {
        return response.then((res: any) => {
          const t1 = performance.now();
          Report.logMetric({ name, duration: t1 - t0 }, targetDuration);
          return res;
        });
      }

      const t1 = performance.now();
      Report.logMetric({ name, duration: t1 - t0 }, targetDuration);

      return response;
    };
  },
})

export const Report = ({
  ...createReport(),
  namespace: (namespace: string) => createReport(namespace),
});
