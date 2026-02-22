import { Report as SharedReport } from "@prose-reader/shared"
import { name } from "../package.json"

export const Report = SharedReport.namespace(name, false, {
  color: "#ffae42",
})
