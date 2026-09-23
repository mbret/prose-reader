import type {
  DomPosition,
  PositionFormat,
  PositionFormatContext,
} from "@prose-reader/shared/positions"
import type { Positions } from "../pagination/types"

type Registration = {
  format: PositionFormat
  unregister: () => void
}

const keepRegistered = () => {}

export class PositionRegistry {
  private readonly registrations = new Map<string, Registration>()

  /**
   * The built-in formats cannot be unregistered: the cfi is the canonical
   * position everything else is converted to.
   */
  constructor(builtIns: PositionFormat[]) {
    for (const format of builtIns) {
      this.add(format, { removable: false })
    }
  }

  /**
   * Registering the format already registered under its name is a no-op that
   * hands back the same unregister, so registering twice (a remount, for
   * example) does not throw. Another format under a registered name does.
   *
   * An unregister only removes its own registration: once the name has been
   * unregistered and registered again, calling an older one does nothing.
   */
  register(format: PositionFormat): () => void {
    const registered = this.registrations.get(format.name)

    if (registered?.format === format) return registered.unregister

    return this.add(format, { removable: true })
  }

  get(name: string) {
    return this.registrations.get(name)?.format
  }

  list(): readonly PositionFormat[] {
    return [...this.registrations.values()].map(({ format }) => format)
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

  private add(format: PositionFormat, { removable }: { removable: boolean }) {
    if (!format.name.trim() || this.registrations.has(format.name)) {
      throw new Error(
        `Position format already registered or empty: ${format.name}`,
      )
    }

    const registration: Registration = {
      format,
      unregister: removable
        ? () => {
            if (this.registrations.get(format.name) === registration) {
              this.registrations.delete(format.name)
            }
          }
        : keepRegistered,
    }

    this.registrations.set(format.name, registration)

    return registration.unregister
  }
}
