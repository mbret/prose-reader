import { describe, expect, it } from "vitest"
import { createRangeResponse } from "./createRangeResponse"

describe("createRangeResponse", () => {
  describe("when the body is a string", () => {
    const body = "bar/foo.jpg"

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
