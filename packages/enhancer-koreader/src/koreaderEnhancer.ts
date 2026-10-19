import type {
  EnhancerOutput,
  NavigationTarget,
  RootEnhancer,
  UserNavigationEntry,
} from "@prose-reader/core"
import {
  cfiToXPointer,
  getKoreaderProgressKind,
  parseXPointer,
  resolveXPointer,
  toCfiPosition,
} from "@prose-reader/koreader"
import { type Manifest, Report } from "@prose-reader/shared"
import { getKoreaderPages } from "./koreaderPages"

const report = Report.namespace(`@prose-reader/enhancer-koreader`)

/**
 * A KOReader `progress`, the reading position a KOReader sync server stores:
 * a crengine xpointer for an EPUB, such as
 * `/body/DocFragment[14]/body/div/p[3]/text().42`, a 1-based page number for a
 * PDF or a comic archive, such as `"12"`.
 */
export type KoreaderProgressNavigationTarget = {
  type: "koreaderProgress"
  value: string
}

export type KoreaderEnhancerOutput<InheritTarget> = {
  navigation: {
    navigate: (
      to: UserNavigationEntry<InheritTarget | KoreaderProgressNavigationTarget>,
    ) => void
    /**
     * Goes to the place a KOReader `progress` names: an xpointer for an EPUB,
     * a page number for a PDF or a comic archive. A value of the other form,
     * or one naming nothing in the book, is ignored. Never animates.
     */
    goToKoreaderProgress: (progress: string) => void
  }
  koreader: {
    /**
     * The KOReader `progress` of a cfi, such as the reading position's, for a
     * KOReader sync client to push: an xpointer for an EPUB, a page number
     * for a PDF or a comic archive, the form KOReader's sync plugin pushes for
     * the same file.
     *
     * A page converts at once. An xpointer naming a chapter converts at once;
     * one naming a place in its text needs the chapter's document loaded.
     * `undefined` otherwise, as for a cfi that names nothing in the book, and
     * any cfi of a book prose has no KOReader progress for, such as a text
     * file.
     */
    cfiToProgress: (cfi: string) => string | undefined
  }
}

const isKoreaderProgressTarget = (target: {
  type: string
}): target is KoreaderProgressNavigationTarget =>
  target.type === "koreaderProgress"

/** A page number as KOReader writes one, `"12"`. */
const PAGE_PROGRESS_PATTERN = /^\s*\d+\s*$/

/**
 * Lets a reader navigate to a KOReader `progress`, and convert a cfi, such as
 * its reading position, to one.
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

    const pageProgressToNavigationTarget = (
      manifest: Manifest,
      progress: string,
    ): NavigationTarget<"spineItem"> | undefined => {
      if (!PAGE_PROGRESS_PATTERN.test(progress)) return undefined

      const spineItemIndex = getKoreaderPages(manifest).getSpineItemIndexOfPage(
        Number(progress),
      )

      return spineItemIndex === undefined
        ? undefined
        : { type: "spineItem", value: spineItemIndex }
    }

    const koreaderProgressToNavigationTarget = (progress: string) => {
      const manifest = reader.context.manifest

      if (!manifest) return undefined

      switch (getKoreaderProgressKind(manifest.mediaType)) {
        case "xpointer":
          return xpointerToNavigationTarget(progress)
        case "page":
          return pageProgressToNavigationTarget(manifest, progress)
        case undefined:
          return undefined
      }
    }

    const navigate = (
      to: UserNavigationEntry<InheritTarget | KoreaderProgressNavigationTarget>,
    ) => {
      const { target } = to

      if (!isKoreaderProgressTarget(target))
        return reader.navigation.navigate({ ...to, target })

      const navigationTarget = koreaderProgressToNavigationTarget(target.value)

      if (!navigationTarget) {
        report.warn(`Ignore navigation to ${target.value}, not in the book`)

        return
      }

      reader.navigation.navigate({ ...to, target: navigationTarget })
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

    const cfiToPageProgress = (manifest: Manifest, cfi: string) => {
      // Through the reader, so the cfi hooks apply: the cbz enhancer's cfis
      // name a panorama's record rather than the half shown.
      const spineItem = reader.cfi.getSpineItemFromCfi(cfi)

      if (!spineItem) return undefined

      const page = getKoreaderPages(manifest).getPageOfSpineItem(spineItem.item)

      return page === undefined ? undefined : String(page)
    }

    const cfiToProgress = (cfi: string) => {
      const manifest = reader.context.manifest

      if (!manifest) return undefined

      switch (getKoreaderProgressKind(manifest.mediaType)) {
        case "xpointer":
          return cfiToXPointer(cfi, getLoadedSpineItemDocument)
        case "page":
          return cfiToPageProgress(manifest, cfi)
        case undefined:
          return undefined
      }
    }

    return {
      ...reader,
      navigation: {
        ...reader.navigation,
        navigate,
        goToKoreaderProgress: (progress) =>
          navigate({
            target: { type: "koreaderProgress", value: progress },
            animation: false,
          }),
      },
      koreader: {
        cfiToProgress,
      },
    }
  }
