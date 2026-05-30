# Contract

For a reading system to work correctly with its content, a contract must be set and followed strictly. This is to ensure everyone with the same content will access the information correctly the same way. The rules listed below applies to prose but more generally to all reading systems.

If you plan on developing your own enhancer, please follow these rules strictly.

## Cheatsheets <a href="#cheatsheets_index_title" id="cheatsheets_index_title"></a>

* Whatever you do, should not change the behavior of **CFI**s
* User expect to see its book as the **publisher** intended

## Publisher is the highest priority

Always respect the publisher intent. Do not try to overwrite publisher style, or structure. If you want to provide additional settings, do so as toggle-able from the user.

Many books are unfortunately broken from the publisher and therefore should be fixed. Sometimes the fix needs to be opinionated as well but generally we should respect the intent as closely as possible.

Let's take a few example:

### Adding a "download" button next to all `<tables>`

Let's say you want the user to be able to download as an excel spreadsheet all tables in the book. You can do it by injecting a \<button> element inside the content but if you do so make sure that the button is never selectable and does not break the flow of the book.

## No altering of the publisher content

XML content from the publisher should not altered. If you need to inject content, try to do so outside of the natural flow (document) of the content. At the very least try to work with absolute positioning and move your content on header or footer of the page. For example highlights can be done as superposition outside of the iframe or inside but with an absolute positioning.

Usually, anything you inject in a document should not:

* Be possible to be referenced in a CFI
* Break or alter the book reading flow
* Change what an accessible reader speech would say
