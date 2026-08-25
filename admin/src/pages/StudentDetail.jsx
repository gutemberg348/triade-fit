import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Handshake,
  Mail,
  Phone,
  Plus,
  Ruler,
  Scale,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { errorMessage } from "../services/api.js";
import { useApi } from "../hooks/useApi.js";
import { ErrorState, Loading, Modal, StatusBadge } from "../components/UI.jsx";

const measurementFields = [
  ["weightKg", "Peso (kg)"],
  ["heightCm", "Altura (cm)"],
  ["bodyFatPercent", "Gordura (%)"],
  ["waistCm", "Cintura (cm)"],
  ["abdomenCm", "Abdômen (cm)"],
  ["hipsCm", "Quadril (cm)"],
  ["chestCm", "Peitoral (cm)"],
  ["rightArmCm", "Braço direito"],
  ["leftArmCm", "Braço esquerdo"],
  ["rightThighCm", "Coxa direita"],
  ["leftThighCm", "Coxa esquerda"],
  ["rightCalfCm", "Panturrilha direita"],
  ["leftCalfCm", "Panturrilha esquerda"],
];
const formatDate = (date) =>
  new Intl.DateTimeFormat("pt-BR").format(new Date(date));
export default function StudentDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi(`/admin/students/${id}`);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [studentForm, setStudentForm] = useState({});
  const [partnerForm, setPartnerForm] = useState({});
  const [measurement, setMeasurement] = useState({
    measuredAt: new Date().toISOString().slice(0, 10),
    notes: "",
    ...Object.fromEntries(measurementFields.map(([key]) => [key, ""])),
  });
  if (loading) return <Loading label="Abrindo a jornada do aluno..." />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const student = data;
  const profile = student.studentProfile;
  const latestMeasurement = profile.measurements[0];
  const latestMeasurementDate = latestMeasurement
    ? formatDate(latestMeasurement.measuredAt)
    : "Sem avaliação registrada";
  const summaryItems = [
    {
      icon: Scale,
      label: "Peso atual",
      value: latestMeasurement?.weightKg ?? "—",
      unit: latestMeasurement?.weightKg != null ? "kg" : "",
      detail: latestMeasurement ? `Avaliado em ${latestMeasurementDate}` : "Adicione a primeira avaliação",
    },
    {
      icon: Ruler,
      label: "Cintura",
      value: latestMeasurement?.waistCm ?? "—",
      unit: latestMeasurement?.waistCm != null ? "cm" : "",
      detail: latestMeasurement ? "Medida mais recente" : "Ainda não informada",
    },
    {
      icon: CheckCircle2,
      label: "Aulas concluídas",
      value: profile.lessonProgress.length,
      unit: "aulas",
      detail: "Na jornada atual",
    },
    {
      icon: Camera,
      label: "Fotos de evolução",
      value: profile.progressPhotos.length,
      unit: "fotos",
      detail: profile.progressPhotos.length ? "Comparativo disponível" : "Nenhuma foto adicionada",
    },
  ];
  const chartData = data.evolution.measurements.map((item) => ({
    ...item,
    date: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
      new Date(item.measuredAt),
    ),
  }));
  const submitMeasurement = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api.post(`/admin/students/${id}/measurements`, measurement);
      setModal(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/students/${id}`, {
        status: student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      await reload();
    } finally {
      setSaving(false);
    }
  };
  const togglePlanAccess = async () => {
    const activating = profile.accessStatus !== "ACTIVE";
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    setSaving(true);
    setFormError("");
    try {
      await api.put(`/admin/students/${id}`, {
        accessStatus: activating ? "ACTIVE" : "BLOCKED",
        accessExpiresAt: activating
          ? expiresAt.toISOString().slice(0, 10)
          : null,
      });
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const openStudentEditor = () => {
    setStudentForm({
      name: student.name,
      email: student.email,
      phone: student.phone || "",
      birthDate: student.birthDate?.slice(0, 10) || "",
      objective: profile.objective || "",
      notes: profile.notes || "",
      accessStatus: profile.accessStatus || "PENDING_PAYMENT",
      accessExpiresAt: profile.accessExpiresAt?.slice(0, 10) || "",
    });
    setFormError("");
    setModal("student");
  };
  const openPartnerEditor = () => {
    setPartnerForm({
      active: profile.partnerProfile?.active ?? true,
      referralCode: profile.partnerProfile?.referralCode || "",
      defaultCredit: profile.partnerProfile
        ? String((profile.partnerProfile.defaultCreditCents / 100).toFixed(2)).replace(".", ",")
        : "",
    });
    setFormError("");
    setModal("partner");
  };
  const submitPartner = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const defaultCreditCents = Math.round(Number(partnerForm.defaultCredit.replace(",", ".") || 0) * 100);
      await api.put(`/admin/students/${id}/partner`, {
        active: partnerForm.active,
        referralCode: partnerForm.referralCode || undefined,
        defaultCreditCents,
      });
      setModal(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const submitStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api.put(`/admin/students/${id}`, {
        ...studentForm,
        birthDate: studentForm.birthDate || null,
        accessExpiresAt: studentForm.accessExpiresAt || null,
      });
      setModal(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Link className="back-link" to="/alunos">
        <ArrowLeft /> Voltar para alunos
      </Link>
      <section className="student-hero">
        <div className="student-hero__identity">
          <span className="avatar-large">{student.name.charAt(0)}</span>
          <div className="student-hero__copy">
            <small>FICHA DA ALUNA</small>
            <h2>{student.name}</h2>
            <div className="student-hero__contacts">
              <span><Mail /> {student.email}</span>
              <span><Phone /> {student.phone || "Telefone não informado"}</span>
            </div>
            <div className="student-hero__status">
              <div>
                <small>CONTA</small>
                <StatusBadge value={student.status} />
              </div>
              <div>
                <small>PLANO</small>
                <StatusBadge value={profile.accessStatus} />
              </div>
              <div className="student-hero__date">
                <CalendarDays />
                <span>{profile.accessExpiresAt ? `Acesso até ${formatDate(profile.accessExpiresAt)}` : "Sem data de expiração"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="student-hero__actions">
          <button
            className="button primary student-action-create"
            onClick={() => setModal("measurement")}
          >
            <Plus /> Nova avaliação
          </button>
          <div className="student-action-grid">
            <button className="button secondary student-action" onClick={openStudentEditor} title="Editar dados da aluna">
              <Edit3 /> <span>Editar dados</span>
            </button>
            <button
              className={`button secondary student-action ${profile.accessStatus === "ACTIVE" ? "student-action--warning" : "student-action--accent"}`}
              onClick={togglePlanAccess}
              disabled={saving}
              title={profile.accessStatus === "ACTIVE" ? "Bloquear plano" : "Liberar plano por 12 meses"}
            >
              {profile.accessStatus === "ACTIVE" ? <ShieldOff /> : <ShieldCheck />}
              <span>{profile.accessStatus === "ACTIVE" ? "Bloquear plano" : "Liberar plano"}</span>
            </button>
            <button
              className="button secondary student-action"
              onClick={updateStatus}
              disabled={saving}
              title={student.status === "ACTIVE" ? "Desativar conta" : "Ativar conta"}
            >
              <ShieldCheck /> <span>{student.status === "ACTIVE" ? "Desativar conta" : "Ativar conta"}</span>
            </button>
            <button className="button secondary student-action" onClick={openPartnerEditor} title="Configurar conta parceira">
              <Handshake /> <span>{profile.partnerProfile ? "Conta parceira" : "Tornar parceira"}</span>
            </button>
          </div>
        </div>
      </section>
      <div className="student-summary">
        {summaryItems.map(({ icon: Icon, label, value, unit, detail }) => (
          <article key={label} className="student-summary__card">
            <span className="student-summary__icon"><Icon /></span>
            <div>
              <span>{label}</span>
              <strong>{value} {unit && <small>{unit}</small>}</strong>
              <small className="student-summary__detail">{detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="detail-grid">
        <section className="panel chart-panel">
          <header className="panel__header">
            <div>
              <small>EVOLUÇÃO CORPORAL</small>
              <h3>Peso ao longo do tempo</h3>
            </div>
            <span className="delta">
              {data.evolution.comparison.weightKg?.change ?? 0} kg
            </span>
          </header>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,235,218,.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#8f8179"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#8f8179" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#241916",
                    border: "1px solid rgba(255,235,218,.1)",
                    borderRadius: 14,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke="#f2b88f"
                  strokeWidth={3}
                  dot={{ fill: "#d98a5f", strokeWidth: 0, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">
              Cadastre avaliações para visualizar o gráfico.
            </p>
          )}
        </section>
        <section className="panel">
          <header className="panel__header">
            <div>
              <small>PLANO ATUAL</small>
              <h3>Programas</h3>
            </div>
          </header>
          <div className="program-mini-list">
            {profile.enrollments.map(({ program, status }) => (
              <div key={program.id}>
                <span>{program.title}</span>
                <StatusBadge value={status} />
              </div>
            ))}
            {!profile.enrollments.length && (
              <p className="muted">Nenhum programa atribuído.</p>
            )}
          </div>
          <div className="profile-notes">
            <small>OBJETIVO</small>
            <p>{profile.objective || "Ainda não informado."}</p>
            <small>OBSERVAÇÕES DA PERSONAL</small>
            <p>{profile.notes || "Nenhuma observação privada."}</p>
          </div>
        </section>
      </div>
      <section className="panel measurements-panel">
        <header className="panel__header">
          <div>
            <small>HISTÓRICO COMPLETO</small>
            <h3>Avaliações corporais</h3>
          </div>
          <button
            className="button secondary"
            onClick={() => setModal("measurement")}
          >
            <Plus /> Adicionar
          </button>
        </header>
        {profile.measurements.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peso</th>
                  <th>IMC</th>
                  <th>Gordura</th>
                  <th>Cintura</th>
                  <th>Quadril</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {profile.measurements.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.measuredAt)}</td>
                    <td>{item.weightKg ? `${item.weightKg} kg` : "—"}</td>
                    <td>{item.bmi || "—"}</td>
                    <td>
                      {item.bodyFatPercent ? `${item.bodyFatPercent}%` : "—"}
                    </td>
                    <td>{item.waistCm ? `${item.waistCm} cm` : "—"}</td>
                    <td>{item.hipsCm ? `${item.hipsCm} cm` : "—"}</td>
                    <td>{item.recordedBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nenhuma avaliação cadastrada.</p>
        )}
      </section>
      {modal === "student" && (
        <Modal title="Editar dados do aluno" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submitStudent}>
            {formError && <div className="form-error full">{formError}</div>}
            <label className="full">
              <span>Nome</span>
              <input
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, name: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={studentForm.email}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                value={studentForm.phone}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, phone: event.target.value })
                }
              />
            </label>
            <label>
              <span>Data de nascimento</span>
              <input
                type="date"
                value={studentForm.birthDate}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    birthDate: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Acesso comercial</span>
              <select
                value={studentForm.accessStatus}
                onChange={(event) => setStudentForm({ ...studentForm, accessStatus: event.target.value })}
              >
                <option value="PENDING_PAYMENT">Aguardando pagamento</option>
                <option value="ACTIVE">Acesso liberado</option>
                <option value="OVERDUE">Pagamento pendente</option>
                <option value="BLOCKED">Acesso bloqueado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <label>
              <span>Acesso até (opcional)</span>
              <input
                type="date"
                value={studentForm.accessExpiresAt}
                onChange={(event) => setStudentForm({ ...studentForm, accessExpiresAt: event.target.value })}
              />
            </label>
            <label className="full">
              <span>Objetivo</span>
              <textarea
                rows="3"
                value={studentForm.objective}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    objective: event.target.value,
                  })
                }
              />
            </label>
            <label className="full">
              <span>Observações privadas</span>
              <textarea
                rows="4"
                value={studentForm.notes}
                onChange={(event) =>
                  setStudentForm({ ...studentForm, notes: event.target.value })
                }
              />
            </label>
            <div className="form-actions full">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "partner" && (
        <Modal title="Conta parceira" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submitPartner}>
            {formError && <div className="form-error full">{formError}</div>}
            <label className="full">
              <span>Código de indicação</span>
              <input
                value={partnerForm.referralCode}
                onChange={(event) => setPartnerForm({ ...partnerForm, referralCode: event.target.value.toUpperCase() })}
                placeholder="Será gerado automaticamente se ficar vazio"
              />
            </label>
            <label>
              <span>Crédito por indicação aprovada (R$)</span>
              <input
                inputMode="decimal"
                value={partnerForm.defaultCredit}
                onChange={(event) => setPartnerForm({ ...partnerForm, defaultCredit: event.target.value })}
                placeholder="0,00"
              />
            </label>
            <label>
              <span>Status do parceiro</span>
              <select
                value={String(partnerForm.active)}
                onChange={(event) => setPartnerForm({ ...partnerForm, active: event.target.value === "true" })}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
            <p className="muted full">O crédito é lançado automaticamente quando a indicação passa para “Acesso liberado”.</p>
            <div className="form-actions full">
              <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar parceiro"}</button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "measurement" && (
        <Modal
          title="Nova avaliação corporal"
          onClose={() => setModal(null)}
          wide
        >
          <form
            className="form-grid form-grid--measurements"
            onSubmit={submitMeasurement}
          >
            {formError && <div className="form-error full">{formError}</div>}
            <label>
              <span>Data da avaliação</span>
              <input
                type="date"
                value={measurement.measuredAt}
                onChange={(e) =>
                  setMeasurement({ ...measurement, measuredAt: e.target.value })
                }
                required
              />
            </label>
            {measurementFields.map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={measurement[key]}
                  onChange={(e) =>
                    setMeasurement({ ...measurement, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="full">
              <span>Observações</span>
              <textarea
                rows="3"
                value={measurement.notes}
                onChange={(e) =>
                  setMeasurement({ ...measurement, notes: e.target.value })
                }
              />
            </label>
            <div className="form-actions full">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar nova avaliação"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
