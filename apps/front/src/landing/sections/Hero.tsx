import { Box, Button, Flex, Heading, Image, Text } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../../constants"
import heroPhone from "../assets/hero-phone.webp"
import heroSpread800 from "../assets/hero-spread-800.webp"
import heroSpread1600 from "../assets/hero-spread-1600.webp"
import { InstallCommand } from "../components/InstallCommand"
import { PageContainer } from "../components/PageContainer"
import { Eyebrow } from "../components/SectionHeading"
import { links } from "../links"

/**
 * The demo in a browser window, with the same book on a phone in front of it.
 * The phone covers the illustrated page rather than the text, and stays inside
 * the column so it lines up with the copy above it on a phone.
 */
const HeroScreens = () => (
  <Box position="relative" w="full" maxW="760px" mx="auto" pb="10">
    <Box
      as="figure"
      rounded="14px"
      overflow="hidden"
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      boxShadow="0 40px 80px -32px rgba(28, 26, 23, 0.35), 0 12px 24px -12px rgba(28, 26, 23, 0.18)"
    >
      <Flex
        aria-hidden
        align="center"
        gap="7px"
        h="38px"
        px="14px"
        borderBottomWidth="1px"
        borderColor="border.muted"
        bg="bg.subtle"
      >
        <Box boxSize="11px" rounded="full" bg="border.emphasized" />
        <Box boxSize="11px" rounded="full" bg="border.emphasized" />
        <Box boxSize="11px" rounded="full" bg="border.emphasized" />
        <Box
          ms="10px"
          px="3"
          py="3px"
          rounded="6px"
          borderWidth="1px"
          borderColor="border.muted"
          bg="bg"
          color="fg.subtle"
          fontSize="xs"
        >
          prose-reader.com/demo
        </Box>
      </Flex>
      <Image
        src={heroSpread1600}
        srcSet={`${heroSpread800} 800w, ${heroSpread1600} 1600w`}
        sizes="(min-width: 64em) 32rem, min(760px, 100vw)"
        alt="The prose demo showing a two-page spread of an illustrated French novel"
        htmlWidth={1600}
        htmlHeight={1000}
        fetchPriority="high"
        w="full"
        h="auto"
      />
    </Box>
    <Box
      as="figure"
      position="absolute"
      left="0"
      bottom="0"
      w="22%"
      rounded="22px"
      borderWidth="6px"
      borderColor="ink"
      overflow="hidden"
      bg="bg"
      boxShadow="0 30px 50px -20px rgba(28, 26, 23, 0.45)"
    >
      <Image
        src={heroPhone}
        alt="The same book on a phone, paginated to fit the screen"
        htmlWidth={520}
        htmlHeight={1040}
        w="full"
        h="auto"
      />
    </Box>
  </Box>
)

export const Hero = () => (
  <Box as="section" aria-labelledby="hero-title" position="relative">
    <Box
      aria-hidden
      position="absolute"
      top="-140px"
      right="-10%"
      w="min(980px, 110%)"
      h="820px"
      bgImage="radial-gradient(closest-side, rgba(229, 72, 43, 0.17), rgba(229, 72, 43, 0.06) 55%, rgba(229, 72, 43, 0))"
      pointerEvents="none"
    />
    <PageContainer
      position="relative"
      display="grid"
      gridTemplateColumns={{
        base: "minmax(0, 1fr)",
        lg: "minmax(0, 1.25fr) minmax(0, 1fr)",
      }}
      alignItems="center"
      gap="clamp(2.5rem, 5vw, 4rem)"
      pt="clamp(1.5rem, 4vw, 3.5rem)"
      pb="clamp(2.5rem, 5vw, 4.5rem)"
    >
      <Box>
        <Eyebrow>Reading system engine</Eyebrow>
        <Heading
          as="h1"
          id="hero-title"
          mt="4"
          fontSize="clamp(2.375rem, 4.2vw, 3.5rem)"
          fontWeight="semibold"
          lineHeight="1.06"
          letterSpacing="-0.02em"
          textWrap="balance"
        >
          The{" "}
          <Box as="span" whiteSpace="nowrap">
            open-source
          </Box>{" "}
          engine for building reading apps in the browser
        </Heading>
        <Text
          mt="6"
          maxW="560px"
          color="fg.muted"
          fontSize="clamp(1.0625rem, 1.5vw, 1.25rem)"
          lineHeight="1.55"
          textWrap="pretty"
        >
          Render any format: EPUB 3, comics and PDF are ready, and you can
          extend it to more. Serve books from anywhere, entirely in the browser
          or from your server. One framework-agnostic SDK to ship your own
          reader, your way.
        </Text>
        <Flex wrap="wrap" gap="3" mt="8">
          <Button asChild size="xl" rounded="xl" fontWeight="semibold">
            <a href={links.gettingStarted}>Get started</a>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            rounded="xl"
            borderColor="border.emphasized"
            bg="bg"
            color="fg"
            fontWeight="semibold"
            _hover={{ bg: "bg.subtle" }}
          >
            <a href={DEMO_BASE_PATH}>Try the demo</a>
          </Button>
        </Flex>
        <InstallCommand mt="7" />
      </Box>
      <HeroScreens />
    </PageContainer>
  </Box>
)
