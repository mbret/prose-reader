import { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const firefoxEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    // add all normalization

    return reader
  }
