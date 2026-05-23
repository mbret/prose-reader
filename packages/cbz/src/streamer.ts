import type {
  StreamerManifestHookFactory,
  StreamerResourceHookFactory,
} from "@prose-reader/streamer"
import { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"
import { pageSpreadSplit } from "./pageSpreadSplitManifest"
import { pageSpreadSplitResourceHook } from "./pageSpreadSplitResource"

export const streamerHooks: {
  manifest: {
    content: StreamerManifestHookFactory[]
    spine: StreamerManifestHookFactory[]
  }
  resource: StreamerResourceHookFactory[]
} = {
  manifest: {
    content: [detectReadingDirectionManifest],
    spine: [pageSpreadSplit],
  },
  resource: [pageSpreadSplitResourceHook],
}

export { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"
export { CBZ_MIME_TYPES, isCbzArchive } from "./isCbzArchive"

export {
  buildVirtualPageSpreadResourcePath,
  detectPageSpreadFromBasename,
  isPageSpreadSplitSupportedArchiveRecord,
  isPageSpreadSplitSupportedImage,
  PAGE_SPREAD_RESOURCE_PREFIX,
  PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
  type PageSpreadCropSide,
  pageSpreadSplit,
  type VirtualPageSpreadResource,
} from "./pageSpreadSplitManifest"

export {
  createPageSpreadSplitXhtml,
  pageSpreadSplitResourceHook,
  parseVirtualPageSpreadResourcePath,
} from "./pageSpreadSplitResource"
