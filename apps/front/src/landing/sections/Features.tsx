import {
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react"
import type { IconType } from "react-icons"
import {
  LuBookOpen,
  LuCode,
  LuColumns2,
  LuFileText,
  LuLayers,
  LuLayoutGrid,
  LuPencilLine,
  LuPlus,
  LuServer,
} from "react-icons/lu"
import { ArrowLink } from "../components/ArrowLink"
import { PageContainer } from "../components/PageContainer"
import { SectionIntro } from "../components/SectionHeading"
import { links } from "../links"

const features: {
  icon: IconType
  title: string
  description: string
  href: string
  /**
   * Ends the card's "Learn more" for screen readers and search engines, which
   * would otherwise read the same text for every card.
   */
  linkTopic: string
}[] = [
  {
    icon: LuBookOpen,
    title: "EPUB 3.3",
    description:
      "Reflowable and fixed-layout books, following the EPUB 3.3 specification.",
    href: links.epub,
    linkTopic: "EPUB support",
  },
  {
    icon: LuLayoutGrid,
    title: "Comics and manga",
    description:
      "CBZ and CBR archives, right-to-left pages and webtoon scrolling.",
    href: links.comics,
    linkTopic: "comics support",
  },
  {
    icon: LuFileText,
    title: "PDF",
    description:
      "PDF documents, rendered page by page through the PDF enhancer.",
    href: links.pdf,
    linkTopic: "PDF support",
  },
  {
    icon: LuColumns2,
    title: "Pagination",
    description:
      "Single pages, two-page spreads or continuous scrolling, in any direction.",
    href: links.pagination,
    linkTopic: "pagination",
  },
  {
    icon: LuLayers,
    title: "Enhancers",
    description:
      "Add new formats, gestures, search, annotations or features of your own.",
    href: links.enhancers,
    linkTopic: "enhancers",
  },
  {
    icon: LuPencilLine,
    title: "Annotations and bookmarks",
    description:
      "Highlights, notes and bookmarks, anchored to the text with CFIs.",
    href: links.annotations,
    linkTopic: "annotations",
  },
  {
    icon: LuServer,
    title: "Streamer",
    description:
      "Serve books from anywhere: the page itself, a service worker, a Node server or React Native.",
    href: links.streamer,
    linkTopic: "the streamer",
  },
  {
    icon: LuCode,
    title: "Any framework",
    description:
      "Plain TypeScript at the core, with packages for React and React Native.",
    href: links.reactNative,
    linkTopic: "framework support",
  },
]

/**
 * What the last card lists, so the grid does not read as the whole feature
 * set. Each one has its own page in the docs.
 */
const moreFeatures = [
  "Search",
  "Gestures",
  "Zoom",
  "Text selection",
  "Audiobooks",
  "KOReader sync",
]

const FeatureIcon = ({ icon: Icon, bg }: { icon: IconType; bg: string }) => (
  <Box
    aria-hidden
    display="grid"
    placeItems="center"
    boxSize="10"
    rounded="10px"
    bg={bg}
    color="brand.fg"
    fontSize="22px"
  >
    <Icon />
  </Box>
)

export const Features = () => (
  <Box
    as="section"
    aria-labelledby="features-title"
    borderBlockWidth="1px"
    borderColor="border.muted"
    bg="bg.subtle"
  >
    <PageContainer py="clamp(3.5rem, 8vw, 6.5rem)">
      <SectionIntro
        eyebrow="Features"
        title="The hard part of an ebook reader, packaged as an SDK"
        titleId="features-title"
      />
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="5" mt="12">
        {features.map(({ icon, title, description, href, linkTopic }) => (
          <Flex
            as="article"
            key={title}
            direction="column"
            gap="2.5"
            p={{ base: "5", md: "6" }}
            borderWidth="1px"
            borderColor="border"
            rounded="2xl"
            bg="bg"
          >
            <FeatureIcon icon={icon} bg="brand.subtle" />
            <Heading as="h3" mt="1.5" fontFamily="body" fontSize="lg">
              {title}
            </Heading>
            <Text color="fg.muted" fontSize="15px" lineHeight="1.55">
              {description}
            </Text>
            <ArrowLink href={href} mt="auto">
              Learn more<VisuallyHidden> about {linkTopic}</VisuallyHidden>
            </ArrowLink>
          </Flex>
        ))}
        <Flex
          as="article"
          direction="column"
          gap="2.5"
          gridColumn={{ md: "span 2", lg: "auto" }}
          p={{ base: "5", md: "6" }}
          borderWidth="1px"
          borderColor="brand.border"
          rounded="2xl"
          bg="brand.subtle"
        >
          <FeatureIcon icon={LuPlus} bg="bg" />
          <Heading as="h3" mt="1.5" fontFamily="body" fontSize="lg">
            And much more
          </Heading>
          <Flex as="ul" listStyle="none" wrap="wrap" gap="1.5">
            {moreFeatures.map((feature) => (
              <Box
                as="li"
                key={feature}
                display="inline-flex"
                alignItems="center"
                h="7"
                px="2.5"
                rounded="full"
                borderWidth="1px"
                borderColor="brand.muted"
                bg="bg"
                color="fg.muted"
                fontSize="13px"
                fontWeight="medium"
              >
                {feature}
              </Box>
            ))}
          </Flex>
          <ArrowLink href={links.docs} mt="auto" color="brand.700">
            Browse the docs
          </ArrowLink>
        </Flex>
      </SimpleGrid>
    </PageContainer>
  </Box>
)
