import type { Manifest } from "@prose-reader/shared"
import { afterEach, expect, test, vi } from "vitest"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  vi.stubGlobal(`URL`, {
    createObjectURL: vi.fn(() => objectUrl),
  })
  vi.stubGlobal(
    `createImageBitmap`,
    vi.fn(async () => ({
      width: 800,
      height: 1200,
      close: vi.fn(),
    })),
  )

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
