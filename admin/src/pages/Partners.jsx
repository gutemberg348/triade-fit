import { useState } from "react";
import { CircleDollarSign, Handshake, Plus } from "lucide-react";
import api, { errorMessage } from "../services/api.js";
import { useApi } from "../hooks/useApi.js";
import { EmptyState, ErrorState, Loading, Modal, PageHeader, StatusBadge } from "../components/UI.jsx";

const money = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

export default function Partners() {
  const { data, loading, error, reload } = useApi("/admin/partners");
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Crédito manual aprovado pela administração");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const openCredit = (partner) => {
    setSelected(partner);
    setAmount("");
    setDescription("Crédito manual aprovado pela administração");
    setFormError("");
  };
  const credit = async (event) => {
    event.preventDefault();
    const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post(`/admin/partners/${selected.id}/credits`, { amountCents, description });
      setSelected(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loading label="Carregando parceiros..." />;
  if (error) return <ErrorState message={error} retry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="INDICAÇÕES E COMISSÕES"
        title="Parceiros e saldo"
        description="Escolha clientes como parceiros na ficha do aluno. O saldo entra quando o acesso indicado for liberado."
      />
      {data.length ? (
        <div className="table-card">
          <table>
            <thead><tr><th>Parceiro</th><th>Código</th><th>Indicações</th><th>Saldo</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.map((partner) => (
                <tr key={partner.id}>
                  <td><div className="student-cell"><span className="avatar-mini">{partner.student.user.name.charAt(0)}</span><div><strong>{partner.student.user.name}</strong><small>{partner.student.user.email}</small></div></div></td>
                  <td><code>{partner.referralCode}</code></td>
                  <td>{partner._count.referrals} cadastrada{partner._count.referrals === 1 ? "" : "s"} · {partner.referrals.length} aprovada{partner.referrals.length === 1 ? "" : "s"}</td>
                  <td><strong>{money(partner.balanceCents)}</strong></td>
                  <td><StatusBadge value={partner.active ? "ACTIVE" : "INACTIVE"} /></td>
                  <td><button className="button secondary" onClick={() => openCredit(partner)}><Plus /> Lançar saldo</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum parceiro selecionado" text="Abra a ficha de um aluno e use “Tornar parceiro” para criar a conta de indicação." />
      )}
      {selected && (
        <Modal title={`Lançar saldo · ${selected.student.user.name}`} onClose={() => setSelected(null)}>
          <form className="form-grid" onSubmit={credit}>
            {formError && <div className="form-error full">{formError}</div>}
            <label className="full"><span>Valor (R$)</span><input inputMode="decimal" placeholder="0,00" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label className="full"><span>Motivo</span><input value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
            <div className="form-actions full"><button type="button" className="button secondary" onClick={() => setSelected(null)}>Cancelar</button><button className="button primary" disabled={saving}><CircleDollarSign /> {saving ? "Lançando..." : "Confirmar crédito"}</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
