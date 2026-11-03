const hasViewportControl = (
  happyDOM: unknown,
): happyDOM is {
  setViewport: (viewport: { width: number; height: number }) => void
} =>
  typeof happyDOM === `object` &&
  happyDOM !== null &&
  `setViewport` in happyDOM &&
  typeof happyDOM.setViewport === `function`

/** Sets the width of the window happy-dom emulates, which media queries follow. */
export const setWindowWidth = (width: number) => {
  const happyDOM: unknown = Reflect.get(window, `happyDOM`)

  if (!hasViewportControl(happyDOM)) {
    throw new Error(
      `These tests run in happy-dom, to control the window's width`,
    )
  }

  happyDOM.setViewport({ width, height: window.innerHeight })
}
