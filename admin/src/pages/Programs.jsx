import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  FilePlus,
  Layers3,
  Leaf,
  Link2,
  LockKeyhole,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import api, { errorMessage } from "../services/api.js";
import { useApi } from "../hooks/useApi.js";
import {
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  StatusBadge,
} from "../components/UI.jsx";

const defaults = {
  program: { title: "", description: "", coverUrl: "", status: "PUBLISHED" },
  module: {
    programId: "",
    title: "",
    description: "",
    coverUrl: "",
    status: "PUBLISHED",
  },
  lesson: {
    moduleId: "",
    title: "",
    description: "",
    videoUrl: "",
    coverUrl: "",
    instructions: "",
    durationMinutes: "",
    category: "",
    kind: "WORKOUT",
    showMeditationButton: false,
    unlockDelayHours: 0,
    difficulty: "Iniciante",
    calories: "",
    status: "PUBLISHED",
    materials: [],
    notes: "",
  },
};
export default function Programs() {
  const { data, loading, error, reload } = useApi("/admin/programs");
  const [expanded, setExpanded] = useState({});
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  const [formError, setFormError] = useState("");
  const title =
    editor?.entity === "program"
      ? "Programa"
      : editor?.entity === "module"
        ? "Módulo"
        : "Capítulo";
  const open = (entity, item = null, preset = {}) => {
    setEditor({ entity, id: item?.id });
    setForm({
      ...defaults[entity],
      ...item,
      ...preset,
      coverUrl: item?.coverUrl || "",
      videoUrl: item?.videoUrl || "",
      materials: Array.isArray(item?.materials) ? item.materials : [],
    });
    setFormError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const path =
      editor.entity === "program"
        ? "/admin/programs"
        : editor.entity === "module"
          ? "/admin/modules"
          : "/admin/lessons";
    try {
      const payload = {
        ...form,
        durationMinutes: form.durationMinutes
          ? Number(form.durationMinutes)
          : null,
        calories: form.calories ? Number(form.calories) : null,
        unlockDelayHours: Number(form.unlockDelayHours || 0),
        materials: Array.isArray(form.materials)
          ? form.materials.filter((material) => material.title && material.url)
          : [],
      };
      if (editor.id) await api.put(`${path}/${editor.id}`, payload);
      else await api.post(path, payload);
      setEditor(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const uploadCover = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await api.post("/uploads", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, coverUrl: data.url }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploadingCover(false);
    }
  };
  const uploadVideo = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("video", file);
      const { data } = await api.post("/uploads/video", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({ ...current, videoUrl: data.url }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploadingVideo(false);
    }
  };
  const changeMaterial = (index, field, value) => {
    setForm((current) => ({
      ...current,
      materials: current.materials.map((material, materialIndex) =>
        materialIndex === index ? { ...material, [field]: value } : material,
      ),
    }));
  };
  const addMaterial = () =>
    setForm((current) => ({
      ...current,
      materials: [...(current.materials || []), { title: "", url: "", type: "LINK" }],
    }));
  const removeMaterial = (index) =>
    setForm((current) => ({
      ...current,
      materials: current.materials.filter((_, materialIndex) => materialIndex !== index),
    }));
  const uploadMaterialFile = async (file, index) => {
    if (!file) return;
    setUploadingMaterial(index);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post("/uploads/file", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((current) => ({
        ...current,
        materials: current.materials.map((material, materialIndex) =>
          materialIndex === index
            ? {
                ...material,
                title: material.title || data.originalName,
                url: data.url,
                type: "FILE",
              }
            : material,
        ),
      }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploadingMaterial(null);
    }
  };
  const archive = async (entity, id) => {
    if (
      !window.confirm(
        "Arquivar este conteúdo? Ele deixará de aparecer para os alunos.",
      )
    )
      return;
    const path =
      entity === "program"
        ? "programs"
        : entity === "module"
          ? "modules"
          : "lessons";
    await api.delete(`/admin/${path}/${id}`);
    reload();
  };
  if (loading) return <Loading label="Organizando seus conteúdos..." />;
  if (error) return <ErrorState message={error} retry={reload} />;
  return (
    <>
      <PageHeader
        eyebrow="CONTEÚDO E JORNADA"
        title="Programas, módulos e capítulos"
        description="Monte uma experiência de catálogo com capítulos progressivos e materiais extras."
        action={
          <button className="button primary" onClick={() => open("program")}>
            <Plus /> Novo programa
          </button>
        }
      />
      {data.length ? (
        <div className="program-list">
          {data.map((program) => (
            <article className="program-card" key={program.id}>
              <header>
                <button
                  className="program-expand"
                  onClick={() =>
                    setExpanded({
                      ...expanded,
                      [program.id]: !expanded[program.id],
                    })
                  }
                >
                  {expanded[program.id] ? <ChevronDown /> : <ChevronRight />}
                </button>
                <div
                  className="program-cover"
                  style={{
                    backgroundImage: program.coverUrl
                      ? `url(${program.coverUrl})`
                      : undefined,
                  }}
                >
                  <Layers3 />
                </div>
                <div className="program-title">
                  <div>
                    <StatusBadge value={program.status} />
                    <span>{program._count.enrollments} alunos</span>
                  </div>
                  <h3>{program.title}</h3>
                  <p>{program.description}</p>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    onClick={() => open("program", program)}
                    title="Editar"
                  >
                    <Edit3 />
                  </button>
                  <button
                    className="icon-button danger"
                    onClick={() => archive("program", program.id)}
                    title="Arquivar"
                  >
                    <Archive />
                  </button>
                </div>
              </header>
              {expanded[program.id] && (
                <div className="modules-admin">
                  <div className="modules-admin__heading">
                    <strong>Módulos</strong>
                    <button
                      className="button ghost"
                      onClick={() =>
                        open("module", null, { programId: program.id })
                      }
                    >
                      <Plus /> Adicionar módulo
                    </button>
                  </div>
                  {program.modules.map((module) => (
                    <section className="module-admin" key={module.id}>
                      <header>
                        <div>
                          <small>
                            MÓDULO{" "}
                            {String(module.sortOrder + 1).padStart(2, "0")}
                          </small>
                          <h4>{module.title}</h4>
                        </div>
                        <StatusBadge value={module.status} />
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            onClick={() => open("module", module)}
                          >
                            <Edit3 />
                          </button>
                          <button
                            className="icon-button danger"
                            onClick={() => archive("module", module.id)}
                          >
                            <Archive />
                          </button>
                        </div>
                      </header>
                      <div className="lesson-admin-list">
                        {module.lessons.map((lesson) => (
                          <div className="lesson-admin" key={lesson.id}>
                            <span className="lesson-admin__icon">
                              {lesson.kind === "MEDITATION" ? <Leaf /> : <Video />}
                            </span>
                            <div>
                              <strong>{lesson.title}</strong>
                              <small>
                                <Clock3 /> {lesson.durationMinutes || "—"} min ·{" "}
                                {lesson.kind === "MEDITATION" ? "Meditação" : lesson.category || "Treino"}
                                {lesson.kind === "WORKOUT" && lesson.calories
                                  ? ` · ${lesson.calories} kcal`
                                  : ""}
                                {lesson.kind === "MEDITATION"
                                  ? ` · ${lesson.showMeditationButton ? "Prática guiada" : "Vídeo"}`
                                  : ""}
                                {lesson.difficulty ? ` · ${lesson.difficulty}` : ""}
                                {lesson.unlockDelayHours
                                  ? ` · libera ${lesson.unlockDelayHours}h após a anterior`
                                  : ""}
                                {lesson.materials?.length
                                  ? ` · ${lesson.materials.length} material${lesson.materials.length > 1 ? "is" : ""}`
                                  : ""}
                              </small>
                            </div>
                            <StatusBadge value={lesson.status} />
                            <div className="row-actions">
                              <button
                                className="icon-button"
                                onClick={() => open("lesson", lesson)}
                              >
                                <Edit3 />
                              </button>
                              <button
                                className="icon-button danger"
                                onClick={() => archive("lesson", lesson.id)}
                              >
                                <Archive />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="lesson-add"
                          onClick={() =>
                            open("lesson", null, { moduleId: module.id })
                          }
                        >
                          <Plus /> Novo capítulo neste módulo
                        </button>
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Crie seu primeiro programa"
          text="Organize módulos e capítulos em uma jornada de evolução."
        />
      )}
      {editor && (
        <Modal
          title={`${editor.id ? "Editar" : "Novo"} ${title.toLowerCase()}`}
          onClose={() => setEditor(null)}
          wide
        >
          <form className="form-grid" onSubmit={submit}>
            {formError && <div className="form-error full">{formError}</div>}
            <label className="full">
              <span>Título</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label className="full">
              <span>Descrição</span>
              <textarea
                rows="3"
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required={editor.entity === "program"}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
            </label>
            {editor.entity === "lesson" && (
              <>
                <label>
                  <span>Tipo do capítulo</span>
                  <select
                    value={form.kind || "WORKOUT"}
                    onChange={(e) => {
                      const kind = e.target.value;
                      setForm({
                        ...form,
                        kind,
                        calories: kind === "WORKOUT" ? form.calories : "",
                        showMeditationButton:
                          kind === "MEDITATION" ? true : false,
                      });
                    }}
                  >
                    <option value="WORKOUT">Treino</option>
                    <option value="MEDITATION">Meditação</option>
                  </select>
                </label>
                {form.kind === "MEDITATION" && (
                  <label>
                    <span>Como a aluna acessa</span>
                    <select
                      value={
                        form.showMeditationButton
                          ? "GUIDED_SESSION"
                          : "VIDEO_ONLY"
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          showMeditationButton:
                            e.target.value === "GUIDED_SESSION",
                        })
                      }
                    >
                      <option value="GUIDED_SESSION">
                        Botão para prática guiada
                      </option>
                      <option value="VIDEO_ONLY">Somente vídeo</option>
                    </select>
                    <small className="muted">
                      {form.showMeditationButton
                        ? "O botão abre o cronômetro; vídeo é opcional e pode ensinar a prática."
                        : "A aluna vê somente o vídeo deste capítulo."}
                    </small>
                  </label>
                )}
                <label>
                  <span>Duração (min)</span>
                  <input
                    type="number"
                    min="1"
                    value={form.durationMinutes || ""}
                    onChange={(e) =>
                      setForm({ ...form, durationMinutes: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Nível</span>
                  <select
                    value={form.difficulty || "Iniciante"}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Todos os níveis">Todos os níveis</option>
                  </select>
                </label>
                {form.kind === "WORKOUT" && (
                  <label>
                    <span>Calorias estimadas (kcal)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.calories || ""}
                      onChange={(e) => setForm({ ...form, calories: e.target.value })}
                      placeholder="Ex.: 320"
                    />
                    <small className="muted">
                      Ao concluir o treino, este valor entra automaticamente no progresso da aluna.
                    </small>
                  </label>
                )}
                <label>
                  <span>Categoria</span>
                  <input
                    value={form.category || ""}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Link do vídeo (opcional)</span>
                  <input
                    type="url"
                    value={form.videoUrl || ""}
                    onChange={(e) =>
                      setForm({ ...form, videoUrl: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Ou envie o vídeo</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => uploadVideo(event.target.files?.[0])}
                    disabled={uploadingVideo}
                  />
                  <small className="muted">
                    <Upload /> {uploadingVideo ? "Enviando vídeo..." : "MP4, WebM ou MOV · até 150 MB"}
                  </small>
                </label>
                <label className="full">
                  <span>Orientações</span>
                  <textarea
                    rows="4"
                    value={form.instructions || ""}
                    onChange={(e) =>
                      setForm({ ...form, instructions: e.target.value })
                    }
                  />
                </label>
                <label className="full lesson-release-field">
                  <span><LockKeyhole /> Liberação após concluir o capítulo anterior</span>
                  <div className="release-delay-control">
                    <input
                      type="number"
                      min="0"
                      max="8760"
                      step="1"
                      value={form.unlockDelayHours || 0}
                      onChange={(e) =>
                        setForm({ ...form, unlockDelayHours: e.target.value })
                      }
                    />
                    <strong>horas</strong>
                  </div>
                  <small className="muted">
                    0 libera imediatamente · 24 libera em 1 dia · 168 libera em 7 dias. O primeiro capítulo fica sempre disponível.
                  </small>
                </label>
                <section className="full lesson-materials-editor">
                  <header>
                    <div>
                      <strong>Arquivos e links do capítulo</strong>
                      <small>PDF, documentos, planilhas, apresentações, ZIP ou links externos.</small>
                    </div>
                    <button type="button" className="button secondary" onClick={addMaterial}>
                      <Plus /> Adicionar material
                    </button>
                  </header>
                  {form.materials?.length ? (
                    <div className="material-editor-list">
                      {form.materials.map((material, index) => (
                        <article className="material-editor-row" key={index}>
                          <span className="material-editor-icon">
                            {material.type === "FILE" ? <FilePlus /> : <Link2 />}
                          </span>
                          <div className="material-editor-fields">
                            <input
                              placeholder="Nome exibido para a aluna"
                              value={material.title}
                              onChange={(e) => changeMaterial(index, "title", e.target.value)}
                            />
                            <input
                              type="url"
                              placeholder="https://... ou faça upload"
                              value={material.url}
                              onChange={(e) => {
                                changeMaterial(index, "url", e.target.value);
                                changeMaterial(index, "type", "LINK");
                              }}
                            />
                          </div>
                          <label className="material-upload-button" title="Enviar arquivo">
                            <Upload />
                            <input
                              type="file"
                              accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                              disabled={uploadingMaterial !== null}
                              onChange={(e) => uploadMaterialFile(e.target.files?.[0], index)}
                            />
                          </label>
                          <button type="button" className="icon-button danger" onClick={() => removeMaterial(index)} title="Remover material">
                            <Trash2 />
                          </button>
                          {uploadingMaterial === index && <small className="material-uploading">Enviando arquivo...</small>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="materials-empty">Nenhum material adicional neste capítulo.</div>
                  )}
                </section>
              </>
            )}
            <label className="full">
              <span>URL da capa</span>
              <input
                type="url"
                value={form.coverUrl || ""}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label className="full">
              <span>Ou envie a capa</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => uploadCover(event.target.files?.[0])}
                disabled={uploadingCover}
              />
              <small className="muted">
                <Upload /> {uploadingCover ? "Enviando imagem..." : "JPG, PNG ou WebP · até 8 MB"}
              </small>
            </label>
            {form.coverUrl && (
              <div className="full content-cover-preview">
                <img src={form.coverUrl} alt="Prévia da capa" />
                <span>Capa pronta para este {title.toLowerCase()}.</span>
              </div>
            )}
            <div className="form-actions full">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={saving || uploadingCover || uploadingVideo || uploadingMaterial !== null}
              >
                {saving ? "Salvando..." : "Salvar conteúdo"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
