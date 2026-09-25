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
        const { snapToPage, awaitsDocument, ...resolution } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.previousNavigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, ...resolution },
          snapToPage,
          awaitsDocument,
        }
      }),
    )

/**
 * A navigation without an anchor resolves its target again for one: a target
 * naming a place in an item that had not loaded finds it once the item has.
 */
export const withAnchorFromTarget =
  ({ resolvers }: { resolvers: NavigationTargetResolvers }) =>
  <N extends { navigation: InternalNavigationEntry }>(stream: Observable<N>) =>
    stream.pipe(
      map((params) => {
        if (params.navigation.anchor !== undefined)
          return { ...params, awaitsDocument: false }

        const { anchor, awaitsDocument } = resolveTarget(
          resolvers,
          params.navigation.target,
          { previousNavigation: params.navigation },
        )

        return {
          ...params,
          navigation: { ...params.navigation, anchor },
          awaitsDocument,
        }
      }),
    )
