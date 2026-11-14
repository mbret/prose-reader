import type { Manifest } from "@prose-reader/shared"
import { config } from "rxjs"
import { onTestFinished, vi } from "vitest"

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

/**
 * Holds the animation frames of `view` until the test ends: a callback runs
 * only when the test runs a frame, as a browser runs it at its next render.
 */
export const holdAnimationFrames = (view: Window) => {
  const frameCallbacks = new Map<number, FrameRequestCallback>()
  let numberOfFrameRequests = 0

  const requestAnimationFrame = vi
    .spyOn(view, "requestAnimationFrame")
    .mockImplementation((callback) => {
      numberOfFrameRequests += 1
      frameCallbacks.set(numberOfFrameRequests, callback)

      return numberOfFrameRequests
    })
  const cancelAnimationFrame = vi
    .spyOn(view, "cancelAnimationFrame")
    .mockImplementation((frameRequest) => {
      frameCallbacks.delete(frameRequest)
    })

  onTestFinished(() => {
    requestAnimationFrame.mockRestore()
    cancelAnimationFrame.mockRestore()
  })

  return {
    /** Runs the callbacks requested so far, as one frame does. */
    runAnimationFrame: () => {
      const callbacksOfFrame = [...frameCallbacks.values()]

      frameCallbacks.clear()

      for (const callback of callbacksOfFrame) callback(performance.now())
    },
  }
}
