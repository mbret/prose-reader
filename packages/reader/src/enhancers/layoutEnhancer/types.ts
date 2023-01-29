export type SettingsInput = {
  pageHorizontalMargin?: number
  pageVerticalMargin?: number
}

export type SettingsOutput = Required<SettingsInput>

export type Options = SettingsInput & {
  /**
   * Can be used to let the reader automatically resize.
   * `container`: observe and resize the reader whenever the container resize.
   * `false`: do not automatically resize.
   */
  layoutAutoResize?: `container` | false
}
// export type LayoutEnhancer =

// export type ReaderInstance = ReturnType<Parameters<LayoutEnhancer>[0]>
