import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  BadgeDollarSign,
  BookOpenText,
  BrainCircuit,
  CreditCard,
  ImagePlus,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
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

const THEME_PRESETS = {
  CHAMPAGNE_NUDE: {
    label: "Champagne Nude",
    description: "Claro, leve e acolhedor",
    icon: Sun,
    colors: {
      background: "#F1E3D6",
      cardBackground: "#F8EFE7",
      secondaryBackground: "#E8D3C2",
      button: "#C97D74",
      buttonPressed: "#B96D65",
      title: "#301F19",
      text: "#60483D",
      secondaryText: "#8A6F62",
      border: "#D9C2B2",
      activeIcon: "#B96D65",
      inactiveIcon: "#8A6F62",
    },
  },
  TRIADE_DARK: {
    label: "Triade Escuro",
    description: "Tema original preservado",
    icon: Moon,
    colors: {
      background: "#100B0A",
      cardBackground: "#1C1311",
      secondaryBackground: "#241815",
      button: "#E8885B",
      buttonPressed: "#9E3F22",
      title: "#FFFFFF",
      text: "#E3D2C9",
      secondaryText: "#C9AEA1",
      border: "#4D352B",
      activeIcon: "#E8885B",
      inactiveIcon: "#C9AEA1",
    },
  },
};

const THEME_FIELDS = [
  ["background", "Fundo principal"],
  ["cardBackground", "Fundo dos cards"],
  ["secondaryBackground", "Fundo secundário"],
  ["button", "Botões e destaques"],
  ["buttonPressed", "Botão pressionado / destaque forte"],
  ["title", "Título principal"],
  ["text", "Texto normal"],
  ["secondaryText", "Texto secundario"],
  ["border", "Linhas e bordas"],
  ["activeIcon", "Ícone ativo"],
  ["inactiveIcon", "Ícone inativo"],
];

export default function Settings() {
  const resource = useApi("/admin/app-config");
  const trainingResource = useApi("/admin/training-ai-config");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resource.data || !trainingResource.data) return;
    const preset = resource.data.themePreset || "CHAMPAGNE_NUDE";
    setForm({
      ...resource.data,
      themePreset: preset,
      themeColors: {
        ...THEME_PRESETS[preset]?.colors,
        ...resource.data.themeColors,
      },
      trainingAiPrompt: trainingResource.data.prompt,
      trainingAiKnowledge: trainingResource.data.knowledge,
      pixPrice: decimalFromCents(resource.data.pixPriceCents),
      cardBasePrice: decimalFromCents(resource.data.cardBasePriceCents),
    });
  }, [resource.data, trainingResource.data]);

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

  const selectTheme = (themePreset) =>
    setForm((current) => ({
      ...current,
      themePreset,
      themeColors: { ...THEME_PRESETS[themePreset].colors },
    }));

  const changeThemeColor = (field, value) =>
    setForm((current) => ({
      ...current,
      themeColors: { ...current.themeColors, [field]: value.toUpperCase() },
    }));

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
      const {
        plan: _plan,
        pixPrice,
        cardBasePrice,
        trainingAiPrompt,
        trainingAiKnowledge,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        id: _id,
        ...data
      } = form;
      const [response, trainingResponse] = await Promise.all([
        api.put("/admin/app-config", {
          ...data,
          pixPriceCents: centsFromDecimal(pixPrice),
          cardBasePriceCents: centsFromDecimal(cardBasePrice),
          planDurationMonths: Number(data.planDurationMonths),
          cardInstallments: Number(data.cardInstallments),
          cardInterestPercent: Number(data.cardInterestPercent),
        }),
        api.put("/admin/training-ai-config", {
          prompt: trainingAiPrompt,
          knowledge: trainingAiKnowledge,
        }),
      ]);
      resource.setData(response.data);
      trainingResource.setData(trainingResponse.data);
      setMessage("Configurações e conhecimento da Luna publicados.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (resource.error || trainingResource.error)
    return <ErrorState message={resource.error || trainingResource.error} retry={() => { resource.reload(); trainingResource.reload(); }} />;
  if (resource.loading || trainingResource.loading || !form)
    return <Loading label="Carregando configurações..." />;

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

          <SettingsSection icon={Palette} eyebrow="APARÊNCIA" title="Tema e cores do aplicativo">
            <p className="settings-theme-intro">Escolha uma base e visualize o resultado antes de publicar. O tema escuro original permanece salvo como opção de reserva.</p>
            <div className="settings-theme-presets">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                const Icon = preset.icon;
                const selected = form.themePreset === key;
                return (
                  <button key={key} type="button" className={`settings-theme-preset${selected ? " is-selected" : ""}`} onClick={() => selectTheme(key)}>
                    <span className="settings-theme-preset__icon" style={{ background: preset.colors.background, color: preset.colors.activeIcon, borderColor: preset.colors.border }}><Icon /></span>
                    <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
                    <span className="settings-theme-swatches">
                      {[preset.colors.background, preset.colors.cardBackground, preset.colors.button, preset.colors.title].map((color) => <i key={color} style={{ background: color }} />)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="settings-theme-editor">
              <div className="settings-color-grid">
                {THEME_FIELDS.map(([field, label]) => (
                  <ColorField key={field} label={label} value={form.themeColors[field]} onChange={(value) => changeThemeColor(field, value)} />
                ))}
                <button type="button" className="settings-theme-reset" onClick={() => selectTheme(form.themePreset)}><RotateCcw /> Restaurar cores de {THEME_PRESETS[form.themePreset].label}</button>
              </div>
              <ThemePreview colors={form.themeColors} />
            </div>
          </SettingsSection>

          <SettingsSection icon={BrainCircuit} eyebrow="LUNA TREINOS" title="Prompt e conhecimento da assistente">
            <p className="settings-theme-intro">Tudo o que for salvo aqui passa a ser usado nas próximas respostas da Luna, sem precisar gerar outro APK.</p>
            <div className="settings-ai-grid">
              <TextAreaField
                label="Prompt padrão"
                hint="Defina o jeito de responder, o tom e a forma de explicar. As regras essenciais de segurança continuam protegidas no sistema."
                value={form.trainingAiPrompt}
                onChange={(value) => change("trainingAiPrompt", value)}
                maxLength={12000}
              />
              <TextAreaField
                label="Conhecimentos de treino"
                hint="Cadastre exercícios, execução, correções, limitações e substituições. O conteúdo é salvo em conhecimentos.md."
                value={form.trainingAiKnowledge}
                onChange={(value) => change("trainingAiKnowledge", value)}
                maxLength={100000}
                icon={BookOpenText}
                large
              />
            </div>
            <div className="settings-ai-actions">
              <span>Arquivos: prompt-padrao.md e conhecimentos.md</span>
              <button type="submit" className="button primary" disabled={saving || Boolean(uploading)}><Save /> {saving ? "Salvando..." : "Salvar conhecimento"}</button>
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

function TextAreaField({ label, hint, value, onChange, maxLength, icon: Icon, large }) {
  return (
    <label className={`settings-ai-field${large ? " settings-ai-field--large" : ""}`}>
      <span>{Icon ? <Icon /> : null}{label}</span>
      <small>{hint}</small>
      <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} required />
      <em>{String(value || "").length.toLocaleString("pt-BR")} / {maxLength.toLocaleString("pt-BR")} caracteres</em>
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  const pickerValue = /^#[0-9A-F]{6}$/i.test(value || "") ? value : "#000000";
  return (
    <label className="settings-color-field">
      <span>{label}</span>
      <div>
        <input type="color" value={pickerValue} onChange={(event) => onChange(event.target.value)} />
        <input type="text" value={value} pattern="#[0-9A-Fa-f]{6}" maxLength="7" onChange={(event) => onChange(event.target.value)} required />
      </div>
    </label>
  );
}

function ThemePreview({ colors }) {
  const previewStyle = {
    "--theme-bg": colors.background,
    "--theme-card": colors.cardBackground,
    "--theme-secondary": colors.secondaryBackground,
    "--theme-button": colors.button,
    "--theme-button-pressed": colors.buttonPressed,
    "--theme-title": colors.title,
    "--theme-text": colors.text,
    "--theme-muted": colors.secondaryText,
    "--theme-border": colors.border,
    "--theme-active": colors.activeIcon,
    "--theme-inactive": colors.inactiveIcon,
  };
  return (
    <div className="settings-theme-preview" style={previewStyle}>
      <div className="settings-theme-preview__status"><span>9:41</span><span>● ● ●</span></div>
      <small>SUA JORNADA</small>
      <h4>Olá, Guto</h4>
      <p>Movimento e constância no seu ritmo.</p>
      <article>
        <span>MÓDULO EM DESTAQUE</span>
        <h5>Comece por aqui</h5>
        <p>3 aulas para dar o primeiro passo.</p>
        <button type="button">Continuar aula</button>
      </article>
      <div className="settings-theme-preview__nav"><b>Início</b><span>Treinos</span><span>Evolução</span><span>Perfil</span></div>
    </div>
  );
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
