import type { Archive } from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/shared"
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
  /**
   * Ordered transforms applied to the fully mapped manifest — after the
   * archive has been resolved (metadata, reading order, toc) and rebased
   * into serving space, and just before the final defaults (an unset
   * `readingDirection` falls back to `ltr` only once every hook ran, so a
   * hook can still detect "nothing decided it").
   *
   * All book-format understanding lives in `@prose-reader/archive-reader`
   * now, so there is a single hook point rather than the former
   * content/spine/presentation/navigation phases.
   */
  manifest?: StreamerManifestHookFactory[]
  resource?: StreamerResourceHookFactory[]
}
