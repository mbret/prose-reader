import { Box, Presence } from "@chakra-ui/react"
import {
  type ExtraPaginationInfo,
  type PaginationInfo,
  shouldUseComputedSpreadModeForViewport,
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
  startWith,
} from "rxjs"
import { useTransientValue } from "../common/useTransientValue"
import { useReader } from "../context/useReader"
import styles from "./SpreadRotationHint.module.css"

const HINT_TARGET_DEBOUNCE_MS = 100
const HINT_VISIBLE_MS = 900

const ANIMATION_NAME_IN_OUT = { _open: "fade-in", _closed: "fade-out" }

type ViewportDimensions = {
  height: number
  width: number
}

type ViewportState = `busy` | `free`

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
    viewport,
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
  pagination: PaginationInfo & ExtraPaginationInfo
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

const useSpreadRotationHintTargetKey = () => {
  const reader = useReader()

  return useObserve(
    () =>
      !reader
        ? NEVER
        : combineLatest([
            reader.pagination.state$,
            reader.context.manifest$,
            reader.settings.watch([`computedSpreadMode`]),
            reader.viewportState$,
            reader.viewport.watch([`width`, `height`]),
            reader.spineItemsObserver.states$.pipe(startWith(undefined)),
          ]).pipe(
            debounceTime(HINT_TARGET_DEBOUNCE_MS),
            map(([pagination, manifest, settings, viewportState, viewport]) => {
              const hintTargetKey = getSpreadRotationHintTargetKey({
                manifest,
                pagination,
                computedSpreadMode: settings.computedSpreadMode ?? false,
                viewportState,
                viewport,
              })

              if (hintTargetKey === undefined) return undefined

              const spineItemIndex = pagination.beginSpineItemIndex

              if (
                spineItemIndex === undefined ||
                reader.spineItemsManager.get(spineItemIndex)?.value.isReady !==
                  true
              ) {
                return undefined
              }

              return hintTargetKey
            }),
            distinctUntilChanged(),
          ),
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
      animationName={ANIMATION_NAME_IN_OUT}
      animationDuration="moderate"
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
      >
        <Box
          alignItems="center"
          bg="rgba(12, 12, 12, 0.56)"
          borderRadius="full"
          boxShadow="0 16px 40px rgba(0, 0, 0, 0.24)"
          className={styles.pulse}
          color="white"
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
