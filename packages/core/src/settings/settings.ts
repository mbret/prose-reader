import { BehaviorSubject } from "rxjs"
import { distinctUntilChanged } from "rxjs/operators"
import { Manifest } from "../types"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { InputSettings, OutputSettings } from "./types"

export const createSettings = (initialSettings: Partial<InputSettings>) => {
  const mergedSettings: OutputSettings = {
    forceSinglePageMode: false,
    pageTurnAnimation: `none`,
    computedPageTurnAnimation: `none`,
    pageTurnDirection: `horizontal`,
    computedPageTurnDirection: `horizontal`,
    pageTurnAnimationDuration: undefined,
    computedPageTurnAnimationDuration: 0,
    pageTurnMode: `controlled`,
    computedPageTurnMode: `controlled`,
    computedSnapAnimationDuration: 300,
    navigationSnapThreshold: 0.3,
    numberOfAdjacentSpineItemToPreLoad: 0,
    ...initialSettings,
  }

  updateComputedSettings(undefined, mergedSettings, false)

  const settingsSubject$ = new BehaviorSubject(mergedSettings)

  const setSettings = (
    newSettings: Partial<InputSettings>,
    options: {
      hasVerticalWriting?: boolean
      manifest?: Manifest | undefined
    },
  ) => {
    if (Object.keys(newSettings).length === 0) return

    const newMergedSettings = { ...settingsSubject$.value, ...newSettings }

    updateComputedSettings(options.manifest, newMergedSettings, options.hasVerticalWriting ?? false)

    settingsSubject$.next(newMergedSettings)
  }

  const recompute = (options: { hasVerticalWriting?: boolean; manifest?: Manifest | undefined }) => {
    const newMergedSettings = { ...settingsSubject$.value }

    updateComputedSettings(options.manifest, newMergedSettings, options.hasVerticalWriting ?? false)

    settingsSubject$.next(newMergedSettings)
  }

  const destroy = () => {
    settingsSubject$.complete()
  }

  return {
    getSettings: () => settingsSubject$.value,
    setSettings,
    recompute,
    destroy,
    $: {
      settings$: settingsSubject$.asObservable().pipe(distinctUntilChanged(isShallowEqual)),
    },
  }
}

const areAllItemsPrePaginated = (manifest: Manifest | undefined) =>
  !manifest?.spineItems.some((item) => item.renditionLayout === `reflowable`)

const updateComputedSettings = (newManifest: Manifest | undefined, settings: OutputSettings, hasVerticalWriting: boolean) => {
  settings.computedPageTurnDirection = settings.pageTurnDirection
  settings.computedPageTurnAnimation = settings.pageTurnAnimation
  settings.computedPageTurnMode = `controlled`

  // We force scroll mode for some books
  if (newManifest?.renditionFlow === `scrolled-continuous`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  } else if (
    newManifest &&
    settings.pageTurnMode === `scrollable` &&
    (newManifest.renditionLayout !== `pre-paginated` || !areAllItemsPrePaginated(newManifest))
  ) {
    Report.warn(`pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`)
    settings.computedPageTurnAnimation = `none`
    settings.computedPageTurnMode = `controlled`
  } else if (settings.pageTurnMode === `scrollable`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  }

  // some settings are not available for vertical writing
  if (hasVerticalWriting && settings.computedPageTurnAnimation === `slide`) {
    Report.warn(
      `pageTurnAnimation ${settings.computedPageTurnAnimation} incompatible with current book, switching back to default`,
    )
    settings.computedPageTurnAnimation = `none`
  }

  // for now we only support animation none for scrollable
  if (settings.computedPageTurnMode === `scrollable`) {
    settings.computedPageTurnAnimationDuration = 0
    settings.computedPageTurnAnimation = `none`
  } else {
    settings.computedPageTurnAnimationDuration =
      settings.pageTurnAnimationDuration !== undefined ? settings.pageTurnAnimationDuration : 300
  }
}
