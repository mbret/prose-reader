/* @vitest-environment happy-dom */

import { act, type ComponentProps, useState } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Slider } from "../components/ui/slider"

type SliderProps = ComponentProps<typeof Slider>

/** The props of every render of the slider, which stands in for Chakra's. */
const { sliderRenders } = vi.hoisted(() => {
  const sliderRenders: SliderProps[] = []

  return { sliderRenders }
})

vi.mock("../components/ui/slider", () => ({
  Slider: (props: SliderProps) => {
    sliderRenders.push(props)

    return null
  },
}))

import { FontScaleSlider } from "./FontScaleSlider"

/** An app that saves the font scale the slider changes and passes it back. */
const AppSavingFontScale = ({
  onFontScaleChange,
}: {
  onFontScaleChange: (fontScale: number) => void
}) => {
  const [fontScale, setFontScale] = useState(1)

  return (
    <FontScaleSlider
      fontScale={fontScale}
      onFontScaleChange={function saveFontScale(changedFontScale) {
        onFontScaleChange(changedFontScale)
        setFontScale(changedFontScale)
      }}
    />
  )
}

describe(`FontScaleSlider`, () => {
  let root: ReturnType<typeof createRoot>

  const getSlider = () => sliderRenders.at(-1)

  const dragTo = async (percent: number) => {
    await act(async () => {
      getSlider()?.onValueChange?.({ value: [percent] })
    })
  }

  /** Ends the change with what the slider last rendered, as Chakra's does. */
  const endChange = async () => {
    await act(async () => {
      getSlider()?.onValueChangeEnd?.({ value: getSlider()?.value ?? [] })
    })
  }

  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    sliderRenders.length = 0
    root = createRoot(document.createElement(`div`))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
  })

  it(`shows the values a drag crosses and changes the font scale once, where it ends`, async () => {
    const onFontScaleChange = vi.fn()

    await act(async () => {
      root.render(<AppSavingFontScale onFontScaleChange={onFontScaleChange} />)
    })
    await dragTo(120)
    await dragTo(150)

    expect(getSlider()?.value).toEqual([150])
    expect(onFontScaleChange).not.toHaveBeenCalled()

    await endChange()

    expect(onFontScaleChange.mock.calls).toEqual([[1.5]])
    expect(getSlider()?.value).toEqual([150])
  })

  it(`changes the font scale to where the drag went, when the end reports an earlier value`, async () => {
    const onFontScaleChange = vi.fn()

    await act(async () => {
      root.render(<AppSavingFontScale onFontScaleChange={onFontScaleChange} />)
    })
    await dragTo(150)
    await act(async () => {
      getSlider()?.onValueChangeEnd?.({ value: [100] })
    })

    expect(onFontScaleChange.mock.calls).toEqual([[1.5]])
  })

  it(`leaves the font scale when a change ends without the slider moving`, async () => {
    const onFontScaleChange = vi.fn()

    await act(async () => {
      root.render(<AppSavingFontScale onFontScaleChange={onFontScaleChange} />)
    })
    await endChange()

    expect(onFontScaleChange).not.toHaveBeenCalled()
  })
})
