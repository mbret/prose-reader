# Introduction

Integrating prose and React Native is fairly straightforward but there are important concepts to review:

## Is it okay to do that?

It's fair to wonder if doing so makes sense. After all, there are already some native epub libraries existing that may be more convenient to use. On a technical perspective, this is a totally viable solution. The major downside is the requirement of a webview and to have separate web assets to run prose. There really is no way around it but it works well and performs without noticeable performance issues.&#x20;

The question is more whether you want to use prose or not and you are welcome to explore the entire documentation to see what it is capable of.

An added benefit is the consolidated API if you decide to have a web reader that uses prose as well. Your content will be displayed the same on both platforms with the same level of features. You will also be able to share many of your custom business logic related to the readers.

## WebView

We don't provide a native plugin directly so you will need to run prose on the web. The simplest way is to use [https://docs.expo.dev/versions/latest/sdk/webview/](https://docs.expo.dev/versions/latest/sdk/webview/).

### Web assets

You will need some minimal web assets (html, js) to serve to the webview. At the very least they will have a simple document on which the prose engine can start rendering. The process of developing, building and serving the assets on the native side is straightforward and can be done in several ways. This is even possible to have hot reloading on React Native side when you change your web assets.

### Bridge web :left\_right\_arrow: native

Having prose in a webview does not mean you have to design your reader inside that webview. In fact we recommend having the engine only and make your UX on the native side. To help bridging prose API with your native side you can use [prose-reader-react-native.md](prose-reader-react-native.md "mention"). This will create an API wrapper between the react native and prose inside the webview.

### Reader UX

This would be possible to design your Reader entirely on the webview but we discourage this path for several reasons:

* React Native might be faster than the webview, especially for gestures, interactions
* You likely already have a UX library on your native side
* Developing and maintaining the web assets are a separate process which adds complexity
* If you have a RN app, there is surely a reason for it, otherwise you would have gone with a PWA right?

Not everything is possible to do from the native side and you are obviously encouraged to fiddle with your web assets when needed.

## Streaming

The same way as it works on the web, there are several ways you can stream contents.

### HTTP server

If you have a typical streaming server you can access it directly from within the webview which makes the process easy. Just provide the urls in the manifest and prose will fetch the document itself. You don't even need CORS enabled to work (assuming you configure the webview to do so).

### Directly from native side

If your content is not accessible through a server, for example if you download the books on the device or generate documents locally you can provide the documents directly to prose when it asks for them. This is what the [https://github.com/mbret/prose-reader/tree/master/prose-react-native-demo](https://github.com/mbret/prose-reader/tree/master/prose-react-native-demo) demo showcase does. Our package helps you deal with this scenario with ease.

### Local HTTP server

If you need to stream your content locally but cannot pass it directly to the webview for various reasons, you can run an HTTP server directly into your react native application and let prose listen to it. Packages such as [https://github.com/simonsturge/expo-http-server](https://github.com/simonsturge/expo-http-server) can solve this use case.

## Limitations / Considerations

### Native streaming with large content

If you stream your content from the native side to the webview, you have to send it as string. I am not aware of the maximum size of the data that can be passed down a webview but there is potentially a limit. This should not be an issue with regular epub files but a comics with images that are dozen or hundreds of MB might be an issue.

### Prose bridge API

You cannot use prose API directly from the native side for obvious reasons and that's why [prose-reader-react-native.md](prose-reader-react-native.md "mention") exists. The API cannot be identical since the platforms are different and you cannot use directly methods that would take a web only object so the bridge will never be a 1:1 mapping. This also needs to be manually maintained which can result in methods or state missing. If that is the case, please raise an issue and we will work on it.
