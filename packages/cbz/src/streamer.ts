import type {
  StreamerManifestHookFactory,
  StreamerResourceHookFactory,
} from "@prose-reader/streamer"
import { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"
import { panoramaSplit } from "./panoramaSplitManifest"
import { panoramaSplitResourceHook } from "./panoramaSplitResource"

export const streamerHooks: {
  manifest: StreamerManifestHookFactory[]
  resource: StreamerResourceHookFactory[]
} = {
  // ordered: reading direction detection must run before the panorama split
  // (the split lays crops out according to the reading direction)
  manifest: [detectReadingDirectionManifest, panoramaSplit],
  resource: [panoramaSplitResourceHook],
}

export { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"
export { CBZ_MIME_TYPES, isCbzArchive } from "./isCbzArchive"

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
} from "./panoramaSplitManifest"

export {
  createPanoramaSplitXhtml,
  panoramaSplitResourceHook,
  parseVirtualPanoramaResourcePath,
} from "./panoramaSplitResource"
