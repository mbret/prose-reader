import { Header } from "../lib/components/Header";
import { Box, Button, ChakraProvider, Heading } from "@chakra-ui/react";
import { dancingScript } from "../lib/fonts";
import { Text } from "@chakra-ui/react";
import Image from "next/image";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import headerLogo from "../public/header_logo.svg";

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
          <Text paddingY={10} textAlign="center">
            Next generation reading engine. Build your reading app for any
            platforms, any formats and any languages with ease and extensive
            functionalities.
          </Text>
          <Button
            as="a"
            href="https://demo.prose-reader.com/"
            target="_blank"
            rightIcon={<ExternalLinkIcon />}
          >
            demo
          </Button>
          <Button
            as="a"
            href="https://doc.prose-reader.com/"
            target="_blank"
            rightIcon={<ExternalLinkIcon />}
          >
            documentation
          </Button>
        </Box>
      </Box>
    </>
  );
}
