/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { Archive, generateManifestFromArchive, ServiceWorkerStreamer } from "."

const archive: Archive = {
  filename: `comicinfo.xml`,
  files: [
    {
      dir: false,
      basename: `foo.jpg`,
      uri: `bar/foo.jpg`,
      blob: async () => new Blob([`bar/foo.jpg`]),
      string: async () => `bar/foo.jpg`,
      base64: async () => btoa(`bar/foo.jpg`),
      size: 0,
    },
  ],
  close: () => Promise.resolve(),
}

describe("Given no resource specified", () => {
  it("should return 500", async () => {
    const streamer = new ServiceWorkerStreamer({
      getUriInfo: () => {
        return { baseUrl: "https://foo.bar/streamer" }
      },
      cleanArchiveAfter: 1,
      getArchive: async () => archive,
    })

    const response = await new Promise<Response>((resolve) => {
      streamer.fetchEventListener({
        request: {
          url: "https://foo.bar/streamer/foo",
        } as any,
        respondWith: resolve,
      })
    })

    expect(response.status).toBe(500)
  })
})

describe("Given resource is manifest", () => {
  it("should return manifest response", async () => {
    const streamer = new ServiceWorkerStreamer({
      getUriInfo: () => {
        return { baseUrl: "https://foo.bar/streamer/" }
      },
      cleanArchiveAfter: 1,
      getArchive: async () => archive,
    })

    const response = await new Promise<Response>((resolve) => {
      streamer.fetchEventListener({
        request: {
          url: "https://foo.bar/streamer/foo/manifest",
        } as any,
        respondWith: resolve,
      })
    })

    const manifest = await generateManifestFromArchive(archive, {
      baseUrl: "https://foo.bar/streamer/foo/",
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(manifest)
  })
})

describe("Given valid resource from archive", () => {
  it("should return response", async () => {
    const streamer = new ServiceWorkerStreamer({
      getUriInfo: () => {
        return { baseUrl: "https://foo.bar/streamer/" }
      },
      cleanArchiveAfter: 1,
      getArchive: async () => archive,
    })

    const resource = await new Promise<Response>((resolve) => {
      streamer.fetchEventListener({
        request: {
          url: "https://foo.bar/streamer/foo/bar/foo.jpg",
        } as any,
        respondWith: resolve,
      })
    })

    expect(resource.status).toBe(200)
    expect(await resource.text()).toBe(`bar/foo.jpg`)
  })
})
