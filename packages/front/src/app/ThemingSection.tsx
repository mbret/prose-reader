import { Container, Heading, Text, Box, Button, Link } from "@chakra-ui/react"
import Image from "next/image"
import makeItYours from "@/assets/make-it-yours.png"
import { FaExternalLinkAlt } from "react-icons/fa"

export const ThemingSection = () => {
  return (
    <Container maxW="3xl" display="flex" gap={2} flexDirection="column">
      <Box flexDirection={["column", null, "row"]} display="flex" gap={[4, null, 8]} alignItems={["flex-start"]}>
        <Box flexDirection="column" gap={2} display="flex">
          <Heading as="h2" size="2xl">
            Make it yours
          </Heading>
          <Box flexDirection="column" gap={2} display="flex" mt={2}>
            <Text>
              Prose handle the complex functionality like rendering and pagination, while giving you complete creative freedom
              over the design. You can even use our demo as starting point.
            </Text>
            <Text>Integrate it with React, Svelte, React Native or anything really. It&apos;s that easy.</Text>
            <Button asChild alignSelf="flex-start" mt={2}>
              <Link href="https://demo.prose-reader.com/" target="_blank" unstyled>
                Visit the demo <FaExternalLinkAlt />
              </Link>
            </Button>
          </Box>
        </Box>
        <Image
          src={makeItYours}
          alt="Make it yours image"
          style={{ width: "100%", maxWidth: 300, boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)" }}
        />
      </Box>
    </Container>
  )
}
