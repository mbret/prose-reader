import { map, type Observable } from "rxjs"
import type {
  NavigationTargetResolvers,
  TargetResolverContext,
} from "../targets/types"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
  NavigationTarget,
  NavigationTargetType,
} from "../types"

type Navigation = {
  navigation: InternalNavigationInput
  previousNavigation: InternalNavigationEntry
}

const resolveTarget = <Type extends NavigationTargetType>(
  resolvers: NavigationTargetResolvers,
  target: NavigationTarget<Type>,
  context: TargetResolverContext,
) => resolvers[target.type](target.value, context)

/**
 * The only step that reads the navigation's target: its resolver tells what
 * it can of where the navigation goes, and every step after it works the same
 * whatever the target was. Whether the resolved position is exact is only for
 * the steps of this navigation, so it is kept beside the entry, not in it.
 */
export const withResolvedTarget =
  ({ resolvers }: { resolvers: NavigationTargetResolvers }) =>
  <N extends Navigation>(stream: Observable<N>) =>
    stream.pipe(
      map((params) => {
        const { isExact, ...resolution } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.previousNavigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, ...resolution },
          isExact,
        }
      }),
    )
