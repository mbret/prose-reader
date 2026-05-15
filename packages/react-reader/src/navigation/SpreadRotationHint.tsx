import { Box, Presence } from "@chakra-ui/react"
import {
  type ExtraPaginationInfo,
  type PaginationInfo,
  shouldUseComputedSpreadModeForViewport,
  watchKeys,
} from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
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
import { useReader } from "../context/useReader"
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

type HintPagination = Pick<
  PaginationInfo & ExtraPaginationInfo,
  | `beginHasAdjacentSpreadPage`
  | `beginPageIndexInSpineItem`
  | `beginSpineItemIndex`
  | `endHasAdjacentSpreadPage`
  | `endPageIndexInSpineItem`
  | `endSpineItemIndex`
>

type ReaderWithSpreadHintStreams = NonNullable<ReturnType<typeof useReader>>

export const wouldRotationUseComputedSpreadMode = ({
  manifest,
  viewport,
}: {
  manifest: Manifest
  viewport: ViewportDimensions
}) => {
  if (viewport.width === viewport.height) return false

  return shouldUseComputedSpreadModeForViewport({
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
  computedSpreadMode,
  viewportState,
  viewport,
}: {
  manifest: Manifest
  pagination: HintPagination
  computedSpreadMode: boolean
  viewportState: ViewportState
  viewport: ViewportDimensions
}) => {
  if (viewportState !== `free`) return undefined
  if (computedSpreadMode) return undefined
  if (!wouldRotationUseComputedSpreadMode({ manifest, viewport })) {
    return undefined
  }

  const hasSpreadPair =
    pagination.beginHasAdjacentSpreadPage || pagination.endHasAdjacentSpreadPage

  if (!hasSpreadPair) return undefined

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
    watchKeys([
      `beginHasAdjacentSpreadPage`,
      `beginPageIndexInSpineItem`,
      `beginSpineItemIndex`,
      `endHasAdjacentSpreadPage`,
      `endPageIndexInSpineItem`,
      `endSpineItemIndex`,
    ]),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

const observeBeginSpineItemReady = ({
  pagination$,
  reader,
}: {
  pagination$: Observable<HintPagination>
  reader: ReaderWithSpreadHintStreams
}) =>
  combineLatest([pagination$, reader.spineItemsManager.items$]).pipe(
    map(([{ beginSpineItemIndex }, spineItems]) =>
      beginSpineItemIndex === undefined
        ? undefined
        : spineItems[beginSpineItemIndex],
    ),
    distinctUntilChanged(),
    switchMap((spineItem) => spineItem?.isReady$ ?? of(false)),
  )

const observeSpreadRotationHintTargetKey = (
  reader: ReaderWithSpreadHintStreams,
) => {
  const pagination$ = observeHintPagination(reader)
  const beginSpineItemReady$ = observeBeginSpineItemReady({
    pagination$,
    reader,
  })

  return combineLatest([
    pagination$,
    reader.context.manifest$,
    reader.settings.watch([`computedSpreadMode`]),
    reader.viewportState$,
    reader.viewport.watch([`width`, `height`]),
    beginSpineItemReady$,
  ]).pipe(
    debounceTime(HINT_TARGET_DEBOUNCE_MS),
    map(
      ([pagination, manifest, settings, viewportState, viewport, isReady]) => {
        if (!isReady) return undefined

        return getSpreadRotationHintTargetKey({
          manifest,
          pagination,
          computedSpreadMode: settings.computedSpreadMode ?? false,
          viewportState,
          viewport,
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
