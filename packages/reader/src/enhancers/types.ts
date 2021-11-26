import { Observable, ObservedValueOf } from "rxjs"
import { Reader, createReader } from "../reader"

// type AnyObject = Record<string, any>
type AnyObject = Record<string, any>

/** Makes each property optional and turns each leaf property into any, allowing for type overrides by narrowing any. */
type DeepPartialAny<T> = {
  [P in keyof T]?: T[P] extends AnyObject ? DeepPartialAny<T[P]> : any
}

// @todo add observable ? right now they get merged
type Primitive = number | string | ((...args: any) => any)

type ModifyDeep<A extends AnyObject, B extends DeepPartialAny<A>> = {
  [K in keyof A]-?: B[K] extends never
  ? A[K]
  : B[K] extends Function
  ? B[K]
  : B[K] extends AnyObject
  ? ModifyDeep<A[K], B[K]>
  : B[K] extends Primitive ? B[K] : A[K]
} & (A extends AnyObject ? Omit<B, keyof A> : A)

type ReaderOptions = Parameters<typeof createReader>[0]

type CreateReader = (options: ReaderOptions) => Reader

type RawEnhancer = (createReader: CreateReader) => (options: ReaderOptions) => Reader

export type ExtractOptions<E extends (...args: any) => (options: any) => any> = Parameters<ReturnType<E>>[0]
export type ExtractApi<E extends (...args: any) => (options: any) => any> = ReturnType<ReturnType<E>>
export type ExtractHiddenApi<E extends (...args: any) => (options: any) => any> = NonNullable<ReturnType<ReturnType<E>>[`__API`]>

export type Enhancer<Options = {}, Api = {}, Settings = {}, OutputSettings = Settings, DependsOn extends Enhancer<any, any, any> = RawEnhancer> =
  (
    createReader: (options: ExtractOptions<DependsOn>) =>
      Omit<ReturnType<ReturnType<DependsOn>>, `__API` | `__OutputSettings`>
  ) =>
    (options: ExtractOptions<DependsOn> & Options) =>
      ModifyDeep<Omit<ExtractApi<DependsOn>, `__API` | `__OutputSettings` | `$`>, {
        /**
         * special case for prose and to automatically extends settings.
         * - add correct type for enhancer inside setSettings parameter
         * - add correct type for end user using the enhancer
         */
        setSettings: (settings: Parameters<ExtractApi<DependsOn>[`setSettings`]>[0] & Settings) => void
        $: Omit<ExtractApi<DependsOn>[`$`], `settings$`> & {
          /**
           * special case for prose and to automatically merge settings output stream.
           * - add correct type for enhancer dependances
           * - add correct type for the combined final enhancer API
           */
          settings$: Observable<OutputSettings & ObservedValueOf<ExtractApi<DependsOn>[`$`][`settings$`]>>
        }
      } & Api>
      & { __API?: Api, __OutputSettings?: OutputSettings }
