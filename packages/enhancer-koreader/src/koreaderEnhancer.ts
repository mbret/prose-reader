import type {
  EnhancerOutput,
  NavigationTarget,
  RootEnhancer,
  UserNavigationEntry,
} from "@prose-reader/core"
import {
  cfiToXPointer,
  parseXPointer,
  resolveXPointer,
  toCfiPosition,
} from "@prose-reader/koreader"
import { Report } from "@prose-reader/shared"
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  type Observable,
  of,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs"

const report = Report.namespace(`@prose-reader/enhancer-koreader`)

/** A KOReader (crengine) xpointer, such as `/body/DocFragment[14]/body/div/p[3]/text().42`. */
export type XPointerNavigationTarget = { type: "xpointer"; value: string }

export type KoreaderEnhancerOutput<InheritTarget> = {
  navigation: {
    navigate: (
      to: UserNavigationEntry<InheritTarget | XPointerNavigationTarget>,
    ) => void
    /** Goes to the place an xpointer names. Never animates. */
    goToXPointer: (xpointer: string) => void
    /**
     * The reading position as an xpointer, the value a KOReader sync client
     * pushes. It only emits pointers as exact as the reading position.
     */
    readingPositionXPointer$: Observable<string>
  }
}

const isXPointerTarget = (target: {
  type: string
}): target is XPointerNavigationTarget => target.type === "xpointer"

type XPointerNavigation = {
  xpointer: string
  target: NavigationTarget<"selector">
}

/**
 * Lets a reader navigate to KOReader xpointers, and reports its reading
 * position as one.
 */
export const koreaderEnhancer =
  <
    InheritOptions,
    InheritTarget extends { type: string },
    InheritOutput extends EnhancerOutput<RootEnhancer>,
  >(
    next: (options: InheritOptions) => InheritOutput & {
      navigation: {
        navigate: (to: UserNavigationEntry<InheritTarget>) => void
      }
    },
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & KoreaderEnhancerOutput<InheritTarget> => {
    const reader = next(options)
    const lastXPointerNavigation = new BehaviorSubject<
      XPointerNavigation | undefined
    >(undefined)

    /**
     * The pointer names its spine item, which is known at once, and a place
     * in its document, found once the document is loaded.
     */
    const xpointerToNavigationTarget = (
      xpointer: string,
    ): NavigationTarget<"selector"> | undefined => {
      const parsed = parseXPointer(xpointer)

      if (!parsed || !reader.spineItemsManager.get(parsed.spineItemIndex))
        return undefined

      return {
        type: "selector",
        value: {
          spineItem: parsed.spineItemIndex,
          find: (document) => {
            const position = resolveXPointer(parsed, document)

            return position && toCfiPosition(position)
          },
        },
      }
    }

    const navigate = (
      to: UserNavigationEntry<InheritTarget | XPointerNavigationTarget>,
    ) => {
      const { target } = to

      if (!isXPointerTarget(target))
        return reader.navigation.navigate({ ...to, target })

      const selector = xpointerToNavigationTarget(target.value)

      if (!selector) {
        report.warn(`Ignore navigation to ${target.value}, not in the book`)

        return
      }

      // Before navigating, so `readingPositionXPointer$` never reports what is
      // shown while its chapter loads.
      lastXPointerNavigation.next({ xpointer: target.value, target: selector })
      reader.navigation.navigate({ ...to, target: selector })
    }

    const getLoadedSpineItemDocument = (spineItemIndex: number) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const document = spineItem?.value.isLoaded
        ? spineItem.renderer.getDocumentFrame()?.contentDocument
        : undefined

      return spineItem && document
        ? { document, id: spineItem.item.id }
        : undefined
    }

    const readingPositionXPointer$ = combineLatest([
      reader.navigation.readingPosition$,
      lastXPointerNavigation,
      // Every navigation, so one away from the xpointer is seen even when the
      // reading position stays the same.
      reader.navigation.navigation$,
    ]).pipe(
      switchMap(([{ cfi, isFinal }, xpointerNavigation]) => {
        // Found, its item is loaded, and its document converts it.
        if (isFinal) {
          const xpointer = cfiToXPointer(cfi, getLoadedSpineItemDocument)

          return xpointer === undefined ? EMPTY : of(xpointer)
        }

        /**
         * Until the reader has found where a navigation took it, the reading
         * position is a stand-in, such as the chapter start while the chapter
         * loads, which would overwrite a better position on a sync server. On
         * its way to an xpointer, the xpointer is the better answer; otherwise
         * the last one reported stands.
         */
        const isNavigatingToXPointer =
          xpointerNavigation !== undefined &&
          reader.navigation.getNavigation().target === xpointerNavigation.target

        return isNavigatingToXPointer ? of(xpointerNavigation.xpointer) : EMPTY
      }),
      distinctUntilChanged(),
      takeUntil(reader.$.destroy$),
      shareReplay({ bufferSize: 1, refCount: true }),
    )

    return {
      ...reader,
      navigation: {
        ...reader.navigation,
        navigate,
        goToXPointer: (xpointer) =>
          navigate({
            target: { type: "xpointer", value: xpointer },
            animation: false,
          }),
        readingPositionXPointer$,
      },
    }
  }
