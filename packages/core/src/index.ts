import { createSelection } from "./selection"

export type { Manifest } from "@prose-reader/shared"

import { createReaderWithEnhancers as createReader } from "./createReaderWithEnhancer"

export { HookManager } from "./hooks/HookManager"

export { SettingsManager } from "./settings/SettingsManager"

export type Reader = ReturnType<typeof createReader>

export { createReader }

export type ReaderSelection = ReturnType<typeof createSelection>

export { Report } from "./report"

export { isHtmlElement } from "./utils/dom"
export { isShallowEqual } from "./utils/objects"
export { waitForSwitch } from "./utils/rxjs"
