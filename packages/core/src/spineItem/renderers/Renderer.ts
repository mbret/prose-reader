import { Manifest } from "@prose-reader/shared"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import {
  BehaviorSubject,
  filter,
  map,
  Subject,
  tap,
  withLatestFrom,
} from "rxjs"
import { ResourceHandler } from "../ResourceHandler"

type Layer = {
  element: HTMLElement
}

export abstract class Renderer {
  protected stateSubject = new BehaviorSubject<
    `idle` | `loading` | `loaded` | `unloading` | `ready`
  >(`idle`)

  private triggerSubject = new Subject<`load` | `unload` | `destroy`>()

  public layers: Layer[] = []

  constructor(
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected item: Manifest[`spineItems`][number],
    protected containerElement: HTMLElement,
    protected resourcesHandler: ResourceHandler,
  ) {
    this.stateSubject.subscribe((state) => {
      console.log(`FOOO`, item.id, `state`, state)
    })
  }

  protected load$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger === `load` &&
        state !== "ready" &&
        state !== "loaded" &&
        state !== "loading",
    ),
    map(() => undefined),
    tap(() => {
      console.log(`FOOO`, this.item.id, `load`)
    }),
  )

  protected unload$ = this.triggerSubject.pipe(
    withLatestFrom(this.stateSubject),
    filter(
      ([trigger, state]) =>
        trigger === `unload` && state !== "idle" && state !== "unloading",
    ),
    map(() => undefined),
    tap(() => {
      console.log(`FOOO`, this.item.id, `unload`)
    }),
  )
  protected destroy$ = this.triggerSubject.pipe(
    filter((trigger) => trigger === `destroy`),
  )

  public get state$() {
    return this.stateSubject
  }

  public load() {
    this.triggerSubject.next(`load`)
  }

  public unload() {
    this.triggerSubject.next(`unload`)
  }

  public destroy() {
    this.triggerSubject.next(`destroy`)
    this.triggerSubject.complete()
    this.stateSubject.complete()
  }

  abstract render(params: {
    minPageSpread: number
    blankPagePosition: `before` | `after` | `none`
    spreadPosition: `none` | `left` | `right`
  }): { width: number; height: number }

  abstract get writingMode(): `vertical-rl` | `horizontal-tb` | undefined

  abstract get readingDirection(): `rtl` | `ltr` | undefined
}
