export type { Manifest } from "@prose-reader/shared"

import { createReaderWithEnhancers as createReader } from "./createReaderWithEnhancer.ts"

export {
  type EnhancerThemeInputSettings,
  getThemeBackgroundColor,
  type Theme,
} from "./enhancers/theme/index.ts"
export { HookManager } from "./hooks/HookManager.ts"
export { reportRecoveredError } from "./report.ts"
export { SettingsManager } from "./settings/SettingsManager.ts"
export {
  type DocumentLoadStatus,
  DocumentRenderer,
} from "./spineItem/renderer/DocumentRenderer.ts"
export { ResourceHandler } from "./spineItem/resources/ResourceHandler.ts"

export type CreateReaderOptions = Parameters<typeof createReader>[0]

export { createReader }
export type Reader = ReturnType<typeof createReader>

export * from "./cfi/index.ts"
export * from "./constants.ts"
export * from "./context/Context.ts"
export type { EnhancerFontsInputSettings } from "./enhancers/fonts/index.ts"
export * from "./enhancers/html/enhancer.ts"
export * from "./enhancers/layout/layoutEnhancer.ts"
export type { EnhancerLayoutInputSettings } from "./enhancers/layout/types.ts"
export * from "./enhancers/navigation/types.ts"
export * from "./enhancers/pagination/index.ts"
export * from "./enhancers/types/enhancer.ts"
export * from "./enhancers/zoom/types.ts"
export * from "./features/Features.ts"
export * from "./hooks/index.ts"
export * from "./navigation/controllers/ControlledNavigationController.ts"
export * from "./navigation/controllers/ScrollNavigationController.ts"
export * from "./navigation/InternalNavigator.ts"
export * from "./navigation/Locker.ts"
export * from "./navigation/types.ts"
export * from "./pagination/index.ts"
export * from "./settings/SettingsInterface.ts"
export * from "./settings/types.ts"
export * from "./spine/Pages.ts"
export * from "./spine/Spine.ts"
export * from "./spine/SpineItemsManager.ts"
export * from "./spine/SpineItemsObserver.ts"
export type { SpineLayoutLifecycleEvent } from "./spine/SpineLayout.ts"
export * from "./spine/types.ts"
export * from "./spineItem/SpineItem.ts"
export { SpineItem } from "./spineItem/SpineItem.ts"
export type { SpineItemLayoutParams } from "./spineItem/SpineItemLayout.ts"
export type { SpineItemPageGeometry } from "./spineItem/SpineItemPageGeometry.ts"
export * from "./spineItem/types.ts"
export * from "./utilities.ts"
export * from "./utils/DestroyableClass.ts"
export * from "./utils/frames.ts"
export * from "./utils/isDefined.ts"
export * from "./utils/objects.ts"
export * from "./utils/ReactiveEntity.ts"
export * from "./utils/rxjs.ts"
export * from "./viewport/Viewport.ts"
