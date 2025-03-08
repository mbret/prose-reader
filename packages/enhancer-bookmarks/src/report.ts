import { Report } from "@prose-reader/shared"
import { name } from "../package.json"

const IS_DEBUG_ENABLED = true

export const report = Report.namespace(name, IS_DEBUG_ENABLED)
