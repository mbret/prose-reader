import { BehaviorSubject, filter } from "rxjs"

/**
 * The viewport state, which the navigator produces, carried by the context
 * for what is built before the navigator: the spine items' renderers wait for
 * a free viewport before doing heavy work. The reader relays it here once the
 * navigator exists.
 */
export class BridgeEvent {
  public viewportStateSubject = new BehaviorSubject<`free` | `busy`>(`free`)

  /**
   * Replay and emit viewport state
   */
  public viewportState$ = this.viewportStateSubject.asObservable()

  /**
   * Replay and emit whenever viewport is free
   */
  public viewportFree$ = this.viewportState$.pipe(
    filter((state) => state === "free"),
  )

  /**
   * Replay and emit whenever viewport is busy
   */
  public viewportBusy$ = this.viewportState$.pipe(
    filter((state) => state === "busy"),
  )
}
