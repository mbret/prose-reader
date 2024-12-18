import Head from "next/head"
import { dancingScript, roboto } from "../lib/fonts"
import { Provider } from "../components/ui/provider"

// const theme = extendTheme({
//   fonts: {
//     heading: dancingScript.style.fontFamily,
//     body: roboto.style.fontFamily,
//   },
//   components: {
//     Button: {
//       baseStyle: {
//         textTransform: "uppercase",
//       },
//     },
//   },
// })

function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
      </Head>
      <div className={`${dancingScript.className} ${roboto.className}`}>
        <Provider>
          <Component {...pageProps} />
        </Provider>
      </div>
    </>
  )
}

export default App
