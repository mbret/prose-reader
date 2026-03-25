import { describe, expect, it } from "vitest"
import type { Archive } from "./archives/types"
import { generateManifestFromArchive } from "./generators/manifest"
import { ServiceWorkerStreamer } from "./ServiceWorkerStreamer"

const archiveResourceBody = `bar/foo.jpg`

const archive: Archive = {
  filename: `comicinfo.xml`,
  records: [
    {
      dir: false,
      basename: `foo.jpg`,
      uri: `bar/foo.jpg`,
      blob: async () => new Blob([archiveResourceBody]),
      string: async () => archiveResourceBody,
      size: 0,
    },
    {
      dir: false,
      basename: "unknown",
      uri: `Creature Girls - A Hands-On Field Journal in Another World v04 (2020) (Digital) (SnS)/Creature Girls - A Hands-On Field Journal in Another World v04 000 (2020) (Digital) (SnS).jpg`,
      blob: async () => new Blob([`bar/foo.jpg`]),
      string: async () => `bar/foo.jpg`,
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
        request: new Request("https://foo.bar/streamer/foo"),
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
        request: new Request("https://foo.bar/streamer/foo/manifest"),
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
        request: new Request("https://foo.bar/streamer/foo/bar/foo.jpg"),
        respondWith: resolve,
      })
    })

    expect(resource.status).toBe(200)
    expect(await resource.text()).toBe(archiveResourceBody)
  })

  describe("and it requests byte ranges", () => {
    const fetchRangedResource = async (range: string) => {
      const streamer = new ServiceWorkerStreamer({
        getUriInfo: () => {
          return { baseUrl: "https://foo.bar/streamer/" }
        },
        cleanArchiveAfter: 1,
        getArchive: async () => archive,
      })

      return new Promise<Response>((resolve) => {
        streamer.fetchEventListener({
          request: new Request("https://foo.bar/streamer/foo/bar/foo.jpg", {
            headers: {
              range,
            },
          }),
          respondWith: resolve,
        })
      })
    }

    it("should return 206 for explicit ranges", async () => {
      const resource = await fetchRangedResource("bytes=0-2")

      expect(resource.status).toBe(206)
      expect(resource.headers.get("Content-Range")).toBe(
        `bytes 0-2/${archiveResourceBody.length}`,
      )
      expect(await resource.text()).toBe(archiveResourceBody.slice(0, 3))
    })

    it("should return 206 for open-ended ranges", async () => {
      const resource = await fetchRangedResource("bytes=4-")

      expect(resource.status).toBe(206)
      expect(resource.headers.get("Content-Range")).toBe(
        `bytes 4-${archiveResourceBody.length - 1}/${archiveResourceBody.length}`,
      )
      expect(await resource.text()).toBe(archiveResourceBody.slice(4))
    })

    it("should return 206 for suffix ranges", async () => {
      const resource = await fetchRangedResource("bytes=-3")

      expect(resource.status).toBe(206)
      expect(resource.headers.get("Content-Range")).toBe(
        `bytes ${archiveResourceBody.length - 3}-${archiveResourceBody.length - 1}/${archiveResourceBody.length}`,
      )
      expect(await resource.text()).toBe(archiveResourceBody.slice(-3))
    })

    it("should ignore unsupported multi-ranges", async () => {
      const resource = await fetchRangedResource("bytes=0-2,4-6")

      expect(resource.status).toBe(200)
      expect(resource.headers.get("Content-Range")).toBeNull()
      expect(await resource.text()).toBe(archiveResourceBody)
    })
  })

  it("should return 416 for malformed range headers", async () => {
    const streamer = new ServiceWorkerStreamer({
      getUriInfo: () => {
        return { baseUrl: "https://foo.bar/streamer/" }
      },
      cleanArchiveAfter: 1,
      getArchive: async () => archive,
    })

    const resource = await new Promise<Response>((resolve) => {
      streamer.fetchEventListener({
        request: new Request("https://foo.bar/streamer/foo/bar/foo.jpg", {
          headers: {
            range: "bytes=foo-1",
          },
        }),
        respondWith: resolve,
      })
    })

    expect(resource.status).toBe(416)
    expect(resource.headers.get("Content-Range")).toBe(
      `bytes */${new Blob([archiveResourceBody]).size}`,
    )
  })

  it("should return 416 for malformed single range syntax", async () => {
    const streamer = new ServiceWorkerStreamer({
      getUriInfo: () => {
        return { baseUrl: "https://foo.bar/streamer/" }
      },
      cleanArchiveAfter: 1,
      getArchive: async () => archive,
    })

    const resource = await new Promise<Response>((resolve) => {
      streamer.fetchEventListener({
        request: new Request("https://foo.bar/streamer/foo/bar/foo.jpg", {
          headers: {
            range: "bytes=0-1-2",
          },
        }),
        respondWith: resolve,
      })
    })

    expect(resource.status).toBe(416)
    expect(resource.headers.get("Content-Range")).toBe(
      `bytes */${new Blob([archiveResourceBody]).size}`,
    )
  })

  describe("and it contains encoded characters", () => {
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
          request: new Request(
            "https://foo.bar/streamer/foo/Creature%20Girls%20-%20A%20Hands-On%20Field%20Journal%20in%20Another%20World%20v04%20(2020)%20(Digital)%20(SnS)/Creature%20Girls%20-%20A%20Hands-On%20Field%20Journal%20in%20Another%20World%20v04%20000%20(2020)%20(Digital)%20(SnS).jpg",
          ),
          respondWith: resolve,
        })
      })

      expect(resource.status).toBe(200)
      expect(await resource.text()).toBe(archiveResourceBody)
    })
  })
})
