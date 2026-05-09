import { BehaviorSubject, filter, ReplaySubject } from "rxjs"
import type { Navigation } from "../navigation/types"
import type { PaginationInfo } from "../pagination/types"
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"

/**
 * Bridge events that are transverse to the project and needed across several
 * layout and level of components.
 *
 * These events have important and rather general meaning for the engine.
 *
 * This is also mostly because some components would have circular dep if
 * the events weren't extracted. (navigation and pagination both need to listen
 * to one another for example).
 */
export class BridgeEvent {
  public navigationSubject = new ReplaySubject<Navigation>(1)
  public positionSubject = new ReplaySubject<
    SpinePosition | UnboundSpinePosition
  >(1)
  public viewportStateSubject = new BehaviorSubject<`free` | `busy`>(`free`)
  public paginationSubject = new ReplaySubject<PaginationInfo>(1)

  /**
   * Replay last pagination and emit next changes
   */
  public pagination$ = this.paginationSubject.asObservable()

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

  /**
   * Replay and emit navigation
   */
  public navigation$ = this.navigationSubject.asObservable()

  /**
   * Replay and emit the resolved viewport position, deduped on shallow
   * equality. Mirrors `Navigator.position$`. Use this instead of deriving
   * from `navigation$` in core internals that only care about
   * position-effective changes.
   */
  public position$ = this.positionSubject.asObservable()
}
