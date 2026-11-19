export type { Manifest } from "@prose-reader/shared"
export { configure } from "./configure.ts"
export { createManifestResourceHref } from "./generators/manifest/createManifestResourceHref.ts"
export { generateManifestFromArchive } from "./generators/manifest/index.ts"
export { generateResourceFromArchive } from "./generators/resources/index.ts"
export type {
  HookResource,
  StreamerHooks,
  StreamerManifestHook,
  StreamerManifestHookContext,
  StreamerManifestHookFactory,
  StreamerResourceHook,
  StreamerResourceHookContext,
  StreamerResourceHookFactory,
} from "./hooks.ts"
export { ServiceWorkerStreamer } from "./ServiceWorkerStreamer.ts"
export { Streamer } from "./Streamer.ts"
