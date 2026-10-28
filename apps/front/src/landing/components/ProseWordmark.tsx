import { chakra, type HTMLChakraProps, Image } from "@chakra-ui/react"
import logo from "../../../../../assets/brand/logo.svg"

/**
 * The prose mark beside the name, sized from the font size it is given.
 * `vertical-align: middle` puts the mark's middle at half the x-height above
 * the baseline, which centers it on the lowercase letters of "prose", as in
 * assets/brand/logo-wordmark.svg. The name keeps its baseline, so the
 * wordmark lines up with the text around it.
 */
export const ProseWordmark = (props: HTMLChakraProps<"span">) => (
  <chakra.span
    fontFamily="heading"
    fontWeight="semibold"
    letterSpacing="-0.01em"
    whiteSpace="nowrap"
    {...props}
  >
    <Image
      src={logo}
      alt=""
      htmlWidth={32}
      htmlHeight={32}
      display="inline-block"
      boxSize="1.25em"
      verticalAlign="middle"
      marginEnd="0.42em"
    />
    prose
  </chakra.span>
)
