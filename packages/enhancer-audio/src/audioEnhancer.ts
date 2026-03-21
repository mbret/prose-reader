import type { CreateReaderOptions, Reader } from "@prose-reader/core"
import { AudioController } from "./playback/AudioController"
import { AudioRenderer } from "./renderer/AudioRenderer"
import type { AudioEnhancerAPI } from "./types"
import { isAudioSpineItem } from "./utils"

export const audioEnhancer =
  <InheritOptions extends CreateReaderOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & AudioEnhancerAPI => {
    const readerOptions = { ...options }

    const reader = next({
      ...readerOptions,
      getRenderer(item) {
        const maybeFactory = options.getRenderer?.(item)

        if (maybeFactory) {
          return maybeFactory
        }

        if (isAudioSpineItem(item)) {
          return (params) => new AudioRenderer(params)
        }

        return undefined
      },
    })

    const controller = new AudioController(reader)

    const destroy = () => {
      controller.destroy()
      reader.destroy()
    }

    return {
      ...reader,
      __PROSE_READER_ENHANCER_AUDIO: true,
      destroy,
      audio: {
        state$: controller.state$,
        visualizer$: controller.visualizer$,
        visibleTrackIds$: controller.visibleTrackIds$,
        get state() {
          return controller.state
        },
        get visualizer() {
          return controller.visualizer
        },
        isAudioRenderer: (renderer) => renderer instanceof AudioRenderer,
        play: () => controller.play(),
        pause: () => controller.pause(),
        toggle: () => controller.toggle(),
        setCurrentTime: (value) => controller.setCurrentTime(value),
        select: (trackId, options) => controller.select(trackId, options),
      },
    }
  }
