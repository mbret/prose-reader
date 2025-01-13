import { describe, expect, it } from "vitest"
import {
  type Archive,
  generateManifestFromArchive,
  ServiceWorkerStreamer,
} from "."

const archive: Archive = {
  filename: `comicinfo.xml`,
  files: [
    {
      dir: false,
      basename: `foo.jpg`,
      uri: `bar/foo.jpg`,
      blob: async () => new Blob([`bar/foo.jpg`]),
      string: async () => `bar/foo.jpg`,
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
        request: {
          url: "https://foo.bar/streamer/foo",
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        } as any,
        respondWith: resolve,
      })
    })

    expect(resource.status).toBe(200)
    expect(await resource.text()).toBe(`bar/foo.jpg`)
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
          request: {
            url: "https://foo.bar/streamer/foo/Creature%20Girls%20-%20A%20Hands-On%20Field%20Journal%20in%20Another%20World%20v04%20(2020)%20(Digital)%20(SnS)/Creature%20Girls%20-%20A%20Hands-On%20Field%20Journal%20in%20Another%20World%20v04%20000%20(2020)%20(Digital)%20(SnS).jpg",
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          } as any,
          respondWith: resolve,
        })
      })

      expect(resource.status).toBe(200)
      expect(await resource.text()).toBe(`bar/foo.jpg`)
    })
  })
})
