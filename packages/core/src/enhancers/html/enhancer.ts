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
        const maybeFactory = options.getRenderer?.(item)

        return maybeFactory ?? ((props) => new HtmlRenderer(props))
      },
    })

    return reader
  }
