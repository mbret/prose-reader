---
title: "Narration enhancer"
description: "Read a book aloud with @prose-reader/enhancer-narration: one player, with play, pause and the unit being heard, for every source that can narrate a book."
sidebar:
  label: "Narration"
---

This enhancer reads a book aloud. It is one player for everything that can narrate a book: a voice that speaks the text, the recorded narration an EPUB ships, or a source of your own. The enhancer decides what is heard and when. A **source** gives it the pieces of the book it can make heard, and their sound.

## Getting Started

```bash
npm install @prose-reader/enhancer-narration @prose-reader/core rxjs
```

Both are peer dependencies: the enhancer runs against the reader your app
creates, so it shares that reader's copies rather than bringing its own. It
needs the `@prose-reader/core` it was released with, or a later one of the same
major. Its `rxjs` range is `^7.5.5`, the same as core's.

Connect the enhancer to your reader, with the sources it may use:

```typescript
import { createReader } from "@prose-reader/core"
import { narrationEnhancer } from "@prose-reader/enhancer-narration"

const createAppReader = narrationEnhancer(createReader)

const reader = createAppReader({
  manifest,
  narration: {
    sources: [mySource],
  },
})

reader.narration.play()
```

`sources` is required, and its order is a priority. For each spine item, the narration comes from the first source that has something for it.

## How It Works

The narration goes through the book one spine item at a time. A source cuts a spine item into **units**. A unit is a piece of the book that the source can make heard, such as a sentence, and it has a cfi.

1. `play()` starts with the first spine item that is visible.
2. The enhancer asks its sources, in order, what they can narrate of that spine item.
3. The first source that has units plays them, and reports each unit when it is heard. The unit that is heard is the **active unit**.
4. When the last unit was heard, the narration continues with the next spine item. A spine item that no source has units for is skipped.
5. After the last spine item, the narration returns to `idle`.

A command replaces what the previous one started. A source that answers after a `pause()` or a `stop()` changes nothing.

## API

The API is under the `narration` namespace. The package exports its types.

Code that receives a reader can check for `__PROSE_READER_ENHANCER_NARRATION`
to know whether it was created with this enhancer.

### `.play()`

Starts the narration, or resumes it from the active unit. It does nothing while the narration is `playing` or `loading`.

```typescript
reader.narration.play()
```

### `.pause()`

Stops the sound and keeps the place of the narration. `play()` resumes from the active unit, from its start.

```typescript
reader.narration.pause()
```

### `.stop()`

Stops the sound and forgets the place of the narration. The next `play()` starts with the first visible spine item again.

```typescript
reader.narration.stop()
```

### `.state` / `.state$` { #state-.stateusd }

The state of the narration, read synchronously or as an RxJS observable.

```typescript
type NarrationState = {
  hasError: boolean
} & (
  | { status: "idle"; activeUnit: undefined }
  | { status: "loading" | "paused"; activeUnit: NarrationActiveUnit | undefined }
  | { status: "playing"; activeUnit: NarrationActiveUnit }
)

type NarrationActiveUnit = {
  cfi: string
  spineItemIndex: number
  indexInSpineItem: number
}
```

| Status | Meaning |
| --- | --- |
| `idle` | Nothing is narrated |
| `loading` | Playback is asked, and no unit is heard yet: a source prepares the spine item, or its sound |
| `playing` | The active unit is heard |
| `paused` | The sound is stopped, and `play()` resumes from the active unit |

* **`activeUnit`**: the unit the narration is on. `cfi` is where it is in the book, `spineItemIndex` the spine item it belongs to, and `indexInSpineItem` its index in the units of that spine item. While `loading` or `paused` it is `undefined` when the narration is at a spine item whose units are not known yet: at a first start, and between two spine items.
* **`hasError`**: whether the last playback stopped on an error of its source. The narration is then `paused` on the last unit that was heard, and `play()` tries that unit again. It stays `true` until the next `play()`.

```typescript
reader.narration.state$.subscribe(({ status, activeUnit }) => {
  console.log(status, activeUnit?.cfi)
})
```

## Writing a source

A source is an object with one method. The enhancer calls it each time the narration reaches a spine item.

```typescript
type NarrationSource = {
  getNarrationOfSpineItem: (params: {
    reader: Reader
    spineItem: SpineItem
  }) => Observable<SpineItemNarration | undefined>
}

type SpineItemNarration = {
  units: readonly NarrationUnit[]
  play: (params: { startUnitIndex: number }) => Observable<NarrationProgress>
}

type NarrationUnit = {
  cfi: string
}

type NarrationProgress = {
  unitIndex: number
}
```

* **`getNarrationOfSpineItem()`** emits once. `undefined`, or a narration with no unit, means that the source has nothing for the spine item: the enhancer asks the next source.
* **`units`** are the units of the spine item, in reading order.
* **`play()`** makes the units heard in order, from the one at `startUnitIndex` to the last one.
  * It emits the index of a unit when that unit starts to be **heard**, not when its sound is requested or fetched. The active unit follows what it emits.
  * It completes once the last unit was heard.
  * Unsubscribing stops the sound. The enhancer unsubscribes on `pause()`, on `stop()`, and when the reader is destroyed.

A source that plays one audio clip for each unit:

```typescript
import type { NarrationSource } from "@prose-reader/enhancer-narration"
import { concatMap, from, map, Observable, of } from "rxjs"

const playClip = (url: string) =>
  new Observable<void>((subscriber) => {
    const audio = new Audio(url)

    audio.onplaying = () => subscriber.next()
    audio.onended = () => subscriber.complete()
    audio.onerror = () => subscriber.error(audio.error)
    audio.play().catch((error) => subscriber.error(error))

    return () => audio.pause()
  })

const clipsSource: NarrationSource = {
  getNarrationOfSpineItem: ({ spineItem }) => {
    // The clips your app has for this spine item, each with the cfi it reads.
    const clips = getClipsOfSpineItem(spineItem.item.id)

    return of({
      units: clips.map(({ cfi }) => ({ cfi })),
      play: ({ startUnitIndex }) =>
        from(clips.slice(startUnitIndex)).pipe(
          concatMap((clip, index) =>
            playClip(clip.url).pipe(
              map(() => ({ unitIndex: startUnitIndex + index })),
            ),
          ),
        ),
    })
  },
}
```

### Errors

* An error of `getNarrationOfSpineItem()` means that the source has nothing for the spine item. The enhancer asks the next source.
* An error of `play()` pauses the narration on the last unit that was heard, with `hasError` set.

Both errors are reported the way rxjs reports an error that no subscriber handles: `config.onUnhandledError` receives them.
