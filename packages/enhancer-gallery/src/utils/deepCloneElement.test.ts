// @vitest-environment happy-dom

import { firstValueFrom } from "rxjs"
import { afterEach, expect, test, vi } from "vitest"
import { deepCloneElement } from "./deepCloneElement"

afterEach(() => {
  vi.unstubAllGlobals()
})

test(`clones blob assets into snapshot-owned URLs and releases them`, async () => {
  const sourceUrl = `blob:http://localhost/original`
  const snapshotUrl = `blob:http://localhost/snapshot`
  const sourceElement = document.createElement(`div`)
  const image = document.createElement(`img`)
  const createObjectURL = vi.fn(() => snapshotUrl)
  const revokeObjectURL = vi.fn()

  image.setAttribute(`src`, sourceUrl)
  sourceElement.appendChild(image)

  vi.stubGlobal(
    `fetch`,
    vi.fn(async () => new Response(new Blob([`image`]))),
  )
  vi.stubGlobal(`URL`, {
    createObjectURL,
    revokeObjectURL,
  })

  const { clone, ready$, release } = deepCloneElement(sourceElement)

  await firstValueFrom(ready$)

  const clonedImage = clone.querySelector(`img`)

  if (!clonedImage) {
    throw new Error(`Expected cloned image`)
  }

  expect(clonedImage.getAttribute(`src`)).toBe(snapshotUrl)

  release()

  expect(revokeObjectURL).toHaveBeenCalledWith(snapshotUrl)
})
