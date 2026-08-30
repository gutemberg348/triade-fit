import React, { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erro ao renderizar o painel Triade FIT:", error, info);
  }

  clearSessionAndReload = () => {
    localStorage.removeItem("essenza.accessToken");
    localStorage.removeItem("essenza.refreshToken");
    localStorage.removeItem("essenza.user");
    window.location.assign("/login");
  };

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-error-boundary">
        <section>
          <span>PAINEL TRIADE FIT</span>
          <h1>Não foi possível abrir esta tela.</h1>
          <p>
            O painel encontrou um dado ou atualização incompatível. Tente abrir
            a tela novamente; se persistir, entre de novo.
          </p>
          {import.meta.env.DEV && (
            <pre className="app-error-boundary__detail">
              {this.state.error?.message}
            </pre>
          )}
          <div className="app-error-boundary__actions">
            <button className="button secondary" onClick={this.retry}>Tentar novamente</button>
            <button className="button primary" onClick={this.clearSessionAndReload}>Entrar novamente</button>
          </div>
        </section>
      </main>
    );
  }
}
