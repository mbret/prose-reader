import { PROJECT_NAME } from "./constants.shared";

const IS_DEVELOPMENT = process.env.NODE_ENV === `development`

export const Report = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: (...data: any[]) => {
    if (IS_DEVELOPMENT) {
      // eslint-disable-next-line no-console
      console.log(`[${PROJECT_NAME}]`, ...data);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...data: any[]) => {
    if (self.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      console.warn(`[prose-reader]`, ...data);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...data: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...data);
  },
  time: (label?: string | undefined) => {
    if (self.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      console.time(`[prose-reader] [metric] ${label}`);
    }
  },
  timeEnd: (label?: string | undefined) => {
    if (self.__PROSE_READER_DEBUG) {
      // eslint-disable-next-line no-console
      console.timeEnd(`[prose-reader] [metric] ${label}`);
    }
  },
  metric: (performanceEntry: PerformanceEntry | { name: string; duration: number }, targetDuration = Infinity) => {
    const duration = typeof performanceEntry === 'number' ? performanceEntry : performanceEntry.duration;
    if (self.__PROSE_READER_DEBUG) {
      if (performanceEntry.duration <= targetDuration) {
        // eslint-disable-next-line no-console
        console.log(`[prose-reader] [metric] `, `${performanceEntry.name} took ${duration}ms`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[prose-reader] [metric] `,
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
};
