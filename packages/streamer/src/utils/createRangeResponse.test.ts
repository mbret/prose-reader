import { afterEach, describe, expect, it, vi } from "vitest"
import { createRangeResponse } from "./createRangeResponse"

describe("createRangeResponse", () => {
  describe("when the body is a string", () => {
    const body = "bar/foo.jpg"

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("returns a normal response without materializing a blob when no range is requested", async () => {
      const OriginalBlob = globalThis.Blob
      let blobCreationCount = 0

      class TrackingBlob extends OriginalBlob {
        constructor(blobParts?: BlobPart[], options?: BlobPropertyBag) {
          super(blobParts, options)
          blobCreationCount += 1
        }
      }

      vi.stubGlobal("Blob", TrackingBlob)

      const response = createRangeResponse({
        body,
        contentType: "text/plain; charset=UTF-8",
      })

      expect(response.status).toBe(200)
      expect(response.headers.get("Accept-Ranges")).toBe("bytes")
      expect(await response.text()).toBe(body)
      expect(blobCreationCount).toBe(0)
    })

    it("returns partial content for explicit byte ranges", async () => {
      const response = createRangeResponse({
        body,
        contentType: "text/plain; charset=UTF-8",
        rangeHeader: "bytes=0-2",
      })

      expect(response.status).toBe(206)
      expect(response.headers.get("Accept-Ranges")).toBe("bytes")
      expect(response.headers.get("Content-Range")).toBe(
        `bytes 0-2/${new Blob([body]).size}`,
      )
      expect(await response.text()).toBe(body.slice(0, 3))
    })

    it.each([
      "Bytes=0-2",
      "BYTES=0-2",
    ])("returns partial content when the range unit casing varies: %s", async (rangeHeader) => {
      const response = createRangeResponse({
        body,
        contentType: "text/plain; charset=UTF-8",
        rangeHeader,
      })

      expect(response.status).toBe(206)
      expect(response.headers.get("Content-Range")).toBe(
        `bytes 0-2/${new Blob([body]).size}`,
      )
      expect(await response.text()).toBe(body.slice(0, 3))
    })

    it("returns 416 for malformed range headers", async () => {
      const response = createRangeResponse({
        body,
        contentType: "text/plain; charset=UTF-8",
        rangeHeader: "bytes=foo-1",
      })

      expect(response.status).toBe(416)
      expect(response.headers.get("Content-Range")).toBe(
        `bytes */${new Blob([body]).size}`,
      )
    })
  })
})
