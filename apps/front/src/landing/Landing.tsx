import { PageLayout } from "./components/PageLayout"
import { BuiltWithProse } from "./sections/BuiltWithProse"
import { CallToAction } from "./sections/CallToAction"
import { Community } from "./sections/Community"
import { Faq } from "./sections/Faq"
import { Features } from "./sections/Features"
import { Hero } from "./sections/Hero"
import { HowItWorks } from "./sections/HowItWorks"

/**
 * The whole landing page.
 */
export const Landing = () => (
  <PageLayout>
    <Hero />
    <HowItWorks />
    <Features />
    <BuiltWithProse />
    <Faq />
    <Community />
    <CallToAction />
  </PageLayout>
)
