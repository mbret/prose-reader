export type { Manifest } from "@prose-reader/shared"

import { createReaderWithEnhancers as createReader } from "./createReaderWithEnhancer"
export { DocumentRenderer } from "./spineItem/renderer/DocumentRenderer"
export { ResourceHandler } from "./spineItem/resources/ResourceHandler"
export type { Theme } from "./enhancers/theme"
export { HookManager } from "./hooks/HookManager"
export { SettingsManager } from "./settings/SettingsManager"

export type CreateReaderOptions = Parameters<typeof createReader>[0]

export { createReader }
export type Reader = ReturnType<typeof createReader>

export { isHtmlElement, isHtmlTagElement } from "./utils/dom"
export { isShallowEqual } from "./utils/objects"
export { waitForSwitch } from "./utils/rxjs"
export { SpineItem } from "./spineItem/SpineItem"
export type { PaginationInfo } from "./pagination/types"
export * from "./utils/DestroyableClass"

export * from "./utils/frames"
export * from "./utils/rxjs"

export type PaginationState = ReturnType<
  typeof createReader
>["pagination"]["state"]

// Exports required so that libraries can build when having reference to internal types (TS2742)
export type { EnhancerFontsInputSettings } from "./enhancers/fonts"
export type { EnhancerLayoutInputSettings } from "./enhancers/layout/types"
export * from "./settings/types"
export * from "./context/Context"
export * from "./enhancers/layout/layoutEnhancer"
export * from "./enhancers/navigation/types"
export * from "./enhancers/zoom/types"
export * from "./enhancers/pagination/ResourcesLocator"
export * from "./hooks"
export * from "./navigation/InternalNavigator"
export * from "./navigation/Locker"
export * from "./navigation/controllers/ControlledNavigationController"
export * from "./navigation/controllers/ScrollNavigationController"
export * from "./navigation/types"
export * from "./spine/types"
export * from "./spine/SpineItemsManager"
export * from "./spine/Spine"
export * from "./cfi"
