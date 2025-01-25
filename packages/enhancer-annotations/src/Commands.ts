import { DestroyableClass } from "@prose-reader/core"
import { filter, Subject } from "rxjs"
import type { SerializableHighlight } from "./types"

type HighlightParams = {
  selection: Selection
  itemIndex: number
  color?: string
  contents?: string[]
}

type Command =
  | { type: "highlight"; data: HighlightParams }
  | { type: "add"; data: SerializableHighlight | SerializableHighlight[] }
  | { type: "delete"; id: string }
  | {
      type: "update"
      id: string
      data: Pick<HighlightParams, "color" | "contents">
    }
  | { type: "select"; id: string | undefined }
  | { type: "reset" }

export class Commands extends DestroyableClass {
  private commandSubject = new Subject<Command>()

  public readonly highlight$ = this.commandSubject.pipe(
    filter((command) => command.type === "highlight"),
  )
  public readonly add$ = this.commandSubject.pipe(
    filter((command) => command.type === "add"),
  )
  public readonly delete$ = this.commandSubject.pipe(
    filter((command) => command.type === "delete"),
  )
  public readonly update$ = this.commandSubject.pipe(
    filter((command) => command.type === "update"),
  )
  public readonly select$ = this.commandSubject.pipe(
    filter((command) => command.type === "select"),
  )
  public readonly reset$ = this.commandSubject.pipe(
    filter((command) => command.type === "reset"),
  )

  highlight = (params: HighlightParams) => {
    this.commandSubject.next({ type: "highlight", data: params })
  }

  add = (data: SerializableHighlight | SerializableHighlight[]) => {
    this.commandSubject.next({ type: "add", data })
  }

  delete = (id: string) => {
    this.commandSubject.next({ type: "delete", id })
  }

  update = (id: string, data: Pick<HighlightParams, "color" | "contents">) => {
    this.commandSubject.next({ type: "update", id, data })
  }

  select = (id: string | undefined) => {
    this.commandSubject.next({ type: "select", id })
  }

  reset = () => {
    this.commandSubject.next({ type: "reset" })
  }

  destroy() {
    super.destroy()
    this.commandSubject.complete()
  }
}
