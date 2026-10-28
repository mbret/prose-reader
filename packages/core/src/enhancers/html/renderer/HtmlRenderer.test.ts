import { resolveObjectURL } from "node:buffer"
import type { Manifest } from "@prose-reader/shared"
import {
  Document as HappyDOMDocument,
  type Window as HappyDOMWindow,
} from "happy-dom"
import { of } from "rxjs"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { Context } from "../../../context/Context"
import { HookManager } from "../../../hooks/HookManager"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { ResourceHandler } from "../../../spineItem/resources/ResourceHandler"
import { createTestManifest } from "../../../tests/utils"
import { Viewport } from "../../../viewport/Viewport"
import { HtmlRenderer } from "./HtmlRenderer"

const isHappyDOMWindow = (value: object): value is HappyDOMWindow =>
  `happyDOM` in value

const getHappyDOMWindow = () => {
  if (!isHappyDOMWindow(window)) throw new Error(`these tests need happy-dom`)

  return window
}

const SVG_NAMESPACE = `http://www.w3.org/2000/svg`
const XLINK_NAMESPACE = `http://www.w3.org/1999/xlink`

type Resource = { mediaType: string; body: string }

const ONE_PIXEL_PNG_DATA_URL = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`

type HeldRequest = { load: () => void; fail: () => void }

const svgWith = (image: string) =>
  `<svg xmlns="${SVG_NAMESPACE}" xmlns:xlink="${XLINK_NAMESPACE}">${image}</svg>`

const getSvgImageReference = (image: Element) =>
  image.getAttributeNS(null, `href`) ??
  image.getAttributeNS(XLINK_NAMESPACE, `href`)

const documentWith = (head: string, body = `<p>content</p>`) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>${head}</head>
  <body>${body}</body>
</html>`

const readObjectUrl = async (url: string | null | undefined) =>
  url ? resolveObjectURL(url)?.text() : undefined

/**
 * Serves the frame's blob urls through happy-dom's fetch interceptor, holding
 * each stylesheet, and each image when asked, until the test loads or fails
 * it. With `servesAtUrls`, `getResource` gives nothing, and the interceptor
 * serves the document and its resources at their urls instead, as a server or
 * a service worker does.
 */
const createHarness = ({
  documentHref,
  resources,
  failingResources = [],
  holdsImages = false,
  servesAtUrls = false,
}: {
  documentHref: string
  resources: Record<string, Resource>
  failingResources?: string[]
  holdsImages?: boolean
  servesAtUrls?: boolean
}) => {
  const happyDOMWindow = getHappyDOMWindow()
  const stylesheetRequests: HeldRequest[] = []
  const imageRequests: HeldRequest[] = []
  const served: Record<string, Resource> = { ...resources }

  const getRequestedResource = async (
    url: string,
  ): Promise<Resource | undefined> => {
    const blob = resolveObjectURL(url)

    if (blob) return { mediaType: blob.type, body: await blob.text() }

    return servesAtUrls ? served[url] : undefined
  }

  happyDOMWindow.happyDOM.settings.enableImageFileLoading = true
  happyDOMWindow.happyDOM.settings.fetch.interceptor = {
    beforeAsyncRequest: async ({ request, window: requestWindow }) => {
      const resource = await getRequestedResource(request.url)

      if (!resource) return undefined

      const respond = () =>
        new requestWindow.Response(resource.body, {
          headers: { "content-type": resource.mediaType },
        })

      const heldRequests =
        resource.mediaType === `text/css`
          ? stylesheetRequests
          : holdsImages && resource.mediaType.startsWith(`image/`)
            ? imageRequests
            : undefined

      if (!heldRequests) return respond()

      return new Promise((resolve, reject) => {
        heldRequests.push({
          load: () => resolve(respond()),
          fail: () => reject(new Error(`${resource.mediaType} failed`)),
        })
      })
    },
  }

  const item: Manifest[`spineItems`][number] = {
    id: `document`,
    index: 0,
    href: documentHref,
    containerUri: `EPUB/Content/page.xhtml`,
    mediaType: `application/xhtml+xml`,
  }
  const context = new Context(
    createTestManifest({
      spineItems: [item],
      items: [
        item,
        ...Object.entries(resources).map(([href, { mediaType }], index) => ({
          id: `resource-${index}`,
          href,
          mediaType,
        })),
        ...failingResources.map((href, index) => ({
          id: `failing-resource-${index}`,
          href,
        })),
      ],
    }),
  )
  const settings = new ReaderSettingsManager(
    {
      getResource: (resourceItem) => {
        if (failingResources.includes(resourceItem.href)) {
          throw new Error(`the archive could not read ${resourceItem.href}`)
        }

        const resource = served[resourceItem.href]

        return of(
          resource && !servesAtUrls
            ? new Response(resource.body, {
                headers: { "content-type": resource.mediaType },
              })
            : undefined,
        )
      },
    },
    context,
  )
  const viewport = new Viewport(context, settings)
  const hookManager = new HookManager()
  const containerElement = document.createElement(`div`)
  let hasFrameLoaded = false

  hookManager.register(`item.onDocumentCreated`, ({ documentContainer }) => {
    documentContainer.addEventListener(`load`, () => {
      hasFrameLoaded = true
    })
  })

  /**
   * happy-dom never loads an SVG image, so this reports each one loaded once
   * it is swapped in, from a task as a browser does.
   */
  if (!holdsImages) {
    hookManager.register(`item.onDocumentCreated`, ({ documentContainer }) => {
      if (!(documentContainer instanceof HTMLIFrameElement)) return

      documentContainer.addEventListener(`load`, () => {
        const frameDocument = documentContainer.contentDocument
        const frameView = frameDocument?.defaultView

        if (!frameDocument || !frameView) return

        const reportedImages = new Set<Element>()

        new frameView.MutationObserver(() => {
          for (const image of frameDocument.querySelectorAll(`image`)) {
            const isSwapped = getSvgImageReference(image)?.startsWith(`blob:`)

            if (!isSwapped || reportedImages.has(image)) continue

            reportedImages.add(image)
            setTimeout(() => image.dispatchEvent(new Event(`load`)))
          }
        }).observe(frameDocument, { attributes: true, subtree: true })
      })
    })
  }

  document.body.appendChild(containerElement)

  const renderer = new HtmlRenderer({
    context,
    settings,
    hookManager,
    item,
    containerElement,
    resourcesHandler: new ResourceHandler(item, settings),
    viewport,
  })

  const getDocument = () => renderer.getDocumentFrame()?.contentDocument

  const waitForSwappedSvgImages = () =>
    vi.waitFor(() => {
      const images = Array.from(getDocument()?.querySelectorAll(`image`) ?? [])

      expect(images).not.toHaveLength(0)

      for (const image of images) {
        expect(getSvgImageReference(image)).toMatch(/^blob:/)
      }

      return images
    })

  return {
    renderer,
    getDocument,
    waitForFrameLoaded: () =>
      vi.waitFor(() => expect(hasFrameLoaded).toBe(true)),
    load: (body: string) => {
      served[documentHref] = { mediaType: `application/xhtml+xml`, body }
      renderer.load()
    },
    waitForStylesheetRequests: (count: number) =>
      vi.waitFor(() => {
        expect(stylesheetRequests).toHaveLength(count)

        return stylesheetRequests
      }),
    waitForImageRequests: (count: number) =>
      vi.waitFor(() => {
        expect(imageRequests).toHaveLength(count)

        return imageRequests
      }),
    waitForSwappedSvgImages,
    waitForLoaded: () =>
      vi.waitFor(() => expect(renderer.value.loadStatus).toBe(`loaded`)),
    cleanup: () => {
      renderer.destroy()
      viewport.destroy()
      settings.destroy()
      context.destroy()
      containerElement.remove()
    },
  }
}

/** happy-dom has no `document.fonts`, which the renderer waits on. */
beforeAll(() => {
  Object.defineProperty(HappyDOMDocument.prototype, `fonts`, {
    configurable: true,
    get: () => ({ ready: Promise.resolve() }),
  })
})

afterAll(() => {
  Reflect.deleteProperty(HappyDOMDocument.prototype, `fonts`)
})

let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
  getHappyDOMWindow().happyDOM.settings.fetch.interceptor = null
  getHappyDOMWindow().happyDOM.settings.enableImageFileLoading = false
  vi.useRealTimers()
})

// rxjs schedules delays with intervals
const useRxjsFakeTimers = () =>
  vi.useFakeTimers({
    toFake: [`setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`],
  })

const setup = (params: Parameters<typeof createHarness>[0]) => {
  const harness = createHarness(params)

  cleanup = harness.cleanup

  return harness
}

describe(`HtmlRenderer`, () => {
  describe(`given a document with links the browser never fetches`, () => {
    const head = `
      <link rel="stylesheet" href="css/epub.css" />
      <link rel="pronunciation" href="lexicon/en.pls" type="application/pls+xml" hreflang="en" />
      <link rel="pronunciation" href="lexicon/fr.pls" type="application/pls+xml" hreflang="fr" />
    `
    const resources = {
      "file://EPUB/css/epub.css": { mediaType: `text/css`, body: `p {}` },
      "file://EPUB/lexicon/en.pls": {
        mediaType: `application/pls+xml`,
        body: `<lexicon xml:lang="en"/>`,
      },
      "file://EPUB/lexicon/fr.pls": {
        mediaType: `application/pls+xml`,
        body: `<lexicon xml:lang="fr"/>`,
      },
    }

    it(`loads once its stylesheet has, without waiting on the other links`, async () => {
      const { load, waitForStylesheetRequests, waitForLoaded, renderer } =
        setup({ documentHref: `file://EPUB/ch03s03.xhtml`, resources })

      load(documentWith(head))

      const [stylesheet] = await waitForStylesheetRequests(1)

      expect(renderer.value.loadStatus).toBe(`loading`)

      stylesheet?.load()

      await waitForLoaded()
    })

    it(`still points those links at their content`, async () => {
      const { load, waitForStylesheetRequests, waitForLoaded, getDocument } =
        setup({ documentHref: `file://EPUB/ch03s03.xhtml`, resources })

      load(documentWith(head))

      const [stylesheet] = await waitForStylesheetRequests(1)

      stylesheet?.load()

      await waitForLoaded()

      const lexicons = Array.from(
        getDocument()?.querySelectorAll(`link[rel="pronunciation"]`) ?? [],
        (link) => readObjectUrl(link.getAttribute(`href`)),
      )

      expect(await Promise.all(lexicons)).toEqual([
        `<lexicon xml:lang="en"/>`,
        `<lexicon xml:lang="fr"/>`,
      ])
    })
  })

  describe(`given a document with stylesheets`, () => {
    const resources = {
      "file://EPUB/css/a.css": { mediaType: `text/css`, body: `.a {}` },
      "file://EPUB/css/b.css": { mediaType: `text/css`, body: `.b {}` },
    }
    const head = `
      <link rel="stylesheet" href="css/a.css" />
      <link rel="stylesheet" media="speech" href="css/b.css" />
    `

    it(`is not loaded until every one of them has settled`, async () => {
      const {
        load,
        waitForStylesheetRequests,
        waitForLoaded,
        renderer,
        getDocument,
      } = setup({ documentHref: `file://EPUB/chapter.xhtml`, resources })

      load(documentWith(head))

      const [first, second] = await waitForStylesheetRequests(2)

      first?.load()

      await vi.waitFor(() => expect(getDocument()?.styleSheets).toHaveLength(1))

      expect(renderer.value.loadStatus).toBe(`loading`)

      second?.load()

      await waitForLoaded()
    })

    it(`loads without one that fails`, async () => {
      const { load, waitForStylesheetRequests, waitForLoaded } = setup({
        documentHref: `file://EPUB/chapter.xhtml`,
        resources,
      })

      load(documentWith(head))

      const [first, second] = await waitForStylesheetRequests(2)

      first?.fail()
      second?.load()

      await waitForLoaded()
    })

    it(`loads without one that never reports, once it stops waiting for it`, async () => {
      useRxjsFakeTimers()

      const { load, waitForStylesheetRequests, waitForLoaded, renderer } =
        setup({ documentHref: `file://EPUB/chapter.xhtml`, resources })

      load(documentWith(head))

      const [first] = await waitForStylesheetRequests(2)

      first?.load()

      await vi.advanceTimersByTimeAsync(4_000)

      expect(renderer.value.loadStatus).toBe(`loading`)

      await vi.advanceTimersByTimeAsync(1_000)

      await waitForLoaded()
    })

    it(`waits for one whose relation is written in another case`, async () => {
      const { load, waitForLoaded, renderer, getDocument } = setup({
        documentHref: `file://EPUB/chapter.xhtml`,
        resources,
      })

      load(documentWith(`<link rel="StyleSheet" href="css/a.css" />`))

      // happy-dom does not fetch it, so the test reports in its place
      const link = await vi.waitFor(() => {
        const link = getDocument()?.querySelector(`link`)

        expect(link?.getAttribute(`href`)).toMatch(/^blob:/)

        return link
      })

      expect(renderer.value.loadStatus).toBe(`loading`)

      link?.dispatchEvent(new Event(`load`))

      await waitForLoaded()
    })

    it.each([
      [
        `disabled`,
        `<link rel="stylesheet" disabled="disabled" href="css/a.css" />`,
      ],
      [
        `typed as another language`,
        `<link rel="stylesheet" type="text/x-scss" href="css/a.css" />`,
      ],
    ])(
      `does not wait for one that is %s, which the browser does not fetch`,
      async (_, link) => {
        const { load, waitForLoaded, getDocument } = setup({
          documentHref: `file://EPUB/chapter.xhtml`,
          resources,
        })

        load(documentWith(link))

        await waitForLoaded()

        expect(
          await readObjectUrl(
            getDocument()?.querySelector(`link`)?.getAttribute(`href`),
          ),
        ).toBe(`.a {}`)
      },
    )
  })

  describe(`given a document with images`, () => {
    const documentHref = `file://EPUB/chapter.xhtml`
    const resources = {
      "file://EPUB/images/a.png": { mediaType: `image/png`, body: `a` },
      "file://EPUB/images/b.png": { mediaType: `image/png`, body: `b` },
    }

    it(`is not loaded until each of them has loaded`, async () => {
      const {
        load,
        waitForImageRequests,
        waitForLoaded,
        renderer,
        getDocument,
      } = setup({ documentHref, resources, holdsImages: true })

      load(
        documentWith(
          ``,
          `<img src="images/a.png" /><img src="images/b.png" />`,
        ),
      )

      const [first, second] = await waitForImageRequests(2)
      // `load` does not bubble, but a listener capturing on the document sees it
      const firstImageLoaded = new Promise((resolve) => {
        getDocument()?.addEventListener(`load`, resolve, {
          capture: true,
          once: true,
        })
      })

      first?.load()
      await firstImageLoaded

      expect(renderer.value.loadStatus).toBe(`loading`)

      second?.load()

      await waitForLoaded()
    })

    it(`is not loaded until its SVG image has loaded`, async () => {
      const { load, waitForSwappedSvgImages, waitForLoaded, renderer } = setup({
        documentHref,
        resources,
        holdsImages: true,
      })

      load(documentWith(``, svgWith(`<image href="images/a.png" />`)))

      const [image] = await waitForSwappedSvgImages()

      expect(renderer.value.loadStatus).toBe(`loading`)

      image?.dispatchEvent(new Event(`load`))

      await waitForLoaded()
    })

    it(`loads without the images that fail`, async () => {
      const {
        load,
        waitForImageRequests,
        waitForSwappedSvgImages,
        waitForLoaded,
      } = setup({ documentHref, resources, holdsImages: true })

      load(
        documentWith(
          ``,
          `<img src="images/a.png" />${svgWith(`<image href="images/b.png" />`)}`,
        ),
      )

      const [image] = await waitForImageRequests(1)
      const [svgImage] = await waitForSwappedSvgImages()

      image?.fail()
      svgImage?.dispatchEvent(new Event(`error`))

      await waitForLoaded()
    })

    it(`loads without an image that never reports, once it stops waiting for it`, async () => {
      useRxjsFakeTimers()

      const { load, waitForImageRequests, waitForLoaded, renderer } = setup({
        documentHref,
        resources,
        holdsImages: true,
      })

      load(documentWith(``, `<img src="images/a.png" />`))

      await waitForImageRequests(1)
      await vi.advanceTimersByTimeAsync(4_000)

      expect(renderer.value.loadStatus).toBe(`loading`)

      await vi.advanceTimersByTimeAsync(1_000)

      await waitForLoaded()
    })

    it(`marks a lazy image eager`, async () => {
      const { load, waitForLoaded, getDocument } = setup({
        documentHref,
        resources,
      })

      load(documentWith(``, `<img loading="lazy" src="images/a.png" />`))

      await waitForLoaded()

      expect(getDocument()?.querySelector(`img`)?.getAttribute(`loading`)).toBe(
        `eager`,
      )
    })

    it(`does not load when it unloads while an image is loading, and revokes the image's blob url`, async () => {
      const { load, waitForImageRequests, renderer, getDocument } = setup({
        documentHref,
        resources,
        holdsImages: true,
      })
      const loadStatuses: string[] = []

      renderer.state$.subscribe(({ loadStatus }) => {
        loadStatuses.push(loadStatus)
      })

      load(documentWith(``, `<img src="images/a.png" />`))

      await waitForImageRequests(1)

      const imageUrl = getDocument()?.querySelector(`img`)?.getAttribute(`src`)

      expect(await readObjectUrl(imageUrl)).toBe(`a`)

      renderer.unload()

      await vi.waitFor(() => expect(renderer.value.loadStatus).toBe(`idle`))

      expect(loadStatuses).not.toContain(`loaded`)
      expect(await readObjectUrl(imageUrl)).toBeUndefined()
    })
  })

  describe(`given a document loaded by its url, with images`, () => {
    // On the page's origin, so the frame loads the document from its url.
    const documentHref = `${window.location.origin}/EPUB/chapter.xhtml`
    const resources = {
      [`${window.location.origin}/EPUB/images/a.png`]: {
        mediaType: `image/png`,
        body: `a`,
      },
    }

    it(`is not loaded until each of them has loaded, though its frame has`, async () => {
      useRxjsFakeTimers()

      const {
        load,
        waitForImageRequests,
        waitForFrameLoaded,
        waitForLoaded,
        renderer,
        getDocument,
      } = setup({
        documentHref,
        resources,
        holdsImages: true,
        servesAtUrls: true,
      })

      load(documentWith(``, `<img src="images/a.png" />`))

      const [image] = await waitForImageRequests(1)

      await waitForFrameLoaded()
      // well short of the 5 seconds the reader waits for an image at most
      await vi.advanceTimersByTimeAsync(1_000)

      expect(getDocument()?.URL).toBe(documentHref)
      expect(renderer.value.loadStatus).toBe(`loading`)

      image?.load()

      await waitForLoaded()
    })

    it(`does not wait for an image that has already loaded`, async () => {
      useRxjsFakeTimers()

      const { load, waitForFrameLoaded, renderer, getDocument } = setup({
        documentHref,
        resources,
        servesAtUrls: true,
      })

      // A data url loads as the document is parsed, before its frame's load.
      load(documentWith(``, `<img src="${ONE_PIXEL_PNG_DATA_URL}" />`))

      await waitForFrameLoaded()
      // well short of the 5 seconds the reader waits for an image at most
      await vi.advanceTimersByTimeAsync(1_000)

      expect(getDocument()?.querySelector(`img`)?.complete).toBe(true)
      expect(renderer.value.loadStatus).toBe(`loaded`)
    })

    it(`marks a lazy image eager`, async () => {
      const { load, waitForLoaded, getDocument } = setup({
        documentHref,
        resources,
        servesAtUrls: true,
      })

      load(documentWith(``, `<img loading="lazy" src="images/a.png" />`))

      await waitForLoaded()

      expect(getDocument()?.querySelector(`img`)?.getAttribute(`loading`)).toBe(
        `eager`,
      )
    })
  })

  describe(`given an asset the archive cannot read`, () => {
    it(`loads without it`, async () => {
      const { load, waitForLoaded, getDocument } = setup({
        documentHref: `file://EPUB/chapter.xhtml`,
        resources: {
          "file://EPUB/images/b.png": { mediaType: `image/png`, body: `b` },
        },
        failingResources: [`file://EPUB/images/a.png`],
      })

      load(
        documentWith(
          ``,
          `<img src="images/a.png" /><img src="images/b.png" />`,
        ),
      )

      await waitForLoaded()

      const [broken, image] = Array.from(
        getDocument()?.querySelectorAll(`img`) ?? [],
      )

      expect(broken?.getAttribute(`src`)).toBe(`images/a.png`)
      expect(await readObjectUrl(image?.getAttribute(`src`))).toBe(`b`)
    })
  })

  describe(`resolving references`, () => {
    it.each([
      [
        `a file href nested in a folder`,
        `file://EPUB/Text/chapter.xhtml`,
        `file://EPUB/Text/images/a.png`,
      ],
      [
        `a file href at the root of the archive`,
        `file://chapter.xhtml`,
        `file://images/a.png`,
      ],
      [
        `an item listed by its bare path in the archive, as a non-epub archive lists them`,
        `file://Text/chapter.xhtml`,
        `Text/images/a.png`,
      ],
      [
        `an http href`,
        `http://localhost:9000/book/EPUB/chapter.xhtml`,
        `http://localhost:9000/book/EPUB/images/a.png`,
      ],
    ])(
      `resolves an element's reference against the document, given %s`,
      async (_, documentHref, imageHref) => {
        const { load, waitForLoaded, getDocument } = setup({
          documentHref,
          resources: { [imageHref]: { mediaType: `image/png`, body: `a` } },
        })

        load(documentWith(``, `<img src="images/a.png" />`))

        await waitForLoaded()

        expect(
          await readObjectUrl(
            getDocument()?.querySelector(`img`)?.getAttribute(`src`),
          ),
        ).toBe(`a`)
      },
    )

    it(`resolves a font face against its stylesheet, and rewrites it before the document is loaded`, async () => {
      const { load, waitForStylesheetRequests, renderer, getDocument } = setup({
        documentHref: `file://EPUB/Text/chapter.xhtml`,
        resources: {
          "file://EPUB/Styles/style.css": {
            mediaType: `text/css`,
            body: `@font-face {
              font-family: Serif;
              src: local("Serif"), url(fonts/serif.otf) format("opentype"), url(fonts/missing.woff) format("woff");
            }`,
          },
          "file://EPUB/Styles/fonts/serif.otf": {
            mediaType: `font/otf`,
            body: `serif`,
          },
        },
      })

      load(documentWith(`<link rel="stylesheet" href="../Styles/style.css" />`))

      const [stylesheet] = await waitForStylesheetRequests(1)
      const fontFaceSources = new Promise<string | undefined>((resolve) => {
        const subscription = renderer.state$.subscribe(({ loadStatus }) => {
          if (loadStatus !== `loaded`) return

          subscription.unsubscribe()
          resolve(
            Array.from(getDocument()?.styleSheets[0]?.cssRules ?? [])
              .find((rule) => rule instanceof CSSFontFaceRule)
              ?.style.getPropertyValue(`src`),
          )
        })
      })

      stylesheet?.load()

      const sources = await fontFaceSources
      const [local, font, missing] = sources?.split(`,`) ?? []
      const fontUrl = font?.match(/url\("?([^")]+)"?\)/)?.[1]

      expect(local?.trim()).toBe(`local("Serif")`)
      expect(await readObjectUrl(fontUrl)).toBe(`serif`)
      expect(font).toContain(`format("opentype")`)
      expect(missing?.trim()).toBe(`url(fonts/missing.woff) format("woff")`)
    })

    describe(`of an SVG image`, () => {
      const documentHref = `file://EPUB/Content/page.xhtml`
      const resources = {
        "file://EPUB/Image/a.jpg": { mediaType: `image/jpeg`, body: `a` },
        "file://EPUB/Image/b.jpg": { mediaType: `image/jpeg`, body: `b` },
      }

      it(`resolves its XLink href, as SVG 1.1 writes it, and swaps the picture in there`, async () => {
        const { load, waitForLoaded, getDocument } = setup({
          documentHref,
          resources,
        })

        load(documentWith(``, svgWith(`<image xlink:href="../Image/a.jpg" />`)))

        await waitForLoaded()

        const image = getDocument()?.querySelector(`image`)

        expect(
          await readObjectUrl(image?.getAttributeNS(XLINK_NAMESPACE, `href`)),
        ).toBe(`a`)
        expect(image?.hasAttributeNS(null, `href`)).toBe(false)
      })

      it(`resolves its href, as SVG 2 writes it`, async () => {
        const { load, waitForLoaded, getDocument } = setup({
          documentHref,
          resources,
        })

        load(documentWith(``, svgWith(`<image href="../Image/a.jpg" />`)))

        await waitForLoaded()

        expect(
          await readObjectUrl(
            getDocument()?.querySelector(`image`)?.getAttributeNS(null, `href`),
          ),
        ).toBe(`a`)
      })

      it(`resolves its href rather than its XLink href, as the browser draws it`, async () => {
        const { load, waitForLoaded, getDocument } = setup({
          documentHref,
          resources,
        })

        load(
          documentWith(
            ``,
            svgWith(
              `<image href="../Image/a.jpg" xlink:href="../Image/b.jpg" />`,
            ),
          ),
        )

        await waitForLoaded()

        const image = getDocument()?.querySelector(`image`)

        expect(await readObjectUrl(image?.getAttributeNS(null, `href`))).toBe(
          `a`,
        )
        expect(image?.getAttributeNS(XLINK_NAMESPACE, `href`)).toBe(
          `../Image/b.jpg`,
        )
      })
    })
  })

  describe(`when it unloads`, () => {
    it(`revokes the blob url of every asset it swapped in`, async () => {
      const { load, waitForLoaded, getDocument, renderer } = setup({
        documentHref: `file://EPUB/Content/page.xhtml`,
        resources: {
          "file://EPUB/Image/a.jpg": { mediaType: `image/jpeg`, body: `a` },
          "file://EPUB/Image/b.jpg": { mediaType: `image/jpeg`, body: `b` },
        },
      })

      load(
        documentWith(
          ``,
          `<img src="../Image/a.jpg" />${svgWith(`<image xlink:href="../Image/b.jpg" />`)}`,
        ),
      )

      await waitForLoaded()

      const assetUrls = [
        getDocument()?.querySelector(`img`)?.getAttribute(`src`),
        getDocument()
          ?.querySelector(`image`)
          ?.getAttributeNS(XLINK_NAMESPACE, `href`),
      ]

      expect(await Promise.all(assetUrls.map(readObjectUrl))).toEqual([
        `a`,
        `b`,
      ])

      renderer.unload()

      await vi.waitFor(() => expect(renderer.value.loadStatus).toBe(`idle`))

      expect(await Promise.all(assetUrls.map(readObjectUrl))).toEqual([
        undefined,
        undefined,
      ])
    })
  })
})
