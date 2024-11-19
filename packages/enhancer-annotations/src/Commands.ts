import { DestroyableClass } from "@prose-reader/core"
import { filter, Subject } from "rxjs"
import { Highlight } from "./types"

type HighlightParams = { document: Document; selection: Selection; itemId: string; color?: string; contents?: string[] }

type Command = { type: "highlight"; data: HighlightParams } | { type: "add"; data: Highlight | Highlight[] }

export class Commands extends DestroyableClass {
  private commandSubject = new Subject<Command>()

  public readonly highlight$ = this.commandSubject.pipe(filter((command) => command.type === "highlight"))
  public readonly add$ = this.commandSubject.pipe(filter((command) => command.type === "add"))

  highlight = (params: HighlightParams) => {
    this.commandSubject.next({ type: "highlight", data: params })
  }

  add = (data: Highlight | Highlight[]) => {
    this.commandSubject.next({ type: "add", data })
  }

  destroy() {
    super.destroy()
    this.commandSubject.complete()
  }
}
