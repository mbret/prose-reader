import { Box, Button, chakra, Flex, Heading, Text } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../../constants"
import { PageContainer } from "../components/PageContainer"
import { links } from "../links"

export const CallToAction = () => (
  <PageContainer
    as="section"
    aria-labelledby="call-to-action-title"
    py="clamp(3rem, 7vw, 5.5rem)"
  >
    <Box
      position="relative"
      overflow="hidden"
      display="grid"
      justifyItems="center"
      gap="18px"
      py="clamp(2.75rem, 6vw, 4.5rem)"
      px="clamp(1.5rem, 5vw, 4rem)"
      rounded="28px"
      bg="brand.solid"
      color="brand.contrast"
      textAlign="center"
    >
      {/* The pilcrow of the prose mark, as a watermark in the corner. */}
      <chakra.svg
        viewBox="0 0 32 32"
        aria-hidden
        position="absolute"
        right="-60px"
        bottom="-110px"
        w="clamp(200px, 30%, 360px)"
        h="auto"
        opacity="0.1"
      >
        <path
          fill="white"
          d="M12 6h14v20h-4V10h-4v16h-4v-7.5h-2a6.25 6.25 0 0 1 0-12.5Z"
        />
      </chakra.svg>
      <Heading
        as="h2"
        id="call-to-action-title"
        position="relative"
        fontSize="clamp(1.875rem, 3.6vw, 2.875rem)"
        fontWeight="semibold"
        lineHeight="1.1"
        letterSpacing="-0.015em"
        textWrap="balance"
      >
        Build your own reader
      </Heading>
      <Text
        position="relative"
        maxW="560px"
        color="brand.50"
        fontSize="lg"
        lineHeight="1.6"
        textWrap="pretty"
      >
        Follow the getting started guide and have your first book on screen in a
        few minutes.
      </Text>
      <Flex position="relative" wrap="wrap" justify="center" gap="3" mt="2">
        <Button
          asChild
          size="xl"
          rounded="xl"
          bg="white"
          color="brand.700"
          fontWeight="semibold"
          _hover={{ bg: "brand.50" }}
        >
          <a href={links.gettingStarted}>Get started</a>
        </Button>
        <Button
          asChild
          size="xl"
          variant="outline"
          rounded="xl"
          borderColor="whiteAlpha.600"
          color="white"
          fontWeight="semibold"
          _hover={{ bg: "whiteAlpha.200" }}
        >
          <a href={DEMO_BASE_PATH}>Try the demo</a>
        </Button>
      </Flex>
    </Box>
  </PageContainer>
)
