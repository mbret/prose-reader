import type {
  StreamerManifestHookFactory,
  StreamerResourceHookFactory,
} from "@prose-reader/streamer"
import { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"
import { panoramaSplit } from "./panoramaSplitManifest"
import { panoramaSplitResourceHook } from "./panoramaSplitResource"

export const streamerHooks: {
  manifest: {
    content: StreamerManifestHookFactory[]
    spine: StreamerManifestHookFactory[]
  }
  resource: StreamerResourceHookFactory[]
} = {
  manifest: {
    content: [detectReadingDirectionManifest],
    spine: [panoramaSplit],
  },
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
