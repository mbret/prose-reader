import type {
  StreamerManifestHookFactory,
  StreamerResourceHookFactory,
} from "@prose-reader/streamer"
import { pageSpreadSplit } from "./pageSpreadSplitManifest"
import { pageSpreadSplitResourceHook } from "./pageSpreadSplitResource"

export const streamerHooks: {
  manifest: {
    spine: StreamerManifestHookFactory[]
  }
  resource: StreamerResourceHookFactory[]
} = {
  manifest: {
    spine: [pageSpreadSplit],
  },
  resource: [pageSpreadSplitResourceHook],
}

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
