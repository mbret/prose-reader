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
 * What the navigation's target tells of where it goes. With
 * `withAnchorFromTarget`,
 * the only steps that read the target.
 */
export const withResolvedTarget =
  ({ resolvers }: { resolvers: NavigationTargetResolvers }) =>
  <N extends Navigation>(stream: Observable<N>) =>
    stream.pipe(
      map((params) => {
        const { snapToPage, ...resolution } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.previousNavigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, ...resolution },
          snapToPage,
        }
      }),
    )

/**
 * A navigation whose target awaits its document resolves it again: once the
 * document is loaded, the place the target names is found there, and anchors
 * the navigation, or is found to be nowhere, and the navigation is anchored at
 * the page it lands on instead.
 */
export const withAnchorFromTarget =
  ({ resolvers }: { resolvers: NavigationTargetResolvers }) =>
  <N extends { navigation: InternalNavigationEntry }>(stream: Observable<N>) =>
    stream.pipe(
      map((params) => {
        if (!params.navigation.awaitsDocument) return params

        const { anchor, awaitsDocument } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.navigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, anchor, awaitsDocument },
        }
      }),
    )
