---
title: "Refit enhancer"
description: "Install @prose-reader/enhancer-refit and set refit.viewportFit when you create the reader, to narrow the viewport of a scrolled book to a tablet width."
sidebar:
  label: "Refit"
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

<div class="figures"><figure><img src="/images/viewport-fit-32.webp" alt="The demo's viewport fit setting at a maximum width of 32%, with the comic narrowed behind it" width="750" height="1334"></figure> <figure><img src="/images/viewport-fit-76.webp" alt="The same setting at 76%, with the comic wider" width="750" height="1334"></figure></div>
