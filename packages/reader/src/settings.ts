import { BehaviorSubject } from "rxjs"
import { distinctUntilChanged } from "rxjs/operators"
import { Manifest } from "./types"
import { Report } from "./report"
import { isShallowEqual } from "./utils/objects"

export type PublicSettings = {
  forceSinglePageMode: boolean,
  pageTurnAnimation: `none` | `fade` | `slide`,
  pageTurnAnimationDuration: undefined | number
  pageTurnDirection: `vertical` | `horizontal`,
  pageTurnMode: `controlled` | `scrollable`,
}

/**
 * Represent the settings that are derived from user settings.
 * Because some of the user settings can sometime be invalid based on some
 * context we need to use the computed one internally.
 * For example if the user decide to use horizontal page turn direction with scrolled content
 * we will overwrite it and force it to vertical (granted we only support vertical).
 */
type InnerSettings = PublicSettings & {
  computedPageTurnMode: PublicSettings[`pageTurnMode`],
  computedPageTurnDirection: PublicSettings[`pageTurnDirection`],
  computedPageTurnAnimation: PublicSettings[`pageTurnAnimation`],
  computedPageTurnAnimationDuration: number,
  computedSnapAnimationDuration: number,
}

export const createSettings = (initialSettings: Partial<PublicSettings>) => {
  const mergedSettings: InnerSettings = {
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
    ...initialSettings
  }

  updateComputedSettings(undefined, mergedSettings, false)

  const settingsSubject$ = new BehaviorSubject(mergedSettings)

  const setSettings = (newSettings: Partial<PublicSettings>, options: { hasVerticalWritingSubject: boolean, manifest: Manifest | undefined }) => {
    if (Object.keys(newSettings).length === 0) return

    const newMergedSettings = { ...settingsSubject$.value, ...newSettings }

    updateComputedSettings(options.manifest, newMergedSettings, options.hasVerticalWritingSubject)

    settingsSubject$.next(newMergedSettings)
  }

  const recompute = (options: { hasVerticalWritingSubject: boolean, manifest: Manifest | undefined }) => {
    const newMergedSettings = { ...settingsSubject$.value }

    updateComputedSettings(options.manifest, newMergedSettings, options.hasVerticalWritingSubject)

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
      settings$: settingsSubject$
        .asObservable()
        .pipe(distinctUntilChanged(isShallowEqual))
    }
  }
}

const areAllItemsPrePaginated = (manifest: Manifest | undefined) => !manifest?.spineItems.some(item => item.renditionLayout === `reflowable`)

const updateComputedSettings = (newManifest: Manifest | undefined, settings: InnerSettings, hasVerticalWriting: boolean) => {
  settings.computedPageTurnDirection = settings.pageTurnDirection
  settings.computedPageTurnAnimation = settings.pageTurnAnimation
  settings.computedPageTurnMode = `controlled`

  // We force scroll mode for some books
  if (newManifest?.renditionFlow === `scrolled-continuous`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  } else if (newManifest && settings.pageTurnMode === `scrollable` && (newManifest.renditionLayout !== `pre-paginated` || !areAllItemsPrePaginated(newManifest))) {
    Report.warn(`pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`)
    settings.computedPageTurnAnimation = `none`
    settings.computedPageTurnMode = `controlled`
  } else if (settings.pageTurnMode === `scrollable`) {
    settings.computedPageTurnMode = `scrollable`
    settings.computedPageTurnDirection = `vertical`
  }

  // some settings are not available for vertical writing
  if (hasVerticalWriting && settings.computedPageTurnAnimation === `slide`) {
    Report.warn(`pageTurnAnimation ${settings.computedPageTurnAnimation} incompatible with current book, switching back to default`)
    settings.computedPageTurnAnimation = `none`
  }

  // for now we only support animation none for scrollable
  if (settings.computedPageTurnMode === `scrollable`) {
    settings.computedPageTurnAnimationDuration = 0
    settings.computedPageTurnAnimation = `none`
  } else {
    settings.computedPageTurnAnimationDuration = settings.pageTurnAnimationDuration !== undefined
      ? settings.pageTurnAnimationDuration
      : 300
  }
}
