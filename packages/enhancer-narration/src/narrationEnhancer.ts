import type { Reader } from "@prose-reader/core"
import { NarrationController } from "./playback/NarrationController.ts"
import type { NarrationEnhancerAPI, NarrationEnhancerOptions } from "./types.ts"

export const narrationEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & NarrationEnhancerOptions,
  ): InheritOutput & NarrationEnhancerAPI => {
    const reader = next(options)
    const controller = new NarrationController(
      reader,
      options.narration.sources,
    )

    const destroy = () => {
      controller.destroy()
      reader.destroy()
    }

    return {
      ...reader,
      __PROSE_READER_ENHANCER_NARRATION: true,
      destroy,
      narration: {
        state$: controller.state$,
        get state() {
          return controller.state
        },
        play: () => controller.play(),
        playFromCfi: (cfi) => controller.playFromCfi(cfi),
        pause: () => controller.pause(),
        stop: () => controller.stop(),
      },
    }
  }
