import { Enhancer } from "./types"

export const firefoxEnhancer: Enhancer<{}, {}> = (next) => (options) => {
  const reader = next(options)

  // add all normalization

  return reader
}
