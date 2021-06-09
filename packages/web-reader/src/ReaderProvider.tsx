import { createContext, useContext } from "react";
import { ReaderInstance } from "./types";

export const ReaderContext = createContext<ReaderInstance | undefined>(undefined)

export const useReader = () => useContext(ReaderContext)