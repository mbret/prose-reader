const ROOT_NAMESPACE = `@prose-reader/core`

import { Report as SharedReport } from "@prose-reader/shared"

const getWindow = () => {
  if (typeof window === "undefined") {
    return undefined
  }

  return window
}

export const Report = SharedReport.namespace(
  ROOT_NAMESPACE,
  getWindow()?.__PROSE_READER_DEBUG,
)
