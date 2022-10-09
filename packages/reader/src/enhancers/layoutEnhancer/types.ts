import { Enhancer } from "../types"

export type SettingsInput = {
  pageHorizontalMargin?: number
  pageVerticalMargin?: number
}

export type SettingsOutput = Required<SettingsInput>

export type LayoutEnhancer = Enhancer<
  SettingsInput & {
    /**
     * Can be used to let the reader automatically resize.
     * `container`: observe and resize the reader whenever the container resize.
     * `false`: do not automatically resize.
     */
    layoutAutoResize?: `container` | false
  },
  {},
  SettingsInput,
  SettingsOutput
>

export type ReaderInstance = ReturnType<Parameters<LayoutEnhancer>[0]>
