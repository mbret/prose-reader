import { useBreakpointValue } from "@chakra-ui/react"
import type { ScreenSettingsScopeReference } from "./types"

/**
 * The screen the screen scope stands for here, from the window's width and the
 * app's Chakra breakpoints. It is read on the first render rather than after
 * it, so a menu opened on a tablet shows the tablet's scope and value from its
 * first frame, not the mobile ones.
 */
export const useScreenSettingsScopeReference =
  (): ScreenSettingsScopeReference =>
    useBreakpointValue<ScreenSettingsScopeReference>(
      { base: "mobile", md: "tablet", lg: "desktop" },
      { ssr: false },
    ) ?? "mobile"
