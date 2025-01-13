import { Button, Link, Text, Box, Icon } from "@chakra-ui/react"
import { FaExternalLinkAlt } from "react-icons/fa"
import { SiTypescript } from "react-icons/si"
import { SiReactiveresume } from "react-icons/si"
import { Section, SectionTitle } from "./Section"

export const DeveloperFriendlySection = () => {
  return (
    <Section>
      <SectionTitle>Developer friendly</SectionTitle>
      <Box display="flex" gap={4} mt={2}>
        <Icon fontSize="2xl" color="blue.600">
          <SiTypescript size="" />
        </Icon>
        <Icon fontSize="2xl" color="pink.600">
          <SiReactiveresume />
        </Icon>
      </Box>
      <Text mt={2}>
        Prose is written with modern features and typescript. You can easily
        extend the app with your own plugins and customizations. The SDK focus
        on the difficult part while giving you the freedom to design your reader
        the way you want.
      </Text>
      <Button asChild alignSelf="flex-start" mt={2}>
        <Link href="https://doc.prose-reader.com/" target="_blank" unstyled>
          Explore the documentation <FaExternalLinkAlt />
        </Link>
      </Button>
    </Section>
  )
}
