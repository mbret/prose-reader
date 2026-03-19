# Repository structure

This repository is a mono-repository and is using lerna. Take it into consideration when you want to check typescript, build or run tests for examples.

# Performances

This library needs to be very careful with everything that impact performances (eg: reflow, heavy dom computation). Whenever possible we should use
asynchronous lookup and mechanisms that defer, batch or are fast enough to not impact user experience while reading books.

An example of common issue is `getBoundingClientRect`. Getting elements position is a common use case across prose-reader. Ideally it should always
be in a very controlled way and with better performance alternative when possible (eg: `IntersectionObserver`)

# Epub SPECS

This library is built to support entirely and strictly the epub3 specs. You can access it at https://www.w3.org/TR/epub-33/. The spec and rules should always be enforced

# Non EPUB contents

We also support books that are not epubs (eg: comics, text, pdf). At some point the generated manifest and our handling of them should be consolidated and works the same as an epub. Translation and conversion are to be expected first.

# Layout and in-between stable states

Actions such as navigation can happens anytime (eg: user tap the screen) and in some case may happens during layout or other internal state change happening. This is expected and prose should be resilient to it. The entire internal process is asynchronous on purpose but some actions are synchronous. Make sure to always consider race or stale or invalid in between state conditions.