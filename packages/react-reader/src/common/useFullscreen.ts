import { useEffect } from "react"

import { useCallback } from "react"

import { useState } from "react"

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const onToggleFullscreenClick = useCallback(() => {
    if (document.fullscreenElement) {
      return document
        .exitFullscreen()
        .catch(console.error)
        .then(() => {
          setIsFullscreen(false)
        })
    }

    return document.documentElement
      .requestFullscreen({ navigationUI: "hide" })
      .catch(console.error)
      .then(() => {
        setIsFullscreen(true)
      })
  }, [])

  useEffect(() => {
    function fullscreenchangeHandler() {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", fullscreenchangeHandler)

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenchangeHandler)
    }
  }, [])

  return {
    isFullscreen,
    onToggleFullscreenClick,
  }
}
