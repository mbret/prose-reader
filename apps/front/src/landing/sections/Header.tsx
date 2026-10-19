import { Box, Button, Flex, Link, type LinkProps } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../../constants"
import { PageContainer } from "../components/PageContainer"
import { ProseMark } from "../components/ProseMark"
import { links } from "../links"

const HeaderLink = (props: LinkProps) => (
  <Link
    display="inline-flex"
    alignItems="center"
    h="11"
    px="3"
    color="fg"
    fontSize="15px"
    fontWeight="medium"
    _hover={{ color: "brand.fg", textDecoration: "none" }}
    {...props}
  />
)

/**
 * On a phone, Demo and GitHub leave the bar: the hero right below links the
 * demo, and Docs and Get started are what someone arriving here looks for.
 */
export const Header = () => (
  <Box as="header" position="relative" zIndex="1">
    <PageContainer display="flex" alignItems="center" gap="6" py="4">
      <Link
        href="/"
        aria-label="prose home"
        flexShrink="0"
        gap="2.5"
        minH="11"
        color="fg"
        fontFamily="heading"
        fontSize="2xl"
        fontWeight="semibold"
        letterSpacing="-0.01em"
        _hover={{ textDecoration: "none" }}
      >
        <ProseMark boxSize="30px" />
        prose
      </Link>
      <Flex
        as="nav"
        aria-label="Main"
        flex="1"
        justify="flex-end"
        align="center"
        gap="1"
      >
        <HeaderLink href={links.docs}>Docs</HeaderLink>
        <HeaderLink href={DEMO_BASE_PATH} hideBelow="md">
          Demo
        </HeaderLink>
        <HeaderLink href={links.github} hideBelow="md">
          GitHub
        </HeaderLink>
        <Button
          asChild
          ms="2"
          h="11"
          px="18px"
          rounded="10px"
          bg="ink"
          color="paper"
          fontSize="15px"
          fontWeight="semibold"
          _hover={{ bg: "black" }}
        >
          <a href={links.gettingStarted}>Get started</a>
        </Button>
      </Flex>
    </PageContainer>
  </Box>
)
