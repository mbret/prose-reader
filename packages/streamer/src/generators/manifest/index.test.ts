import { generateManifestFromArchive } from "./index"
import { createArchiveFromUrls } from "../../archives/createArchiveFromUrls"
import { describe, expect, it } from "vitest"
import { Archive } from "../../archives/types"
import { Manifest } from "@prose-reader/shared"

const fakeContent = {
  blob: () => Promise.resolve(new Blob([])),
  string: () => Promise.resolve(""),
}

describe(`Given a list of urls archive`, () => {
  it(`should return a valid pre-paginated manifest`, async () => {
    const archive = await createArchiveFromUrls([
      `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`,
    ])

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          mediaType: `image/jpg`,
        },
      ],
      nav: {
        toc: [],
      },
      readingDirection: "ltr",
      renditionLayout: "pre-paginated",
      renditionFlow: `auto`,
      spineItems: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          progressionWeight: 1,
          renditionLayout: "pre-paginated",
          mediaType: `image/jpg`,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
        },
      ],
      title: "",
      renditionSpread: undefined,
    } satisfies Manifest)
  })
})

describe(`Given a list of urls with rendition flow archive`, () => {
  it(`should return a valid reflowable manifest`, async () => {
    const archive = await createArchiveFromUrls(
      [
        `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`,
      ],
      {
        useRenditionFlow: true,
      },
    )

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          mediaType: `image/jpg`,
        },
      ],
      nav: {
        toc: [],
      },
      readingDirection: "ltr",
      renditionLayout: "reflowable",
      renditionFlow: `scrolled-continuous`,
      spineItems: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          progressionWeight: 1,
          renditionLayout: "reflowable",
          mediaType: `image/jpg`,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
        },
      ],
      title: "",
      renditionSpread: undefined,
    } satisfies Manifest)
  })
})

describe("Given archive with a folder containing a space", () => {
  const fakeContent = {
    blob: () => Promise.resolve(new Blob([])),
    string: () => Promise.resolve(""),
  }

  it("should encode space but not the slash", async () => {
    const archive: Archive = {
      filename: "",
      files: [
        {
          ...fakeContent,
          basename: "Chapter 1/",
          uri: "Chapter 1/",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems).toEqual([
      {
        href: "Chapter%201/page_1.jpg",
        id: "0.page_1.jpg",
        mediaType: undefined,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })
})

describe("Given archive with no folders", () => {
  it("should not create any toc", async () => {
    const archive: Archive = {
      filename: "",
      files: [
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "page_1.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.nav).toEqual(undefined)
  })
})

describe("Given archive with folders", () => {
  it("should create correct toc", async () => {
    const archive: Archive = {
      filename: "",
      files: [
        {
          ...fakeContent,
          basename: "Chapter 1/",
          uri: "Chapter 1/",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "Chapter 2",
          uri: "Chapter 2",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_2.jpg",
          uri: "Chapter 1/page_2.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_3.jpg",
          uri: "Chapter 4/page_3.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const baseUrl = "http://localhost:9000"

    const manifest = await generateManifestFromArchive(archive, { baseUrl })

    expect(manifest.nav).toEqual({
      toc: [
        {
          contents: [],
          href: `${baseUrl}/Chapter%201/page_1.jpg`,
          path: "Chapter 1/page_1.jpg",
          title: "Chapter 1",
        },
        {
          contents: [],
          href: `${baseUrl}/Chapter%204/page_3.jpg`,
          path: "Chapter 4/page_3.jpg",
          title: "Chapter 4",
        },
      ],
    })
  })
})
