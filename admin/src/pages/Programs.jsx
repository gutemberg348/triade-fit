import { useMemo, useState } from "react";
import { Archive, CalendarClock, Clock3, Dumbbell, Edit3, FilePlus, Layers3, Link2, Plus, Sparkles, Trash2, Upload, Video } from "lucide-react";
import api, { errorMessage } from "../services/api.js";
import { useApi } from "../hooks/useApi.js";
import { EmptyState, ErrorState, Loading, Modal, PageHeader, StatusBadge } from "../components/UI.jsx";

const defaults = {
  program: { type: "TRAINING", title: "", description: "", coverUrl: "", status: "PUBLISHED" },
  module: { title: "", description: "", coverUrl: "", unlockDelayDays: 0, status: "PUBLISHED" },
  lesson: {
    moduleId: "", programId: "", title: "", description: "", videoUrl: "", coverUrl: "",
    instructions: "", durationMinutes: "", category: "", kind: "CONTENT", isIntroductory: false,
    showMeditationButton: false, unlockDelayHours: 0, difficulty: "Iniciante",
    status: "PUBLISHED", materials: [], notes: "",
  },
};

const lessonLabel = (lesson) => lesson.kind === "MEDITATION" ? "Meditação" : lesson.kind === "WORKOUT" ? "Exercício" : "Conteúdo";

const embeddedVideoUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    if (url.hostname.includes("youtube.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = url.pathname === "/watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null;
      if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
};

function LessonVideoPreview({ value }) {
  if (!value) return null;
  const embedded = embeddedVideoUrl(value);
  return (
    <div className="lesson-video-preview">
      {embedded
        ? <iframe src={embedded} title="Prévia do vídeo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        : <video src={value} controls preload="metadata">Seu navegador não conseguiu abrir este vídeo.</video>}
      <div><Video /><span>Prévia da aula</span><a href={value} target="_blank" rel="noreferrer">Abrir original</a></div>
    </div>
  );
}

export default function Programs() {
  const { data = [], loading, error, reload } = useApi("/admin/programs");
  const [section, setSection] = useState("CONTENT");
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadingMaterial, setUploadingMaterial] = useState(null);
  const [formError, setFormError] = useState("");

  const contentModules = useMemo(() => data
    .filter((program) => program.type === "CONTENT")
    .flatMap((program) => program.modules.map((module) => ({ ...module, programId: program.id }))), [data]);
  const trainingPrograms = useMemo(() => data.filter((program) => program.type === "TRAINING"), [data]);

  const open = (entity, item = null, preset = {}) => {
    const context = preset.context || (section === "TRAINING" ? "TRAINING" : "CONTENT");
    setEditor({ entity, id: item?.id, context });
    setForm({
      ...defaults[entity],
      ...item,
      ...preset,
      context: undefined,
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
    const path = editor.entity === "program" ? "/admin/programs" : editor.entity === "module" ? "/admin/modules" : "/admin/lessons";
    try {
      const { modules, lessons, _count, progress, program, moduleTitle, context, ...values } = form;
      const payload = {
        ...values,
        ...(editor.entity === "program" ? { type: "TRAINING" } : {}),
        ...(editor.entity === "lesson" ? {
          moduleId: editor.context === "CONTENT" ? values.moduleId : undefined,
          programId: editor.context === "TRAINING" ? values.programId : undefined,
          kind: editor.context === "TRAINING" ? "WORKOUT" : values.kind,
          isIntroductory: editor.context === "CONTENT" && Boolean(values.isIntroductory),
          durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : null,
          unlockDelayHours: Number(values.unlockDelayHours || 0),
          materials: Array.isArray(values.materials) ? values.materials.filter((material) => material.title && material.url) : [],
        } : {}),
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

  const upload = async (file, route, field, setUploading) => {
    if (!file) return;
    setUploading(true);
    if (field === "videoUrl") setVideoUploadProgress(0);
    setFormError("");
    try {
      const body = new FormData();
      body.append(field === "coverUrl" ? "image" : "video", file);
      const { data: uploaded } = await api.post(route, body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: field === "videoUrl" ? 180000 : 30000,
        onUploadProgress: field === "videoUrl" ? (event) => {
          if (event.total) setVideoUploadProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
        } : undefined,
      });
      setForm((current) => ({ ...current, [field]: uploaded.url }));
      if (field === "videoUrl") setVideoUploadProgress(100);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const addMaterial = () => setForm((current) => ({ ...current, materials: [...(current.materials || []), { title: "", url: "", type: "LINK" }] }));
  const changeMaterial = (index, field, value) => setForm((current) => ({
    ...current,
    materials: current.materials.map((material, materialIndex) => materialIndex === index ? { ...material, [field]: value } : material),
  }));
  const removeMaterial = (index) => setForm((current) => ({ ...current, materials: current.materials.filter((_, materialIndex) => materialIndex !== index) }));
  const uploadMaterialFile = async (file, index) => {
    if (!file) return;
    setUploadingMaterial(index);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const { data: uploaded } = await api.post("/uploads/file", body, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((current) => ({
        ...current,
        materials: current.materials.map((material, materialIndex) => materialIndex === index
          ? { ...material, title: material.title || uploaded.originalName, url: uploaded.url, type: "FILE" }
          : material),
      }));
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setUploadingMaterial(null);
    }
  };

  const archive = async (entity, id) => {
    if (!window.confirm("Arquivar este conteúdo? Ele deixará de aparecer para as alunas.")) return;
    try {
      const resource = entity === "program" ? "programs" : entity === "module" ? "modules" : "lessons";
      await api.delete(`/admin/${resource}/${id}`);
      await reload();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  };

  if (loading) return <Loading label="Organizando seus conteúdos..." />;
  if (error) return <ErrorState message={error} retry={reload} />;
  const items = section === "CONTENT" ? contentModules : trainingPrograms;
  const title = editor?.entity === "program" ? "programa de treino" : editor?.entity === "module" ? "módulo" : "aula";

  const renderLesson = (lesson, context, parentId) => (
    <div className="lesson-admin" key={lesson.id}>
      <span className="lesson-admin__icon">{lesson.kind === "MEDITATION" ? <Sparkles /> : lesson.kind === "WORKOUT" ? <Dumbbell /> : <Video />}</span>
      <div>
        <strong>{lesson.title}</strong>
        <small><Clock3 /> {lesson.durationMinutes || "—"} min · {lessonLabel(lesson)}{lesson.isIntroductory ? " · Destaque da Home" : ""}</small>
      </div>
      <StatusBadge value={lesson.status} />
      <div className="row-actions">
        <button className="icon-button" onClick={() => open("lesson", lesson, context === "CONTENT" ? { moduleId: parentId, context } : { programId: parentId, context })} title="Editar aula"><Edit3 /></button>
        <button className="icon-button danger" onClick={() => archive("lesson", lesson.id)} title="Arquivar aula"><Archive /></button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="CATÁLOGO DO APLICATIVO"
        title={section === "CONTENT" ? "Módulos e aulas da Home" : "Programas de treino"}
        description={section === "CONTENT"
          ? "Cadastre o módulo com sua capa e, dentro dele, as aulas que a aluna verá como episódios."
          : "Cadastre cada programa de treino e adicione as aulas e exercícios diretamente, sem módulos intermediários."}
        action={<button className="button primary" onClick={() => open(section === "CONTENT" ? "module" : "program", null, { context: section })}><Plus /> {section === "CONTENT" ? "Novo módulo" : "Novo programa de treino"}</button>}
      />

      <div className="content-tabs catalog-tabs" role="tablist">
        <button className={section === "CONTENT" ? "is-active" : ""} onClick={() => setSection("CONTENT")}><Layers3 /> Módulos da Home</button>
        <button className={section === "TRAINING" ? "is-active" : ""} onClick={() => setSection("TRAINING")}><Dumbbell /> Programas de treino</button>
      </div>

      {items.length ? (
        <div className="program-list catalog-list">
          {items.map((item) => {
            const lessons = item.lessons || [];
            const context = section;
            const entity = context === "CONTENT" ? "module" : "program";
            return (
              <article className="program-card catalog-card" key={item.id}>
                <header>
                  <div className="program-cover" style={{ backgroundImage: item.coverUrl ? `url(${item.coverUrl})` : undefined }}>{context === "CONTENT" ? <Layers3 /> : <Dumbbell />}</div>
                  <div className="program-title">
                    <div><StatusBadge value={item.status} /><span>{lessons.length} aula{lessons.length === 1 ? "" : "s"}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.description || (context === "CONTENT" ? "Módulo da Home" : "Programa de treino")}</p>
                    {context === "CONTENT" && Number(item.unlockDelayDays) > 0 && (
                      <small className="catalog-release"><CalendarClock /> Libera {item.unlockDelayDays} dia{item.unlockDelayDays === 1 ? "" : "s"} após concluir o módulo anterior</small>
                    )}
                  </div>
                  <div className="row-actions">
                    <button className="icon-button" onClick={() => open(entity, item, { context })} title="Editar"><Edit3 /></button>
                    <button className="icon-button danger" onClick={() => archive(entity, item.id)} title="Arquivar"><Archive /></button>
                  </div>
                </header>
                <div className="modules-admin catalog-lessons">
                  <div className="modules-admin__heading">
                    <strong>{context === "CONTENT" ? "Aulas do módulo" : "Aulas e exercícios"}</strong>
                    <button className="button ghost" onClick={() => open("lesson", null, context === "CONTENT" ? { moduleId: item.id, kind: "CONTENT", context } : { programId: item.id, kind: "WORKOUT", context })}><Plus /> Adicionar aula</button>
                  </div>
                  <div className="lesson-admin-list">
                    {lessons.map((lesson) => renderLesson(lesson, context, item.id))}
                    {!lessons.length && <div className="materials-empty">Nenhuma aula cadastrada ainda.</div>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState title={section === "CONTENT" ? "Crie o primeiro módulo da Home" : "Crie o primeiro programa de treino"} text="Depois, adicione as aulas diretamente dentro dele." />}

      {editor && (
        <Modal title={`${editor.id ? "Editar" : "Novo"} ${title}`} onClose={() => setEditor(null)} wide>
          <form className="form-grid" onSubmit={submit}>
            {formError && <div className="form-error full">{formError}</div>}
            <label className="full"><span>Nome</span><input value={form.title || ""} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
            <label className="full"><span>Descrição</span><textarea rows="3" value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} required={editor.entity === "program"} /></label>
            <label><span>Status</span><select value={form.status || "PUBLISHED"} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option></select></label>
            {editor.entity === "module" && (
              <label>
                <span>Liberação após o módulo anterior (dias)</span>
                <input type="number" min="0" max="3650" value={form.unlockDelayDays || 0} onChange={(event) => setForm({ ...form, unlockDelayDays: event.target.value })} />
                <small className="muted">0 libera assim que o anterior terminar. Ex.: 7 libera uma semana depois.</small>
              </label>
            )}

            {editor.entity === "lesson" && (
              <>
                {editor.context === "CONTENT" && <label><span>Tipo de aula</span><select value={form.kind || "CONTENT"} onChange={(event) => setForm({ ...form, kind: event.target.value, showMeditationButton: event.target.value === "MEDITATION" })}><option value="CONTENT">Aula geral</option><option value="MEDITATION">Meditação</option><option value="WORKOUT">Aula com exercício</option></select></label>}
                {editor.context === "CONTENT" && <label className="catalog-highlight-toggle"><input type="checkbox" checked={Boolean(form.isIntroductory)} onChange={(event) => setForm({ ...form, isIntroductory: event.target.checked })} /><span><strong>Mostrar nas aulas introdutórias</strong><small>Até 3 aulas podem aparecer no carrossel do topo da Home.</small></span></label>}
                {form.kind === "MEDITATION" && <label><span>Acesso à meditação</span><select value={form.showMeditationButton ? "GUIDED" : "VIDEO"} onChange={(event) => setForm({ ...form, showMeditationButton: event.target.value === "GUIDED" })}><option value="GUIDED">Abrir prática guiada (vídeo opcional)</option><option value="VIDEO">Somente vídeo</option></select></label>}
                <label><span>Duração (min)</span><input type="number" min="1" value={form.durationMinutes || ""} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></label>
                <label><span>Nível</span><select value={form.difficulty || "Iniciante"} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}><option>Iniciante</option><option>Intermediário</option><option>Avançado</option><option>Todos os níveis</option></select></label>
                <label><span>Categoria</span><input value={form.category || ""} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder={editor.context === "TRAINING" ? "Ex.: Bíceps" : "Ex.: Introdução"} /></label>
                <section className="full lesson-video-editor">
                  <header><div><strong>Vídeo da aula</strong><small>Use um link do YouTube/Vimeo, um arquivo MP4 direto ou envie o vídeo.</small></div>{form.videoUrl && <button type="button" className="button ghost" onClick={() => setForm({ ...form, videoUrl: "" })}><Trash2 /> Remover vídeo</button>}</header>
                  <div className="lesson-video-fields">
                    <label><span>Link do vídeo</span><input type="url" value={form.videoUrl || ""} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://youtube.com/... ou https://.../video.mp4" /><small className="muted"><Link2 /> YouTube, Vimeo ou link direto HTTPS</small></label>
                    <label><span>Enviar arquivo</span><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => upload(event.target.files?.[0], "/uploads/video", "videoUrl", setUploadingVideo)} disabled={uploadingVideo} /><small className="muted"><Upload /> {uploadingVideo ? `Enviando vídeo... ${videoUploadProgress}%` : "MP4 recomendado · até 150 MB"}</small></label>
                  </div>
                  {uploadingVideo && <div className="video-upload-progress"><span style={{ width: `${videoUploadProgress}%` }} /></div>}
                  <LessonVideoPreview value={form.videoUrl} />
                </section>
                <label className="full"><span>Orientações</span><textarea rows="4" value={form.instructions || ""} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label>
                <label className="full"><span>Liberação após a aula anterior (horas)</span><input type="number" min="0" max="8760" value={form.unlockDelayHours || 0} onChange={(event) => setForm({ ...form, unlockDelayHours: event.target.value })} /><small className="muted">Use 0 para liberar imediatamente, 24 para um dia ou 168 para sete dias.</small></label>
                <section className="full lesson-materials-editor">
                  <header><div><strong>Arquivos e links da aula</strong><small>PDF, documento, planilha, ZIP ou link externo.</small></div><button type="button" className="button secondary" onClick={addMaterial}><Plus /> Adicionar material</button></header>
                  {form.materials?.length ? <div className="material-editor-list">{form.materials.map((material, index) => (
                    <article className="material-editor-row" key={index}>
                      <span className="material-editor-icon">{material.type === "FILE" ? <FilePlus /> : <Link2 />}</span>
                      <div className="material-editor-fields"><input placeholder="Nome do material" value={material.title} onChange={(event) => changeMaterial(index, "title", event.target.value)} /><input type="url" placeholder="https://... ou faça upload" value={material.url} onChange={(event) => { changeMaterial(index, "url", event.target.value); changeMaterial(index, "type", "LINK"); }} /></div>
                      <label className="material-upload-button" title="Enviar arquivo"><Upload /><input type="file" accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" disabled={uploadingMaterial !== null} onChange={(event) => uploadMaterialFile(event.target.files?.[0], index)} /></label>
                      <button type="button" className="icon-button danger" onClick={() => removeMaterial(index)}><Trash2 /></button>
                      {uploadingMaterial === index && <small className="material-uploading">Enviando...</small>}
                    </article>
                  ))}</div> : <div className="materials-empty">Nenhum material adicional.</div>}
                </section>
              </>
            )}

            <label className="full"><span>URL da capa</span><input type="url" value={form.coverUrl || ""} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} placeholder="https://..." /></label>
            <label className="full"><span>Ou envie a capa</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0], "/uploads", "coverUrl", setUploadingCover)} disabled={uploadingCover} /><small className="muted"><Upload /> {uploadingCover ? "Enviando imagem..." : "JPG, PNG ou WebP · até 8 MB"}</small></label>
            {form.coverUrl && <div className="full content-cover-preview"><img src={form.coverUrl} alt="Prévia da capa" /><span>Capa pronta.</span></div>}
            <div className="form-actions full"><button type="button" className="button secondary" onClick={() => setEditor(null)}>Cancelar</button><button className="button primary" disabled={saving || uploadingCover || uploadingVideo || uploadingMaterial !== null}>{saving ? "Salvando..." : "Salvar"}</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
