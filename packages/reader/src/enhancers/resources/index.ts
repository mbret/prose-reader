import { Enhancer } from "../../createReader";
import { createResourcesManager } from "./resourcesManager";

export const resourcesEnhancer: Enhancer<{

}> = (next) => (options) => {
  const reader = next(options)
  const resourceManager = createResourcesManager(reader.context)

  /**
   * We will serve resources from cache if they exist otherwise fetch it normally.
   * The resource manager use the provided user option to fetch resource if it exists
   */
  const load: typeof reader.load = (manifest, loadOptions) => {
    reader.load(manifest, {
      ...loadOptions,
      fetchResource: async (item) => {
        return resourceManager.get(item, loadOptions?.fetchResource)
      }
    })
  }

  const destroy = () => {
    resourceManager.destroy()
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
    load
  }
}