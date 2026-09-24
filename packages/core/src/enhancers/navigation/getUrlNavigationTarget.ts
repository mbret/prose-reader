import type { Manifest } from "@prose-reader/shared"
import type { NavigationTarget } from "../../navigation/types"

const parseUrl = (url: string | URL, base?: string) => {
  try {
    return new URL(url, base)
  } catch {
    return undefined
  }
}

const withoutFragment = (url: URL) => {
  const copy = new URL(url)

  copy.hash = ""

  return copy.href
}

const findElement = (document: Document, fragment: string) => {
  if (!fragment) return undefined

  let decoded = fragment

  try {
    decoded = decodeURIComponent(fragment)
  } catch {
    // A literal percent sign can be part of an id.
  }

  const element =
    document.getElementById(fragment) ?? document.getElementById(decoded)

  return element ? { node: element } : undefined
}

/**
 * Where a url of the book goes: the spine item its path names, and there the
 * element its fragment names. `undefined` for a url outside the book. A
 * relative url is resolved against `base`, the href of the document it is in.
 */
export const getUrlNavigationTarget = (
  url: string | URL,
  manifest: Manifest,
  base?: string,
): NavigationTarget<"node"> | undefined => {
  const parsed = parseUrl(url, base)

  if (!parsed) return undefined

  const href = withoutFragment(parsed)
  const item = manifest.spineItems.find((item) => {
    const itemUrl = parseUrl(item.href)

    return itemUrl && withoutFragment(itemUrl) === href
  })

  if (!item) return undefined

  const fragment = parsed.hash.slice(1)

  return {
    type: "node",
    value: {
      spineItem: item.index,
      find: (document) => findElement(document, fragment),
    },
  }
}
