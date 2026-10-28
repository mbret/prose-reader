import { Field as ChakraField } from "@chakra-ui/react"
import * as React from "react"

export interface FieldProps extends Omit<ChakraField.RootProps, "label"> {
  label?: React.ReactNode
  helperText?: React.ReactNode
  helperTextPosition?: "top" | "bottom"
  errorText?: React.ReactNode
  optionalText?: React.ReactNode
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  function Field(props, ref) {
    const {
      label,
      children,
      helperText,
      errorText,
      optionalText,
      helperTextPosition = "bottom",
      ...rest
    } = props
    return (
      <ChakraField.Root ref={ref} {...rest}>
        {label && (
          <ChakraField.Label>
            {label}
            <ChakraField.RequiredIndicator fallback={optionalText} />
          </ChakraField.Label>
        )}
        {helperText && helperTextPosition === "top" && (
          <ChakraField.HelperText>{helperText}</ChakraField.HelperText>
        )}
        {children}
        {helperText && helperTextPosition === "bottom" && (
          <ChakraField.HelperText>{helperText}</ChakraField.HelperText>
        )}
        {errorText && (
          <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>
        )}
      </ChakraField.Root>
    )
  },
)
