import { Component } from "react"

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: "#ffb199", padding: 20, whiteSpace: "pre-wrap" }}>
          Something crashed:{"\n\n"}
          {String(this.state.error?.stack || this.state.error)}
        </pre>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary