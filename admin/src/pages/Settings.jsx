import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  BadgeDollarSign,
  CreditCard,
  ImagePlus,
  Save,
  Smartphone,
  Upload,
} from "lucide-react";
import { ErrorState, Loading, PageHeader } from "../components/UI.jsx";
import { useApi } from "../hooks/useApi.js";
import api, { errorMessage } from "../services/api.js";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimalFromCents = (value) => (Number(value || 0) / 100).toFixed(2);
const centsFromDecimal = (value) => Math.round(Number(value || 0) * 100);

export default function Settings() {
  const resource = useApi("/admin/app-config");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resource.data) return;
    setForm({
      ...resource.data,
      pixPrice: decimalFromCents(resource.data.pixPriceCents),
      cardBasePrice: decimalFromCents(resource.data.cardBasePriceCents),
    });
  }, [resource.data]);

  const preview = useMemo(() => {
    if (!form) return null;
    const baseCents = centsFromDecimal(form.cardBasePrice);
    const interestCents = Math.round(
      baseCents * (Number(form.cardInterestPercent || 0) / 100),
    );
    const totalCents = baseCents + interestCents;
    const configuredInstallments = Math.max(1, Number(form.cardInstallments || 1));
    const installments = Math.min(
      configuredInstallments,
      Math.max(1, Math.floor(totalCents / 500)),
    );
    return {
      pixCents: centsFromDecimal(form.pixPrice),
      interestCents,
      totalCents,
      installmentCents: Math.round(totalCents / installments),
      installments,
    };
  }, [form]);

  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const upload = async (file, field) => {
    if (!file) return;
    setUploading(field);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await api.post("/uploads", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      change(field, data.url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading("");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { plan: _plan, pixPrice, cardBasePrice, createdAt: _createdAt, updatedAt: _updatedAt, id: _id, ...data } = form;
      const response = await api.put("/admin/app-config", {
        ...data,
        pixPriceCents: centsFromDecimal(pixPrice),
        cardBasePriceCents: centsFromDecimal(cardBasePrice),
        planDurationMonths: Number(data.planDurationMonths),
        cardInstallments: Number(data.cardInstallments),
        cardInterestPercent: Number(data.cardInterestPercent),
      });
      resource.setData(response.data);
      setMessage("Configurações publicadas no aplicativo.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (resource.error) return <ErrorState message={resource.error} retry={resource.reload} />;
  if (resource.loading || !form) return <Loading label="Carregando configurações..." />;

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="CONTROLE DO APLICATIVO"
        title="Configurações do app"
        description="Atualize a identidade visual, os banners e o preço apresentado às clientes."
        action={
          <button className="button primary" disabled={saving || Boolean(uploading)}>
            <Save /> {saving ? "Publicando..." : "Salvar e publicar"}
          </button>
        }
      />

      {error && <div className="form-error settings-feedback">{error}</div>}
      {message && <div className="form-success settings-feedback">{message}</div>}

      <div className="settings-layout">
        <div className="settings-main">
          <SettingsSection icon={AppWindow} eyebrow="IDENTIDADE" title="Textos do aplicativo">
            <div className="settings-fields">
              <Field label="Nome do aplicativo" value={form.appName} onChange={(value) => change("appName", value)} />
              <Field label="Chamada pequena do login" value={form.loginEyebrow} onChange={(value) => change("loginEyebrow", value)} />
              <Field label="Título principal do login" value={form.loginHeadline} onChange={(value) => change("loginHeadline", value)} full />
              <Field label="Descrição do login" value={form.loginSubtitle} onChange={(value) => change("loginSubtitle", value)} full />
              <Field label="Texto sobre o banner inicial" value={form.homeBannerLabel} onChange={(value) => change("homeBannerLabel", value)} full />
            </div>
          </SettingsSection>

          <SettingsSection icon={ImagePlus} eyebrow="IMAGENS" title="Login e banners">
            <div className="settings-media-grid">
              <ImageField title="Imagem do login" hint="Tela de entrada do aplicativo e painel" field="loginImageUrl" value={form.loginImageUrl} uploading={uploading} upload={upload} change={change} />
              <ImageField title="Banner da página inicial" hint="Destaque acima do programa da cliente" field="homeBannerUrl" value={form.homeBannerUrl} uploading={uploading} upload={upload} change={change} />
              <ImageField title="Banner do pagamento" hint="Capa da oferta antes do checkout" field="paymentBannerUrl" value={form.paymentBannerUrl} uploading={uploading} upload={upload} change={change} />
            </div>
          </SettingsSection>

          <SettingsSection icon={BadgeDollarSign} eyebrow="PLANO E PAGAMENTO" title="Plano de acesso">
            <div className="settings-fields">
              <Field label="Nome do plano" value={form.planTitle} onChange={(value) => change("planTitle", value)} />
              <NumberField label="Duração do acesso (meses)" value={form.planDurationMonths} min="1" max="60" step="1" onChange={(value) => change("planDurationMonths", value)} />
              <Field label="Descrição curta" value={form.planDescription} onChange={(value) => change("planDescription", value)} full />
              <NumberField label="Preço total no Pix (R$)" value={form.pixPrice} min="1" step="0.01" onChange={(value) => change("pixPrice", value)} />
              <NumberField label="Preço-base no cartão (R$)" value={form.cardBasePrice} min="1" step="0.01" onChange={(value) => change("cardBasePrice", value)} />
              <NumberField label="Máximo de parcelas no cartão" value={form.cardInstallments} min="1" max="21" step="1" onChange={(value) => change("cardInstallments", value)} />
              <NumberField label="Juros total do cartão (%)" value={form.cardInterestPercent} min="0" max="999.99" step="0.01" onChange={(value) => change("cardInterestPercent", value)} />
              <p className="form-helper full">O percentual é aplicado uma vez sobre o preço-base. O Asaas exige parcela mínima de R$ 5,00; se o total não comportar o máximo configurado, o app reduz automaticamente a quantidade de parcelas.</p>
            </div>
          </SettingsSection>
        </div>

        <aside className="settings-preview">
          <div className="settings-preview__head">
            <Smartphone />
            <div><small>PRÉVIA PARA A CLIENTE</small><strong>Oferta no aplicativo</strong></div>
          </div>
          {form.paymentBannerUrl && <img src={form.paymentBannerUrl} alt="Prévia do banner de pagamento" />}
          <span>{form.planDurationMonths} MESES DE ACESSO</span>
          <h3>{form.planTitle}</h3>
          <p>{form.planDescription}</p>
          <div className="settings-price-option settings-price-option--featured">
            <div><strong>Pix</strong><small>pagamento à vista</small></div>
            <b>{money.format(preview.pixCents / 100)}</b>
          </div>
          <div className="settings-price-option">
            <div><strong><CreditCard /> Cartão</strong><small>até {preview.installments}x de {money.format(preview.installmentCents / 100)}</small></div>
            <b>{money.format(preview.totalCents / 100)}</b>
          </div>
          <div className="settings-interest">
            {Number(form.cardInterestPercent) > 0
              ? `${form.cardInterestPercent}% de juros · ${money.format(preview.interestCents / 100)} já incluídos no total`
              : "Cartão sem juros"}
          </div>
        </aside>
      </div>
    </form>
  );
}

function SettingsSection({ icon: Icon, eyebrow, title, children }) {
  return <section className="settings-section"><header><span><Icon /></span><div><small>{eyebrow}</small><h3>{title}</h3></div></header>{children}</section>;
}

function Field({ label, value, onChange, full }) {
  return <label className={full ? "full" : ""}><span>{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function NumberField({ label, value, onChange, ...props }) {
  return <label><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(event.target.value)} required {...props} /></label>;
}

function ImageField({ title, hint, field, value, uploading, upload, change }) {
  return (
    <article className="settings-media">
      <div className="settings-media__preview">{value ? <img src={value} alt="" /> : <ImagePlus />}</div>
      <div><strong>{title}</strong><small>{hint}</small></div>
      <input type="url" placeholder="https://..." value={value || ""} onChange={(event) => change(field, event.target.value)} />
      <label className="file-button"><Upload /> {uploading === field ? "Enviando..." : "Fazer upload"}<input type="file" accept="image/*" disabled={Boolean(uploading)} onChange={(event) => upload(event.target.files?.[0], field)} /></label>
    </article>
  );
}
