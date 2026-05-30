import { describe, expect, it } from "vitest"
import { Streamer } from "."
import { createArchive } from "./archives/createArchive"
import { blobFileAccessors } from "./archives/fileAccessors"

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
    const archive = createArchive({
      close: () => Promise.resolve(),
      filename: "",
      records: [
        {
          ...blobFileAccessors(() =>
            Promise.resolve(new Blob([body], { type: "image/jpeg" })),
          ),
          basename: "page [1].jpg",
          dir: false,
          encodingFormat: "image/jpeg",
          size: body.length,
          uri: "Chapter 1/page [1].jpg",
        },
      ],
    })
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

describe("Given streamer hooks", () => {
  it("should thread hooks into manifest and resource generation", async () => {
    const archive = createArchive({
      close: () => Promise.resolve(),
      filename: "",
      records: [],
    })
    const streamer = new Streamer({
      cleanArchiveAfter: Infinity,
      getArchive: async () => archive,
      hooks: {
        manifest: {
          spine: [
            () => async (manifest) => ({
              ...manifest,
              title: "hooked manifest",
            }),
          ],
        },
        resource: [
          () => async (resource) => ({
            ...resource,
            body: "hooked resource",
            params: {
              ...resource.params,
              contentType: "text/plain",
            },
          }),
        ],
      },
    })

    const manifestResponse = await streamer.fetchManifest({ key: "book" })
    const resourceResponse = await streamer.fetchResource({
      key: "book",
      resourcePath: "virtual.txt",
    })

    expect(await manifestResponse.json()).toMatchObject({
      title: "hooked manifest",
    })
    expect(await resourceResponse.text()).toBe("hooked resource")
    expect(resourceResponse.headers.get("Content-Type")).toBe("text/plain")
  })
})
