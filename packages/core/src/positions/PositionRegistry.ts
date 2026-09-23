import type {
  DomPosition,
  PositionFormat,
  PositionFormatContext,
} from "@prose-reader/shared/positions"
import type { Positions } from "../pagination/types"

export class PositionRegistry {
  private readonly formats = new Map<string, PositionFormat>()

  constructor(formats: PositionFormat[]) {
    for (const format of formats) {
      this.register(format)
    }
  }

  register(format: PositionFormat): () => void {
    if (!format.name.trim() || this.formats.has(format.name)) {
      throw new Error(
        `Position format already registered or empty: ${format.name}`,
      )
    }
    this.formats.set(format.name, format)
    let registered = true
    return () => {
      if (!registered) return
      registered = false
      if (this.formats.get(format.name) === format) {
        this.formats.delete(format.name)
      }
    }
  }

  get(name: string) {
    return this.formats.get(name)
  }
  list(): readonly PositionFormat[] {
    return [...this.formats.values()]
  }

  generate(position: DomPosition, context: PositionFormatContext): Positions {
    return {
      cfi: undefined,
      ...Object.fromEntries(
        this.list().flatMap((format) => {
          const value = format.generate(position, context)
          return value === undefined ? [] : [[format.name, value]]
        }),
      ),
    }
  }
}
