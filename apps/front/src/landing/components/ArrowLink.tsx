import { Link, type LinkProps } from "@chakra-ui/react"
import { LuArrowRight } from "react-icons/lu"

/**
 * A link that reads as a call to action: accent colored, with an arrow.
 */
export const ArrowLink = ({ children, ...props }: LinkProps) => (
  <Link
    display="inline-flex"
    alignItems="center"
    gap="1.5"
    minH="11"
    color="brand.fg"
    fontWeight="semibold"
    {...props}
  >
    {children}
    <LuArrowRight aria-hidden />
  </Link>
)
