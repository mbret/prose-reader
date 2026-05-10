/**
 * This report class needs to be fast because it is used in hot path. The disabled state
 * should not trigger any i/o and be no op operations.
 * The logging should keep the original stack trace.
 */

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

export type ReportOptions = {
  color?: string
}

export type ReportNamespaceOptions = ReportOptions & {
  enabled?: boolean
}

type ReportNamespace = {
  (namespace: string, enabled?: boolean, options?: ReportOptions): Report
  (namespace: string, options?: ReportNamespaceOptions): Report
}

type ReportGroupArgs = [label: string, ...styles: string[]]

type NamespaceSegment = {
  label: string
  color?: string
}

export type Report = {
  enable: (enabled: boolean) => void
  isEnabled: () => boolean
  namespace: ReportNamespace
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  debug: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  info: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  log: (...args: any[]) => void
  /** Use with getGroupArgs for namespace + color. Preserves call site. */
  groupCollapsed: (...args: unknown[]) => void
  groupEnd: () => void
  /** Returns [label, ...styles] to pass to groupCollapsed for namespace + color. */
  getGroupArgs: (title: string) => ReportGroupArgs
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  warn: (...args: any[]) => void
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  error: (...args: any[]) => void
}

const getNamespaceArgs = (
  enabledOrOptions?: boolean | ReportNamespaceOptions,
  options?: ReportOptions,
) => {
  if (typeof enabledOrOptions === "boolean") {
    return {
      enabled: enabledOrOptions,
      options,
    }
  }

  return {
    enabled: enabledOrOptions?.enabled,
    options: enabledOrOptions ?? options,
  }
}

const getCurrentColor = (namespaceSegments: NamespaceSegment[]) =>
  namespaceSegments.at(-1)?.color

const getStyledNamespaceArgs = (
  namespaceSegments: NamespaceSegment[],
): ReportGroupArgs | undefined => {
  if (!namespaceSegments.length) {
    return undefined
  }

  if (!namespaceSegments.some((segment) => segment.color)) {
    return [namespaceSegments.map((segment) => segment.label).join(" ")]
  }

  let label = ""
  const styles: string[] = []

  for (const namespaceSegment of namespaceSegments) {
    label += `%c${label ? ` ${namespaceSegment.label}` : namespaceSegment.label}`
    styles.push(
      namespaceSegment.color ? `color: ${namespaceSegment.color}` : "",
    )
  }

  return [label, ...styles]
}

const createReport = (
  namespaceSegments: NamespaceSegment[] = [],
  enabled = isGlobalDebugEnabled(),
): Report => {
  let reportEnabled = enabled

  const report: Report = {
    enable: (enabled: boolean) => {
      setEnabled(enabled)
    },
    namespace: (
      _namespace: string,
      enabledOrOptions?: boolean | ReportNamespaceOptions,
      namespaceOptions?: ReportOptions,
    ) => {
      const childNamespaceArgs = getNamespaceArgs(
        enabledOrOptions,
        namespaceOptions,
      )

      const childColor =
        childNamespaceArgs.options?.color ?? getCurrentColor(namespaceSegments)

      return createReport(
        [
          ...namespaceSegments,
          {
            label: `[${_namespace}]`,
            color: childColor,
          },
        ],
        childNamespaceArgs.enabled ?? reportEnabled,
      )
    },
    isEnabled: () => reportEnabled,
    debug: () => {},
    info: () => {},
    log: () => {},
    groupCollapsed: () => {},
    groupEnd: () => {},
    getGroupArgs: (title: string) => {
      const namespaceArgs = getStyledNamespaceArgs(namespaceSegments)

      if (!namespaceArgs) {
        return [title]
      }

      const [namespaceLabel, ...namespaceStyles] = namespaceArgs

      return [`${namespaceLabel} ${title}`, ...namespaceStyles]
    },
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

    const namespaceArgs = getStyledNamespaceArgs(namespaceSegments) ?? []

    report.debug = Function.prototype.bind.call(
      console.debug,
      console,
      ...namespaceArgs,
    )
    report.info = Function.prototype.bind.call(
      console.info,
      console,
      ...namespaceArgs,
    )
    report.log = Function.prototype.bind.call(
      console.log,
      console,
      ...namespaceArgs,
    )
    report.groupCollapsed = Function.prototype.bind.call(
      console.groupCollapsed,
      console,
    )
    report.groupEnd = Function.prototype.bind.call(console.groupEnd, console)
    report.warn = Function.prototype.bind.call(
      console.warn,
      console,
      ...namespaceArgs,
    )
    report.error = Function.prototype.bind.call(
      console.error,
      console,
      ...namespaceArgs,
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

export const Report = createReport()
