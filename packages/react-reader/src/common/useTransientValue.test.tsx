/* @vitest-environment happy-dom */

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTransientValue } from "./useTransientValue"

const TransientValueProbe = ({
  durationMs,
  value,
}: {
  durationMs: number
  value: string | undefined
}) => {
  const transientValue = useTransientValue(value, durationMs)

  return <div data-testid="value" data-value={transientValue ?? ``} />
}

describe(`useTransientValue`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const getValue = () =>
    container.querySelector(`[data-testid="value"]`)?.getAttribute(`data-value`)

  const renderProbe = async ({
    durationMs,
    value,
  }: {
    durationMs: number
    value: string | undefined
  }) => {
    await act(async () => {
      root.render(<TransientValueProbe durationMs={durationMs} value={value} />)
    })
  }

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    })
    vi.useFakeTimers()
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    vi.useRealTimers()
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    container.remove()
  })

  it(`keeps a value visible for the requested duration`, async () => {
    await renderProbe({ durationMs: 100, value: `spread` })

    expect(getValue()).toBe(`spread`)

    act(() => {
      vi.advanceTimersByTime(99)
    })

    expect(getValue()).toBe(`spread`)

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(getValue()).toBe(``)
  })

  it(`clears immediately when the source value is undefined`, async () => {
    await renderProbe({ durationMs: 100, value: `spread` })
    await renderProbe({ durationMs: 100, value: undefined })

    expect(getValue()).toBe(``)
  })

  it(`does not let an older timeout clear a newer value`, async () => {
    await renderProbe({ durationMs: 100, value: `first` })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    await renderProbe({ durationMs: 100, value: `second` })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(getValue()).toBe(`second`)

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(getValue()).toBe(``)
  })
})
