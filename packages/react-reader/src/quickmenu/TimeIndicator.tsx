import { Text, type TextProps } from "@chakra-ui/react"
import { useEffect, useState } from "react"

export const useTime = () => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000 * 60)

    return () => clearInterval(interval)
  }, [])

  return time
}

export const TimeIndicator = (props: TextProps) => {
  const time = useTime()

  return (
    <Text fontSize="md" {...props}>
      {time.toLocaleTimeString(navigator.language, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </Text>
  )
}
