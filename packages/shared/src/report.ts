/* eslint-disable @typescript-eslint/no-explicit-any */
const ROOT_NAMESPACE = `@prose-reader`

declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}

const wrap = (str: string) => `[${str}]`

const createReport = (namespace?: string, enabled?: boolean) => {
  return {
    debug:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(console.debug, console, wrap(`${ROOT_NAMESPACE}`), wrap(namespace))
          : Function.prototype.bind.call(console.debug, console, wrap(`${ROOT_NAMESPACE}`)),
    info:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(console.info, console, wrap(`${ROOT_NAMESPACE}`), wrap(namespace))
          : Function.prototype.bind.call(console.info, console, wrap(`${ROOT_NAMESPACE}`)),
  }
}

export const Report = {
  ...createReport(),
  namespace: (namespace: string, enabled?: boolean) => createReport(namespace, enabled),
}
