import type { Manifest } from "@prose-reader/shared"
import { afterEach, expect, test, vi } from "vitest"
import {
  createHtmlPageFromResource,
  getTransformMediaType,
} from "./createHtmlPageFromResource"

afterEach(() => {
  vi.unstubAllGlobals()
})

const stubImageGlobals = ({
  objectUrl,
  width,
  height,
}: {
  objectUrl: string
  width: number
  height: number
}) => {
  vi.stubGlobal(`URL`, {
    createObjectURL: vi.fn(() => objectUrl),
  })
  vi.stubGlobal(
    `createImageBitmap`,
    vi.fn(async () => ({
      width,
      height,
      close: vi.fn(),
    })),
  )
}

test(`keeps generated image object URLs alive for cloned gallery frames`, async () => {
  const objectUrl = `blob:http://localhost/image-1`
  const createObjectURL = vi.fn(() => objectUrl)

  vi.stubGlobal(`URL`, {
    createObjectURL,
  })
  vi.stubGlobal(
    `createImageBitmap`,
    vi.fn(async () => ({
      width: 640,
      height: 960,
      close: vi.fn(),
    })),
  )

  const item: Manifest[`spineItems`][number] = {
    id: `page-1`,
    index: 0,
    href: `page-1.jpg`,
    mediaType: `image/jpeg`,
    renditionLayout: `pre-paginated`,
  }
  const response = new Response(new Blob([`image`], { type: `image/jpeg` }), {
    headers: { "Content-Type": `image/jpeg` },
  })

  const htmlBlob = await createHtmlPageFromResource(response, item)
  const html = await htmlBlob.text()

  expect(createObjectURL).toHaveBeenCalledTimes(1)
  expect(html).toContain(`src="${objectUrl}"`)
  expect(html).toContain(
    `<meta name="viewport" content="width=640, height=960">`,
  )
  expect(html).not.toContain(`revokeObjectURL`)
})

test(`wraps avif images into a generated html page`, async () => {
  const objectUrl = `blob:http://localhost/image-2`

  stubImageGlobals({ objectUrl, width: 800, height: 1200 })

  const item: Manifest[`spineItems`][number] = {
    id: `page-1`,
    index: 0,
    href: `page-1.avif`,
    mediaType: `image/avif`,
    renditionLayout: `pre-paginated`,
  }
  const response = new Response(new Blob([`image`], { type: `image/avif` }), {
    headers: { "Content-Type": `image/avif` },
  })

  const htmlBlob = await createHtmlPageFromResource(response, item)
  const html = await htmlBlob.text()

  expect(htmlBlob.type).toBe(`text/html`)
  expect(html).toContain(`src="${objectUrl}"`)
  expect(html).toContain(
    `<meta name="viewport" content="width=800, height=1200">`,
  )
})

test(`wraps images served with a generic content type header`, async () => {
  const objectUrl = `blob:http://localhost/image-3`

  stubImageGlobals({ objectUrl, width: 800, height: 1200 })

  const item: Manifest[`spineItems`][number] = {
    id: `page-1`,
    index: 0,
    href: `http://localhost/streamer/key/page-1.avif`,
    renditionLayout: `pre-paginated`,
  }
  const response = new Response(new Blob([`image`]), {
    headers: { "Content-Type": `application/octet-stream` },
  })

  const htmlBlob = await createHtmlPageFromResource(response, item)
  const html = await htmlBlob.text()

  expect(htmlBlob.type).toBe(`text/html`)
  expect(html).toContain(`src="${objectUrl}"`)
  expect(html).toContain(
    `<meta name="viewport" content="width=800, height=1200">`,
  )
})

test(`wraps gif and bmp images into a generated html page`, async () => {
  for (const [extension, mediaType] of [
    [`gif`, `image/gif`],
    [`bmp`, `image/bmp`],
  ] as const) {
    const objectUrl = `blob:http://localhost/image-${extension}`

    stubImageGlobals({ objectUrl, width: 640, height: 960 })

    const item: Manifest[`spineItems`][number] = {
      id: `page-1`,
      index: 0,
      href: `page-1.${extension}`,
      mediaType,
      renditionLayout: `pre-paginated`,
    }
    const response = new Response(new Blob([`image`], { type: mediaType }), {
      headers: { "Content-Type": mediaType },
    })

    const htmlBlob = await createHtmlPageFromResource(response, item)
    const html = await htmlBlob.text()

    expect(htmlBlob.type).toBe(`text/html`)
    expect(html).toContain(`src="${objectUrl}"`)
  }
})

test(`serves non transformable resources untouched`, async () => {
  const item: Manifest[`spineItems`][number] = {
    id: `page-1`,
    index: 0,
    href: `chapter-1.xhtml`,
    mediaType: `application/xhtml+xml`,
    renditionLayout: `pre-paginated`,
  }
  const response = new Response(
    new Blob([`<html></html>`], { type: `application/xhtml+xml` }),
    {
      headers: { "Content-Type": `application/xhtml+xml` },
    },
  )

  const blob = await createHtmlPageFromResource(response, item)

  expect(blob.type).toBe(`application/xhtml+xml`)
  expect(await blob.text()).toBe(`<html></html>`)
})

test(`getTransformMediaType shares one decision for attach and transform`, () => {
  // manifest media type wins
  expect(
    getTransformMediaType({ href: `page.avif`, mediaType: `image/avif` }),
  ).toBe(`image/avif`)
  // name detection covers items without media type, case-insensitively
  expect(getTransformMediaType({ href: `PAGE.AVIF` })).toBe(`image/avif`)
  expect(getTransformMediaType({ href: `notes.txt` })).toBe(`text/plain`)
  // generic types never decide, they defer to the name detection
  expect(
    getTransformMediaType({
      href: `page.webp`,
      responseContentType: `application/octet-stream`,
    }),
  ).toBe(`image/webp`)
  // non transformable resources resolve to undefined
  expect(
    getTransformMediaType({
      href: `chapter.xhtml`,
      mediaType: `application/xhtml+xml`,
    }),
  ).toBe(undefined)
  expect(getTransformMediaType({ href: `unknown.bin` })).toBe(undefined)
})
