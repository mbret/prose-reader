import { Subject } from "rxjs"
import { LoadOptions, Manifest } from "./types"

export type Context = ReturnType<typeof createContext>

export type ContextObservableEvents = {}

type Settings = { forceSinglePageMode: boolean }

export const createContext = (initialSettings: Partial<Settings>) => {
  let manifest: Manifest | undefined
  let loadOptions: LoadOptions | undefined
  let settings: Settings = {
    forceSinglePageMode: false,
    ...initialSettings
  }
  const subject = new Subject<ContextObservableEvents>()
  const visibleAreaRect = {
    width: 0,
    height: 0,
    x: 0,
    y: 0
  }
  const horizontalMargin = 24
  const verticalMargin = 20
  const marginTop = 0
  const marginBottom = 0
  const destroy$ = new Subject<void>()

  /**
   * Global spread behavior
   * @see http://idpf.org/epub/fxl/#property-spread
   * @todo user setting
   */
  const shouldDisplaySpread = () => {
    const { height, width } = visibleAreaRect
    const isLandscape = width > height

    if (settings.forceSinglePageMode) return false
    
    // portrait only
    if (!isLandscape && manifest?.renditionSpread === `portrait`) {
      return true
    }

    // default auto behavior
    return (isLandscape && (manifest?.renditionSpread === undefined || manifest?.renditionSpread === `auto` || manifest?.renditionSpread === `landscape` || manifest?.renditionSpread === `both`))
  }

  const load = (newManifest: Manifest, newLoadOptions: LoadOptions) => {
    manifest = newManifest
    loadOptions = newLoadOptions
  }

  const isRTL = () => manifest?.readingDirection === 'rtl'

  const setSettings = (newSettings: Partial<typeof settings>) => {
    settings = { ...settings, ...newSettings }
  }

  const destroy = () => {
    destroy$.next()
    destroy$.complete()
  }

  return {
    load,
    isRTL,
    destroy,
    getLoadOptions: () => loadOptions,
    setSettings,
    getCalculatedInnerMargin: () => 0,
    getVisibleAreaRect: () => visibleAreaRect,
    shouldDisplaySpread,
    setVisibleAreaRect: (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      // visibleAreaRect.width = width - horizontalMargin * 2
      visibleAreaRect.width = width
      visibleAreaRect.height = height - marginTop - marginBottom
      visibleAreaRect.x = x
      visibleAreaRect.y = y

      // if (this.useChromiumRubyBugSafeInnerMargin) {
      //   this.visibleAreaRect.height =
      //     this.visibleAreaRect.height - this.getCalculatedInnerMargin()
      // }
    },
    getHorizontalMargin: () => horizontalMargin,
    getVerticalMargin: () => verticalMargin,
    getPageSize: () => {
      return {
        width: shouldDisplaySpread()
          ? visibleAreaRect.width / 2
          : visibleAreaRect.width,
        height: visibleAreaRect.height,
      }
    },
    $: subject.asObservable(),
    destroy$: destroy$.asObservable(),
    emit: (data: ContextObservableEvents) => {
      subject.next(data)
    },
    getManifest: () => manifest,
    getReadingDirection: () => manifest?.readingDirection
  }
}