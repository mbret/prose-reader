import { Heading, Image, Link, Text } from "@chakra-ui/react"
import { Box } from "@chakra-ui/react"
import { FaDiscord, FaGithub } from "react-icons/fa"
import { LuExternalLink } from "react-icons/lu"
import headerLogo from "./assets/header_logo.svg"
import { OrDivider } from "./components/OrDivider"
import { Button } from "./components/ui/button"
import { DeveloperFriendlySection } from "./sections/DeveloperFriendlySection"
import { ThemingSection } from "./sections/ThemingSection"
import "./App.css"
import { ReadAnythingSection } from "./sections/ReadAnythingSection"

function App() {
  return (
    <Box pt={10} pb={10}>
      <Box
        as="main"
        display="flex"
        marginX={4}
        style={{
          justifyContent: `center`,
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Heading
          as="h1"
          fontFamily={`"Dancing Script", serif;`}
          size="6xl"
          mb={8}
        >
          prose
        </Heading>
        {<Image src={headerLogo} alt="logo" height={[150, 200, 250]} />}
        <Box display="flex" maxW={[400]} flexDirection="column" gap={2}>
          <Text paddingTop={10} textAlign="center" fontFamily="body">
            Next generation reading engine. Build your reading app for any
            platforms, any formats and any languages with ease and extensive
            functionalities.
          </Text>
          <Text paddingY={5} textAlign="center">
            prose is a library licensed under <b>MIT license</b>. It&apos;s{" "}
            <Link
              variant="underline"
              href="https://github.com/mbret/prose-reader/blob/master/LICENCE"
            >
              free of use <LuExternalLink />
            </Link>{" "}
            and open source
          </Text>
          <Button asChild textTransform="uppercase">
            <Link
              href="https://demo.prose-reader.com/"
              target="_blank"
              unstyled
            >
              demo <LuExternalLink />
            </Link>
          </Button>
          <Button textTransform="uppercase" asChild>
            <Link href="https://doc.prose-reader.com/" target="_blank" unstyled>
              documentation <LuExternalLink />
            </Link>
          </Button>
          <OrDivider title="more" />
          <Button as="a" asChild variant="outline" textTransform="uppercase">
            <Link
              href="https://github.com/mbret/prose-reader"
              target="_blank"
              unstyled
            >
              <FaGithub />
              github
            </Link>
          </Button>
          <Button asChild variant="outline" textTransform="uppercase">
            <Link href="https://discord.gg/dffDEgwNc5" target="_blank" unstyled>
              <FaDiscord />
              discord
            </Link>
          </Button>
        </Box>
        <Box display="flex" flexDirection="column" gap={[8, null, 14]} mt={14}>
          <ReadAnythingSection />
          <ThemingSection />
          <DeveloperFriendlySection />
        </Box>
      </Box>
      <Box as="footer" marginTop={16} paddingBottom={8} textAlign="center">
        <Text>
          © Copyright{" "}
          <b>
            <Link
              href="https://www.linkedin.com/in/maxime-bret/"
              rel="nofollow noopener noreferrer"
            >
              Maxime Bret
            </Link>
          </b>
        </Text>
      </Box>
    </Box>
  )
}

export default App
