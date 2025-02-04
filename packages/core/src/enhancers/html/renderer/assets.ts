import { type Manifest, getParentPath } from "@prose-reader/shared"
import {
  Observable,
  combineLatest,
  from,
  map,
  mergeMap,
  of,
  switchMap,
} from "rxjs"
import type { Context } from "../../../context/Context"
import type { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import { getElementsWithAssets, revokeDocumentBlobs } from "../../../utils/dom"

/**
 * @important Firefox handles file protocol weirdly and will not
 * go up one directory when using "../". We temporarily replace to http://
 * to keep our behavior.
 */
const joinPath = (base: string, path: string) => {
  // Temporarily replace file:// with http:// for consistent URL handling
  const isFileProtocol = base.startsWith("file://")
  const tempBase = isFileProtocol ? base.replace("file://", "http://") : base
  const result = new URL(path, tempBase).toString()

  // Convert back to file:// if needed
  return isFileProtocol ? result.replace("http://", "file://") : result
}

const loadFontFaces = async (
  document: Document | null | undefined,
  element: HTMLLinkElement,
  spineItemUriParentPath: string,
  context: Context,
  settings: ReaderSettingsManager,
): Promise<void> => {
  if (!document || !document.defaultView) return

  const sheet = element.sheet

  if (!sheet) return

  try {
    const rules = Array.from(sheet.cssRules || [])

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (
        document.defaultView &&
        rule instanceof document.defaultView.CSSFontFaceRule
      ) {
        const src = rule.style.getPropertyValue("src")
        const matches = src.match(/url\(['"]?([^'"]+)['"]?\)/g)

        if (matches) {
          // Split the src value into individual sources
          const srcParts = src.split(",").map((part) => part.trim())

          const newSrcParts = await Promise.all(
            srcParts.map(async (part) => {
              // If it's a local() source, preserve it as-is
              if (part.startsWith("local(")) {
                return part
              }

              // Extract URL and format parts
              const urlMatch = part.match(/url\(['"]?([^'"]+)['"]?\)/)
              if (!urlMatch) return part

              const originalSrc = urlMatch[1] ?? ``

              // Find the font resource in the manifest
              const foundItem = context.manifest?.items.find(({ href }) => {
                return `${joinPath(spineItemUriParentPath, originalSrc).toLowerCase()}`.endsWith(
                  `${href.toLowerCase()}`,
                )
              })

              if (foundItem) {
                const resourceHandler = new ResourceHandler(foundItem, settings)

                try {
                  const resource = await resourceHandler.getResource()

                  if (resource instanceof Response) {
                    const blob = await resource.blob()
                    const blobUrl =
                      document.defaultView?.URL.createObjectURL(blob)

                    // Reconstruct the source with the new blob URL and preserve format/tech
                    const newPart = part.replace(
                      urlMatch[0],
                      `url("${blobUrl}")`,
                    )

                    return newPart
                  }
                } catch (e) {
                  console.error("Error loading font:", e)
                }
              }
              return part
            }),
          )

          // Instead of modifying the existing rule, create a new one
          // firefox will not allow to modify the existing rule
          // Get the complete rule text and replace the entire src declaration
          const newRule = rule.cssText.replace(
            /src:\s*[^;]+;/,
            `src: ${newSrcParts.join(", ")};`,
          )

          // Delete the old rule and insert the new one
          sheet.deleteRule(i)
          sheet.insertRule(newRule, i)
        }
      }
    }
  } catch (e) {
    console.error("Could not access stylesheet rules:", e)
  }
}

const loadElementSrc = (
  _document: Document | null | undefined,
  element: Element,
  spineItemUriParentPath: string,
  context: Context,
  settings: ReaderSettingsManager,
) => {
  const originalSrc =
    element.getAttribute("src") || element.getAttribute("href")

  if (!originalSrc) return of(null)

  // EPUB/image.png needs to match frame relative src /image.png
  const foundItem = context.manifest?.items.find(({ href }) => {
    // this will remove things like "../.." and have a normal relative path
    return `${joinPath(spineItemUriParentPath, originalSrc).toLowerCase()}`.endsWith(
      `${href.toLowerCase()}`,
    )
  })

  if (!foundItem) return of(null)

  const resourceHandler = new ResourceHandler(foundItem, settings)

  /**
   * For each resources, if it's a response and not a URL, we should convert it to a blob
   * because it will not be accessible otherwise.
   */
  return from(resourceHandler.getResource()).pipe(
    mergeMap((resource) =>
      resource instanceof Response ? from(resource.blob()) : of(undefined),
    ),
    mergeMap((blob) => {
      if (!blob) {
        return of(null)
      }

      const blobUrl = _document?.defaultView?.URL.createObjectURL(blob) ?? ``

      if (element.hasAttribute("src")) {
        element.setAttribute("src", blobUrl)
      } else if (element.hasAttribute("href")) {
        element.setAttribute("href", blobUrl)

        if (
          _document?.defaultView &&
          element instanceof _document.defaultView.HTMLLinkElement
        ) {
          return new Observable((observer) => {
            element.onload = async () => {
              try {
                // Now that the stylesheet is loaded, replace font URLs
                // we cannot do that before because the stylesheet is not loaded
                // and we would not have access to it.
                if (element.sheet) {
                  await loadFontFaces(
                    _document,
                    element,
                    spineItemUriParentPath,
                    context,
                    settings,
                  )
                }
                observer.next()
                observer.complete()
              } catch (error) {
                observer.error(error)
              }
            }
            element.onerror = observer.error
          })
        }
      }

      return of(null)
    }),
  )
}

export const loadAssets =
  ({
    settings,
    item,
    context,
  }: {
    settings: ReaderSettingsManager
    item: Manifest["items"][number]
    context: Context
  }) =>
  (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      switchMap((frameElement) => {
        const elementsWithAsset = getElementsWithAssets(
          frameElement.contentDocument,
        )

        const spineItemUriParentPath = getParentPath(item.href)

        const assetsLoad$ = elementsWithAsset.map((element) =>
          loadElementSrc(
            frameElement.contentDocument,
            element,
            spineItemUriParentPath,
            context,
            settings,
          ),
        )

        return combineLatest(assetsLoad$).pipe(map(() => frameElement))
      }),
    )

export const unloadAssets = (frameElement?: HTMLIFrameElement) => {
  revokeDocumentBlobs(frameElement?.contentDocument)
}
