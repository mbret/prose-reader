import { Box, Link as ChakraLink, Heading, Stack, Text } from "@chakra-ui/react"
import { Link } from "react-router"
import { OrDivider } from "../../components/OrDivider"
import { Button } from "../../components/ui/button"
import { DEMO_BASE_PATH } from "../../constants"

export const HomeScreen = () => {
  return (
    <Stack height="100%">
      <Stack
        style={{
          width: `100%`,
          margin: `auto`,
          maxWidth: 320,
          alignItems: `center`,
        }}
        px={4}
      >
        <Box position="relative" mb={8}>
          <Heading as="h1" fontFamily="'Dancing Script', sans-serif" size="6xl">
            prose
          </Heading>
          <Text
            as="span"
            position="absolute"
            top="10%"
            right="-30%"
            opacity={0.5}
          >
            demo
          </Text>
        </Box>
        <Box textAlign="justify" maxWidth={[`auto`]} mb={4}>
          <Text as="p">
            This demo is a reader made with React and use <b>prose</b> to render
            its content.
          </Text>
          <Text as="p" mt={4}>
            It provides a simple and generic user interface to showcase what{" "}
            <b>prose</b> can do and how it integrates with a reader app.
          </Text>
        </Box>
        <Button size="lg" width="100%" asChild mb={2}>
          <Link to={`${DEMO_BASE_PATH}/books`}>Take me in!</Link>
        </Button>
        <OrDivider opacity={0.5} />
        <Button size="lg" width="100%" asChild mt={2}>
          <Link to="/">landing page</Link>
        </Button>
      </Stack>
      <Box as="footer" paddingBottom={8} textAlign="center">
        <Text>
          © Copyright{" "}
          <b>
            <ChakraLink
              href="https://www.linkedin.com/in/maxime-bret/"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Maxime Bret
            </ChakraLink>
          </b>
        </Text>
      </Box>
    </Stack>
  )
}
