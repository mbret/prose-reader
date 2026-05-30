# Troubleshooting / FAQ

## My book does not work

Between the many standards, use cases, non standard books and the one containing mistakes it's really hard to render or support everything right.

If you find yourself in a situation where a book does not look right on prose you have several options to help you:

### Opening an issue / PR

If the book is following a known or popular standard such as epub you may want to open an issue. The engine aim to fully support all standards so it should be part of the core and need to be fixed. You are also free to open a PR if you know how to fix it by yourself.

Go to [https://github.com/mbret/prose-reader/issues/new](https://github.com/mbret/prose-reader/issues/new) to open a new issue.

### Develop your own hook / enhancer to add support

{% hint style="info" %}
If you think the book should be supported by default with prose we still encourage you to open an issue or PR anyway.
{% endhint %}

The easiest way is to fix the book itself when it's possible and if it makes sense. If this is a one time occurence or you have control on the book you may want to check if you can edit it and fix what's wrong. If it's an epub for example there are some tools that can help you automatically fix common mistake.

If you can't just fix a book and need to add support for it through the reader you have mainly two situation where you can act which will heavily depend on what you need to fix.

### Streamer

If you use a streamer (which you probably do) you can fix the book on a deeper level, for example you can fix wrong file extensions, encoding types or even alter the content of the files themselves. Whether you are in a service worker, a nodejs backend or else you usually have a way to manipulate the book completely before serving it to the engine. When possible you should favor this approach over engine fix since it reduce the performance strain on the client side.

**There is one small downside to this approach,** the code is streamer (or language) specific and you need to develop it for every different streamers you may have. It's okay for your own personal project but this is the reason why we are fixing as much as we can on the engine side instead of the streamer for the library. This way you have very few fix to develop if you need to make your own streamer.

An example of fix performed by our javascript streamer is to replace css vendor attributes so they are compatible with every browsers. This is an impossible fix on the engine side because the browser does not interpret invalid css attribute. There are no way for us to manipulate the sylesheets once we are on the browser. Altering the content of fetched resources could be possible on the browser manipulating the iframe assets but the performance and complexity cost is not worth it.

#### [streamer](../learn/streamer/ "mention")

If you need to add a fix and are using our javascript streamer you should visit the [hooks.md](../learn/streamer/hooks.md "mention") section.

### Engine

If your fix cannot be done on the streamer or just feels easier to implement on the browser side you can try to add it to the the engine itself. Check the [Broken link](/broken/pages/IrTFnltAQvvGcLFpORsg "mention") and [enhancers.md](../learn/enhancers.md "mention")sections to see which method fits the most your situation. We have a lot of enhancers that adds various fixes internally so don't hesitate to take a look at the source code to get some examples.

## My book does not resize with my screen

By default the reader is static and does not resize itself. To prevent this you can:

* Set the setting `layoutAutoResize` when creating the reader instance
* Resize the reader yourself by using `layout()`

## I have a vertical reading book but the first page is using slide turn

Vertical writing books does not support slide turn animation yet however we cannot prevent sliding until we detect the book being vertical. Some vertical books does not indicate whether they are vertical or not in the first cover page nor in the manifest. To prevent this problem you can:

* set `pageTurnAnimation` to something else yourself
* **Tell the engine about the book nature on the Manifest**. This is the correct expected way as the engine will be able to enable/disable features based on the book type automatically.
* set `numberOfAdjacentSpineItemToPreLoad` to a higher value than `0` so we get a change to detect the orientation with the next loaded pages
