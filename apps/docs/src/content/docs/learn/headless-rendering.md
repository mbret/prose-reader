---
title: "Headless Rendering"
description: "Read a spine item's DOM without showing it on screen with reader.renderHeadless(), as the search enhancer does, for less work than loading it in the reader."
---

There are situations where you want or need to access documents structure / DOM without actually rendering them on the page. Search is a good example of such use case. The benefits are performance and lower resources consumption. Consider using headless rendering when possible rather than loading documents in the reader directly.

See the [renderHeadless()](/core-api/reader/renderheadless) API to use it or check the [Search](/enhancers/search) enhancer to see its usage.
