import { Image, type ImageProps } from "@chakra-ui/react"

/**
 * The prose mark is the favicon file, so the page and its tab show the same
 * drawing. It sits next to the name, which says it for screen readers.
 */
export const ProseMark = (props: ImageProps) => (
  <Image
    src="/favicon.svg"
    alt=""
    htmlWidth={32}
    htmlHeight={32}
    flexShrink="0"
    {...props}
  />
)
