/**
 * Standard EPUB CFIs that target a content document first address the
 * package document spine element.
 *
 * EPUB package documents order their element children as metadata, manifest, then spine.
 * CFI element steps are even-numbered, so the third element child is step 6.
 */
export const EPUB_CFI_PACKAGE_SPINE_STEP_INDEX = 6
