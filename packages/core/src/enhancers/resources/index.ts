import { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { createResourcesManager } from "./resourcesManager"

export const resourcesEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)
    const resourceManager = createResourcesManager(reader.context)

    /**
     * We will serve resources from cache if they exist otherwise fetch it normally.
     * The resource manager use the provided user option to fetch resource if it exists
     */
    // const load: typeof reader.load = (manifest, loadOptions) => {
    //   reader.load(manifest, {
    //     ...loadOptions,
    //   })
    // }

    // reader.registerHook(`item.onGetResource`, (fetcher) => async (item) => {
    //   return resourceManager.get(item, fetcher)
    // })

    const destroy = () => {
      resourceManager.destroy()
      reader.destroy()
    }

    return {
      ...reader,
      // $: {
      //   ...reader.$,
      //   errors$: merge(reader.$.errors$, errorsSubject$.asObservable())
      // },
      destroy,
      // load,
    }
  }
