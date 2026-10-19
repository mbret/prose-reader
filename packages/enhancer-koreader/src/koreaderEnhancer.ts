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
 * The pointer names its spine item, which is known at once, and a place in its
 * document, found once the document is loaded.
 */
const xpointerToNavigationTarget = (
  manifest: Manifest,
  xpointer: string,
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

/**
 * The target core goes to for a KOReader `progress`, `undefined` for one that
 * names nothing in the book. It reads the manifest alone, so the target a
 * reader opens at converts before the reader exists.
 */
const koreaderProgressToNavigationTarget = (
  manifest: Manifest,
  progress: string,
) => {
  switch (getKoreaderProgressKind(manifest.mediaType)) {
    case "xpointer":
      return xpointerToNavigationTarget(manifest, progress)
    case "page":
      return pageProgressToNavigationTarget(manifest, progress)
    case undefined:
      return undefined
  }
}

/**
 * Converted before the reader is created, rather than navigated to once it is:
 * core goes to the target it opens at once the book is laid out and every
 * enhancer has registered its hooks, such as the cbz enhancer's cfi hooks. A
 * progress naming nothing in the book opens it at its start.
 */
const koreaderProgressToOpeningTarget = (
  manifest: Manifest,
  progress: string,
) => {
  const navigationTarget = koreaderProgressToNavigationTarget(
    manifest,
    progress,
  )

  if (!navigationTarget) {
    report.warn(`Open at the start of the book, ${progress} is not in it`)
  }

  return navigationTarget
}

/**
 * Lets a reader navigate to a KOReader `progress`, open at one, and convert a
 * cfi, such as its reading position, to one.
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
      /**
       * Where the reader opens: any target the reader it enhances opens at, or
       * a KOReader `progress`. A progress naming nothing in the book opens it
       * at its start, as any such target does.
       */
      target?: InheritOptions["target"] | KoreaderProgressNavigationTarget
    },
  ): InheritOutput & KoreaderEnhancerOutput<InheritTarget> => {
    const { target: openingTarget, ...rest } = options
    const reader = next({
      ...rest,
      target:
        openingTarget && isKoreaderProgressTarget(openingTarget)
          ? koreaderProgressToOpeningTarget(
              options.manifest,
              openingTarget.value,
            )
          : openingTarget,
      // Only `target` changed, to one the reader it enhances takes; TS cannot
      // rebuild the generic options from `Omit`.
    } as InheritOptions)

    const navigate = (
      to: UserNavigationEntry<InheritTarget | KoreaderProgressNavigationTarget>,
    ) => {
      const { target } = to

      if (!isKoreaderProgressTarget(target))
        return reader.navigation.navigate({ ...to, target })

      const navigationTarget = koreaderProgressToNavigationTarget(
        reader.context.manifest,
        target.value,
      )

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
