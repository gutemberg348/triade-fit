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

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-error-boundary">
        <section>
          <span>PAINEL TRIADE FIT</span>
          <h1>Não foi possível abrir esta tela.</h1>
          <p>
            A sessão local ou uma atualização anterior pode ter ficado
            incompatível. Limpe a sessão e entre novamente.
          </p>
          {import.meta.env.DEV && (
            <pre className="app-error-boundary__detail">
              {this.state.error?.message}
            </pre>
          )}
          <button className="button primary" onClick={this.clearSessionAndReload}>
            Limpar sessão e entrar
          </button>
        </section>
      </main>
    );
  }
}
