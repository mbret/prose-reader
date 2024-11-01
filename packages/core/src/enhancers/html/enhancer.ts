import {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { HtmlRenderer } from "./renderer/HtmlRenderer"

export const htmlEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next({
      ...options,
      getRenderer(item) {
        const MaybeRenderer = options.getRenderer?.(item)

        return MaybeRenderer ?? HtmlRenderer
      },
    })

    return reader
  }
