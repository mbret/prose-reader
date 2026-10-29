import { memo, useRef, useState } from "react"
import { Slider } from "../components/ui/slider"

const FONT_SCALE_MIN = 0.2
const FONT_SCALE_MAX = 5

/**
 * The font scale, as a percentage. A drag shows the values it crosses and
 * changes the font scale once, where it ends, since each change lays the book
 * out again.
 */
export const FontScaleSlider = memo(function FontScaleSlider({
  fontScale,
  onFontScaleChange,
}: {
  fontScale: number
  onFontScaleChange: (fontScale: number) => void
}) {
  const [draggedFontScale, setDraggedFontScale] = useState<number>()
  /**
   * The slider reports the end of a change in a microtask, with the value it
   * last rendered, which the dragged one may not have reached yet.
   */
  const draggedFontScaleRef = useRef<number>(undefined)

  return (
    <Slider
      label={`%`}
      value={[(draggedFontScale ?? fontScale) * 100]}
      onValueChange={function showDraggedFontScale({ value: [percent = 0] }) {
        draggedFontScaleRef.current = percent / 100
        setDraggedFontScale(percent / 100)
      }}
      onValueChangeEnd={function changeToDraggedFontScale() {
        const changedFontScale = draggedFontScaleRef.current

        draggedFontScaleRef.current = undefined
        setDraggedFontScale(undefined)

        if (changedFontScale !== undefined) onFontScaleChange(changedFontScale)
      }}
      showValue={true}
      marks={[
        { value: 100, label: "Publisher" },
        { value: FONT_SCALE_MIN * 100, label: `${FONT_SCALE_MIN * 100}%` },
        { value: FONT_SCALE_MAX * 100, label: `${FONT_SCALE_MAX * 100}%` },
      ]}
      max={FONT_SCALE_MAX * 100}
      min={FONT_SCALE_MIN * 100}
      width="100%"
      step={0.1 * 100}
    />
  )
})
