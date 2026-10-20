---
title: "Handling links"
description: "What happens when the user clicks a link in a book: links to the book itself navigate on their own, and you handle external or email links with reader.links$."
sidebar:
  label: "Links"
---

Anchor elements events are prevented by default. This is to avoid unintentional navigation or effects within the document frame.

Links that target a navigable element or item within the book will be navigated automatically upon clicking but you are left in charge for any other types (external website, email, etc).

You can intercept any links event if needed. See [links$](/core-api/reader/linksusd)
