import { Box, Presence } from "@chakra-ui/react"
import {
  type CoreInputSettings,
  shouldUseSpreadModeForViewport,
} from "@prose-reader/core"
import { isShallowEqual, type Manifest } from "@prose-reader/shared"
import { memo } from "react"
import { MdScreenRotation } from "react-icons/md"
import { useObserve } from "reactjrx"
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  NEVER,
  type Observable,
  of,
  shareReplay,
  switchMap,
} from "rxjs"
import { useTransientValue } from "../common/useTransientValue"
import { hasCbzEnhancer, useReader } from "../context/useReader"
import styles from "./SpreadRotationHint.module.css"

const HINT_TARGET_DEBOUNCE_MS = 100
const HINT_VISIBLE_MS = 900

const ANIMATION_NAME_IN_OUT = {
  _open: "fade-in",
  _closed: "fade-out",
  _motionReduce: "none",
}
const ANIMATION_DURATION_IN_OUT = { base: "moderate", _motionReduce: "0ms" }

type ViewportDimensions = {
  height: number
  width: number
}

type ViewportState = `busy` | `free`

/**
 * Only these four values matter here, so they are projected flat and compared
 * as one object rather than as edges rebuilt on every result.
 */
type HintPagination = {
  beginPageIndexInSpineItem: number | undefined
  beginSpineItemIndex: number | undefined
  endPageIndexInSpineItem: number | undefined
  endSpineItemIndex: number | undefined
}

type ReaderWithSpreadHintStreams = NonNullable<ReturnType<typeof useReader>>

export const wouldRotationUseSpreadMode = ({
  manifest,
  spreadMode,
  viewport,
}: {
  manifest: Manifest
  spreadMode: CoreInputSettings["spreadMode"]
  viewport: ViewportDimensions
}) => {
  if (viewport.width === viewport.height) return false

  return shouldUseSpreadModeForViewport({
    spreadMode,
    manifest,
    viewport: {
      height: viewport.width,
      width: viewport.height,
    },
  })
}

export const getSpreadRotationHintTargetKey = ({
  manifest,
  pagination,
  spreadMode,
  isSpread,
  viewportState,
  viewport,
  isPanorama,
}: {
  manifest: Manifest
  pagination: HintPagination
  /** The `spreadMode` setting. */
  spreadMode: CoreInputSettings["spreadMode"]
  /** Whether the viewport shows a spread now. */
  isSpread: boolean
  viewportState: ViewportState
  viewport: ViewportDimensions
  isPanorama: boolean
}) => {
  if (viewportState !== `free`) return undefined
  if (isSpread) return undefined
  if (!wouldRotationUseSpreadMode({ manifest, spreadMode, viewport })) {
    return undefined
  }

  if (!isPanorama) return undefined

  return [
    pagination.beginSpineItemIndex,
    pagination.beginPageIndexInSpineItem,
    pagination.endSpineItemIndex,
    pagination.endPageIndexInSpineItem,
  ]
    .map((value) => value ?? `none`)
    .join(`:`)
}

const observeHintPagination = (reader: ReaderWithSpreadHintStreams) =>
  reader.pagination.state$.pipe(
    map(
      ({ begin, end }): HintPagination => ({
        beginPageIndexInSpineItem: begin.pageIndexInSpineItem,
        beginSpineItemIndex: begin.spineItemIndex,
        endPageIndexInSpineItem: end.pageIndexInSpineItem,
        endSpineItemIndex: end.spineItemIndex,
      }),
    ),
    distinctUntilChanged(isShallowEqual),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

/**
 * Resolves the begin spine item alongside its readiness so the hint can both
 * gate on a loaded page and inspect whether that page is a cbz panorama half.
 */
const observeBeginSpineItem = ({
  pagination$,
  reader,
}: {
  pagination$: Observable<HintPagination>
  reader: ReaderWithSpreadHintStreams
}) =>
  pagination$.pipe(
    map(({ beginSpineItemIndex }) =>
      beginSpineItemIndex === undefined
        ? undefined
        : reader.spineItemsManager.items[beginSpineItemIndex],
    ),
    distinctUntilChanged(),
    switchMap((spineItem) =>
      spineItem
        ? spineItem.isReady$.pipe(map((isReady) => ({ spineItem, isReady })))
        : of({ spineItem: undefined, isReady: false }),
    ),
  )

const observeSpreadRotationHintTargetKey = (
  reader: ReaderWithSpreadHintStreams,
) => {
  const pagination$ = observeHintPagination(reader)
  const beginSpineItem$ = observeBeginSpineItem({
    pagination$,
    reader,
  })
  const cbzReader = hasCbzEnhancer(reader) ? reader : undefined

  return combineLatest([
    pagination$,
    reader.viewportState$,
    reader.viewport.watch([`width`, `height`, `isSpread`]),
    reader.settings.watch([`spreadMode`]),
    beginSpineItem$,
  ]).pipe(
    debounceTime(HINT_TARGET_DEBOUNCE_MS),
    map(
      ([
        pagination,
        viewportState,
        { isSpread, ...viewport },
        { spreadMode },
        { spineItem, isReady },
      ]) => {
        const manifest = reader.context.manifest
        const isPanorama =
          isReady &&
          cbzReader !== undefined &&
          spineItem !== undefined &&
          cbzReader.cbz.isPanoramaSpineItem(spineItem)

        return getSpreadRotationHintTargetKey({
          manifest,
          pagination,
          spreadMode,
          isSpread,
          viewportState,
          viewport,
          isPanorama,
        })
      },
    ),
    distinctUntilChanged(),
  )
}

const useSpreadRotationHintTargetKey = () => {
  const reader = useReader()

  return useObserve(
    () => (reader ? observeSpreadRotationHintTargetKey(reader) : NEVER),
    [reader],
  ).data
}

export const SpreadRotationHint = memo(() => {
  const hintTargetKey = useSpreadRotationHintTargetKey()
  const visibleHintKey = useTransientValue(hintTargetKey, HINT_VISIBLE_MS)

  return (
    <Presence
      present={visibleHintKey !== undefined}
      lazyMount
      unmountOnExit
      animationName={ANIMATION_NAME_IN_OUT}
      animationDuration={ANIMATION_DURATION_IN_OUT}
    >
      <Box
        key={visibleHintKey}
        aria-hidden
        position="absolute"
        left="50%"
        top="50%"
        transform="translate(-50%, -50%)"
        pointerEvents="none"
        zIndex={2}
        data-spread-rotation-hint="true"
      >
        <Box
          alignItems="center"
          bg="bg.inverted/72"
          borderRadius="full"
          className={styles.pulse}
          color="fg.inverted"
          display="flex"
          height="68px"
          justifyContent="center"
          width="68px"
        >
          <MdScreenRotation focusable={false} size={34} />
        </Box>
      </Box>
    </Presence>
  )
})
