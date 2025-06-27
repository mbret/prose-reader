const ROOT_NAMESPACE = `@prose-reader/core`

import { Report as SharedReport } from "@prose-reader/shared"

export const Report = SharedReport.namespace(ROOT_NAMESPACE, undefined, {
  color: `#98cde7`,
})
