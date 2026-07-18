import { createReader } from "@prose-reader/core"
import {
  bridgeReader,
  createReaderBridge,
} from "@prose-reader/react-native/web"
import { from, map } from "rxjs"
import "./style.css"

/**
 * Create the reader bridge.
 *
 * You can extends it to add enhancers or your own state/methods.
 */
const bridge = createReaderBridge()

/**
 * Connect the reader factory to the bridge.
 *
 * The reader is created once the native side sends a book (`load` event)
 * and lives for that single book. A new `load` recreates a fresh reader.
 * From now on, you will drive it from RN side.
 */
bridgeReader({
  /**
   * Create the prose reader, the same way as you would do in web.
   */
  createReader: (manifest) =>
    createReader({
      manifest,
      /**
       * In this project example we want to serve resources directly from the RN side.
       * We will intercept resource requests and call the RN side to get the resource as string.
       *
       * Other alternatives are possible such as serving content from a CDN directly (thus
       * bypassing RN entirely) or using an http server. Depending on what, where and how you serve
       * your content will dictate the best approach.
       *
       * If you already manage your content on your RN side, this interceptor is a straightforward method.
       */
      getResource: (item) => {
        return from(bridge.getResource(item)).pipe(
          map(
            (resource) =>
              new Response(resource.data, { headers: resource.headers }),
          ),
        )
      },
      /**
       * Regular reader creation options.
       * Works the same as web counterpart.
       */
      spreadMode: false,
      numberOfAdjacentSpineItemToPreLoad: 3,
    }),
  bridge,
  // biome-ignore lint/style/noNonNullAssertion: TODO
  containerElement: document.getElementById("reader")!,
})
