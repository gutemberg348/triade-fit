import { useCallback, useEffect, useState } from "react";
import { Alert, ImageBackground, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Award,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  ExternalLink,
  FileText,
  Flame,
  Gauge,
  Leaf,
  LockKeyhole,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import api, { messageFrom } from "../services/api.js";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  ProgressBar,
  Screen,
} from "../components/UI.js";
import { colors, radii, shadow } from "../theme/index.js";

const cover = require("../../assets/essenza-cover.png");

export function ProgramsScreen({ navigation }) {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/programs");
      setState({ loading: false, error: "", items: data });
    } catch (error) {
      setState({ loading: false, error: messageFrom(error), items: [] });
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.eyebrowRow}>
          <Sparkles size={14} color={colors.accent} />
          <Text style={styles.eyebrow}>SUA JORNADA</Text>
        </View>
        <Text style={styles.pageTitle}>Programas</Text>
        <Text style={styles.lead}>Treinos organizados para você avançar com clareza e constância.</Text>
      </View>

      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox message={state.error} retry={load} />
      ) : state.items.length ? (
        state.items.map((program) => (
          <Pressable
            style={({ pressed }) => [styles.programCard, pressed && styles.pressed]}
            key={program.id}
            onPress={() => navigation.navigate("Program", { id: program.id })}
          >
            <ImageBackground
              source={program.coverUrl ? { uri: program.coverUrl } : cover}
              style={styles.programCover}
              imageStyle={styles.programImage}
            >
              <View style={styles.coverScrim}>
                <View style={styles.programTopline}>
                  <View style={styles.programPill}>
                    <Award size={13} color={colors.accent} />
                    <Text style={styles.programPillText}>PLANO ATIVO</Text>
                  </View>
                  <View style={styles.percentBubble}>
                    <Text style={styles.percentBubbleText}>{program.progressPercent}%</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.programTitle}>{program.title}</Text>
                  <Text numberOfLines={2} style={styles.programText}>{program.description}</Text>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>{program.completedLessons} de {program.totalLessons} capítulos</Text>
                    <Text style={styles.progressLabel}>Progresso</Text>
                  </View>
                  <ProgressBar value={program.progressPercent} color={colors.accent} />
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ))
      ) : (
        <Empty title="Nenhum programa disponível" text="Sua Personal ainda está preparando sua jornada." />
      )}
    </Screen>
  );
}

export function ProgramDetailScreen({ route, navigation }) {
  const [state, setState] = useState({ loading: true, error: "", item: null });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/programs/${route.params.id}`);
      setState({ loading: false, error: "", item: data });
    } catch (error) {
      setState({ loading: false, error: messageFrom(error), item: null });
    }
  }, [route.params.id]);
  useFocusEffect(useCallback(() => void load(), [load]));

  if (state.loading) return <Screen><Loading /></Screen>;
  if (state.error) return <Screen onBack={navigation.goBack}><ErrorBox message={state.error} retry={load} /></Screen>;

  const program = state.item;
  return (
    <Screen header={program.title} onBack={navigation.goBack}>
      <View style={styles.programSummary}>
        <View style={styles.summaryIcon}><Award size={20} color={colors.accent} /></View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryEyebrow}>SEU PROGRESSO</Text>
          <Text style={styles.summaryText}>{program.description}</Text>
        </View>
        <Text style={styles.summaryPercent}>{program.progressPercent}%</Text>
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryCount}>{program.completedLessons} de {program.totalLessons} capítulos concluídos</Text>
          <ProgressBar value={program.progressPercent} color={colors.accent} />
        </View>
      </View>

      {program.modules.map((module, moduleIndex) => (
        <View style={styles.moduleBlock} key={module.id}>
          <ImageBackground
            source={module.coverUrl ? { uri: module.coverUrl } : program.coverUrl ? { uri: program.coverUrl } : cover}
            style={styles.moduleHero}
            imageStyle={styles.moduleHeroImage}
          >
            <View style={styles.moduleHeroScrim}>
              <View style={styles.moduleCopy}>
                <Text style={styles.moduleEyebrow}>MÓDULO {String(moduleIndex + 1).padStart(2, "0")}</Text>
                <Text style={styles.moduleName}>{module.title}</Text>
                <Text style={styles.moduleStatus}>{module.completedLessons} de {module.totalLessons} capítulos concluídos</Text>
              </View>
              <View style={styles.modulePercent}><Text style={styles.modulePercentText}>{module.progressPercent}%</Text></View>
            </View>
          </ImageBackground>
          <View style={styles.moduleProgress}><ProgressBar value={module.progressPercent} color={module.progressPercent === 100 ? colors.success : colors.primary} /></View>

          <View style={styles.lessonList}>
            <Text style={styles.chapterLabel}>CAPÍTULOS</Text>
            {module.lessons.map((lesson, lessonIndex) => {
              const completed = lesson.progress?.[0]?.completed;
              const locked = lesson.availability?.isLocked;
              const unlockText = lesson.availability?.unlocksAt
                ? `Libera em ${new Date(lesson.availability.unlocksAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                : "Conclua o capítulo anterior";
              return (
                <Pressable
                  style={({ pressed }) => [styles.lessonRow, locked && styles.lessonRowLocked, pressed && !locked && styles.rowPressed]}
                  key={lesson.id}
                  disabled={locked}
                  onPress={() => navigation.navigate("Lesson", { id: lesson.id })}
                >
                  <ImageBackground
                    source={lesson.coverUrl ? { uri: lesson.coverUrl } : module.coverUrl ? { uri: module.coverUrl } : program.coverUrl ? { uri: program.coverUrl } : cover}
                    style={styles.chapterThumb}
                    imageStyle={styles.chapterThumbImage}
                  >
                    <View style={styles.chapterThumbScrim}>
                      <View style={styles.chapterIndexBadge}>
                        <Text style={styles.chapterIndexText}>{String(lessonIndex + 1).padStart(2, "0")}</Text>
                      </View>
                      <View style={[styles.chapterState, completed && styles.chapterStateComplete]}>
                        {locked ? <LockKeyhole size={15} color={colors.text} /> : completed ? <CircleCheckBig size={16} color={colors.text} /> : <Play size={14} color={colors.text} fill={colors.text} />}
                      </View>
                    </View>
                  </ImageBackground>
                  <View style={styles.lessonCopy}>
                    <Text style={styles.chapterNumber}>CAPÍTULO {String(lessonIndex + 1).padStart(2, "0")}</Text>
                    <Text numberOfLines={2} style={[styles.lessonTitle, locked && styles.lessonTitleLocked]}>{lesson.title}</Text>
                    <View style={styles.metaRow}>
                      {locked ? (
                        <Text style={styles.unlockText}>{unlockText}</Text>
                      ) : (
                        <>
                          <Clock3 size={13} color={colors.subtle} />
                          <Text style={styles.lessonMeta}>{lesson.durationMinutes || "—"} min</Text>
                          <View style={styles.metaDot} />
                          <Text style={styles.lessonMeta}>{lesson.kind === "MEDITATION" ? "Meditação" : lesson.category || "Treino"}</Text>
                          {lesson.kind === "WORKOUT" && lesson.calories ? (
                            <>
                              <View style={styles.metaDot} />
                              <Flame size={12} color={colors.primaryLight} />
                              <Text style={styles.lessonMeta}>{lesson.calories} kcal</Text>
                            </>
                          ) : null}
                        </>
                      )}
                    </View>
                  </View>
                  {locked ? <LockKeyhole size={18} color={colors.subtle} /> : <ChevronRight size={20} color={completed ? colors.success : colors.primaryLight} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

export function LessonScreen({ route, navigation }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setLesson(null);
    setError("");
    api.get(`/lessons/${route.params.id}`).then(({ data }) => setLesson(data)).catch((err) => setError(messageFrom(err)));
  }, [route.params.id]);
  const player = useVideoPlayer(lesson?.videoUrl || null, (instance) => { instance.loop = false; });
  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/lessons/${lesson.id}/complete`, { completed: true });
      if (data.caloriesAdded > 0) {
        Alert.alert(
          "Treino concluído",
          `+${data.caloriesAdded} kcal foram adicionadas ao seu progresso.`,
          [{ text: "Continuar", onPress: () => navigation.goBack() }],
        );
      } else {
        navigation.goBack();
      }
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };
  const openMaterial = async (material) => {
    try {
      const supported = await Linking.canOpenURL(material.url);
      if (!supported) throw new Error("unsupported");
      await Linking.openURL(material.url);
    } catch {
      Alert.alert("Não foi possível abrir", "Confira se o link ou arquivo continua disponível.");
    }
  };

  if (!lesson && !error) return <Screen><Loading label="Preparando seu capítulo..." /></Screen>;
  if (error && !lesson) return <Screen onBack={navigation.goBack}><ErrorBox message={error} /></Screen>;
  const hasMeditationPractice =
    lesson.kind === "MEDITATION" && lesson.showMeditationButton;
  const alreadyCompleted = lesson.progress?.[0]?.completed;

  return (
    <Screen header="Seu capítulo" onBack={navigation.goBack}>
      {lesson.videoUrl ? (
        <VideoView player={player} style={styles.video} allowsFullscreen allowsPictureInPicture nativeControls />
      ) : (
        <ImageBackground source={lesson.coverUrl ? { uri: lesson.coverUrl } : cover} style={styles.videoFallback} imageStyle={styles.videoImage}>
          <View style={styles.playBig}>
            {hasMeditationPractice ? (
              <Leaf size={25} color={colors.ink} />
            ) : (
              <Play size={23} color={colors.ink} fill={colors.ink} />
            )}
          </View>
        </ImageBackground>
      )}
      <View style={styles.lessonTag}>
        {lesson.kind === "MEDITATION" ? <Leaf size={13} color={colors.primaryLight} /> : null}
        <Text style={styles.lessonTagText}>
          {lesson.kind === "MEDITATION" ? "MEDITAÇÃO" : lesson.category || "TREINO TRIADE FIT"}
        </Text>
      </View>
      <Text style={styles.lessonHeading}>{lesson.title}</Text>
      <View style={styles.lessonMetrics}>
        <View style={styles.lessonMetric}>
          <View style={styles.lessonMetricIcon}><Clock3 size={19} color={colors.primaryLight} /></View>
          <Text style={styles.lessonMetricValue}>{lesson.durationMinutes || "—"} min</Text>
          <Text style={styles.lessonMetricLabel}>DURAÇÃO</Text>
        </View>
        <View style={styles.lessonMetric}>
          <View style={styles.lessonMetricIcon}><Gauge size={19} color={colors.primaryLight} /></View>
          <Text numberOfLines={1} style={styles.lessonMetricValue}>{lesson.difficulty || "Livre"}</Text>
          <Text style={styles.lessonMetricLabel}>NÍVEL</Text>
        </View>
        <View style={styles.lessonMetric}>
          <View style={styles.lessonMetricIcon}>
            {lesson.kind === "MEDITATION" ? <Leaf size={19} color={colors.primaryLight} /> : <Flame size={19} color={colors.primaryLight} />}
          </View>
          <Text numberOfLines={1} style={styles.lessonMetricValue}>
            {lesson.kind === "MEDITATION" ? "Presença" : `${lesson.calories || "—"} kcal`}
          </Text>
          <Text style={styles.lessonMetricLabel}>{lesson.kind === "MEDITATION" ? "PRÁTICA" : "ESTIMATIVA"}</Text>
        </View>
      </View>
      <Text style={styles.description}>{lesson.description}</Text>
      {hasMeditationPractice && (
        <View style={styles.meditationAction}>
          <View style={styles.meditationActionCopy}>
            <Text style={styles.meditationActionEyebrow}>PRÁTICA GUIADA</Text>
            <Text style={styles.meditationActionText}>
              Reserve este tempo para respirar e acompanhar a prática no seu ritmo.
            </Text>
          </View>
          <Button
            title="Iniciar prática de meditação"
            icon={Leaf}
            onPress={() => navigation.navigate("MeditationSession", { id: lesson.id })}
          />
        </View>
      )}
      {lesson.instructions && (
        <View style={styles.instructions}>
          <View style={styles.instructionIcon}><Sparkles size={16} color={colors.accent} /></View>
          <View style={styles.instructionCopy}>
            <Text style={styles.instructionsTitle}>Orientações da Personal</Text>
            <Text style={styles.description}>{lesson.instructions}</Text>
          </View>
        </View>
      )}
      {lesson.materials?.length ? (
        <View style={styles.materialsBlock}>
          <View style={styles.materialsHead}>
            <FileText size={18} color={colors.primaryLight} />
            <View>
              <Text style={styles.materialsTitle}>Materiais deste capítulo</Text>
              <Text style={styles.materialsSubtitle}>Arquivos e links selecionados pela Personal</Text>
            </View>
          </View>
          {lesson.materials.map((material, index) => (
            <Pressable key={`${material.url}-${index}`} style={styles.materialRow} onPress={() => openMaterial(material)}>
              <View style={styles.materialIcon}>{material.type === "FILE" ? <FileText size={17} color={colors.primaryLight} /> : <ExternalLink size={17} color={colors.primaryLight} />}</View>
              <View style={styles.materialCopy}>
                <Text style={styles.materialTitle}>{material.title}</Text>
                <Text style={styles.materialType}>{material.type === "FILE" ? "Abrir arquivo" : "Abrir link externo"}</Text>
              </View>
              <ExternalLink size={17} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      <Button
        title={alreadyCompleted
          ? "Capítulo concluído"
          : saving
            ? "Salvando..."
            : lesson.kind === "WORKOUT" && lesson.calories
              ? `Concluir e somar ${lesson.calories} kcal`
              : "Concluir capítulo"}
        icon={alreadyCompleted ? CircleCheckBig : Award}
        onPress={complete}
        disabled={saving || alreadyCompleted}
      />
      <View style={styles.lessonNav}>
        {lesson.previousLesson ? <Button title="Anterior" variant="secondary" style={styles.navButton} onPress={() => navigation.replace("Lesson", { id: lesson.previousLesson.id })} /> : <View style={styles.navButton} />}
        {lesson.nextLesson ? <Button title={lesson.nextLesson.availability?.isLocked ? "Próxima bloqueada" : "Próxima"} variant="secondary" style={styles.navButton} disabled={lesson.nextLesson.availability?.isLocked} onPress={() => navigation.replace("Lesson", { id: lesson.nextLesson.id })} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 24 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: "900", letterSpacing: 1.35 },
  pageTitle: { marginTop: 7, color: colors.text, fontSize: 33, fontWeight: "900", letterSpacing: -1 },
  lead: { marginTop: 7, maxWidth: 320, color: colors.muted, fontSize: 14, lineHeight: 21 },
  programCard: { height: 304, marginBottom: 17, overflow: "hidden", borderRadius: radii.hero, backgroundColor: colors.surface, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
  programCover: { flex: 1 },
  programImage: { borderRadius: radii.hero },
  coverScrim: { flex: 1, justifyContent: "space-between", padding: 19, backgroundColor: "rgba(5,14,26,.61)" },
  programTopline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  programPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: "rgba(16,11,10,.76)" },
  programPillText: { color: colors.text, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  percentBubble: { width: 49, height: 49, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.5)", borderRadius: 18, backgroundColor: "rgba(16,11,10,.78)" },
  percentBubbleText: { color: colors.accent, fontSize: 14, fontWeight: "900" },
  programTitle: { maxWidth: 275, color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -0.7 },
  programText: { marginTop: 6, color: "#D7E2F1", fontSize: 12, lineHeight: 18 },
  progressRow: { marginTop: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: "#D7E2F1", fontSize: 10, fontWeight: "700" },
  programSummary: { marginBottom: 18, padding: 17, flexDirection: "row", flexWrap: "wrap", gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface2 },
  summaryIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(245,179,141,.12)" },
  summaryContent: { flex: 1, minWidth: 180 },
  summaryEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  summaryText: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 18 },
  summaryPercent: { color: colors.text, fontSize: 25, fontWeight: "900" },
  summaryFooter: { width: "100%", marginTop: 3, gap: 8 },
  summaryCount: { color: colors.text, fontSize: 12, fontWeight: "700" },
  moduleBlock: { marginBottom: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  moduleHero: { height: 150, justifyContent: "flex-end" },
  moduleHeroImage: { borderTopLeftRadius: radii.card - 1, borderTopRightRadius: radii.card - 1 },
  moduleHeroScrim: { flex: 1, padding: 16, flexDirection: "row", gap: 12, justifyContent: "space-between", alignItems: "flex-end", backgroundColor: "rgba(4,8,14,.55)" },
  moduleEyebrow: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  moduleProgress: { padding: 14, paddingBottom: 4 },
  moduleHead: { flexDirection: "row", gap: 12, justifyContent: "space-between", alignItems: "flex-start" },
  moduleCopy: { flex: 1 },
  moduleName: { marginTop: 6, color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  moduleStatus: { marginTop: 5, marginBottom: 13, color: colors.muted, fontSize: 11 },
  modulePercent: { minWidth: 53, paddingVertical: 8, alignItems: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  modulePercentText: { color: colors.primaryLight, fontSize: 14, fontWeight: "900" },
  lessonList: { paddingHorizontal: 13, paddingBottom: 9 },
  chapterLabel: { marginTop: 11, marginBottom: 6, color: colors.subtle, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  lessonRow: { minHeight: 98, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  lessonRowLocked: { opacity: 0.62 },
  rowPressed: { opacity: 0.72 },
  chapterThumb: { width: 92, height: 64, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,179,141,.24)", borderRadius: 13, backgroundColor: colors.surface3 },
  chapterThumbImage: { borderRadius: 13 },
  chapterThumbScrim: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(4,8,14,.34)" },
  chapterIndexBadge: { position: "absolute", top: 6, left: 6, minWidth: 25, height: 20, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.2)", borderRadius: 7, backgroundColor: "rgba(7,7,9,.76)" },
  chapterIndexText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  chapterState: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.2)", borderRadius: 12, backgroundColor: "rgba(7,7,9,.76)" },
  chapterStateComplete: { borderColor: "rgba(169,196,154,.7)", backgroundColor: "rgba(77,112,70,.82)" },
  lessonCopy: { flex: 1 },
  chapterNumber: { marginBottom: 3, color: colors.primaryLight, fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  lessonTitle: { color: colors.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  lessonTitleLocked: { color: colors.muted },
  metaRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 },
  lessonMeta: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  unlockText: { flex: 1, color: colors.subtle, fontSize: 9, lineHeight: 13, fontWeight: "700" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.subtle },
  video: { width: "100%", height: 202, marginBottom: 18, overflow: "hidden", borderRadius: 20, backgroundColor: colors.deep },
  videoFallback: { height: 174, marginBottom: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.surface2 },
  videoImage: { borderRadius: 20 },
  playBig: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.primaryLight },
  lessonTag: { alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: "rgba(217,122,74,.15)" },
  lessonTagText: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  lessonHeading: { marginTop: 11, color: colors.text, fontSize: 29, fontWeight: "900", letterSpacing: -0.8 },
  lessonMetrics: { marginTop: 17, flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface, overflow: "hidden" },
  lessonMetric: { flex: 1, minHeight: 116, paddingHorizontal: 7, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: colors.line },
  lessonMetricIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: 14, backgroundColor: "rgba(245,179,141,.08)" },
  lessonMetricValue: { maxWidth: "100%", marginTop: 7, color: colors.text, fontSize: 12, fontWeight: "900", textAlign: "center" },
  lessonMetricLabel: { marginTop: 3, color: colors.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  meditationAction: { marginTop: 21, padding: 16, borderWidth: 1, borderColor: "rgba(245,179,141,.34)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  meditationActionCopy: { marginBottom: 14 },
  meditationActionEyebrow: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1.15 },
  meditationActionText: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18 },
  description: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 20 },
  instructions: { marginVertical: 21, padding: 16, flexDirection: "row", gap: 11, borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: radii.input, backgroundColor: "rgba(245,179,141,.08)" },
  instructionIcon: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(245,179,141,.12)" },
  instructionCopy: { flex: 1 },
  instructionsTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  materialsBlock: { marginBottom: 21, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  materialsHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  materialsTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  materialsSubtitle: { marginTop: 2, color: colors.subtle, fontSize: 9 },
  materialRow: { minHeight: 61, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.line },
  materialIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(245,179,141,.1)" },
  materialCopy: { flex: 1 },
  materialTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  materialType: { marginTop: 3, color: colors.muted, fontSize: 9 },
  inlineError: { marginBottom: 12, color: colors.danger, fontWeight: "700" },
  lessonNav: { marginTop: 12, flexDirection: "row", gap: 10 },
  navButton: { flex: 1 },
});
