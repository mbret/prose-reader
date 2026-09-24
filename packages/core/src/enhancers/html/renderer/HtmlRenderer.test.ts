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

type Resource = { mediaType: string; body: string }

type StylesheetRequest = { load: () => void; fail: () => void }

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
 * each stylesheet until the test loads or fails it.
 */
const createHarness = ({
  documentHref,
  resources,
  failingResources = [],
}: {
  documentHref: string
  resources: Record<string, Resource>
  failingResources?: string[]
}) => {
  const happyDOMWindow = getHappyDOMWindow()
  const stylesheetRequests: StylesheetRequest[] = []

  happyDOMWindow.happyDOM.settings.fetch.interceptor = {
    beforeAsyncRequest: async ({ request, window: requestWindow }) => {
      const blob = resolveObjectURL(request.url)

      if (!blob) return undefined

      const body = await blob.text()
      const respond = () =>
        new requestWindow.Response(body, {
          headers: { "content-type": blob.type },
        })

      if (blob.type !== `text/css`) return respond()

      return new Promise((resolve, reject) => {
        stylesheetRequests.push({
          load: () => resolve(respond()),
          fail: () => reject(new Error(`stylesheet failed`)),
        })
      })
    },
  }

  const item: Manifest[`spineItems`][number] = {
    id: `document`,
    index: 0,
    href: documentHref,
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
  const served: Record<string, Resource> = { ...resources }
  const settings = new ReaderSettingsManager(
    {
      getResource: (resourceItem) => {
        if (failingResources.includes(resourceItem.href)) {
          throw new Error(`the archive could not read ${resourceItem.href}`)
        }

        const resource = served[resourceItem.href]

        return of(
          resource &&
            new Response(resource.body, {
              headers: { "content-type": resource.mediaType },
            }),
        )
      },
    },
    context,
  )
  const viewport = new Viewport(context, settings)
  const containerElement = document.createElement(`div`)

  document.body.appendChild(containerElement)

  const renderer = new HtmlRenderer({
    context,
    settings,
    hookManager: new HookManager(),
    item,
    containerElement,
    resourcesHandler: new ResourceHandler(item, settings),
    viewport,
  })

  const getDocument = () => renderer.getDocumentFrame()?.contentDocument

  return {
    renderer,
    getDocument,
    load: (body: string) => {
      served[documentHref] = { mediaType: `application/xhtml+xml`, body }
      renderer.load()
    },
    waitForStylesheetRequests: (count: number) =>
      vi.waitFor(() => {
        expect(stylesheetRequests).toHaveLength(count)

        return stylesheetRequests
      }),
    waitForLoaded: () =>
      vi.waitFor(() => expect(renderer.value.state).toBe(`loaded`)),
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
  vi.useRealTimers()
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

      expect(renderer.value.state).toBe(`loading`)

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

      expect(renderer.value.state).toBe(`loading`)

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
      // rxjs schedules delays with intervals
      vi.useFakeTimers({
        toFake: [`setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`],
      })

      const { load, waitForStylesheetRequests, waitForLoaded, renderer } =
        setup({ documentHref: `file://EPUB/chapter.xhtml`, resources })

      load(documentWith(head))

      const [first] = await waitForStylesheetRequests(2)

      first?.load()

      await vi.advanceTimersByTimeAsync(4_000)

      expect(renderer.value.state).toBe(`loading`)

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

      expect(renderer.value.state).toBe(`loading`)

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
        const subscription = renderer.state$.subscribe(({ state }) => {
          if (state !== `loaded`) return

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
  })
})
