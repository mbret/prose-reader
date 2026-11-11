import { Report as SharedReport } from "@prose-reader/shared"
import { config } from "rxjs"

const ROOT_NAMESPACE = `@prose-reader/core`

export const Report = SharedReport.namespace(ROOT_NAMESPACE, undefined, {
  color: `#98cde7`,
})

/**
 * Reports an error that the reader recovers from as rxjs reports an error that
 * no subscriber handles, so one `config.onUnhandledError` receives both. rxjs
 * keeps its own function for this internal. Without a handler, the error is
 * thrown in a timer, so the throw stops nothing.
 *
 * `Report` traces only while debugging. This reports in every build.
 */
export const reportRecoveredError = (error: unknown) => {
  setTimeout(() => {
    if (config.onUnhandledError) {
      config.onUnhandledError(error)
    } else {
      throw error
    }
  })
}
