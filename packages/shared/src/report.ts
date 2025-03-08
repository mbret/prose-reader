declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean
  }
}

const wrap = (str: string) => `[${str}]`

const createReport = (namespace?: string, enabled?: boolean) => {
  return {
    namespace: (_namespace: string, enabled?: boolean) =>
      createReport(`${namespace} ${_namespace}`, enabled),
    debug:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(
              console.debug,
              console,
              wrap(namespace),
            )
          : Function.prototype.bind.call(console.debug, console),
    info:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(console.info, console, wrap(namespace))
          : Function.prototype.bind.call(console.info, console),
    log:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(console.log, console, wrap(namespace))
          : Function.prototype.bind.call(console.log, console),
    warn:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(console.warn, console, wrap(namespace))
          : Function.prototype.bind.call(console.warn, console),
    error:
      !enabled || window?.__PROSE_READER_DEBUG !== true
        ? () => {}
        : namespace
          ? Function.prototype.bind.call(
              console.error,
              console,
              wrap(namespace),
            )
          : Function.prototype.bind.call(console.error, console),
  }
}

export const Report = {
  ...createReport(),
  namespace: (namespace: string, enabled?: boolean) =>
    createReport(namespace, enabled),
}
