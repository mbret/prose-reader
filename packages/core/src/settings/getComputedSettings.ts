import { ComputedSettings, Settings } from "./types"
import { areAllItemsPrePaginated } from "../manifest/areAllItemsPrePaginated"
import { Report } from "../report"
import { Context } from "../context/Context"

export const getComputedSettings = (settings: Settings, context: Context) => {
  const manifest = context.manifest
  const hasVerticalWriting = context.state.hasVerticalWriting ?? false
  const computedSettings: Omit<ComputedSettings, keyof Settings> = {
    computedPageTurnDirection: settings.pageTurnDirection,
    computedPageTurnAnimation: settings.pageTurnAnimation,
    computedPageTurnMode: `controlled`,
    computedPageTurnAnimationDuration: 0,
    computedSnapAnimationDuration: 0,
  }

  // We force scroll mode for some books
  if (manifest?.renditionFlow === `scrolled-continuous`) {
    computedSettings.computedPageTurnMode = `scrollable`
    computedSettings.computedPageTurnDirection = `vertical`
  } else if (
    manifest &&
    settings.pageTurnMode === `scrollable` &&
    (manifest.renditionLayout !== `pre-paginated` || !areAllItemsPrePaginated(manifest))
  ) {
    Report.warn(`pageTurnMode ${settings.pageTurnMode} incompatible with current book, switching back to default`)
    computedSettings.computedPageTurnAnimation = `none`
    computedSettings.computedPageTurnMode = `controlled`
  } else if (settings.pageTurnMode === `scrollable`) {
    computedSettings.computedPageTurnMode = `scrollable`
    computedSettings.computedPageTurnDirection = `vertical`
  }

  // some settings are not available for vertical writing
  if (hasVerticalWriting && computedSettings.computedPageTurnAnimation === `slide`) {
    Report.warn(
      `pageTurnAnimation ${computedSettings.computedPageTurnAnimation} incompatible with current book, switching back to default`,
    )
    computedSettings.computedPageTurnAnimation = `none`
  }

  // for now we only support animation none for scrollable
  if (computedSettings.computedPageTurnMode === `scrollable`) {
    computedSettings.computedPageTurnAnimationDuration = 0
    computedSettings.computedPageTurnAnimation = `none`
  } else {
    computedSettings.computedPageTurnAnimationDuration =
      settings.pageTurnAnimationDuration !== undefined ? settings.pageTurnAnimationDuration : 300
  }

  return computedSettings
}
