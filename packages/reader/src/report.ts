const ROOT_NAMESPACE = `@oboku/reader`

const wrap = (str: string) => `[${str}]`

const createReport = (namespace?: string) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...data: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      if (namespace) console.log(wrap(ROOT_NAMESPACE), wrap(namespace), ...data);
      else console.log(wrap(ROOT_NAMESPACE), ...data);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...data: any[]) => {
    if (process.env.NODE_ENV === 'development') {
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
  time: (label?: string | undefined) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.time(`[oboku-reader] [metric] ${label}`);
    }
  },
  timeEnd: (label?: string | undefined) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.timeEnd(`[oboku-reader] [metric] ${label}`);
    }
  },
  metric: (performanceEntry: PerformanceEntry | { name: string; duration: number }, targetDuration = Infinity) => {
    const duration = typeof performanceEntry === 'number' ? performanceEntry : performanceEntry.duration;
    if (process.env.NODE_ENV === 'development') {
      if (performanceEntry.duration <= targetDuration) {
        // eslint-disable-next-line no-console
        console.log(`[oboku-reader] [metric] `, `${performanceEntry.name} took ${duration}ms`);
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
  measurePerformance: <F extends (...args: any[]) => any>(name: string, targetDuration = 10, functionToMeasure: F) => {
    return (...args: Parameters<F>): ReturnType<F> => {
      const t0 = performance.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = functionToMeasure(...(args as any));

      if (response && response.then) {
        return response.then((res: any) => {
          const t1 = performance.now();
          Report.metric({ name, duration: t1 - t0 }, targetDuration);
          return res;
        });
      }

      const t1 = performance.now();
      Report.metric({ name, duration: t1 - t0 }, targetDuration);

      return response;
    };
  },
})

export const Report = ({
  ...createReport(),
  namespace: (namespace: string) => createReport(namespace),
});
