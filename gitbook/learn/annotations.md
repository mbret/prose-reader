# Annotations

Annotations are common amongst readers and allow the user to annotate information on a document. There are no standards as to what an annotation is or how it can be implemented but usually it is defined by a location on a book that can have metadata (highlight color, notes, etc).

In prose you can implement annotations with [CFI](https://idpf.org/epub/linking/cfi/) and metadata. They are not part of the core engine since they are highly dependent of your system and your implementation.

We do however provide the enhancer [annotations.md](../enhancers/annotations.md "mention")to help you implement it.

## Bookmark, Notes, Highlights ...

Although they represent different things in term of user experience they can all take their roots from the annotation base interface. That is:

* Location: Typically a CFI which will tells where in a book, what text selection, range, location
* Metadata: Typically highlight color, user note, etc.

We encourage you to use the same base interface when implementing your annotations and only apply specific treatment when it comes to UX. This will make your reader more flexible and easy to maintain.

```typescript
// Example of annotation interface that can cover all use cases
type Annotation {
  cfi: string
  id: string
  meta: {
    isPageBookmark: boolean
    highlightColor: string
    notes: string
  }
}
```

Here is a couple of suggestion as to how mentally define your different components:

### Bookmark

A bookmark can be defined as an annotation which does not have a note nor a range. It is simply a marker on a specific node in a document. Usually you want only one bookmark per page but if you reading system allow user to define more bookmark per page you may want to add more metadata to differentiate what is an entire page bookmark (usually the tap top right action) vs a specific page location bookmark (user wanting to bookmark a specific text).

### Highlight

Defined by an annotation which contains a range (or text selection) and an highlight color.

### Notes

Notes can be defined by a bookmark with a user content, meaning no text selection (or range). This is a good idea to differentiate them from bookmarks since the user could want to have several notes for the same page.

## Avoid user confusion or frustration

Ultimately it can be confusing for the user to have different things that can intertween. What happens when the user bookmark a word, is it an highlight without color ? what if he wanted to later put a color on this word bookmark ? Does it becomes an annotation ?

What we recommend is to reduce confusion and have as few components as possible. This is why the [Broken link](/broken/pages/lmGbhW3cVuUFnhwTDpD6 "mention") make an opinionated decision and only assume two interface:

* Page bookmark: a single unique annotationo pointing to the first node of a page, no notes, no highlight color or anything.
* Annotation: Everything else

## Danger of persisting `weak` references

You might be tempted to persist your annotations to your DB together with the text selection as string, the page number and other runtime information. However as the name suggest, they are runtime information, variables, dynamic and therefore not absolute nor stable.

This is because the same CFI can return different runtime information for a different device with a different screen or reader configuration. If the user open a book on its tablet the pages will be much bigger and therefore your page 12 bookmark may now be on the page 6.

Persisting the text selection is okay since the document should not have its structure altered but page information is usually discouraged.

There is nothing wrong in persisting pagination or runtime information but just remember that they might be different from a session to another. Most of the time, a user will open a same book on a same device but that's an assumption only you can can decide.

## Weak vs Strong references

As discussed above, some references are stronger than other, in other words some things can be more stable than other across devices, resolutions and settings. Here is a couple of examples:

### Strong

* Book structure, such as spine item index, chapter ID etc will never change unless the book itself is altered.
* Book link, ids and other anchors should also not change unless the file itself is altered.
* XML nodes are stable as well as long as the book is not altered. This is useful for text selection for example. This is also assuming the reader is not injecting nodes into the content (which it should not do)
* CFI are obviously stable reference and represent a reference to all of the above.

### Weak

* Pages number, whether it's for chapter or absolute will changes depending of the device, resolution or reading settings.
* Number of pages, same as above.
* Progress percentage, depending on how calculated will vary as well.
