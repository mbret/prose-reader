import {
  BehaviorSubject,
  ReplaySubject,
  distinctUntilChanged,
  filter,
} from "rxjs"
import type { Navigation } from "../navigation/types"
import type { PaginationInfo } from "../pagination/types"

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
  public viewportStateSubject = new BehaviorSubject<`free` | `busy`>(`free`)
  public paginationSubject = new ReplaySubject<PaginationInfo>()
  public navigationIsLockedSubject = new BehaviorSubject(false)

  /**
   * Replay last pagination and emit next changes
   */
  public pagination$ = this.paginationSubject.asObservable()

  /**
   * Emit whenever the navigation is unlocked.
   */
  public navigationUnlocked$ = this.navigationIsLockedSubject.pipe(
    distinctUntilChanged(),
    filter((isLocked) => !isLocked),
  )

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
}
