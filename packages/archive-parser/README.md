# @oboku/archive-metadata

This package purpose is to help with two things:

- Make common archive configuration files typed and easy to read (typescript + JSON like object)
- Help resolve different archive configuration into a common interpretation

Additionally it offers a fast and platform agnostic parser (web, node). This is an opinionated decision. The library used @xmldom/xmldom is fast and small.

This package is not trying to become a standard, it is mostly used internally to help translate and normalize different book providers (or even different version).

Essentially, instead of implementing your own parser for "foo.xml" and trying to understand what is what, we offer a common parsing and resolution.

Example of products that may take advantage of this package:
- App that lets user manipulate book archives
- Reading app
- App that handle book metadata

## ComicInfo.xml

We are following https://anansi-project.github.io/ 

## Epub 

Spec for 3.3 is available at https://www.w3.org/TR/epub-33/