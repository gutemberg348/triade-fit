import {
  Activity,
  BookOpen,
  CheckCircle2,
  Clock3,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useApi } from "../hooks/useApi.js";
import { ErrorState, Loading, PageHeader } from "../components/UI.jsx";

const metricDefinitions = [
  ["totalStudents", "Total de alunos", Users, "base cadastrada"],
  ["activeStudents", "Alunos ativos", Activity, "em acompanhamento"],
  ["totalLessons", "Aulas", BookOpen, "conteúdos criados"],
  ["completedLessons", "Conclusões", CheckCircle2, "aulas concluídas"],
  ["newStudents", "Novos alunos", UserPlus, "últimos 30 dias"],
  ["totalModules", "Módulos", TrendingUp, "jornadas organizadas"],
];
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export default function Dashboard() {
  const { data, loading, error, reload } = useApi("/admin/dashboard");
  if (loading) return <Loading label="Preparando seu panorama..." />;
  if (error) return <ErrorState message={error} retry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="VISÃO GERAL"
        title="Seu estúdio em movimento"
        description="Acompanhe o que importa e escolha onde concentrar sua atenção hoje."
      />
      <div className="metric-grid">
        {metricDefinitions.map(([key, label, Icon, detail], index) => (
          <article
            className={`metric-card ${index === 0 ? "metric-card--featured" : ""}`}
            key={key}
          >
            <div className="metric-card__icon">
              <Icon />
            </div>
            <div>
              <span>{label}</span>
              <strong>{String(data.metrics[key]).padStart(2, "0")}</strong>
              <small>{detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel__header">
            <div>
              <small>ATIVIDADE RECENTE</small>
              <h3>Últimos acessos</h3>
            </div>
            <Clock3 />
          </header>
          <div className="activity-list">
            {data.recentLogins.length ? (
              data.recentLogins.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="avatar-mini">{item.name.charAt(0)}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>Acessou em {dateTime(item.lastLoginAt)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Nenhum acesso registrado ainda.</p>
            )}
          </div>
        </section>
        <section className="panel panel--copper">
          <header className="panel__header">
            <div>
              <small>ACOMPANHAMENTO</small>
              <h3>Últimas avaliações</h3>
            </div>
            <Sparkles />
          </header>
          <div className="activity-list">
            {data.recentMeasurements.length ? (
              data.recentMeasurements.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="avatar-mini">
                    {item.student.user.name.charAt(0)}
                  </span>
                  <div>
                    <strong>{item.student.user.name}</strong>
                    <small>
                      {item.weightKg ? `${item.weightKg} kg` : "Nova avaliação"}{" "}
                      · {dateTime(item.measuredAt)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Nenhuma avaliação cadastrada.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
