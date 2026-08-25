import { LoaderCircle, X } from "lucide-react";

export function Loading({ label = "Carregando..." }) {
  return (
    <div className="loading">
      <LoaderCircle />
      {label}
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-state">
      <strong>Algo saiu do esperado</strong>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function StatusBadge({ value }) {
  const names = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    ARCHIVED: "Arquivado",
    PUBLISHED: "Publicado",
    DRAFT: "Rascunho",
    COMPLETED: "Concluído",
    PAUSED: "Pausado",
    PENDING_PAYMENT: "Aguardando pagamento",
    OVERDUE: "Pagamento pendente",
    BLOCKED: "Acesso bloqueado",
    CANCELLED: "Cancelado",
  };
  return (
    <span className={`status status--${value?.toLowerCase()}`}>
      {names[value] || value}
    </span>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button
        className="modal-backdrop"
        onClick={onClose}
        aria-label="Fechar"
      />
      <section className={`modal-card ${wide ? "modal-card--wide" : ""}`}>
        <header>
          <div>
            <small>TRIADE FIT</small>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
