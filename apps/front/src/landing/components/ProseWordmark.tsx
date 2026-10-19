import { Flex, type FlexProps, Image } from "@chakra-ui/react"
import logo from "../../../../../assets/brand/logo.svg"

/**
 * The prose mark beside the name, sized from the font size it is given. A
 * flex row centers the mark on the name's line box, which keeps room for
 * capitals and ascenders that "prose" does not have, so the mark would sit
 * high. Half of Literata's ascent minus its descent and x-height is 0.18em:
 * moving the mark down that much centers it on the lowercase letters, as in
 * assets/brand/logo-wordmark.svg.
 */
export const ProseWordmark = (props: FlexProps) => (
  <Flex
    as="span"
    align="center"
    gap="0.42em"
    fontFamily="heading"
    fontWeight="semibold"
    letterSpacing="-0.01em"
    {...props}
  >
    <Image
      src={logo}
      alt=""
      htmlWidth={32}
      htmlHeight={32}
      boxSize="1.25em"
      flexShrink="0"
      position="relative"
      top="0.18em"
    />
    prose
  </Flex>
)
