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
  }
  koreader: {
    /**
     * The xpointer of a cfi, such as the reading position's, for a KOReader
     * sync client to push. A cfi naming a spine item converts at once; one
     * naming a place in its text needs the item's document loaded, and is
     * `undefined` otherwise, as for a cfi that names nothing in the book.
     */
    cfiToXPointer: (cfi: string) => string | undefined
  }
}

const isXPointerTarget = (target: {
  type: string
}): target is XPointerNavigationTarget => target.type === "xpointer"

/**
 * Lets a reader navigate to KOReader xpointers, and convert a cfi, such as its
 * reading position, to one.
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

      reader.navigation.navigate({ ...to, target: selector })
    }

    const getLoadedSpineItemDocument = (spineItemIndex: number) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const document =
        spineItem?.value.loadStatus === "loaded"
          ? spineItem.renderer.getDocumentFrame()?.contentDocument
          : undefined

      return spineItem && document
        ? { document, id: spineItem.item.id }
        : undefined
    }

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
      },
      koreader: {
        cfiToXPointer: (cfi) => cfiToXPointer(cfi, getLoadedSpineItemDocument),
      },
    }
  }
