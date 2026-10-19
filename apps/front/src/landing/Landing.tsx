import { Box, ChakraProvider } from "@chakra-ui/react"
import { BuiltWithProse } from "./sections/BuiltWithProse"
import { CallToAction } from "./sections/CallToAction"
import { Community } from "./sections/Community"
import { Faq } from "./sections/Faq"
import { Features } from "./sections/Features"
import { Footer } from "./sections/Footer"
import { Header } from "./sections/Header"
import { Hero } from "./sections/Hero"
import { HowItWorks } from "./sections/HowItWorks"
import { landingSystem } from "./theme"

/**
 * The whole landing page, rendered to HTML at build time by `prerender.tsx`
 * and hydrated in the browser by `main.tsx`. The hero's glow reaches past the
 * right edge, which the page clips rather than scrolls to.
 */
export const Landing = () => (
  <ChakraProvider value={landingSystem}>
    <Box overflowX="clip">
      <Header />
      <Box as="main">
        <Hero />
        <HowItWorks />
        <Features />
        <BuiltWithProse />
        <Faq />
        <Community />
        <CallToAction />
      </Box>
      <Footer />
    </Box>
  </ChakraProvider>
)
