import { getManifestFromArchive } from "./index"
import { createArchiveFromUrls } from "../../archives/createArchiveFromUrls"
import { expect, it, test } from "vitest"

test(`Given a list of urls archive`, () => {
  it(`should return a valid pre-paginated manifest`, async () => {
    const archive = await createArchiveFromUrls([
      `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`
    ])

    const manifest = await getManifestFromArchive(archive)

    expect(await manifest.json()).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          mediaType: `image/jpg`
        }
      ],
      nav: {
        toc: []
      },
      readingDirection: "ltr",
      renditionLayout: "pre-paginated",
      renditionFlow: `auto`,
      spineItems: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          path: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          progressionWeight: 1,
          renditionLayout: "pre-paginated",
          mediaType: `image/jpg`
        }
      ],
      title: ""
    })
  })
})

test(`Given a list of urls with rendition flow archive`, () => {
  it(`should return a valid reflowable manifest`, async () => {
    const archive = await createArchiveFromUrls(
      [`https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`],
      {
        useRenditionFlow: true
      }
    )

    const manifest = await getManifestFromArchive(archive)

    expect(await manifest.json()).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          mediaType: `image/jpg`
        }
      ],
      nav: {
        toc: []
      },
      readingDirection: "ltr",
      renditionLayout: "reflowable",
      renditionFlow: `scrolled-continuous`,
      spineItems: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
          path: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          progressionWeight: 1,
          renditionLayout: "reflowable",
          mediaType: `image/jpg`
        }
      ],
      title: ""
    })
  })
})
