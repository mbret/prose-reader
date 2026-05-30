# Refit

This enhancer gives you a convenient way to let the user refit the viewport for better reading experience. For example by reducing the viewport width to see more pages at once on scrolling mode.

## Getting Started

```bash
npm install @prose-reader/enhancer-refit
```

Connect the enhancer to your reader:

```typescript
import { refitEnhancer } from "@prose-reader/enhancer-refit"

const createAppReader = refitEnhancer(createReader)

const reader = createAppReader({
  refit: {
    viewportFit: "tablet"
  }
})
```

<div><figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (2) (1).png" alt=""><figcaption></figcaption></figure> <figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (3).png" alt=""><figcaption></figcaption></figure></div>
