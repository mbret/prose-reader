import { createAddStyleHelper, createRemoveStyleHelper } from "../../frames"

// @todo redo
export const createFrameManipulator = (frameElement: HTMLIFrameElement) => ({
  frame: frameElement,
  removeStyle: createRemoveStyleHelper(frameElement),
  addStyle: createAddStyleHelper(frameElement),
})
