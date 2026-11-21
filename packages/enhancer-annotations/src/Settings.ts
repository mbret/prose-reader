import { ReactiveEntity } from "@prose-reader/core"
import type { AnnotationsEnhancerOptions } from "./types.ts"

export class Settings extends ReactiveEntity<AnnotationsEnhancerOptions> {
  update(settings: AnnotationsEnhancerOptions) {
    super.mergeCompare(settings)
  }
}
