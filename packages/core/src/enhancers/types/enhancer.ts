/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CreateReaderParameters, ReaderInternal } from "../../reader"

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EnhancerOutput<Enhancer extends (options: any) => any> = ReturnType<
  ReturnType<Enhancer>
>
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EnhancerOptions<Enhancer extends (options: any) => any> =
  Parameters<ReturnType<Enhancer>>[0]

export type RootEnhancer<
  Options extends CreateReaderParameters = CreateReaderParameters,
  Reader extends ReaderInternal = ReaderInternal,
> = (next: (options: Options) => Reader) => (options: Options) => Reader

export const rootEnhancer =
  <Options extends CreateReaderParameters, Reader extends ReaderInternal>(
    next: (options: Options) => Reader,
  ) =>
  (options: Options): Reader => {
    const reader = next(options)

    return reader
  }
