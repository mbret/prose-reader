import type { Manifest } from "@prose-reader/shared"
import { config } from "rxjs"
import { onTestFinished } from "vitest"

export const waitFor = async (timeout: number) =>
  await new Promise((resolve) => setTimeout(resolve, timeout))

export const createTestManifestSpineItems = (
  items: number | Array<Partial<Manifest["spineItems"][number]> | undefined>,
): Manifest["spineItems"] => {
  const itemsOverrides =
    typeof items === "number"
      ? Array.from({ length: items }, () => undefined)
      : items

  return itemsOverrides.map((overrides, index) => {
    const href = overrides?.href ?? `item-${index}.xhtml`

    return {
      id: `item-${index}`,
      mediaType: `application/xhtml+xml`,
      ...overrides,
      href,
      containerUri: overrides?.containerUri ?? href,
      index,
    }
  })
}

export const createTestManifest = (
  manifest: Partial<Manifest> = {},
): Manifest => ({
  filename: "test",
  mediaType: "application/epub+zip",
  title: "test",
  renditionLayout: undefined,
  renditionSpread: undefined,
  readingDirection: "ltr",
  spineItems: [],
  items: [],
  ...manifest,
})

/**
 * Records the errors that reach rxjs's `config.onUnhandledError` until the
 * test ends: those that no subscriber handles, and those that the reader
 * recovers from.
 */
export const recordUnhandledErrors = () => {
  const unhandledErrors: unknown[] = []
  const previousHandler = config.onUnhandledError

  config.onUnhandledError = (error) => {
    unhandledErrors.push(error)
  }
  onTestFinished(async () => {
    // Errors are reported in a timer. Waiting lets those reported during the
    // test reach the list, rather than throw once the handler is gone.
    await waitFor(0)

    config.onUnhandledError = previousHandler
  })

  return unhandledErrors
}
