import { Box } from "@chakra-ui/react"
import type { ReactNode } from "react"
import { Footer } from "../sections/Footer"
import { Header } from "../sections/Header"

/**
 * The header and the footer around a page's main content, which grows so that
 * the footer stays at the bottom of a short page. The hero's glow reaches past
 * the right edge, which the page clips rather than scrolls to.
 */
export const PageLayout = ({ children }: { children: ReactNode }) => (
  <Box display="flex" flexDirection="column" minH="100dvh" overflowX="clip">
    <Header />
    <Box as="main" flex="1">
      {children}
    </Box>
    <Footer />
  </Box>
)
