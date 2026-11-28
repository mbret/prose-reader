import type { Reader, SpineItem } from "@prose-reader/core"
import type { Observable } from "rxjs"

/**
 * A piece of a book that a source can make heard: a sentence that a voice
 * speaks, or a text element with its recorded audio clip.
 */
export type NarrationUnit = {
  /** Where the unit is in the book. */
  cfi: string
}

/** What a source reports while it plays the units of a spine item. */
export type NarrationProgress = {
  /** The index, in the units of the spine item, of the unit that is heard. */
  unitIndex: number
}

/** What a source can narrate of one spine item. */
export type SpineItemNarration = {
  /** The units of the spine item, in reading order. */
  units: readonly NarrationUnit[]
  /**
   * Makes the units heard in order, from the one at `startUnitIndex` to the
   * last one.
   *
   * It emits each time a unit starts to be heard, not when its sound is
   * requested or fetched, and completes once the last unit was heard.
   * Unsubscribing stops the sound.
   */
  play: (params: { startUnitIndex: number }) => Observable<NarrationProgress>
}

/**
 * Where units and their sound come from: a voice that speaks the text of the
 * book, the audio the book ships, or anything an app writes.
 */
export type NarrationSource = {
  /**
   * What the source can narrate of a spine item. It is asked each time the
   * narration reaches the spine item.
   *
   * It emits once: `undefined`, or no unit, when the source has nothing for
   * the spine item. The enhancer then asks the next source.
   */
  getNarrationOfSpineItem: (params: {
    reader: Reader
    spineItem: SpineItem
  }) => Observable<SpineItemNarration | undefined>
}

/** The unit the narration is on. */
export type NarrationActiveUnit = {
  /** Where the unit is in the book. */
  cfi: string
  /** The index in the spine of the item the unit belongs to. */
  spineItemIndex: number
  /** The index of the unit in the units of that spine item, from `0`. */
  indexInSpineItem: number
}

export type NarrationState = {
  /**
   * Whether the last playback stopped on an error of its source. It stays
   * until the next `play()`.
   */
  hasError: boolean
} & (
  | {
      /** Nothing is narrated, and nothing is highlighted. */
      status: "idle"
      activeUnit: undefined
    }
  | {
      /**
       * - `loading`: playback is asked, and no unit is heard yet. The source
       *   prepares the spine item, or its sound.
       * - `paused`: `play()` resumes from the active unit, from its start.
       *
       * `activeUnit` is `undefined` when the narration is at a spine item
       * whose units are not known yet: at its first start, and between two
       * spine items.
       */
      status: "loading" | "paused"
      activeUnit: NarrationActiveUnit | undefined
    }
  | {
      /** The active unit is heard. */
      status: "playing"
      activeUnit: NarrationActiveUnit
    }
)

export type NarrationEnhancerOptions = {
  narration: {
    /**
     * The sources of the reader, by priority. For each spine item, the
     * narration comes from the first source that has units for it.
     */
    sources: readonly NarrationSource[]
  }
}

export type NarrationEnhancerAPI = {
  readonly __PROSE_READER_ENHANCER_NARRATION: boolean
  narration: {
    state$: Observable<NarrationState>
    readonly state: NarrationState
    /**
     * Starts the narration, or resumes it from the active unit. It does
     * nothing while the narration is `playing` or `loading`.
     *
     * A first start begins with the first spine item that is visible. From
     * there the narration goes through the book, one spine item after the
     * other, and returns to `idle` after the last one.
     */
    play: () => void
    /**
     * Stops the sound and keeps the place of the narration: `play()` resumes
     * from the active unit, from its start. It does nothing while `idle`.
     */
    pause: () => void
    /**
     * Stops the sound and forgets the place of the narration. The next
     * `play()` is a first start.
     */
    stop: () => void
  }
}
