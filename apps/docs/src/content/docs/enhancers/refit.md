---
title: "Refit"
---

This enhancer gives you a convenient way to let the user refit the viewport for better reading experience. For example by reducing the viewport width to see more pages at once on scrolling mode.

## Getting Started

```bash
npm install @prose-reader/enhancer-refit @prose-reader/core rxjs
```

Connect the enhancer to your reader:

```typescript
import { refitEnhancer } from "@prose-reader/enhancer-refit"

const createAppReader = refitEnhancer(createReader)

const reader = createAppReader({
  manifest,
  refit: {
    viewportFit: "tablet"
  }
})
```

<div class="figures"><figure><img src="/images/viewport-fit-32.png" alt=""></figure> <figure><img src="/images/viewport-fit-76.png" alt=""></figure></div>
