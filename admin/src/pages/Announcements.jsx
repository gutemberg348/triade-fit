import { useState } from "react";
import { Edit3, ImagePlus, Megaphone, MessageCircle, Plus, Send } from "lucide-react";
import api, { errorMessage } from "../services/api.js";
import { useApi } from "../hooks/useApi.js";
import { EmptyState, ErrorState, Loading, Modal, PageHeader, StatusBadge } from "../components/UI.jsx";

const emptyAnnouncement = {
  title: "",
  message: "",
  imageUrl: "",
  audience: "ALL",
  status: "DRAFT",
  studentIds: [],
};

const emptyPost = {
  authorName: "Equipe Triade FIT",
  authorAvatarUrl: "",
  message: "",
  imageUrl: "",
  status: "DRAFT",
};

export default function Announcements() {
  const announcements = useApi("/admin/announcements");
  const posts = useApi("/admin/community-posts");
  const [section, setSection] = useState("posts");
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyPost);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [formError, setFormError] = useState("");

  const source = section === "posts" ? posts : announcements;

  const open = (item) => {
    setEditor(item?.id || "new");
    if (section === "posts") {
      setForm(
        item
          ? {
              authorName: item.authorName,
              authorAvatarUrl: item.authorAvatarUrl || "",
              message: item.message,
              imageUrl: item.imageUrl || "",
              status: item.status,
            }
          : { ...emptyPost },
      );
    } else {
      setForm(
        item
          ? {
              title: item.title,
              message: item.message,
              imageUrl: item.imageUrl || "",
              audience: item.audience,
              status: item.status,
              studentIds: [],
            }
          : { ...emptyAnnouncement },
      );
    }
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const resource = section === "posts" ? "community-posts" : "announcements";
    try {
      if (editor === "new") await api.post(`/admin/${resource}`, form);
      else await api.put(`/admin/${resource}/${editor}`, form);
      setEditor(null);
      source.reload();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file, field = "imageUrl") => {
    if (!file) return;
    setUploading(field);
    setFormError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await api.post("/uploads", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, [field]: data.url }));
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setUploading("");
    }
  };

  if (source.loading) return <Loading />;
  if (source.error) return <ErrorState message={source.error} retry={source.reload} />;

  return (
    <>
      <PageHeader
        eyebrow="CONTEÚDO E RELACIONAMENTO"
        title="Comunidade"
        description="Publique o feed da comunidade e os avisos exibidos no aplicativo."
        action={
          <button className="button primary" onClick={() => open()}>
            <Plus /> {section === "posts" ? "Nova postagem" : "Novo aviso"}
          </button>
        }
      />

      <div className="content-tabs" role="tablist">
        <button className={section === "posts" ? "is-active" : ""} onClick={() => setSection("posts")}>
          <MessageCircle /> Postagens da comunidade
        </button>
        <button className={section === "announcements" ? "is-active" : ""} onClick={() => setSection("announcements")}>
          <Megaphone /> Avisos
        </button>
      </div>

      {source.data.length ? (
        <div className="announcement-grid">
          {source.data.map((item) =>
            section === "posts" ? (
              <CommunityCard key={item.id} item={item} onEdit={() => open(item)} />
            ) : (
              <AnnouncementCard key={item.id} item={item} onEdit={() => open(item)} />
            ),
          )}
        </div>
      ) : (
        <EmptyState
          title={section === "posts" ? "Nenhuma postagem ainda" : "Nenhum comunicado ainda"}
          text={section === "posts" ? "Crie o primeiro conteúdo do feed dos alunos." : "Crie avisos para aparecerem no aplicativo."}
          action={
            <button className="button primary" onClick={() => open()}>
              <Send /> Criar agora
            </button>
          }
        />
      )}

      {editor && (
        <Modal
          title={`${editor === "new" ? "Novo" : "Editar"} ${section === "posts" ? "conteúdo" : "aviso"}`}
          onClose={() => setEditor(null)}
          wide={section === "posts"}
        >
          <form className="form-grid" onSubmit={submit}>
            {formError && <div className="form-error full">{formError}</div>}
            {section === "posts" ? (
              <PostFields form={form} setForm={setForm} upload={upload} uploading={uploading} />
            ) : (
              <AnnouncementFields form={form} setForm={setForm} upload={upload} uploading={uploading} />
            )}
            <div className="form-actions full">
              <button type="button" className="button secondary" onClick={() => setEditor(null)}>
                Cancelar
              </button>
              <button className="button primary" disabled={saving || Boolean(uploading)}>
                <Send /> {saving ? "Salvando..." : form.status === "PUBLISHED" ? "Publicar" : "Salvar rascunho"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function PostFields({ form, setForm, upload, uploading }) {
  return (
    <>
      <label>
        <span>Nome exibido</span>
        <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} required />
      </label>
      <label>
        <span>Status</span>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicado</option>
        </select>
      </label>
      <label className="full">
        <span>Texto da postagem</span>
        <textarea rows="5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
      </label>
      <MediaField label="Imagem da postagem" field="imageUrl" value={form.imageUrl} setForm={setForm} form={form} upload={upload} uploading={uploading} />
      <MediaField label="Foto do perfil" field="authorAvatarUrl" value={form.authorAvatarUrl} setForm={setForm} form={form} upload={upload} uploading={uploading} />
      <p className="form-helper full">
        No aplicativo, as alunas podem curtir, ver quem curtiu, comentar e responder umas às outras.
      </p>
    </>
  );
}

function AnnouncementFields({ form, setForm, upload, uploading }) {
  return (
    <>
      <label className="full">
        <span>Título</span>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label className="full">
        <span>Mensagem</span>
        <textarea rows="5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
      </label>
      <label>
        <span>Público</span>
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
          <option value="ALL">Todos</option>
          <option value="ACTIVE_STUDENTS">Alunos ativos</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicado</option>
        </select>
      </label>
      <MediaField label="Imagem do aviso" field="imageUrl" value={form.imageUrl} setForm={setForm} form={form} upload={upload} uploading={uploading} full />
    </>
  );
}

function MediaField({ label, field, value, form, setForm, upload, uploading, full }) {
  return (
    <label className={full ? "full" : ""}>
      <span>{label}: upload ou URL</span>
      <input type="url" placeholder="https://..." value={value} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
      <span className="file-button">
        <ImagePlus /> {uploading === field ? "Enviando..." : "Selecionar imagem"}
        <input type="file" accept="image/*" disabled={Boolean(uploading)} onChange={(e) => upload(e.target.files?.[0], field)} />
      </span>
    </label>
  );
}

function CommunityCard({ item, onEdit }) {
  return (
    <article className={`announcement-card community-admin-card ${item.status === "PUBLISHED" ? "announcement-card--published" : ""}`}>
      {item.imageUrl && <img className="community-admin-card__image" src={item.imageUrl} alt="" />}
      <div className="community-admin-card__author">
        {item.authorAvatarUrl ? <img src={item.authorAvatarUrl} alt="" /> : <span>{item.authorName.charAt(0)}</span>}
        <div><strong>{item.authorName}</strong><small>Feed da comunidade</small></div>
      </div>
      <div className="announcement-card__status"><StatusBadge value={item.status} /></div>
      <p>{item.message}</p>
      <footer>
        <time>Publicação da comunidade</time>
        <button className="icon-button" onClick={onEdit}><Edit3 /></button>
      </footer>
    </article>
  );
}

function AnnouncementCard({ item, onEdit }) {
  return (
    <article className={`announcement-card ${item.status === "PUBLISHED" ? "announcement-card--published" : ""}`}>
      <div className="announcement-card__icon"><Megaphone /></div>
      <div className="announcement-card__status">
        <StatusBadge value={item.status} />
        <span>{item.audience === "ALL" ? "Todos os alunos" : item.audience === "ACTIVE_STUDENTS" ? "Alunos ativos" : `${item._count?.recipients || 0} selecionados`}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.message}</p>
      <footer>
        <time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(item.publishedAt || item.createdAt))}</time>
        <button className="icon-button" onClick={onEdit}><Edit3 /></button>
      </footer>
    </article>
  );
}
