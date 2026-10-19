import { Button, Flex, Heading, Text } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../constants"
import { ArrowLink } from "../landing/components/ArrowLink"
import { PageContainer } from "../landing/components/PageContainer"
import { PageLayout } from "../landing/components/PageLayout"
import { Eyebrow } from "../landing/components/SectionHeading"
import { links } from "../landing/links"

/**
 * What the website answers, with a 404 status, for a path it has no page for.
 */
export const NotFound = () => (
  <PageLayout>
    <PageContainer py="clamp(4rem, 12vw, 8rem)">
      <Eyebrow>404</Eyebrow>
      <Heading
        as="h1"
        mt="4"
        fontSize="clamp(2.375rem, 4.2vw, 3.5rem)"
        fontWeight="semibold"
        lineHeight="1.06"
        letterSpacing="-0.02em"
      >
        Page not found
      </Heading>
      <Text
        mt="6"
        maxW="560px"
        color="fg.muted"
        fontSize="clamp(1.0625rem, 1.5vw, 1.25rem)"
        lineHeight="1.55"
        textWrap="pretty"
      >
        There is no page at this address. It may have moved, or the link that
        brought you here may be wrong.
      </Text>
      <Flex wrap="wrap" align="center" columnGap="8" rowGap="4" mt="8">
        <Button asChild size="xl" rounded="xl" fontWeight="semibold">
          <a href="/">Go to the home page</a>
        </Button>
        <ArrowLink href={links.docs}>Read the docs</ArrowLink>
        <ArrowLink href={DEMO_BASE_PATH}>Try the demo</ArrowLink>
      </Flex>
    </PageContainer>
  </PageLayout>
)
