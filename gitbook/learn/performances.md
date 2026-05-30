# Performances

A reading system can be heavy both in term of its internal code but also the content itself. Prose is written completely with rxjs, although it significantly helps for development and reliability it adds a certain overhead. In the majority of situation, you should have no performance issues but here are some considerations important to know for good performances.

## Book rendering

### `<iframe>`

Not much to do about it but each spine item of a book is rendered within an iframe. Although browser improved significantly, this still adds some overhead when you have a lot of iframe. Using iframe is very important in order to sandbox and keep the book original publisher design.&#x20;

### Media

Beware that some books may have media of crazy size. There are some comics out there that are close to 1GB in size. Keep in mind that by default the media will be displayed as is in your browser. This is directly translated into RAM usage. Most of the time it will be fine but if you have the possibility to process the media before serving them it can be a good strategy. This can be done easily on React Native or when streaming from a server.

## Number of pages loaded

The number of pages loaded in parallel increase the overhead drastically. This is because each new spine item has:

* An iframe attached
* A layout cycle every-time
* Assets loaded into memories
* Is taken into account in all other calculations (navigation, pagination, etc)

Prose is already heavily optimized to lazy load, wait for idle and other technics to keep the overhead as linear as possible but there is a limit to what can be done.

Try to keep the number of pages loaded simultaneously reasonable. Ideally you can apply some strategies depending of the book. Here are some examples:

* If you know the book is a big comic pre-paginated (only lot of unique media page): You can safely load only a few before and after page at the same time. This will not impact the reading experience too much.
* If you know your book is novel (reflowable, mostly text, light book): You can safely load more or even the entire book. This will make the pagination more stable from the start and increase the reading experience while not impacting performances too much.

Note that if you can afford to do so, you can always load the entire book at first but then only load a few before and after. Prose will keep the previous pagination in mind, even if the items are unloaded. This can make the pagination stable from the start while keeping the performances in check. This will however demands a few ms or seconds at the start depending of the book.
