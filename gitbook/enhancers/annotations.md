# Annotations

## Blank pages and annotations

Sometimes you may end up with blank pages. Some of the scenarios that lead to a blank page are:

* Document configured to show a blank page before or after a specific page (by design)
* Document spreading on more than one page but the DOM does not cover all pages

This situation is unfortunate but sometimes by design as well. Trying to annotate a page on which it's impossible to create a CFI from (other than a root CFI) will make it impossible to derive the correct page for it later.

We provide a `.candidates$` observable which you can observe to know which page is a good candidate for annotation or not. A good candidate is defined as such:

* Page from a pre-paginated document (there can be only one page anyway)
* Page with a visible DOM node (meaning you can target it with a CFI)

pre-paginated documents are by design always on one page so we don't check whether they have a visible node.

## Troubleshoots

### Annotation CFI is empty (root CFI)

If you get a root CFI when trying to annotate a page, it is likely because we were unable to find a node to create a CFI from. This can happen when trying to annotate a blank page. Try to filter out such pages.
