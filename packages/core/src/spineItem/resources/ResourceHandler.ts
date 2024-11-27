import { Manifest } from "@prose-reader/shared"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { lastValueFrom, of } from "rxjs"

const defaultGetResource = (item: Manifest["items"][0]) => new URL(item.href)

export class ResourceHandler {
  constructor(
    protected item: Manifest["items"][number],
    protected settings: ReaderSettingsManager,
  ) {}

  public async getResource() {
    const resource = await lastValueFrom(
      this.settings.values.getResource?.(this.item) ?? of(undefined),
    )

    return resource ?? defaultGetResource(this.item)
  }

  public async fetchResource() {
    const resource = await this.getResource()

    if (resource instanceof Response) return resource

    if (resource instanceof URL) return fetch(resource)

    return resource
  }
}
