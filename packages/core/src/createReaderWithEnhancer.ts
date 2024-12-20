import { chromeEnhancer } from "./enhancers/chrome"
import { fontsEnhancer } from "./enhancers/fonts/fonts"
import { hotkeysEnhancer } from "./enhancers/hotkeys"
import { layoutEnhancer } from "./enhancers/layoutEnhancer/layoutEnhancer"
import { linksEnhancer } from "./enhancers/links"
import { navigationEnhancer } from "./enhancers/navigation"
import { paginationEnhancer } from "./enhancers/pagination/enhancer"
import { themeEnhancer } from "./enhancers/theme"
import { zoomEnhancer } from "./enhancers/zoom"
import { createReader as createInternalReader } from "./reader"
import { utilsEnhancer } from "./enhancers/utils"
import { resourcesEnhancer } from "./enhancers/resources"
import { mediaEnhancer } from "./enhancers/media/media"
import { progressionEnhancer } from "./enhancers/progression"
import { accessibilityEnhancer } from "./enhancers/accessibility"
import { webkitEnhancer } from "./enhancers/webkit"
import { loadingEnhancer } from "./enhancers/loading/loadingEnhancer"
import { eventsEnhancer } from "./enhancers/events/events"
import { htmlEnhancer } from "./enhancers/html/enhancer"
import { selectionEnhancer } from "./enhancers/selection/selectionEnhancer"

export const createReaderWithEnhancers = //__
  selectionEnhancer(
    hotkeysEnhancer(
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
                                paginationEnhancer(
                                  progressionEnhancer(
                                    eventsEnhancer(
                                      htmlEnhancer(
                                        // __
                                        createInternalReader,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
