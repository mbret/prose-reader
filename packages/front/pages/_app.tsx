import { ChakraProvider } from "@chakra-ui/react";
import Head from "next/head";
import { dancingScript, roboto } from "../lib/fonts";
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: dancingScript.style.fontFamily,
    body: roboto.style.fontFamily,
  },
  components: {
    Button: {
      baseStyle: {
        textTransform: "uppercase",
      },
    },
  },
});

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0"
        />
      </Head>
      <div className={`${dancingScript.className} ${roboto.className}`}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
      </div>
    </>
  );
}

export default App;
