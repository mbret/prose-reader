import { Manifest } from "@oboku/shared"

/**
 * @todo strip out param url so that equality works better
 */
export const getCoverItem = (manifest: Manifest) => {
  const coverItem = manifest.guide?.find(item => item.type === `cover`)

  return manifest.spineItems.findIndex(item => coverItem?.href.endsWith(item.path))
}
