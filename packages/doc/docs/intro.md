---
sidebar_position: 1
---

# Introduction

oboku-reader is a web reader that can be used to display and read digital books. You can use it to read all sort of media content such as `.epub`, `.cbz`, `.zip`, `.txt`, etc. The reader is agnostic to the content by design so it can theoretically read any format you have.

It is also fully compatible with native app. You can use the library inside any website or any android, ios, mobile app and more. See the integration section to have more information.


## How does it works?

![image](https://user-images.githubusercontent.com/1911240/121635379-1aad5c80-cac1-11eb-9ceb-ea39b1adb281.png)

The project is composed of two main parts, the **reader** and the **streamer**. The reader lets you display and read books, the streamer provide the content to the reader itself.

### reader
The engine that renders the book on your web page. It consume a [manifest](https://github.com/mbret/oboku-reader/blob/master/packages/reader/src/types/Manifest.ts) which represent an electronic publication structure (reading direction, list of items, their path in the book, etc). By default the reader will use the URL provided for each item to fetch and display each page, which brings us to the streamer.

### streamer
The streamer role is to serve the various resources asked by the reader. There are no plug-&-play steamer provided in this repository as it can be different for everyone, based on their requirements. Maybe you want to serve your content from a server with nodejs, maybe you want to do it in a service worker or web worker, etc.

Instead the streamer package is a set of utility functions (sdk) that you can use to create your own streamer instance. It offers you convenient method to do things such as
- generate manifest from `.epub`, `.txt`, `.cbz`, etc
- convert raw text, img, etc into a valid `.xhtml` resource that can be consumed by the reader

Building your own streamer is not complicated and you can check the `web-reader` package to see how to do it with service worker.

The streamer is not mandatory, all the reader needs is a manifest and a way to retrieve the resources. By default it will use the URL from each item and try to fetch it (hence streaming). However it is possible to override this behavior and use a custom callback function to return the data the way you want. The idea of using a streamer is to provide a better separation of concern, a better way to cache and process resources off thread.

As you can see all you need to do is to serve something that the reader understand. It is in theory possible to convert any media type into something that can be digested by the reader. In the end it all comes down to text, images, etc.
