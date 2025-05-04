declare global {
  interface Window {
    __PROSE_READER_DEBUG?: boolean | string
  }
}

const getWindow = () => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window
}

function isGlobalDebugEnabled() {
  const debug = getWindow()?.__PROSE_READER_DEBUG

  return debug === true || debug === "true"
}

const wrap = (str: string) => `[${str}]`

const createReport = (namespace?: string, enabled = isGlobalDebugEnabled()) => {
  return {
    namespace: (_namespace: string, enabled?: boolean) =>
      createReport(`${namespace} ${_namespace}`, enabled),
    debug: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.debug, console, wrap(namespace))
        : Function.prototype.bind.call(console.debug, console),
    info: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.info, console, wrap(namespace))
        : Function.prototype.bind.call(console.info, console),
    log: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.log, console, wrap(namespace))
        : Function.prototype.bind.call(console.log, console),
    warn: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.warn, console, wrap(namespace))
        : Function.prototype.bind.call(console.warn, console),
    error: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.error, console, wrap(namespace))
        : Function.prototype.bind.call(console.error, console),
  }
}

export const Report = {
  ...createReport(),
  namespace: (namespace: string, enabled?: boolean) =>
    createReport(namespace, enabled),
}
