// @vitest-environment happy-dom

import { afterEach, expect, test, vi } from "vitest"
import {
  copyBlobAssetReferences,
  createSnapshotObjectUrlStore,
} from "./snapshotBlobAssets"

afterEach(() => {
  vi.unstubAllGlobals()
})

test(`copies blob asset references into snapshot-owned object URLs`, async () => {
  const sourceUrl = `blob:http://localhost/original`
  const snapshotUrl = `blob:http://localhost/snapshot`
  const image = document.createElement(`img`)
  const link = document.createElement(`link`)
  const audio = document.createElement(`audio`)
  const createObjectURL = vi.fn(() => snapshotUrl)

  image.setAttribute(`src`, sourceUrl)
  link.setAttribute(`href`, `/style.css`)
  audio.setAttribute(`src`, `https://example.com/audio.mp3`)
  document.body.append(image, link, audio)

  vi.stubGlobal(
    `fetch`,
    vi.fn(async () => new Response(new Blob([`image`]))),
  )
  vi.stubGlobal(`URL`, {
    createObjectURL,
    revokeObjectURL: vi.fn(),
  })

  const objectUrlStore = createSnapshotObjectUrlStore()

  await copyBlobAssetReferences(document.body, document, objectUrlStore)

  expect(fetch).toHaveBeenCalledWith(sourceUrl)
  expect(createObjectURL).toHaveBeenCalledTimes(1)
  expect(image.getAttribute(`src`)).toBe(snapshotUrl)
  expect(link.getAttribute(`href`)).toBe(`/style.css`)
  expect(audio.getAttribute(`src`)).toBe(`https://example.com/audio.mp3`)
})

test(`revokes snapshot-owned object URLs once`, () => {
  const firstUrl = `blob:http://localhost/snapshot-1`
  const secondUrl = `blob:http://localhost/snapshot-2`
  const revokeObjectURL = vi.fn()

  vi.stubGlobal(`URL`, {
    revokeObjectURL,
  })

  const objectUrlStore = createSnapshotObjectUrlStore()

  objectUrlStore.add(firstUrl)
  objectUrlStore.add(firstUrl)
  objectUrlStore.add(secondUrl)
  objectUrlStore.revokeAll()
  objectUrlStore.revokeAll()

  expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  expect(revokeObjectURL).toHaveBeenCalledWith(firstUrl)
  expect(revokeObjectURL).toHaveBeenCalledWith(secondUrl)
})
