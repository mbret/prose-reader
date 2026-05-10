import { describe, expect, it } from "vitest"
import { Streamer } from "."
import type { Archive } from "./archives/types"

describe("Given custom error on get Archive", () => {
  it("should return correct error", async () => {
    class MyError extends Error {}

    const streamer = new Streamer({
      cleanArchiveAfter: 1,
      getArchive: async () => {
        throw new MyError()
      },
      onError: (error) => {
        if (error instanceof MyError)
          return new Response(`myError`, { status: 500 })

        return new Response(``, { status: 500 })
      },
    })

    const response = await streamer.fetchManifest({ key: "any" })

    expect(await response.text()).toBe(`myError`)
    expect(response.status).toBe(500)
  })
})

describe("Given a manifest href with encoded local characters", () => {
  it("should fetch the archive resource from the manifest href in direct streamer mode", async () => {
    const body = "image-body"
    const archive: Archive = {
      close: () => Promise.resolve(),
      filename: "",
      records: [
        {
          basename: "page [1].jpg",
          blob: () => Promise.resolve(new Blob([body], { type: "image/jpeg" })),
          dir: false,
          encodingFormat: "image/jpeg",
          size: body.length,
          string: () => Promise.resolve(""),
          uri: "Chapter 1/page [1].jpg",
        },
      ],
    }
    const streamer = new Streamer({
      cleanArchiveAfter: Infinity,
      getArchive: async () => archive,
    })
    const manifestResponse = await streamer.fetchManifest({ key: "book" })
    const manifest = await manifestResponse.json()
    const [spineItem] = manifest.spineItems

    const resourceResponse = await streamer.fetchResource({
      key: "book",
      resourcePath: spineItem.href,
    })

    expect(spineItem.href).toBe("file://Chapter%201/page%20%5B1%5D.jpg")
    expect(await resourceResponse.text()).toBe(body)
    expect(resourceResponse.headers.get("Content-Type")).toBe("image/jpg")
  })
})
