---
title: "Bookmarks"
description: "How to add bookmarks to a prose reader: build each one on the annotation model, and decide in your app what exactly a bookmark is."
---

Bookmarks are a derived of annotations, usually without a text selection, highlights or note. The implementation of what exactly is a bookmark is left at the discretion of the developer but at its core, it can be built upon annotations. To mark the bookmarked pages, read the annotations of each page from the annotations enhancer's [`annotationsByItemPage$`](/enhancers/annotations#finding-the-annotations-of-a-page), and keep those your app counts as bookmarks. Visit the [Annotations](/learn/annotations) section to learn more.
