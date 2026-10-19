---
title: "Zoom"
description: "Zoom into a page or out to thumbnails by transforming the viewport, and how zooming differs between paginated books and scrollable content such as webtoons."
---

API available here [.zoom](/core-api/zoom)

## How it works

Zooming can be achieved by different means and we provide a ready to use API. The simplest way to zoom on the reader is by manipulating the viewport. By applying transformation to it, you can virtually move the viewport around without affecting the navigation. This is a good strategy to prevent hard to manage side effects.

Internally, prose will use the absolute viewport (without transformation) for most of its calculation regarding navigation, pagination etc. We will consider the relative viewport (with transformation) for visible elements though so things that are visible to the user will be loaded for example.

:::caution
This API will manipulate and apply various transforms (eg: scale) to the viewport. Make sure your viewport is stable during zooming
:::

## Zoom & Thumbnails { #zoom-and-thumbnails }

Zooming is not constrained to one direction. By zooming out (scale < 1) you can achieve a "thumbnails" effect:

<figure><img src="/images/zoom-thumbnails.webp" alt="A manga zoomed out, with three of its pages side by side at a fraction of their size" width="1514" height="1104"></figure>

This is not recommended to use this mode as a mean to "refit" the reading experience. You can use this [Refit](/enhancers/refit) enhancer to do so.

## Controlled vs Scrollable

Controlled contents (regular books) behave differently than scrollable content (eg: webtoon). Visit the section [Page Turn Mode](/learn/page-turn-mode) for more information. When in scrollable mode, the user can keep reading normally and not be constrained within bounds. This is because scrollable books usually take the entire space and offer continuous reading without page turn animations.

The internal implementation is also very much different due to both modes using different navigators. Basically controlled will manipulate viewport 3d axis while scrollable content will manipulate scroll offset on the navigator.
