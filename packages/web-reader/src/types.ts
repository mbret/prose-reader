import { ComponentProps } from "react"
import { Reader as ReactReader } from "@oboku/reader-react";

type ReactReaderProps = ComponentProps<typeof ReactReader>

export type Reader = Parameters<NonNullable<ReactReaderProps['onReader']>>[0]
export type Manifest = NonNullable<ReactReaderProps['manifest']>