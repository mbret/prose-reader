import { Manifest } from "@prose-reader/shared"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"

export class ResourceHandler {
  constructor(
    protected item: Manifest["items"][number],
    protected settings: ReaderSettingsManager,
  ) {}

  public async getResource(): Promise<URL | Response> {
    return new URL(this.item.href)
  }

  public async fetchResource() {
    const resource = await this.getResource()

    if (resource instanceof Response) return resource

    return fetch(resource)
  }
}
