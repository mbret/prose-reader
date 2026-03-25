import { HStack, IconButton, Stack, Text } from "@chakra-ui/react"
import { type ComponentProps, useCallback, useState } from "react"
import { LuPause, LuPlay } from "react-icons/lu"
import { useConstant, useSubscribe } from "reactjrx"
import { BehaviorSubject, map, tap } from "rxjs"
import { ThemedSlider } from "../quickmenu/ThemedSlider"
import { useAudioReader } from "./useAudioReader"
import { useAudioState } from "./useAudioState"

const formatPlaybackTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return `00:00`

  const roundedValue = Math.floor(value)
  const hours = Math.floor(roundedValue / 3600)
  const minutes = Math.floor((roundedValue % 3600) / 60)
  const seconds = roundedValue % 60

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, `0`))
      .join(`:`)
  }

  return [minutes, seconds]
    .map((part) => String(part).padStart(2, `0`))
    .join(`:`)
}

export const AudioControlsSection = (props: ComponentProps<typeof HStack>) => {
  const audioReader = useAudioReader()
  const audioState = useAudioState()
  const hasPlayableTrack =
    !!audioState?.currentTrack || (audioState?.tracks.length ?? 0) > 0
  const duration = audioState?.duration
  const displayDuration = Math.max(0, duration ?? 0)
  const knownDuration =
    typeof duration === `number` && duration > 0 ? duration : undefined
  const hasKnownDuration = knownDuration !== undefined
  const sliderMax = knownDuration ?? 1
  const currentTime = hasKnownDuration
    ? Math.min(Math.max(0, audioState?.currentTime ?? 0), knownDuration)
    : 0
  const isSliderDisabled =
    !hasPlayableTrack || !!audioState?.isLoading || !hasKnownDuration
  const [draftCurrentTime, setDraftCurrentTime] = useState(currentTime)
  const isSeekingSubject = useConstant(() => new BehaviorSubject(false))

  /**
   * Keeps the slider synced with audio playback, except while the user is
   * actively dragging the thumb.
   *
   * During drag we display a local draft value and ignore playback updates to
   * avoid snapping back to the previously observed time. Once the user releases
   * the slider, the enhancer publishes the requested seek time immediately
   * before mutating the audio element, so unlocking this sync path is expected
   * to resume from the new target time. Any later native media updates are then
   * treated as normal playback progression rather than part of the drag UX.
   */
  const syncDownCurrentTime = useCallback(
    () =>
      audioReader?.audio.state$.pipe(
        map((state) => state.currentTime),
        tap((currentTime) => {
          if (isSeekingSubject.value) return

          setDraftCurrentTime(currentTime)
          isSeekingSubject.next(false)
        }),
      ),
    [audioReader, isSeekingSubject],
  )

  useSubscribe(syncDownCurrentTime)

  if (!audioState) {
    return null
  }

  return (
    <HStack
      width="100%"
      maxW="100%"
      gap={3}
      borderRadius="md"
      bg="bg.muted"
      px={3}
      py={2}
      {...props}
    >
      <IconButton
        aria-label={audioState.isPlaying ? "Pause audio" : "Play audio"}
        size="sm"
        variant="ghost"
        onClick={() => {
          void audioReader?.audio.toggle()
        }}
        disabled={!hasPlayableTrack || audioState.isLoading}
      >
        {audioState.isPlaying ? <LuPause /> : <LuPlay />}
      </IconButton>
      <Stack gap={0} minW={0} flex={1}>
        <ThemedSlider
          value={draftCurrentTime}
          min={0}
          max={sliderMax}
          disabled={isSliderDisabled}
          onChange={(value) => {
            const nextValue = Array.isArray(value) ? value[0] : value

            if (typeof nextValue !== "number") return

            isSeekingSubject.next(true)
            setDraftCurrentTime(nextValue)
          }}
          onChangeComplete={(value) => {
            const nextValue = Array.isArray(value) ? value[0] : value

            if (typeof nextValue !== "number") {
              isSeekingSubject.next(false)

              return
            }

            setDraftCurrentTime(nextValue)
            audioReader?.audio.setCurrentTime(nextValue)
            isSeekingSubject.next(false)
          }}
        />
        <HStack justifyContent="space-between" mt={1}>
          <Text fontSize="xs" color="fg.muted">
            {audioState.isLoading
              ? `Loading audio...`
              : formatPlaybackTime(draftCurrentTime)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {formatPlaybackTime(displayDuration)}
          </Text>
        </HStack>
      </Stack>
    </HStack>
  )
}
