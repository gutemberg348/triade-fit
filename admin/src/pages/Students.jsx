import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../services/api.js";
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
export default function Students() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
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
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
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
      setError(errorMessage(err));
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
          <button className="button primary" onClick={() => setModal(true)}>
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
            <button className="button primary" onClick={() => setModal(true)}>
              <UserPlus /> Cadastrar aluno
            </button>
          }
        />
      )}
      {modal && (
        <Modal title="Novo aluno" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={submit}>
            {error && <div className="form-error full">{error}</div>}
            <label className="full">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              <span>Data de nascimento</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
              />
            </label>
            <label>
              <span>Senha inicial</span>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <label className="full">
              <span>Objetivo</span>
              <textarea
                value={form.objective}
                onChange={(e) =>
                  setForm({ ...form, objective: e.target.value })
                }
                rows="3"
              />
            </label>
            <div className="form-actions full">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(false)}
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
