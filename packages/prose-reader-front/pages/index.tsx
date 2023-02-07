import { Box, Button, Heading, Link } from "@chakra-ui/react"
import { Text } from "@chakra-ui/react"
import Image from "next/image"
import { ExternalLinkIcon } from "@chakra-ui/icons"
import headerLogo from "../public/header_logo.svg"
import { GithubIcon } from "../lib/assets/GithubIcon"
import { DiscordMarkBlueIcon } from "../lib/assets/DiscordMarkBlueIcon"
import { OrDivider } from "../lib/OrDivider"

export default function Index() {
  return (
    <>
      {/* <Header /> */}
      <Box
        as="main"
        marginY={10}
        display="flex"
        marginX={4}
        style={{
          justifyContent: `center`,
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Heading as="h1" fontSize="5rem" mb={8}>
          prose
        </Heading>
        <Box maxW={[200, 300]}>
          <Image src={headerLogo} alt="logo" />
        </Box>
        <Box display="flex" maxW={[400]} flexDirection="column" gap={2}>
          <Text paddingTop={10} textAlign="center">
            Next generation reading engine. Build your reading app for any platforms, any formats and any languages with ease and
            extensive functionalities.
          </Text>
          <Text paddingY={5} textAlign="center">
            prose is a library licensed under MIT license. It's{" "}
            <Link href="https://github.com/mbret/prose-reader/blob/master/LICENCE" isExternal color="blue.500">
              free of use <ExternalLinkIcon mx="2px" />
            </Link>{" "}
            and open source
          </Text>
          <Button as="a" href="https://demo.prose-reader.com/" target="_blank" rightIcon={<ExternalLinkIcon />}>
            demo
          </Button>
          <Button as="a" href="https://doc.prose-reader.com/" target="_blank" rightIcon={<ExternalLinkIcon />}>
            documentation
          </Button>
          <OrDivider title="more" />
          <Button
            as="a"
            href="https://github.com/mbret/prose-reader"
            target="_blank"
            variant="outline"
            leftIcon={<GithubIcon />}
            rightIcon={<ExternalLinkIcon />}
          >
            github
          </Button>
          <Button
            as="a"
            href="hhttps://discord.gg/k4X53Yd4Ar"
            target="_blank"
            variant="outline"
            leftIcon={<DiscordMarkBlueIcon />}
            rightIcon={<ExternalLinkIcon />}
          >
            discord
          </Button>
        </Box>
      </Box>
    </>
  )
}
