# Pagination

Epubs files are more or less a group of HTML documents (chapters). These documents depending on the size of your reading device will spread across several pages. Pagination is the act of splitting into pages such documents so that it renders accordingly to your device and settings.

Mobile platforms have different challenges and possibilities so the following section will be focused on web based reading systems

There are two principal way of paginating documents:

* Digest the document and cut its content into separate HTML structure (fragments). Each page being its own HTML element (or iframe). You can see an example at [https://www.colibrio.com/](https://www.colibrio.com/)
* Display the document in one unique HTML structure and style it to spread like pages.

The major advantage of using the fragmented approach is to have more flexibility on rendering and style. Things like page flipping or turning animation often seen on mobile readers are very easy to implement.

On the other hand the benefits of one unique document is to show the document as intended by its publisher and follow its standard structure (important for CFI).

## Prose

We decided to go with the second approach because it help us stay to our core values:

* Follow epub standards (rendering, CFI, ...)
* Adhere to publisher intents
* Read all type of contents
* Developers accessibility
