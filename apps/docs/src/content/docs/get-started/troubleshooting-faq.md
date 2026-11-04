---
title: "Troubleshooting / FAQ"
description: "Fixes for common problems: a book that displays wrong, a reader that does not resize with its container, and vertical books that open with a slide turn."
---

## My book does not work

Between the many standards, use cases, non standard books and the one containing mistakes it's really hard to render or support everything right.

If you find yourself in a situation where a book does not look right on prose you have several options to help you:

### Opening an issue / PR { #opening-an-issue-pr }

If the book is following a known or popular standard such as epub you may want to open an issue. The engine aims to fully support all standards so it should be part of the core and needs to be fixed. You are also free to open a PR if you know how to fix it by yourself.

Go to [https://github.com/mbret/prose-reader/issues/new](https://github.com/mbret/prose-reader/issues/new) to open a new issue.

### Develop your own hook / enhancer to add support { #develop-your-own-hook-enhancer-to-add-support }

:::note
If you think the book should be supported by default with prose we still encourage you to open an issue or PR anyway.
:::

The easiest way is to fix the book itself when it's possible and if it makes sense. If this is a one time occurrence or you have control on the book you may want to check if you can edit it and fix what's wrong. If it's an epub for example there are some tools that can help you automatically fix common mistakes.

If you can't just fix a book and need to add support for it through the reader you have mainly two situations where you can act which will heavily depend on what you need to fix.

### Streamer

If you use a streamer (which you probably do) you can fix the book on a deeper level, for example you can fix wrong file extensions, encoding types or even alter the content of the files themselves. Whether you are in a service worker, a nodejs backend or else you usually have a way to manipulate the book completely before serving it to the engine. When possible you should favor this approach over engine fix since it reduces the performance strain on the client side.

**There is one small downside to this approach,** the code is streamer (or language) specific and you need to develop it for every different streamer you may have. It's okay for your own personal project but this is the reason why we are fixing as much as we can on the engine side instead of the streamer for the library. This way you have very few fixes to develop if you need to make your own streamer.

An example of fix performed by our javascript streamer is to replace css vendor attributes so they are compatible with every browser. This is an impossible fix on the engine side because the browser does not interpret invalid css attributes. There is no way for us to manipulate the stylesheets once we are on the browser. Altering the content of fetched resources could be possible on the browser manipulating the iframe assets but the performance and complexity cost is not worth it.

#### [Streamer](/learn/streamer)

If you need to add a fix and are using our javascript streamer you should visit the [Hooks](/learn/streamer/hooks) section.

### Engine

If your fix cannot be done on the streamer or just feels easier to implement on the browser side you can try to add it to the engine itself. Check the [Hooks](/learn/hooks) and [Enhancers](/learn/enhancers) sections to see which method fits the most your situation. We have a lot of enhancers that add various fixes internally so don't hesitate to take a look at the source code to get some examples.

## My book does not resize with my screen

By default (`layoutAutoResize: "container"`) the reader lays itself out again once the container it is mounted into has held a new size for 100 ms. It follows the container, not the window, so:

* Make sure the container itself changes size, for example by sizing it relative to the window rather than with a fixed width and height.
* If you set `layoutAutoResize` to `false`, the reader no longer watches the container, and you need to call `layout()` yourself after changing its size.

## My reader is hidden in a tab or an Activity

You can hide the container the reader is mounted into with `display: none`, as a tab panel that is not selected or a hidden React `<Activity>` does, and keep the reader. Hidden, the container measures 0 by 0, and the reader neither lays out nor loads spine items at that size:

* The pages and the reading position keep the values they had. A layout that was running when the container was hidden runs again once it is shown.
* A layout asked for while the container is hidden, by a setting such as the font scale or by a chapter that finishes loading, runs once the container is shown again. Until then the pagination is not settled: it describes the layout before the request.
* A navigation made while the container is hidden waits, and runs once the container is shown. If several are made, only the last one runs.
* Shown again at the size it had, the container needs no new layout. With `layoutAutoResize: "container"`, the default, a container shown at another size is laid out for it, as for any resize.
* A reader mounted into a hidden container opens its book once the container is shown. Until then, it has no reading position.

A container with a width but no height, such as one whose height is not set, has no size either, and the reader waits in the same way. [`reader.viewport.isSized$`](/core-api/viewport#issizedusd) tells whether the container has a size.

## I have a vertical reading book but the first page is using slide turn

Vertical writing books do not support slide turn animation yet however we cannot prevent sliding until we detect the book being vertical. Some vertical books do not indicate whether they are vertical or not in the first cover page nor in the manifest. To prevent this problem you can:

* set `pageTurnAnimation` to something else yourself
* **Tell the engine about the book nature on the Manifest**. This is the correct expected way as the engine will be able to enable/disable features based on the book type automatically.
* set `numberOfAdjacentSpineItemToPreLoad` to a higher value than `0` so we get a chance to detect the orientation with the next loaded pages
