import { EnhancerOptions, EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { createNavigator } from "./navigator"
import { createState } from "./state"

export const navigationEnhancer =
  <InheritOptions extends EnhancerOptions<RootEnhancer>, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    navigation: ReturnType<typeof createNavigator> & {
      state$: ReturnType<typeof createState>
    }
  } => {
    const reader = next(options)

    const state$ = createState(reader)

    const navigator = createNavigator(reader)

    return {
      ...reader,
      navigation: {
        ...navigator,
        state$,
      },
    }
  }
