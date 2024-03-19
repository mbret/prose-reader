import { Manifest } from "@prose-reader/shared"

/**
 * @todo strip out param url so that equality works better
 */
export const getCoverItem = (manifest: Manifest) => {
  const coverItem = manifest.guide?.find((item) => item.type === `cover`)

  return manifest.spineItems.findIndex((item) => {
    if (!coverItem?.href) return false

    return item.href.endsWith(coverItem.href)
  })
}
