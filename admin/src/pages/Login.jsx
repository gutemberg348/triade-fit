import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { errorMessage } from "../services/api.js";
import api from "../services/api.js";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appConfig, setAppConfig] = useState(null);
  useEffect(() => {
    api.get("/app-config").then(({ data }) => setAppConfig(data)).catch(() => null);
  }, []);
  if (user?.role === "ADMIN") return <Navigate to="/dashboard" replace />;
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <section
        className="login-art"
        style={appConfig?.loginImageUrl ? { backgroundImage: `url("${appConfig.loginImageUrl}")` } : undefined}
      >
        <div className="login-art__copy">
          <span>{appConfig?.loginEyebrow || "ACOMPANHAMENTO QUE TRANSFORMA"}</span>
          <h1>
            Gestão leve para uma evolução <em>consistente.</em>
          </h1>
          <p>
            Organize alunos, treinos e avaliações em uma experiência tão
            cuidadosa quanto o seu atendimento.
          </p>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit}>
          <Brand />
          <div className="login-heading">
            <small>ÁREA DA PERSONAL</small>
            <h2>Bem-vinda de volta</h2>
            <p>Entre para acompanhar suas alunas.</p>
          </div>
          {error && <div className="form-error">{error}</div>}
          <label>
            <span>E-mail</span>
            <div className="field">
              <Mail />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </label>
          <label>
            <span>Senha</span>
            <div className="field">
              <LockKeyhole />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
          </label>
          <button className="button primary button--full" disabled={loading}>
            {loading ? (
              "Entrando..."
            ) : (
              <>
                Entrar no painel <ArrowRight />
              </>
            )}
          </button>
          <p className="login-help">
            Acesso inicial configurado pelo seed do projeto.
          </p>
        </form>
      </section>
    </main>
  );
}
