import { takeUntil } from "rxjs"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { handleLinks } from "./links"
import { HtmlRenderer } from "./renderer/HtmlRenderer"

type HandleLinksReturnType = ReturnType<typeof handleLinks>

export type HtmlEnhancerOutput = {
  links$: HandleLinksReturnType
}

export const htmlEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    links$: HandleLinksReturnType
  } => {
    const reader = next({
      ...options,
      getRenderer(item) {
        const maybeFactory = options.getRenderer?.(item)

        return maybeFactory ?? ((props) => new HtmlRenderer(props))
      },
    })

    const links$ = handleLinks(reader)

    links$.pipe(takeUntil(reader.$.destroy$)).subscribe()

    return {
      ...reader,
      links$,
    }
  }
