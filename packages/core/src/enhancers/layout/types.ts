export type InputSettings = {
  pageHorizontalMargin: number
  pageVerticalMargin: number
  /**
   * Can be used to let the reader automatically resize.
   * `container`: observe and resize the reader whenever the container resize.
   * `false`: do not automatically resize.
   */
  layoutAutoResize: `container` | false
  /**
   * Whether to use a CSS transition when spine item is ready.
   */
  layoutLayerTransition: boolean
}

export type OutputSettings = InputSettings
