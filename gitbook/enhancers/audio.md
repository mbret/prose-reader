# Audio

This enhancer adds audiobook playback support to the reader. It detects audio spine items in the manifest, renders them using a dedicated audio renderer, and provides a reactive playback API with play/pause, seeking, track selection, and a real-time frequency visualizer. It uses the standard HTML5 Audio element internally and integrates with the reader's pagination and navigation.

{% hint style="info" %}
The audio enhancer automatically builds a track list from spine items that have an audio MIME type or a recognized audio file extension (mp3, m4a, m4b, aac, ogg, oga, wav, flac, opus).
{% endhint %}

### Getting started

```bash
npm install @prose-reader/enhancer-audio
```

Connect the enhancer to your reader:

```typescript
import { createReader } from "@prose-reader/core"
import { audioEnhancer } from "@prose-reader/enhancer-audio"

const createAppReader = audioEnhancer(createReader)

const reader = createAppReader({})
```

The enhancer has no required configuration. When composing with other enhancers, wrap `createReader` as usual:

```typescript
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { audioEnhancer } from "@prose-reader/enhancer-audio"

const createAppReader = gesturesEnhancer(
  audioEnhancer(
    createReader
  )
)
```

{% hint style="info" %}
We encourage you to visit the [prose reader demo repository](https://github.com/mbret/prose-reader/tree/master/apps/demo) to see how the enhancer is being used in a real world example.
{% endhint %}

### How It Works

When the reader loads a manifest, the enhancer filters spine items to build a list of audio tracks. For each audio spine item, a dedicated `AudioRenderer` is used instead of the default HTML renderer. This renderer produces a minimal placeholder page (pre-paginated, no iframe) since audio content has no visual document to display.

Playback is handled by a single internal `HTMLAudioElement`. Track resources are resolved through the reader's resource handler, supporting blob URLs, direct URLs, and HTTP responses. When a track ends, the enhancer automatically advances to the next track in the current pagination window or navigates to the next page.

### API

The API is under the `audio` namespace.

#### `.play()`

Start playback of the current track.

```typescript
reader.audio.play()
```

#### `.pause()`

Pause playback.

```typescript
reader.audio.pause()
```

#### `.toggle()`

Toggle between play and pause.

```typescript
reader.audio.toggle()
```

#### `.setCurrentTime(value)`

Seek to a specific position in the current track.

```typescript
reader.audio.setCurrentTime(30) // seek to 30 seconds
```

#### `.select(trackId, options?)`

Select and load a specific audio track by its spine item id.

```typescript
reader.audio.select("track-3")
```

Options:

```typescript
type SelectAudioTrackOptions = {
  play?: boolean
  navigate?: boolean
}
```

* **`navigate`**: When not `false`, the reader will navigate to the spine item before loading the track. Defaults to navigating.
* **`play`**: Whether to start playback after selection.

```typescript
reader.audio.select("track-3", { play: true, navigate: true })
```

#### `.isAudioRenderer(renderer)`

Type guard to check whether a given `DocumentRenderer` is an `AudioRenderer`.

```typescript
if (reader.audio.isAudioRenderer(renderer)) {
  // renderer is AudioRenderer
}
```

#### `.state` / `.state$`

Access the current playback state synchronously or as an RxJS observable.

```typescript
type AudioEnhancerState = {
  tracks: AudioTrack[]
  currentTrack: AudioTrack | undefined
  isPlaying: boolean
  isLoading: boolean
  hasError: boolean
  currentTime: number
  duration: number | undefined
}

type AudioTrack = {
  id: string
  href: string
  index: number
  mediaType: string | undefined
}
```

Synchronous access:

```typescript
const { isPlaying, currentTrack, currentTime, duration } = reader.audio.state
```

Reactive access:

```typescript
reader.audio.state$.subscribe((state) => {
  console.log(state.isPlaying, state.currentTime)
})
```

#### `.visualizer` / `.visualizer$`

Access the audio frequency visualizer state synchronously or as an observable. The visualizer uses the Web Audio API to provide real-time frequency levels that can drive visual representations like waveforms or spectrum bars.

```typescript
type AudioVisualizerState = {
  levels: number[]
  isActive: boolean
  trackId: string | undefined
}
```

* **`levels`**: Array of frequency bin values (0–1 range) suitable for rendering a waveform or bar visualizer.
* **`isActive`**: Whether the visualizer is currently analyzing audio.
* **`trackId`**: The id of the track being visualized.

```typescript
reader.audio.visualizer$.subscribe(({ levels, isActive }) => {
  if (isActive) {
    renderWaveform(levels)
  }
})
```

#### `.visibleTrackIds$`

Observable that emits the audio track ids at the current pagination boundaries.

```typescript
reader.audio.visibleTrackIds$.subscribe((trackIds) => {
  console.log("Tracks at current page boundaries:", trackIds)
})
```

{% hint style="info" %}
This is intentionally boundary-based and should not be interpreted as "every audio track currently visible on screen".
{% endhint %}

### Playback Behavior

#### Track Resolution

Audio resources are resolved using the reader's resource handler. The enhancer supports multiple resource types: direct URLs, blob URLs from fetched responses, and track href fallbacks. Resolved URLs are cached to avoid redundant fetching.

#### End of Track

When a track finishes:

1. If there is a next track within the current pagination window, it is loaded automatically.
2. Otherwise, the reader navigates to the next page via `navigation.goToRightOrBottomSpineItem()`.

#### Error Handling

If playback fails, the state is updated with `hasError: true`. The enhancer retries playback once after the audio element signals `canplay` before flagging the error.

#### Auto-Selection

When the user navigates pages, the enhancer automatically selects the first audio track visible in the new pagination window. If the user was playing before navigation, playback intent is preserved.

### React Integration

If you are using `@prose-reader/react-reader`, there are hooks available to consume the audio state:

```typescript
import { useAudioState } from "@prose-reader/react-reader"

const MyAudioControls = () => {
  const audioState = useAudioState()

  if (!audioState) return null

  return (
    <div>
      <button onClick={() => reader.audio.toggle()}>
        {audioState.isPlaying ? "Pause" : "Play"}
      </button>
      <span>
        {audioState.currentTime}s / {audioState.duration}s
      </span>
    </div>
  )
}
```

You can check whether the reader has the audio enhancer using the provided type guard:

```typescript
import { hasAudioEnhancer } from "@prose-reader/react-reader"

if (hasAudioEnhancer(reader)) {
  reader.audio.play()
}
```

### Supported Formats

The enhancer recognizes spine items as audio based on MIME type (`audio/*`) or file extension:

| Extension | Format                    |
| --------- | ------------------------- |
| mp3       | MPEG Audio Layer 3        |
| m4a       | MPEG-4 Audio              |
| m4b       | MPEG-4 Audiobook          |
| aac       | Advanced Audio Coding     |
| ogg       | Ogg Vorbis                |
| oga       | Ogg Audio                 |
| wav       | Waveform Audio            |
| flac      | Free Lossless Audio Codec |
| opus      | Opus                      |

{% hint style="info" %}
Actual browser playback support depends on the user's browser. The enhancer delegates decoding entirely to the HTML5 Audio element.
{% endhint %}
