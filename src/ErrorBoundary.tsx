import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Falha inesperada no frontend.", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          <div className="error-boundary-panel">
            <h1>Nao foi possivel abrir esta tela</h1>
            <p>Seus dados nao foram apagados. Recarregue o aplicativo para tentar novamente.</p>
            <button type="button" className="button-primary" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
