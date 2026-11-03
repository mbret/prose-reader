/* @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest"
import { ReactReader } from "../ReactReader"
import { createMountedReader } from "../tests/createMountedReader"
import { setUpRenderRoot } from "../tests/setUpRenderRoot"
import { useReader } from "./useReader"

describe(`useReader`, () => {
  const { render } = setUpRenderRoot()

  it(`gives the components under ReactReader the reader passed to it, then undefined once it has none`, async () => {
    const reader = createMountedReader()
    const onReaderRendered = vi.fn()
    const nameRenderedReader = (rendered: unknown) =>
      rendered === reader ? `the reader` : rendered

    function ReaderUser() {
      onReaderRendered(useReader())

      return null
    }

    await render(
      <ReactReader reader={reader}>
        <ReaderUser />
      </ReactReader>,
    )
    const readerWhilePassed = nameRenderedReader(
      onReaderRendered.mock.lastCall?.[0],
    )
    await render(
      <ReactReader reader={undefined}>
        <ReaderUser />
      </ReactReader>,
    )

    expect({
      readerWhilePassed,
      readerOnceUnset: nameRenderedReader(onReaderRendered.mock.lastCall?.[0]),
    }).toEqual({
      readerWhilePassed: `the reader`,
      readerOnceUnset: undefined,
    })
  })

  it(`throws outside ReactReader`, async () => {
    function ReaderUser() {
      useReader()

      return null
    }

    const renderOutsideReactReader = async () => {
      try {
        await render(<ReaderUser />)
      } catch (error) {
        return error instanceof Error ? error.message : error
      }

      return undefined
    }

    expect(await renderOutsideReactReader()).toBe(
      `useReader needs a ReactReader above it`,
    )
  })
})
