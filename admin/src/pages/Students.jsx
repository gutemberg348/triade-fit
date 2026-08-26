import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import api, { errorMessage, validationErrors } from "../services/api.js";
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  StatusBadge,
} from "../components/UI.jsx";

const initialForm = {
  name: "",
  email: "",
  password: "Essenza@2026",
  phone: "",
  objective: "",
  birthDate: "",
};

const FieldError = ({ message }) =>
  message ? <small className="admin-field-error">{message}</small> : null;

export default function Students() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = async () => {
    setError("");
    try {
      const { data: response } = await api.get("/admin/students", {
        params: { search: debounced || undefined, limit: 50 },
      });
      setData(response);
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => {
    load();
  }, [debounced]);
  const openCreate = () => {
    setForm(initialForm);
    setFormError("");
    setFieldErrors({});
    setModal(true);
  };
  const closeCreate = () => {
    if (saving) return;
    setModal(false);
    setFormError("");
    setFieldErrors({});
  };
  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      await api.post("/admin/students", {
        ...form,
        birthDate: form.birthDate || undefined,
        programIds: [],
      });
      setModal(false);
      setForm(initialForm);
      await load();
    } catch (err) {
      setFieldErrors(validationErrors(err));
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="ACOMPANHAMENTO INDIVIDUAL"
        title="Alunos"
        description="Uma visão humana e completa de cada jornada."
        action={
          <button className="button primary" onClick={openCreate}>
            <Plus /> Novo aluno
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <Search />
          <input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>{data?.total || 0} alunos</span>
      </div>
      {!data && !error ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error} retry={load} />
      ) : data.items.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Objetivo</th>
                <th>Status</th>
                <th>Acesso</th>
                <th>Cadastro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((student) => (
                <tr key={student.id}>
                  <td>
                    <Link className="student-cell" to={`/alunos/${student.id}`}>
                      <span className="avatar-mini">
                        {student.name.charAt(0)}
                      </span>
                      <div>
                        <strong>{student.name}</strong>
                        <small>{student.email}</small>
                      </div>
                    </Link>
                  </td>
                  <td>
                    {student.studentProfile?.objective || (
                      <span className="muted">Não informado</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge value={student.status} />
                  </td>
                  <td>
                    <StatusBadge value={student.studentProfile?.accessStatus || "PENDING_PAYMENT"} />
                  </td>
                  <td>
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(student.createdAt),
                    )}
                  </td>
                  <td>
                    <Link className="icon-link" to={`/alunos/${student.id}`}>
                      <ArrowRight />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Nenhum aluno encontrado"
          text="Ajuste sua busca ou cadastre a primeira pessoa desta jornada."
          action={
            <button className="button primary" onClick={openCreate}>
              <UserPlus /> Cadastrar aluno
            </button>
          }
        />
      )}
      {modal && (
        <Modal title="Novo aluno" onClose={closeCreate}>
          <form className="form-grid" onSubmit={submit} noValidate>
            {formError && <div className="form-error full">{formError}</div>}
            <label className={`full ${fieldErrors.name ? "has-error" : ""}`}>
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              <FieldError message={fieldErrors.name} />
            </label>
            <label className={fieldErrors.email ? "has-error" : ""}>
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
              <FieldError message={fieldErrors.email} />
            </label>
            <label className={fieldErrors.phone ? "has-error" : ""}>
              <span>Telefone</span>
              <input
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              <FieldError message={fieldErrors.phone} />
            </label>
            <label className={fieldErrors.birthDate ? "has-error" : ""}>
              <span>Data de nascimento</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => updateForm("birthDate", e.target.value)}
                aria-invalid={Boolean(fieldErrors.birthDate)}
              />
              <FieldError message={fieldErrors.birthDate} />
            </label>
            <label className={fieldErrors.password ? "has-error" : ""}>
              <span>Senha inicial</span>
              <input
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                required
              />
              <FieldError message={fieldErrors.password} />
            </label>
            <label className={`full ${fieldErrors.objective ? "has-error" : ""}`}>
              <span>Objetivo</span>
              <textarea
                value={form.objective}
                onChange={(e) => updateForm("objective", e.target.value)}
                aria-invalid={Boolean(fieldErrors.objective)}
                rows="3"
              />
              <FieldError message={fieldErrors.objective} />
            </label>
            <div className="form-actions full">
              <button
                type="button"
                className="button secondary"
                onClick={closeCreate}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar aluno"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
