import { Box, Button, type ButtonProps, Flex, Text } from "@chakra-ui/react"
import { FaDiscord, FaGithub } from "react-icons/fa"
import { PageContainer } from "../components/PageContainer"
import { Eyebrow, SectionTitle } from "../components/SectionHeading"
import { links } from "../links"

const CommunityButton = ({
  href,
  children,
  ...props
}: { href: string } & ButtonProps) => (
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
    {...props}
  >
    <a href={href}>{children}</a>
  </Button>
)

export const Community = () => (
  <PageContainer
    as="section"
    aria-labelledby="community-title"
    display="flex"
    flexWrap="wrap"
    alignItems="flex-end"
    justifyContent="space-between"
    columnGap="12"
    rowGap="6"
    pt="clamp(3.5rem, 8vw, 6.5rem)"
  >
    <Box flex="1 1 520px" minW="0">
      <Eyebrow>Community</Eyebrow>
      <SectionTitle id="community-title" mt="3">
        Built in the open
      </SectionTitle>
      <Text
        mt="4"
        maxW="600px"
        color="fg.muted"
        fontSize="lg"
        lineHeight="1.6"
        textWrap="pretty"
      >
        prose is developed on GitHub, where issues and pull requests are
        welcome. Discord is the place to ask questions and show what you build.
      </Text>
    </Box>
    <Flex wrap="wrap" gap="3">
      <CommunityButton href={links.github}>
        <FaGithub aria-hidden />
        GitHub
      </CommunityButton>
      <CommunityButton href={links.discord}>
        <FaDiscord aria-hidden />
        Discord
      </CommunityButton>
    </Flex>
  </PageContainer>
)
