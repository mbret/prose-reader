import { searchEnhancer } from "@prose-reader/enhancer-search";
import { ReaderInstance } from "./types";

export const useSearch = (_: ReaderInstance | undefined) => {
  return searchEnhancer
}
