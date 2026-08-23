import { useEffect, useState } from "react"

export const useServiceWorkerReady = () => {
  const [ready, setReady] = useState(
    () => !!navigator.serviceWorker?.controller,
  )

  useEffect(() => {
    if (navigator.serviceWorker?.controller) {
      setReady(true)
      return
    }

    const onControllerChange = () => {
      setReady(true)
    }

    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      onControllerChange,
    )

    return () => {
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        onControllerChange,
      )
    }
  }, [])

  return ready
}
