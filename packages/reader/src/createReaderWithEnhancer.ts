import { chromeEnhancer } from "./enhancers/chrome"
import { fontsEnhancer } from "./enhancers/fonts"
import { hotkeysEnhancer } from "./enhancers/hotkeys"
import { layoutEnhancer } from "./enhancers/layoutEnhancer/layoutEnhancer"
import { linksEnhancer } from "./enhancers/links"
import { navigationEnhancer } from "./enhancers/navigation"
import { paginationEnhancer } from "./enhancers/pagination"
import { themeEnhancer } from "./enhancers/theme"
import { zoomEnhancer } from "./enhancers/zoom"
import { createReader as createInternalReader } from "./reader"
import { utilsEnhancer } from "./enhancers/utils"
import { resourcesEnhancer } from "./enhancers/resources"
import { mediaEnhancer } from "./enhancers/media"
import { progressionEnhancer } from "./enhancers/progression"
import { accessibilityEnhancer } from "./enhancers/accessibility"
import { webkitEnhancer } from "./enhancers/webkit"
import { loadingEnhancer } from "./enhancers/loadingEnhancer"

export const createReaderWithEnhancers = //__
  loadingEnhancer(
    webkitEnhancer(
      fontsEnhancer(
        linksEnhancer(
          accessibilityEnhancer(
            resourcesEnhancer(
              utilsEnhancer(
                layoutEnhancer(
                  zoomEnhancer(
                    mediaEnhancer(
                      chromeEnhancer(
                        navigationEnhancer(
                          themeEnhancer(
                            hotkeysEnhancer(
                              paginationEnhancer(
                                progressionEnhancer(
                                  // __
                                  createInternalReader
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
