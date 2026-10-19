import { Box, Flex, Link, type LinkProps, Text } from "@chakra-ui/react"
import { DEMO_BASE_PATH } from "../../constants"
import { PageContainer } from "../components/PageContainer"
import { ProseMark } from "../components/ProseMark"
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
      alignItems="center"
      justifyContent="space-between"
      columnGap="8"
      rowGap="4"
      py="8"
    >
      <Flex
        wrap="wrap"
        align="center"
        columnGap="3"
        rowGap="2"
        color="fg.muted"
        fontSize="sm"
      >
        <Flex
          align="center"
          gap="2"
          color="fg"
          fontFamily="heading"
          fontSize="lg"
          fontWeight="semibold"
        >
          <ProseMark boxSize="22px" />
          prose
        </Flex>
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
      <Flex as="nav" aria-label="Footer" wrap="wrap" gap="1" mx="-2.5">
        <FooterLink href={links.docs}>Docs</FooterLink>
        <FooterLink href={DEMO_BASE_PATH}>Demo</FooterLink>
        <FooterLink href={links.github}>GitHub</FooterLink>
        <FooterLink href={links.discord}>Discord</FooterLink>
        <FooterLink href={links.oboku}>oboku</FooterLink>
      </Flex>
    </PageContainer>
  </Box>
)
