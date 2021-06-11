import React from 'react'

export const Button = ({ children, style, ...rest }: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => {
  return (
    <button {...rest} style={{ padding: 5, paddingLeft: 10, paddingRight: 10, ...style }}>
      {children}
    </button>
  )
}