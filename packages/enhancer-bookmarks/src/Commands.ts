import { DestroyableClass } from "@prose-reader/core"
import { filter, Subject } from "rxjs"
import type { SerializableBookmark } from "./types"

type Command =
  | { type: "delete"; id: string }
  | { type: "add"; data: (SerializableBookmark | SerializableBookmark)[] }
  | { type: "bookmark"; absolutePageIndex: number }

export class Commands extends DestroyableClass {
  private commandSubject = new Subject<Command>()

  public readonly delete$ = this.commandSubject.pipe(
    filter((command) => command.type === "delete"),
  )
  public readonly add$ = this.commandSubject.pipe(
    filter((command) => command.type === "add"),
  )
  public readonly bookmark$ = this.commandSubject.pipe(
    filter((command) => command.type === "bookmark"),
  )

  delete = (id: string) => {
    this.commandSubject.next({ type: "delete", id })
  }

  add = (data: (SerializableBookmark | SerializableBookmark)[]) => {
    this.commandSubject.next({ type: "add", data })
  }

  bookmark = (absolutePageIndex: number) => {
    this.commandSubject.next({ type: "bookmark", absolutePageIndex })
  }

  destroy() {
    super.destroy()
    this.commandSubject.complete()
  }
}
