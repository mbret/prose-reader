import { accessibilityEnhancer } from "./enhancers/accessibility.ts"
import { chromeEnhancer } from "./enhancers/chrome.ts"
import { eventsEnhancer } from "./enhancers/events/events.ts"
import { fontsEnhancer } from "./enhancers/fonts/index.ts"
import { hotkeysEnhancer } from "./enhancers/hotkeys.ts"
import { htmlEnhancer } from "./enhancers/html/enhancer.ts"
import { layoutEnhancer } from "./enhancers/layout/layoutEnhancer.ts"
import { mediaEnhancer } from "./enhancers/media/media.ts"
import { navigationEnhancer } from "./enhancers/navigation/index.ts"
import { paginationEnhancer } from "./enhancers/pagination/enhancer.ts"
import { selectionEnhancer } from "./enhancers/selection/selectionEnhancer.ts"
import { themeEnhancer } from "./enhancers/theme/index.ts"
import { utilsEnhancer } from "./enhancers/utils.ts"
import { webkitEnhancer } from "./enhancers/webkit.ts"
import { zoomEnhancer } from "./enhancers/zoom/index.ts"
import { createReader as createInternalReader } from "./reader.ts"

export const createReaderWithEnhancers = //__
  selectionEnhancer(
    hotkeysEnhancer(
      webkitEnhancer(
        fontsEnhancer(
          accessibilityEnhancer(
            utilsEnhancer(
              zoomEnhancer(
                navigationEnhancer(
                  htmlEnhancer(
                    mediaEnhancer(
                      chromeEnhancer(
                        eventsEnhancer(
                          paginationEnhancer(
                            layoutEnhancer(
                              themeEnhancer(
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
  )
