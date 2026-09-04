import { useState } from "react";
import { Edit3, Heart, ImagePlus, LoaderCircle, Megaphone, MessageCircle, Plus, Reply, Send, X } from "lucide-react";
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
  const [discussion, setDiscussion] = useState(null);
  const [discussionTab, setDiscussionTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [likes, setLikes] = useState([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesError, setLikesError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

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

  const loadComments = async (postId) => {
    setCommentsLoading(true);
    setCommentsError("");
    try {
      const { data } = await api.get(`/admin/community-posts/${postId}/comments`);
      setComments(data);
    } catch (error) {
      setCommentsError(errorMessage(error));
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadLikes = async (postId) => {
    setLikesLoading(true);
    setLikesError("");
    try {
      const { data } = await api.get(`/admin/community-posts/${postId}/likes`);
      setLikes(data);
    } catch (error) {
      setLikesError(errorMessage(error));
    } finally {
      setLikesLoading(false);
    }
  };

  const openDiscussion = (post, tab = "comments") => {
    setDiscussion(post);
    setDiscussionTab(tab);
    setComments([]);
    setLikes([]);
    setReplyTo(null);
    setCommentMessage("");
    loadComments(post.id);
    loadLikes(post.id);
  };

  const closeComments = () => {
    setDiscussion(null);
    setReplyTo(null);
    setCommentMessage("");
    setCommentsError("");
    setLikesError("");
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const message = commentMessage.trim();
    if (!message || !discussion) return;
    setSendingComment(true);
    setCommentsError("");
    try {
      const { data } = await api.post(`/admin/community-posts/${discussion.id}/comments`, {
        message,
        parentId: replyTo?.id || null,
      });
      setComments((current) => [...current, data.comment]);
      setCommentMessage("");
      setReplyTo(null);
      setDiscussion((current) => ({ ...current, _count: { ...current._count, comments: data.commentsCount } }));
      posts.setData((current) =>
        current.map((post) =>
          post.id === discussion.id
            ? { ...post, _count: { ...post._count, comments: data.commentsCount } }
            : post,
        ),
      );
    } catch (error) {
      setCommentsError(errorMessage(error));
    } finally {
      setSendingComment(false);
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
              <CommunityCard
                key={item.id}
                item={item}
                onEdit={() => open(item)}
                onComments={() => openDiscussion(item, "comments")}
                onLikes={() => openDiscussion(item, "likes")}
              />
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

      {discussion && (
        <Modal title="Interações da publicação" onClose={closeComments} wide>
          <div className="community-discussion">
            <div className="community-discussion__post">
              {discussion.imageUrl && <img src={discussion.imageUrl} alt="" />}
              <div>
                <small>PUBLICAÇÃO DE {discussion.authorName}</small>
                <p>{discussion.message}</p>
                <div>
                  <span><Heart /> {discussion._count?.likes || 0} curtidas</span>
                  <span><MessageCircle /> {discussion._count?.comments || 0} comentários</span>
                </div>
              </div>
            </div>

            <div className="community-discussion__tabs" role="tablist" aria-label="Interações da publicação">
              <button type="button" className={discussionTab === "comments" ? "is-active" : ""} onClick={() => setDiscussionTab("comments")}>
                <MessageCircle /> Comentários <span>{discussion._count?.comments || 0}</span>
              </button>
              <button type="button" className={discussionTab === "likes" ? "is-active" : ""} onClick={() => setDiscussionTab("likes")}>
                <Heart /> Curtidas <span>{discussion._count?.likes || 0}</span>
              </button>
            </div>

            {discussionTab === "comments" ? (
              <>
                <div className="community-discussion__heading">
                  <div>
                    <strong>Conversa da comunidade</strong>
                    <span>Leia as mensagens das alunas e responda como administradora.</span>
                  </div>
                  <span>{comments.length}</span>
                </div>

                {commentsLoading ? (
                  <div className="community-comments-state"><LoaderCircle className="is-spinning" /> Carregando comentários...</div>
                ) : comments.length ? (
                  <div className="community-comments-list">
                    {buildCommentTree(comments).map((comment) => (
                      <AdminComment key={comment.id} comment={comment} onReply={setReplyTo} />
                    ))}
                  </div>
                ) : (
                  <div className="community-comments-state">
                    <MessageCircle />
                    <strong>Nenhum comentário ainda</strong>
                    <span>Quando uma aluna comentar no aplicativo, a mensagem aparecerá aqui.</span>
                  </div>
                )}

                {commentsError && (
                  <div className="form-error community-comments-error">
                    {commentsError}
                    {!comments.length && <button type="button" className="button ghost" onClick={() => loadComments(discussion.id)}>Tentar novamente</button>}
                  </div>
                )}

                {discussion.status === "PUBLISHED" ? (
                  <form className="community-reply-form" onSubmit={submitComment}>
                    {replyTo && (
                      <div className="community-reply-target">
                        <div><Reply /><span>Respondendo a <strong>{replyTo.author?.name}</strong></span></div>
                        <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancelar resposta"><X /></button>
                      </div>
                    )}
                    <label htmlFor="admin-community-reply">{replyTo ? "Sua resposta" : "Escrever na conversa"}</label>
                    <textarea
                      id="admin-community-reply"
                      rows="3"
                      maxLength="600"
                      placeholder={replyTo ? `Responder a ${replyTo.author?.name}...` : "Escreva uma mensagem como administradora..."}
                      value={commentMessage}
                      onChange={(event) => setCommentMessage(event.target.value)}
                    />
                    <div>
                      <small>{commentMessage.length}/600</small>
                      <button className="button primary" disabled={sendingComment || !commentMessage.trim()}>
                        <Send /> {sendingComment ? "Enviando..." : replyTo ? "Enviar resposta" : "Publicar comentário"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="community-comments-state community-comments-state--compact">
                    Publique esta postagem para poder responder à conversa.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="community-discussion__heading">
                  <div>
                    <strong>Pessoas que curtiram</strong>
                    <span>Veja quais contas interagiram com esta publicação.</span>
                  </div>
                  <span>{likes.length}</span>
                </div>

                {likesLoading ? (
                  <div className="community-comments-state"><LoaderCircle className="is-spinning" /> Carregando curtidas...</div>
                ) : likes.length ? (
                  <div className="community-likes-list">
                    {likes.map((like) => <AdminLike key={like.id} like={like} />)}
                  </div>
                ) : (
                  <div className="community-comments-state">
                    <Heart />
                    <strong>Nenhuma curtida ainda</strong>
                    <span>Os nomes aparecerão aqui assim que alguém curtir a publicação.</span>
                  </div>
                )}

                {likesError && (
                  <div className="form-error community-comments-error">
                    {likesError}
                    <button type="button" className="button ghost" onClick={() => loadLikes(discussion.id)}>Tentar novamente</button>
                  </div>
                )}
              </>
            )}
          </div>
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

function CommunityCard({ item, onEdit, onComments, onLikes }) {
  return (
    <article className={`announcement-card community-admin-card ${item.status === "PUBLISHED" ? "announcement-card--published" : ""}`}>
      {item.imageUrl && <img className="community-admin-card__image" src={item.imageUrl} alt="" />}
      <div className="community-admin-card__author">
        {item.authorAvatarUrl ? <img src={item.authorAvatarUrl} alt="" /> : <span>{item.authorName.charAt(0)}</span>}
        <div><strong>{item.authorName}</strong><small>Feed da comunidade</small></div>
      </div>
      <div className="announcement-card__status"><StatusBadge value={item.status} /></div>
      <p>{item.message}</p>
      <div className="community-admin-card__engagement">
        <button type="button" onClick={onLikes}><Heart /> {item._count?.likes || 0} curtidas</button>
        <button type="button" onClick={onComments}>
          <MessageCircle /> {item._count?.comments || 0} comentários
        </button>
      </div>
      <footer>
        <time>{formatDate(item.publishedAt || item.createdAt)}</time>
        <div className="community-admin-card__actions">
          <button type="button" className="button ghost" onClick={onComments}><MessageCircle /> Abrir conversa</button>
          <button type="button" className="icon-button" onClick={onEdit} aria-label="Editar publicação"><Edit3 /></button>
        </div>
      </footer>
    </article>
  );
}

function buildCommentTree(comments) {
  const nodes = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] }]));
  const roots = [];
  nodes.forEach((comment) => {
    const parent = comment.parentId ? nodes.get(comment.parentId) : null;
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  });
  return roots;
}

function AdminComment({ comment, onReply, depth = 0 }) {
  return (
    <div className={`community-comment-thread ${depth ? "is-reply" : ""}`}>
      <article className={`community-comment ${comment.author?.role === "ADMIN" ? "is-admin" : ""}`}>
        {comment.author?.avatarUrl ? (
          <img src={comment.author.avatarUrl} alt="" />
        ) : (
          <span className="community-comment__avatar">{comment.author?.name?.charAt(0) || "?"}</span>
        )}
        <div className="community-comment__body">
          <header>
            <div>
              <strong>{comment.author?.name || "Usuário"}</strong>
              <span className={comment.author?.role === "ADMIN" ? "is-admin" : ""}>
                {comment.author?.role === "ADMIN" ? "ADMINISTRAÇÃO" : "ALUNA"}
              </span>
            </div>
            <time>{formatDateTime(comment.createdAt)}</time>
          </header>
          <p>{comment.message}</p>
          <button type="button" onClick={() => onReply(comment)}><Reply /> Responder</button>
        </div>
      </article>
      {comment.replies?.map((reply) => (
        <AdminComment key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
}

function AdminLike({ like }) {
  const user = like.user || {};
  return (
    <article className="community-like">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" />
      ) : (
        <span>{user.name?.charAt(0) || "?"}</span>
      )}
      <div>
        <strong>{user.name || "Usuário"}</strong>
        <small>{user.email || (user.role === "ADMIN" ? "Administração" : "Aluna")}</small>
      </div>
      <time>{formatDateTime(like.createdAt)}</time>
    </article>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
