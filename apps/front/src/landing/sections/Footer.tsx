import { Box, Flex, Link, type LinkProps, Text } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../../constants"
import { PageContainer } from "../components/PageContainer"
import { ProseWordmark } from "../components/ProseWordmark"
import { links } from "../links"

const FooterLink = (props: LinkProps) => (
  <Link
    display="inline-flex"
    alignItems="center"
    minH="11"
    px="2.5"
    color="fg.muted"
    fontSize="sm"
    {...props}
  />
)

export const Footer = () => (
  <Box as="footer" borderTopWidth="1px" borderColor="border">
    <PageContainer
      display="flex"
      flexWrap="wrap"
      alignItems="baseline"
      justifyContent={{ base: "center", md: "space-between" }}
      columnGap="8"
      rowGap="4"
      py="8"
    >
      <Flex
        wrap="wrap"
        align="baseline"
        justify={{ base: "center", md: "flex-start" }}
        columnGap="3"
        rowGap="2"
        color="fg.muted"
        fontSize="sm"
      >
        <ProseWordmark color="fg" fontSize="lg" />
        <Text>
          MIT license · ©{" "}
          <Link
            href={links.author}
            rel="nofollow noopener noreferrer"
            color="inherit"
          >
            Maxime Bret
          </Link>
        </Text>
      </Flex>
      <Flex
        as="nav"
        aria-label="Footer"
        wrap="wrap"
        justify="center"
        gap="1"
        mx="-2.5"
      >
        <FooterLink href={links.docs}>Docs</FooterLink>
        <FooterLink href={DEMO_BASE_PATH}>Demo</FooterLink>
        <FooterLink href={links.github}>GitHub</FooterLink>
        <FooterLink href={links.discord}>Discord</FooterLink>
        <FooterLink href={links.oboku}>oboku</FooterLink>
      </Flex>
    </PageContainer>
  </Box>
)
