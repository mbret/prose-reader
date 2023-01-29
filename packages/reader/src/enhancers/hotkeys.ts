import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const hotkeysEnhancer =
  <InheritOptions extends EnhancerOptions<RootEnhancer>, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const onKeyPress = (e: KeyboardEvent) => {
      if (e.key === `ArrowRight`) {
        reader.turnRight()
      }

      if (e.key === `ArrowLeft`) {
        reader.turnLeft()
      }
    }

    document.addEventListener(`keyup`, onKeyPress)

    reader.registerHook(`item.onLoad`, ({ frame }) => {
      frame.contentDocument?.addEventListener(`keyup`, onKeyPress)

      return () => {
        frame.contentDocument?.removeEventListener(`keyup`, onKeyPress)
      }
    })

    const destroy = () => {
      document.removeEventListener(`keyup`, onKeyPress)
      reader.destroy()
    }

    return {
      ...reader,
      destroy,
    }
  }
