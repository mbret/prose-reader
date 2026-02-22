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

export type Report = {
  enable: (enabled: boolean) => void
  isEnabled: () => boolean
  namespace: (namespace: string, enabled?: boolean) => Report
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  debug: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  info: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  log: (...args: any[]) => void
  /** Use with getGroupArgs for namespace + color. Preserves call site. */
  groupCollapsed: (...args: unknown[]) => void
  groupEnd: () => void
  /** Returns [label, style?] to pass to groupCollapsed for namespace + color. */
  getGroupArgs: (title: string) => [string, string?] | [string]
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
  let reportEnabled = enabled
  const color = options?.color ? `color: ${options.color}` : undefined

  const report: Report = {
    enable: (enabled: boolean) => {
      setEnabled(enabled)
    },
    namespace: (_namespace: string, enabled?: boolean) =>
      createReport(`${namespace} [${_namespace}]`, enabled, options),
    isEnabled: () => reportEnabled,
    debug: () => {},
    info: () => {},
    log: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
    getGroupArgs: (title: string) =>
      color
        ? [`%c${namespace ? `${namespace} ${title}` : title}`, color]
        : [namespace ? `${namespace} ${title}` : title],
    warn: () => {},
    error: () => {},
  }

  // Keep direct prototype-bound console functions for enabled mode.
  // Wrapping console calls in closures changes call-site/stack behavior in devtools,
  // which makes runtime debugging harder to interpret.
  const applyEnabledState = (enabled: boolean) => {
    if (!enabled) {
      report.debug = () => {}
      report.info = () => {}
      report.log = () => {}
      report.groupCollapsed = () => {}
      report.groupEnd = () => {}
      report.warn = () => {}
      report.error = () => {}

      return
    }

    report.debug = namespace
      ? Function.prototype.bind.call(
          console.debug,
          console,
          namespace,
          `%c${namespace}`,
          color,
        )
      : Function.prototype.bind.call(
          console.debug,
          console,
          `%c${namespace}`,
          color,
        )
    report.info = Function.prototype.bind.call(
      console.info,
      console,
      `%c${namespace}`,
      color,
    )
    report.log = namespace
      ? Function.prototype.bind.call(
          console.log,
          console,
          `%c${namespace}`,
          color,
        )
      : Function.prototype.bind.call(console.log, console)
    report.groupCollapsed = Function.prototype.bind.call(
      console.groupCollapsed,
      console,
    )
    report.groupEnd = Function.prototype.bind.call(console.groupEnd, console)
    report.warn = Function.prototype.bind.call(
      console.warn,
      console,
      `%c${namespace}`,
      color,
    )
    report.error = Function.prototype.bind.call(
      console.error,
      console,
      `%c${namespace}`,
      color,
    )
  }

  const setEnabled = (enabled: boolean) => {
    if (reportEnabled === enabled) {
      return
    }

    reportEnabled = enabled
    applyEnabledState(reportEnabled)
  }

  applyEnabledState(reportEnabled)

  return report
}

export const Report = {
  ...createReport(),
  namespace: (
    namespace: string,
    enabled?: boolean,
    options?: {
      color?: string
    },
  ) => createReport(`[${namespace}]`, enabled, options),
}
