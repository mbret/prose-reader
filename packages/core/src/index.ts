export type { Manifest } from "@prose-reader/shared"

import { createReaderWithEnhancers as createReader } from "./createReaderWithEnhancer"
export { DocumentRenderer } from "./spineItem/renderer/DocumentRenderer"
export { ResourceHandler } from "./spineItem/resources/ResourceHandler"
export type { Theme } from "./enhancers/theme"
export { HookManager } from "./hooks/HookManager"

export { SettingsManager } from "./settings/SettingsManager"

export type Reader = ReturnType<typeof createReader>

export { createReader }

export { isHtmlElement, isHtmlTagElement } from "./utils/dom"
export { isShallowEqual } from "./utils/objects"
export { waitForSwitch } from "./utils/rxjs"
export { SpineItem } from "./spineItem/SpineItem"
export * from "./utils/DestroyableClass"

export * from "./utils/frames"
export * from "./utils/rxjs"
