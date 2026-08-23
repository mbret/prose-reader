import { useEffect } from "react"
import { registerServiceWorker } from "./registerServiceWorker"

export const useRegisterServiceWorker = () => {
  useEffect(() => {
    registerServiceWorker()
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.error("SW registration failed: ", registrationError)
      })
  }, [])
}
