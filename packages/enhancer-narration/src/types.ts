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

/**
 * What a source can narrate of one spine item.
 *
 * The enhancer keeps it while the narration is on the spine item: it calls
 * `play()` again to resume after a pause, and after `play()` failed.
 */
export type SpineItemNarration = {
  /** The units of the spine item, in reading order. */
  units: readonly NarrationUnit[]
  /**
   * Makes the units heard in order, from the one at `startUnitIndex` to the
   * last one.
   *
   * It emits each time a unit starts to be heard, not when its sound is
   * requested or fetched, and completes once the last unit was heard. A
   * report for a unit that `units` does not have is ignored. Unsubscribing
   * stops the sound.
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
   *
   * When it fails, the narration pauses at the spine item, and the next
   * `play()` asks the sources again. The spine item is not given to the next
   * source: the one that failed may be the one that narrates it.
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
  unitIndex: number
}

export type NarrationState =
  | {
      /** Nothing is narrated. */
      status: "idle"
      activeUnit: undefined
    }
  | {
      /**
       * Playback is asked, and no unit is heard yet: a source prepares the
       * spine item, or the sound of the active unit.
       */
      status: "loading"
      /**
       * The unit that is about to be heard. `undefined` while the units of
       * the spine item are not known: at a first start, and between two
       * spine items.
       */
      activeUnit: NarrationActiveUnit | undefined
    }
  | {
      /** The active unit is heard. */
      status: "playing"
      activeUnit: NarrationActiveUnit
    }
  | {
      /** The sound is stopped, and `play()` resumes from the active unit. */
      status: "paused"
      /**
       * The unit the narration was on. `undefined` when it was at a spine
       * item whose units were not known yet: `play()` resumes with that
       * spine item.
       */
      activeUnit: NarrationActiveUnit | undefined
      /**
       * Whether a source paused the narration by failing: to play, or to
       * say what it narrates of the spine item. `play()` tries again.
       */
      hasError: boolean
    }

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
     * A first start begins with the first unit that starts on the first
     * visible page. From there the narration goes through the book, one
     * spine item after the other, and returns to `idle` after the last one.
     */
    play: () => void
    /**
     * Plays from the unit that holds the cfi, whatever the narration was
     * doing: "read aloud from here". Between two units, it is the one
     * before, and before the first unit of its spine item, the first.
     *
     * It does nothing for a cfi that names no spine item of the book.
     */
    playFromCfi: (cfi: string) => void
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
