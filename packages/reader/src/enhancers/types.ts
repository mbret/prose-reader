import { createReader } from "../reader"

type Reader = ReturnType<typeof createReader>
type CreateReaderOption = Parameters<typeof createReader>[0]
type CreateReader<O = CreateReaderOption, API = Reader> = (options: O) => API

type InitialEnhancer = (_createReader: CreateReader) => (options: Parameters<CreateReader>[0] & CreateReaderOption) => ReturnType<CreateReader>

export type Enhancer<
  Options = {},
  API = {},
  DependsOn extends Enhancer<any, any, any> = InitialEnhancer,
  > = (createReader: ReturnType<DependsOn>) =>
    (options: Parameters<ReturnType<DependsOn>>[0] & Options) =>
      ReturnType<ReturnType<DependsOn>> & API

export type ReaderInternalApi = ReturnType<CreateReader>
