import { accessibilityEnhancer } from "./enhancers/accessibility"
import { chromeEnhancer } from "./enhancers/chrome"
import { eventsEnhancer } from "./enhancers/events/events"
import { fontsEnhancer } from "./enhancers/fonts/fonts"
import { hotkeysEnhancer } from "./enhancers/hotkeys"
import { htmlEnhancer } from "./enhancers/html/enhancer"
import { layoutEnhancer } from "./enhancers/layout/layoutEnhancer"
import { loadingEnhancer } from "./enhancers/loading/loadingEnhancer"
import { mediaEnhancer } from "./enhancers/media/media"
import { navigationEnhancer } from "./enhancers/navigation"
import { paginationEnhancer } from "./enhancers/pagination/enhancer"
import { resourcesEnhancer } from "./enhancers/resources"
import { selectionEnhancer } from "./enhancers/selection/selectionEnhancer"
import { themeEnhancer } from "./enhancers/theme"
import { utilsEnhancer } from "./enhancers/utils"
import { webkitEnhancer } from "./enhancers/webkit"
import { zoomEnhancer } from "./enhancers/zoom"
import { createReader as createInternalReader } from "./reader"

export const createReaderWithEnhancers = //__
  selectionEnhancer(
    hotkeysEnhancer(
      loadingEnhancer(
        webkitEnhancer(
          fontsEnhancer(
            accessibilityEnhancer(
              resourcesEnhancer(
                utilsEnhancer(
                  zoomEnhancer(
                    navigationEnhancer(
                      htmlEnhancer(
                        mediaEnhancer(
                          chromeEnhancer(
                            themeEnhancer(
                              paginationEnhancer(
                                layoutEnhancer(
                                  eventsEnhancer(
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
  )
