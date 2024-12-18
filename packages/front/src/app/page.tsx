import Image from "next/image"
import styles from "./page.module.css"
import { Heading, Link, Text } from "@chakra-ui/react"
import { Box } from "@chakra-ui/react"
import { Button } from "@/components/ui/button"
import { FaDiscord, FaGithub } from "react-icons/fa"
import { LuExternalLink } from "react-icons/lu"
import { OrDivider } from "@/components/OrDivider"
import headerLogo from "@/assets/header_logo.svg"

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
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
          <Heading as="h1" fontSize="5rem" mb={8} fontFamily="var(--font-dancing-script)">
            prose
          </Heading>
          <Box maxW={[200, 300]}>{<Image src={headerLogo} alt="logo" priority />}</Box>
          <Box display="flex" maxW={[400]} flexDirection="column" gap={2}>
            <Text paddingTop={10} textAlign="center" fontFamily="body">
              Next generation reading engine. Build your reading app for any platforms, any formats and any languages with ease
              and extensive functionalities.
            </Text>
            <Text paddingY={5} textAlign="center">
              prose is a library licensed under <b>MIT license</b>. It's{" "}
              <Link variant="underline" href="https://github.com/mbret/prose-reader/blob/master/LICENCE">
                free of use <LuExternalLink />
              </Link>{" "}
              and open source
            </Text>
            <Button asChild textTransform="uppercase">
              <Link href="https://demo.prose-reader.com/" target="_blank" unstyled>
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
              <Link href="https://github.com/mbret/prose-reader" target="_blank" unstyled>
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
          <Box as="footer" marginTop={16} paddingBottom={8} textAlign="center">
            <Text>
              © Copyright{" "}
              <b>
                <Link href="https://www.linkedin.com/in/maxime-bret/" rel="nofollow noopener noreferrer">
                  Maxime Bret
                </Link>
              </b>
            </Text>
          </Box>
        </Box>
      </main>
      <footer className={styles.footer}></footer>
    </div>
  )
}
