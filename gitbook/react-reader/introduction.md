# Introduction

React Reader is a package that offers a plug\&play reader interface for your React project that works seamlessly with prose. The intent is to have a drop in reader that you can use as is or customize to suit your app need.

You can see it in action in our [demo](https://demo.prose-reader.com/).&#x20;

It us using [https://www.chakra-ui.com/](https://www.chakra-ui.com/) under the hook for its theme to offer good range of customization.

### Some considerations

This package is not vanilla JS and will require a few peer dependencies. As a result it may increase your app size and you may want to check if you are okay with this. Although we try to stay as close to vanilla as possible, the biggest library is [https://www.chakra-ui.com/](https://www.chakra-ui.com/). If you don't use it, don't worry it will be scoped to the reader and will not interfere with your app design.

Customization will be possible to some extends (for example by customizing the same way as you would with the chakra theme) but not all UX elements will necessary match your specific design. This package is not a UX component library but rather a ready to use reader. It's a tradeoff for your team in order to offload the maintenance of the reader.

#### Enhancers peer dependencies

This reader automatically detect enhancers that are used and add support for them. However even if you don't use the enhancers handled by this reader they are still marked as peer and you must install them. This is the only way to not have typescript library compilation error. Only their type is imported internally so nothing is actually built but we need to be able to retrieve them.

