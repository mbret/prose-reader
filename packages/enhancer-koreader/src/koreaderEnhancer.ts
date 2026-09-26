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
import { type Manifest, Report } from "@prose-reader/shared"
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  filter,
  first,
  map,
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

/** A navigation to an xpointer, and the selector target it goes by. */
type XPointerNavigation = {
  xpointer: string
  target: NavigationTarget<"selector">
}

/**
 * The pointer names its spine item, which is known at once, and a place in its
 * document, found once the document is loaded.
 */
const xpointerToNavigationTarget = (
  xpointer: string,
  manifest: Manifest,
): NavigationTarget<"selector"> | undefined => {
  const parsed = parseXPointer(xpointer)

  if (!parsed || !manifest.spineItems[parsed.spineItemIndex]) return undefined

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

const toXPointerNavigation = (
  xpointer: string,
  manifest: Manifest,
): XPointerNavigation | undefined => {
  const target = xpointerToNavigationTarget(xpointer, manifest)

  if (!target) {
    report.warn(`Ignore navigation to ${xpointer}, not in the book`)

    return undefined
  }

  return { xpointer, target }
}

/**
 * Lets a reader navigate to KOReader xpointers, and open at one, and reports
 * its reading position as one.
 */
export const koreaderEnhancer =
  <
    InheritOptions extends { manifest: Manifest; target?: { type: string } },
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
    options: Omit<InheritOptions, "target"> & {
      target?: InheritOptions["target"] | XPointerNavigationTarget
    },
  ): InheritOutput & KoreaderEnhancerOutput<InheritTarget> => {
    const { target: openingTarget, ...optionsWithoutOpeningTarget } = options
    const isOpeningAtXPointer =
      openingTarget !== undefined && isXPointerTarget(openingTarget)
    const openingXPointerNavigation = isOpeningAtXPointer
      ? toXPointerNavigation(openingTarget.value, options.manifest)
      : undefined
    // Known before the reader opens, so `readingPositionXPointer$` never
    // reports what is shown while the chapter it opens at loads.
    const lastXPointerNavigation = new BehaviorSubject<
      XPointerNavigation | undefined
    >(openingXPointerNavigation)
    const reader = next({
      ...optionsWithoutOpeningTarget,
      target: isOpeningAtXPointer
        ? openingXPointerNavigation?.target
        : openingTarget,
      // Only `target` changed, to one the reader it enhances takes; TS cannot
      // rebuild the generic options from `Omit`.
    } as InheritOptions)

    const navigate = (
      to: UserNavigationEntry<InheritTarget | XPointerNavigationTarget>,
    ) => {
      const { target } = to

      if (!isXPointerTarget(target))
        return reader.navigation.navigate({ ...to, target })

      const xpointerNavigation = toXPointerNavigation(
        target.value,
        options.manifest,
      )

      if (!xpointerNavigation) return

      // Before navigating, so `readingPositionXPointer$` never reports what is
      // shown while its chapter loads.
      lastXPointerNavigation.next(xpointerNavigation)
      reader.navigation.navigate({ ...to, target: xpointerNavigation.target })
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

    /**
     * The xpointer of a cfi. An item start converts at once; a place in the
     * text once its document is loaded, rather than as the item start in the
     * meantime, which would overwrite a better position on a sync server.
     */
    const readingPositionToXPointer = (cfi: string): Observable<string> => {
      if (reader.cfi.isRootCfi(cfi)) {
        const xpointer = cfiToXPointer(cfi, getLoadedSpineItemDocument)

        return xpointer === undefined ? EMPTY : of(xpointer)
      }

      const spineItem = reader.cfi.getSpineItemFromCfi(cfi)

      if (!spineItem) return EMPTY

      return spineItem.watch("isLoaded").pipe(
        filter(Boolean),
        first(),
        map(() => cfiToXPointer(cfi, getLoadedSpineItemDocument)),
        filter((xpointer) => xpointer !== undefined),
      )
    }

    const readingPositionXPointer$ = combineLatest([
      reader.navigation.readingPosition$,
      lastXPointerNavigation,
      // Every navigation, so one away from the xpointer is seen even when the
      // reading position stays the same.
      reader.navigation.navigation$,
    ]).pipe(
      switchMap(([{ cfi }, xpointerNavigation]) => {
        /**
         * On its way to an xpointer whose chapter is loading, the reading
         * position is the chapter start. The xpointer itself is the better
         * answer until the chapter gives the real one.
         */
        const isNavigatingToXPointer =
          xpointerNavigation !== undefined &&
          reader.navigation.getNavigation().target ===
            xpointerNavigation.target &&
          reader.cfi.isRootCfi(cfi)

        return isNavigatingToXPointer
          ? of(xpointerNavigation.xpointer)
          : readingPositionToXPointer(cfi)
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
