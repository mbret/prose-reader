import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "./archives/types"
import type { HookResource } from "./generators/resources/hooks/types"

export type { HookResource }

export type StreamerManifestHookContext = {
  archive: Archive
  baseUrl: string
}

export type StreamerManifestHook = (
  manifest: Manifest,
) => Manifest | Promise<Manifest>

export type StreamerManifestHookFactory = (
  context: StreamerManifestHookContext,
) => StreamerManifestHook

export type StreamerManifestHooks = {
  /** Additional source/content metadata normalization. */
  content?: StreamerManifestHookFactory[]
  /** Structural manifest transforms that may change `spineItems` and `items`. */
  spine?: StreamerManifestHookFactory[]
  /** Layout and presentation metadata derived from the normalized manifest. */
  presentation?: StreamerManifestHookFactory[]
  /** Navigation derivation such as TOC data. */
  navigation?: StreamerManifestHookFactory[]
}

export type StreamerResourceHookContext = {
  archive: Archive
  resourcePath: string
}

export type StreamerResourceHook = (
  resource: HookResource,
) => HookResource | Promise<HookResource>

export type StreamerResourceHookFactory = (
  context: StreamerResourceHookContext,
) => StreamerResourceHook

export type StreamerHooks = {
  manifest?: StreamerManifestHooks
  resource?: StreamerResourceHookFactory[]
}
