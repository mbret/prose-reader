import { DestroyableClass } from "@prose-reader/core"
import { filter, Subject } from "rxjs"
import type { Annotation } from "./types"

type AnnotationSharedParams = Omit<Annotation, "id" | "cfi"> & {
  selection?: Selection
}

type AnnotateParams = AnnotationSharedParams & {
  itemIndex: number
}

type AnnotateAbsolutePageParams = AnnotationSharedParams & {
  absolutePageIndex: number
}

type Command =
  | {
      type: "annotate"
      data: (AnnotateParams | AnnotateAbsolutePageParams) & {
        absolutePageIndex?: number
      }
    }
  | { type: "add"; data: Annotation | Annotation[] }
  | { type: "delete"; id: string }
  | {
      type: "update"
      id: string
      data: Pick<AnnotationSharedParams, "highlightColor" | "notes">
    }
  | { type: "select"; id: string | undefined }
  | { type: "reset" }

export class Commands extends DestroyableClass {
  private commandSubject = new Subject<Command>()

  public readonly annotate$ = this.commandSubject.pipe(
    filter((command) => command.type === "annotate"),
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

  annotate = (params: AnnotateParams) => {
    this.commandSubject.next({ type: "annotate", data: params })
  }

  annotateAbsolutePage = (params: AnnotateAbsolutePageParams) => {
    this.commandSubject.next({ type: "annotate", data: params })
  }

  add = (data: Annotation | Annotation[]) => {
    this.commandSubject.next({ type: "add", data })
  }

  delete = (id: string) => {
    this.commandSubject.next({ type: "delete", id })
  }

  update = (
    id: string,
    data: Pick<AnnotationSharedParams, "highlightColor" | "notes">,
  ) => {
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
