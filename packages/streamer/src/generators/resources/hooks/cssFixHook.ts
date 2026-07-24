import { createTextResourceHook } from "./createTextResourceHook"

export const cssFixHook = createTextResourceHook(".css", (body) =>
  /**
   * Fix the potentially invalid writing mode present on some vertical book.
   * This has the benefit of making it compatible with firefox as well.
   */
  body.replaceAll(`-webkit-writing-mode`, `writing-mode`),
)
