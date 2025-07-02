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

type Report = {
  namespace: (namespace: string, enabled?: boolean) => Report
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  debug: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  info: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  log: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  warn: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  error: (...args: any[]) => void
}

const createReport = (
  namespace?: string,
  enabled = isGlobalDebugEnabled(),
  options?: {
    color?: string
  },
): Report => {
  return {
    namespace: (_namespace: string, enabled?: boolean) =>
      createReport(`[${namespace}] [${_namespace}]`, enabled, options),
    debug: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.debug, console, namespace)
        : Function.prototype.bind.call(console.debug, console),
    info: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(
            console.info,
            console,
            `%c${namespace}`,
            options?.color ? `color: ${options.color}` : undefined,
          )
        : Function.prototype.bind.call(console.info, console),
    log: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.log, console, namespace)
        : Function.prototype.bind.call(console.log, console),
    warn: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.warn, console, namespace)
        : Function.prototype.bind.call(console.warn, console),
    error: !enabled
      ? () => {}
      : namespace
        ? Function.prototype.bind.call(console.error, console, namespace)
        : Function.prototype.bind.call(console.error, console),
  }
}

export const Report = {
  ...createReport(),
  namespace: (
    namespace: string,
    enabled?: boolean,
    options?: {
      color?: string
    },
  ) => createReport(namespace, enabled, options),
}
