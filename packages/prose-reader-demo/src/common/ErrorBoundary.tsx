import React, { ReactNode } from "react"

type Props = {
  children: ReactNode
}
type State = {
  error: any
  errorInfo: any
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { error: error, errorInfo: error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(error)
    console.error(errorInfo)
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return (
        <div>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      )
    }
    // Normally, just render children
    return this.props.children
  }
}
