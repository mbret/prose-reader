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

1. `play()` starts on the first visible page, with the unit that the page starts in.
2. The enhancer asks its sources, in order, what they can narrate of the spine item of that page.
3. The first source that has units plays them, and reports each unit when it is heard. The unit the narration is on is the **active unit**.
4. When that source has played its last unit, the narration continues with the next spine item. A spine item that no source has units for is skipped.
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

A first start begins at the start of the first visible page, as `playFromCfi()` does for a cfi:

* It begins with the unit that the page starts in. That unit can start on the page before: the narration leaves out no text of the page.
* When the page starts after the last unit of its spine item, the narration begins with the next spine item.
* While the reader moves or lays out, the pagination still names the page shown before. A first start waits for the pagination to settle, with the narration `loading`, and begins on the page the reader lands on.

### `.playFromCfi()`

Plays from a cfi, whatever the narration was doing. Use it to read aloud from a selection, or from a place the user points at.

```typescript
reader.narration.playFromCfi(cfi)
```

* The narration begins with the unit the cfi is in. A cfi between two units begins with the next unit.
* A cfi after the last unit of its spine item begins with the next spine item.
* The cfi can be a range: its start counts. The cfi of a unit plays that unit.
* A cfi that the reader finds no spine item for does nothing.

### `.pause()`

Stops the sound and keeps the place of the narration. `play()` resumes from the active unit, from its start.

```typescript
reader.narration.pause()
```

### `.stop()`

Stops the sound and forgets the place of the narration. The next `play()` is a first start again.

```typescript
reader.narration.stop()
```

### `.state` / `.state$`

The state of the narration, read synchronously or as an RxJS observable.

```typescript
type NarrationState =
  | { status: "idle"; activeUnit: undefined }
  | { status: "loading"; activeUnit: NarrationActiveUnit | undefined }
  | { status: "playing"; activeUnit: NarrationActiveUnit }
  | {
      status: "paused"
      activeUnit: NarrationActiveUnit | undefined
      hasError: boolean
    }

type NarrationActiveUnit = {
  cfi: string
  spineItemIndex: number
  unitIndex: number
}
```

| Status | Meaning |
| --- | --- |
| `idle` | Nothing is narrated |
| `loading` | Playback is asked, and no unit is heard yet: a source prepares the spine item, or the sound of the active unit |
| `playing` | The active unit is heard |
| `paused` | The sound is stopped, and `play()` resumes from the active unit |

* **`activeUnit`**: the unit the narration is on. `cfi` is where it is in the book, `spineItemIndex` the spine item it belongs to, and `unitIndex` its index in the units of that spine item.
  * While `loading`, it is the unit that is about to be heard.
  * While `loading` or `paused`, it is `undefined` when the narration is at a place whose units are not known yet: at a first start, and between two spine items. `play()` then resumes with that place.
* **`hasError`**: only a `paused` state has it. It tells whether a source paused the narration by failing, see [Errors](#errors). `play()` tries again, and `stop()` forgets the error with the place of the narration.

A subscriber can send a command while it receives a state. The command applies at once, and the state it leads to is delivered after the current one, so every subscriber receives the states in the same order. Until then `reader.narration.state` is the state being delivered.

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
* **`units`** are the units of the spine item, in reading order, which is the order of their cfis. The enhancer finds the unit at a place of the book by where each unit starts and ends.
  * `cfi` is a cfi of the book, as `reader.cfi` makes them: `reader.cfi.generateCfiFromRange(range, spineItem.item)` gives the cfi of a unit from the DOM range of its text.
  * Give a range, from the start of the unit to its end. A cfi that is not a range is a unit with no length: the narration starts with it only for a place at it or before it.
  * `cfi` can be a getter that works the cfi out when it is read. The enhancer reads the cfi of the units it needs, not of all of them: a spine item can have tens of thousands of units.
* The enhancer keeps the narration of a spine item while it is on that spine item. It calls `play()` again to resume after a pause, and for a `playFromCfi()` in that spine item.
* **`play()`** makes the units heard in order, from the one at `startUnitIndex` to the last one.
  * It emits the index of a unit when that unit starts to be **heard**, not when its sound is requested or fetched. The active unit follows what it emits. An index that `units` does not have is ignored.
  * It completes once the last unit was heard. The narration then continues with the next spine item.
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

A source that fails pauses the narration, with `hasError` set. `play()` tries again.

* **An error of `getNarrationOfSpineItem()`**: the narration pauses at that spine item. The enhancer does not ask the next source, and does not skip the spine item: the source that failed may be the one that narrates it. The next `play()` asks the sources again, from the first one.
* **An error of `play()`**: the narration pauses on the active unit. That is the last unit that was heard, or the unit that was about to be heard when none was. The next `play()` calls `play()` of the same narration, from that unit.
* **A unit whose cfi cannot be read**: the narration pauses at the spine item when it looks for the unit to start with. That is at a first start, and at a `playFromCfi()`.

A source that throws while its sound is stopped does not stop the command: the narration pauses, stops or is destroyed all the same.

These errors are reported the way rxjs reports an error that no subscriber handles: `config.onUnhandledError` receives them. [Error handling](/learn/error-handling) says how to send them to an error tracker.
