import { Enhancer, ExtractApi, ExtractHiddenApi, ExtractOptions } from "./types"
import { compose } from "../utils/compose"

export type ComposableEnhancer = (createReader: any) => (options: any) => { setSettings?: any; __OutputSettings?: any }

export type ComposeEnhancer2<A extends ComposableEnhancer, B extends ComposableEnhancer> = Enhancer<
  ExtractOptions<A> & ExtractOptions<B>,
  ExtractHiddenApi<A> & ExtractHiddenApi<B>,
  Parameters<ExtractApi<A>[`setSettings`]>[0] & Parameters<ExtractApi<B>[`setSettings`]>[0],
  ExtractApi<A>[`__OutputSettings`] & ExtractApi<B>[`__OutputSettings`]
>

export type ComposeEnhancer3<A extends ComposableEnhancer, B extends ComposableEnhancer, C extends ComposableEnhancer> = Enhancer<
  ExtractOptions<A> & ExtractOptions<B> & ExtractOptions<C>,
  ExtractHiddenApi<A> & ExtractHiddenApi<B> & ExtractHiddenApi<C>,
  Parameters<ExtractApi<A>[`setSettings`]>[0] &
    Parameters<ExtractApi<B>[`setSettings`]>[0] &
    Parameters<ExtractApi<C>[`setSettings`]>[0],
  ExtractApi<A>[`__OutputSettings`] & ExtractApi<B>[`__OutputSettings`] & ExtractApi<C>[`__OutputSettings`]
>

export type ComposeEnhancer<
  A extends ComposableEnhancer = Enhancer,
  B extends ComposableEnhancer = Enhancer,
  C extends ComposableEnhancer = Enhancer,
  D extends ComposableEnhancer = Enhancer,
  E extends ComposableEnhancer = Enhancer,
  F extends ComposableEnhancer = Enhancer,
  G extends ComposableEnhancer = Enhancer,
  H extends ComposableEnhancer = Enhancer,
  I extends ComposableEnhancer = Enhancer,
  J extends ComposableEnhancer = Enhancer,
  K extends ComposableEnhancer = Enhancer,
  L extends ComposableEnhancer = Enhancer,
  M extends ComposableEnhancer = Enhancer,
  N extends ComposableEnhancer = Enhancer,
  O extends ComposableEnhancer = Enhancer,
  P extends ComposableEnhancer = Enhancer
> = Enhancer<
  ExtractOptions<A> &
    ExtractOptions<B> &
    ExtractOptions<C> &
    ExtractOptions<D> &
    ExtractOptions<E> &
    ExtractOptions<F> &
    ExtractOptions<G> &
    ExtractOptions<H> &
    ExtractOptions<I> &
    ExtractOptions<J> &
    ExtractOptions<K> &
    ExtractOptions<L> &
    ExtractOptions<M> &
    ExtractOptions<N> &
    ExtractOptions<O> &
    ExtractOptions<P>,
  // ModifyDeep<
  //   ModifyDeep<
  //     ExtractHiddenApi<A>,
  //     ExtractHiddenApi<B>
  //   >,
  //   ExtractHiddenApi<C>
  // >
  ExtractHiddenApi<A> &
    ExtractHiddenApi<B> &
    ExtractHiddenApi<C> &
    ExtractHiddenApi<D> &
    ExtractHiddenApi<E> &
    ExtractHiddenApi<F> &
    ExtractHiddenApi<G> &
    ExtractHiddenApi<H> &
    ExtractHiddenApi<I> &
    ExtractHiddenApi<J> &
    ExtractHiddenApi<K> &
    ExtractHiddenApi<L> &
    ExtractHiddenApi<M> &
    ExtractHiddenApi<N> &
    ExtractHiddenApi<O> &
    ExtractHiddenApi<P>,
  Parameters<ExtractApi<A>[`setSettings`]>[0] &
    Parameters<ExtractApi<B>[`setSettings`]>[0] &
    Parameters<ExtractApi<C>[`setSettings`]>[0] &
    Parameters<ExtractApi<D>[`setSettings`]>[0] &
    Parameters<ExtractApi<E>[`setSettings`]>[0] &
    Parameters<ExtractApi<F>[`setSettings`]>[0] &
    Parameters<ExtractApi<G>[`setSettings`]>[0] &
    Parameters<ExtractApi<H>[`setSettings`]>[0] &
    Parameters<ExtractApi<I>[`setSettings`]>[0] &
    Parameters<ExtractApi<J>[`setSettings`]>[0] &
    Parameters<ExtractApi<K>[`setSettings`]>[0] &
    Parameters<ExtractApi<L>[`setSettings`]>[0] &
    Parameters<ExtractApi<M>[`setSettings`]>[0] &
    Parameters<ExtractApi<N>[`setSettings`]>[0] &
    Parameters<ExtractApi<O>[`setSettings`]>[0] &
    Parameters<ExtractApi<P>[`setSettings`]>[0],
  ExtractApi<A>[`__OutputSettings`] &
    ExtractApi<B>[`__OutputSettings`] &
    ExtractApi<C>[`__OutputSettings`] &
    ExtractApi<D>[`__OutputSettings`] &
    ExtractApi<E>[`__OutputSettings`] &
    ExtractApi<F>[`__OutputSettings`] &
    ExtractApi<G>[`__OutputSettings`] &
    ExtractApi<H>[`__OutputSettings`] &
    ExtractApi<I>[`__OutputSettings`] &
    ExtractApi<J>[`__OutputSettings`] &
    ExtractApi<K>[`__OutputSettings`] &
    ExtractApi<L>[`__OutputSettings`] &
    ExtractApi<M>[`__OutputSettings`] &
    ExtractApi<N>[`__OutputSettings`] &
    ExtractApi<O>[`__OutputSettings`] &
    ExtractApi<P>[`__OutputSettings`]
>

export function composeEnhancer<A extends ComposableEnhancer>(a: A): ComposeEnhancer<A>
export function composeEnhancer<A extends ComposableEnhancer, B extends ComposableEnhancer>(a: A, b: B): ComposeEnhancer<A, B>
export function composeEnhancer<A extends ComposableEnhancer, B extends ComposableEnhancer, C extends ComposableEnhancer>(
  a: A,
  b: B,
  c: C
): ComposeEnhancer3<A, B, C>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer
>(a: A, b: B, c: C, d: D): ComposeEnhancer<A, B, C, D>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E): ComposeEnhancer<A, B, C, D, E>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F): ComposeEnhancer<A, B, C, D, E, F>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ComposeEnhancer<A, B, C, D, E, F, G>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ComposeEnhancer<A, B, C, D, E, F, G, H>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): ComposeEnhancer<A, B, C, D, E, F, G, H, I>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer,
  L extends ComposableEnhancer
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer,
  L extends ComposableEnhancer,
  M extends ComposableEnhancer
>(
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
  j: J,
  k: K,
  l: L,
  m: M
): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer,
  L extends ComposableEnhancer,
  M extends ComposableEnhancer,
  N extends ComposableEnhancer
>(
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
  j: J,
  k: K,
  l: L,
  m: M,
  n: N
): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer,
  L extends ComposableEnhancer,
  M extends ComposableEnhancer,
  N extends ComposableEnhancer,
  O extends ComposableEnhancer
>(
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
  j: J,
  k: K,
  l: L,
  m: M,
  n: N,
  o: O
): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>
export function composeEnhancer<
  A extends ComposableEnhancer,
  B extends ComposableEnhancer,
  C extends ComposableEnhancer,
  D extends ComposableEnhancer,
  E extends ComposableEnhancer,
  F extends ComposableEnhancer,
  G extends ComposableEnhancer,
  H extends ComposableEnhancer,
  I extends ComposableEnhancer,
  J extends ComposableEnhancer,
  K extends ComposableEnhancer,
  L extends ComposableEnhancer,
  M extends ComposableEnhancer,
  N extends ComposableEnhancer,
  O extends ComposableEnhancer,
  P extends ComposableEnhancer
>(
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
  j: J,
  k: K,
  l: L,
  m: M,
  n: N,
  o: O,
  p: P
): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>
export function composeEnhancer(...funcs: any[]) {
  return compose(...funcs)
}
