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
  debug: (...data: any[]) => {
    if (enabled) {
      console.debug(`[prose-reader-streamer]`, ...data)
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
}
