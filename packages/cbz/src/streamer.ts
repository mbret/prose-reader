import type {
  StreamerManifestHookFactory,
  StreamerResourceHookFactory,
} from "@prose-reader/streamer"
import { detectReadingDirectionManifest } from "./detectReadingDirectionManifest.ts"
import { panoramaSplit } from "./panoramaSplitManifest.ts"
import { panoramaSplitResourceHook } from "./panoramaSplitResource.ts"

export const streamerHooks: {
  manifest: StreamerManifestHookFactory[]
  resource: StreamerResourceHookFactory[]
} = {
  // ordered: reading direction detection must run before the panorama split
  // (the split lays crops out according to the reading direction)
  manifest: [detectReadingDirectionManifest, panoramaSplit],
  resource: [panoramaSplitResourceHook],
}

export { detectReadingDirectionManifest } from "./detectReadingDirectionManifest.ts"
export { CBZ_MIME_TYPES, isCbzArchive } from "./isCbzArchive.ts"

export {
  buildVirtualPanoramaResourcePath,
  detectPanoramaFromBasename,
  isPanoramaSplitSupportedArchiveRecord,
  isPanoramaSplitSupportedImage,
  PANORAMA_RESOURCE_PREFIX,
  PANORAMA_SPLIT_DOCUMENT_MEDIA_TYPE,
  type PanoramaCropSide,
  panoramaSplit,
  type VirtualPanoramaResource,
} from "./panoramaSplitManifest.ts"

export {
  createPanoramaSplitXhtml,
  panoramaSplitResourceHook,
  parseVirtualPanoramaResourcePath,
} from "./panoramaSplitResource.ts"
