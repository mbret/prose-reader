import { Box, Heading, SimpleGrid, Text } from "@chakra-ui/react"
import { ArrowLink } from "../components/ArrowLink"
import { CodeBlock } from "../components/CodeBlock"
import { PageContainer } from "../components/PageContainer"
import { SectionIntro } from "../components/SectionHeading"
import { links } from "../links"

/**
 * The getting started guide, cut down to its three moves. Each line of code
 * stays short enough to fit a phone without scrolling.
 */
const steps = [
  {
    title: "Install the packages",
    description:
      "The engine, the streamer and archive reader that feed it books, and RxJS.",
    code: `npm install @prose-reader/core \\
  @prose-reader/streamer \\
  @prose-reader/archive-reader rxjs`,
  },
  {
    title: "Serve the book",
    description:
      "A streamer turns an EPUB, a comic archive or a PDF into a manifest and the resources it lists.",
    code: `const manifest = await streamer
  .fetchManifest()
  .then((res) => res.json())`,
  },
  {
    title: "Render it",
    description:
      "Create a reader for that manifest and mount it in your page. Enhancers add gestures, search or annotations.",
    code: `const reader = createReader({
  manifest,
  getResource,
})
reader.mount(container)`,
  },
]

export const HowItWorks = () => (
  <PageContainer
    as="section"
    aria-labelledby="how-it-works-title"
    pt="clamp(2.5rem, 6vw, 5rem)"
    pb="clamp(3.5rem, 8vw, 6.5rem)"
  >
    <SectionIntro
      eyebrow="How it works"
      title="From a book file to your own reader"
      titleId="how-it-works-title"
    >
      prose takes care of parsing, layout, pagination, navigation and rendering,
      so you can focus on the reading experience.
    </SectionIntro>
    <SimpleGrid
      as="ol"
      listStyle="none"
      mt="12"
      columns={{ base: 1, lg: 3 }}
      gap="5"
    >
      {steps.map(({ title, description, code }, index) => (
        <Box
          as="li"
          key={title}
          display="flex"
          flexDirection="column"
          gap="3"
          minW="0"
          p={{ base: "5", md: "6" }}
          borderWidth="1px"
          borderColor="border"
          rounded="2xl"
          bg="bg"
        >
          <Box
            aria-hidden
            display="grid"
            placeItems="center"
            boxSize="8"
            rounded="lg"
            bg="brand.subtle"
            color="brand.fg"
            fontWeight="bold"
          >
            {index + 1}
          </Box>
          <Heading as="h3" mt="1" fontFamily="body" fontSize="xl">
            {title}
          </Heading>
          <Text color="fg.muted" fontSize="15px" lineHeight="1.6">
            {description}
          </Text>
          <CodeBlock code={code} mt="auto" />
        </Box>
      ))}
    </SimpleGrid>
    <ArrowLink href={links.gettingStarted} mt="5">
      Read the getting started guide
    </ArrowLink>
  </PageContainer>
)
