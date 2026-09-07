import { createElement, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ImageBackground, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Award,
  Bot,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  Leaf,
  LockKeyhole,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";
import api, { messageFrom } from "../services/api.js";
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  ProgressBar,
  Screen,
} from "../components/UI.js";
import { colors, fonts, radii, shadow } from "../theme/index.js";

const cover = require("../../assets/essenza-cover.png");

const youtubeIdFrom = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null;
    }
  } catch {}
  return null;
};

const embeddedVideoUrl = (value) => {
  const youtubeId = youtubeIdFrom(value);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0`;
  try {
    const url = new URL(value);
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
};

function VideoUnavailable({ lesson, message, onRetry }) {
  const openExternally = async () => {
    try {
      await Linking.openURL(lesson.videoUrl);
    } catch {
      Alert.alert("Vídeo indisponível", "Confira o link cadastrado no painel.");
    }
  };
  return (
    <ImageBackground source={lesson.coverUrl ? { uri: lesson.coverUrl } : cover} style={styles.videoFallback} imageStyle={styles.videoImage}>
      <View style={styles.videoFallbackScrim}>
        <View style={styles.videoErrorIcon}><Play size={20} color={colors.primaryLight} fill={colors.primaryLight} /></View>
        <Text style={styles.videoErrorTitle}>Não foi possível abrir o vídeo</Text>
        <Text style={styles.videoErrorText}>{message || "O arquivo ou link pode estar temporariamente indisponível."}</Text>
        <View style={styles.videoErrorActions}>
          {onRetry && <Pressable style={styles.videoRetry} onPress={onRetry}><Text style={styles.videoRetryText}>Tentar novamente</Text></Pressable>}
          <Pressable style={styles.videoOpen} onPress={openExternally}><ExternalLink size={14} color={colors.ink} /><Text style={styles.videoOpenText}>Abrir vídeo</Text></Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

function DirectLessonVideo({ lesson }) {
  const [playback, setPlayback] = useState({ status: "loading", error: "" });
  const player = useVideoPlayer({ uri: lesson.videoUrl, useCaching: true }, (instance) => { instance.loop = false; });
  useEffect(() => {
    setPlayback({ status: player.status || "loading", error: "" });
    const subscription = player.addListener("statusChange", ({ status, error }) => {
      setPlayback({ status, error: error?.message || "" });
    });
    const timeout = setTimeout(() => {
      setPlayback((current) => current.status === "readyToPlay" ? current : { status: "error", error: "O carregamento demorou mais que o esperado." });
    }, 15000);
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [player]);
  const retry = async () => {
    setPlayback({ status: "loading", error: "" });
    try {
      await player.replaceAsync({ uri: lesson.videoUrl, useCaching: true });
    } catch (error) {
      setPlayback({ status: "error", error: error?.message || "Não foi possível recarregar o vídeo." });
    }
  };
  if (playback.status === "error") return <VideoUnavailable lesson={lesson} message={playback.error} onRetry={retry} />;
  return (
    <View style={styles.videoShell}>
      <VideoView player={player} style={styles.video} contentFit="contain" allowsFullscreen allowsPictureInPicture nativeControls />
      {playback.status !== "readyToPlay" && (
        <View style={styles.videoLoading} pointerEvents="none">
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.videoLoadingText}>Preparando o vídeo...</Text>
        </View>
      )}
    </View>
  );
}

function EmbeddedLessonVideo({ lesson, source }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    if (state !== "loading") return undefined;
    const timeout = setTimeout(() => setState("error"), 15000);
    return () => clearTimeout(timeout);
  }, [state, source]);
  if (state === "error") return <VideoUnavailable lesson={lesson} message="O serviço externo recusou a reprodução dentro do aplicativo." />;
  const browserFrame = Platform.OS === "web"
    ? createElement("iframe", {
        src: source,
        title: lesson.title,
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        allowFullScreen: true,
        onLoad: () => setState("ready"),
        style: { width: "100%", height: "100%", border: 0 },
      })
    : null;
  return (
    <View style={styles.videoShell}>
      {Platform.OS === "web" ? browserFrame : (
        <WebView
          source={{ uri: source }}
          style={styles.videoEmbed}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          onLoadEnd={() => setState("ready")}
          onError={() => setState("error")}
          onHttpError={() => setState("error")}
        />
      )}
      {state === "loading" && (
        <View style={styles.videoLoading} pointerEvents="none">
          <ActivityIndicator color={colors.primaryLight} size="large" />
          <Text style={styles.videoLoadingText}>Conectando ao vídeo...</Text>
        </View>
      )}
    </View>
  );
}

function LessonVideo({ lesson }) {
  const embedUrl = embeddedVideoUrl(lesson.videoUrl);
  return embedUrl ? <EmbeddedLessonVideo lesson={lesson} source={embedUrl} /> : <DirectLessonVideo lesson={lesson} />;
}

export function ProgramsScreen({ navigation }) {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/training-programs");
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
        <Text style={styles.pageTitle}>Programas de treino</Text>
        <Text style={styles.lead}>Treinos organizados para você avançar com clareza e constância.</Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate("TrainingAssistant")}
        style={({ pressed }) => [styles.aiCoachShortcut, pressed && styles.pressed]}
      >
        <View style={styles.aiCoachShortcutIcon}><Bot size={24} color={colors.text} /></View>
        <View style={styles.aiCoachShortcutCopy}>
          <Text style={styles.aiCoachShortcutEyebrow}>LUNA · AJUDA COM TREINO</Text>
          <Text style={styles.aiCoachShortcutTitle}>Dúvida ou dificuldade?</Text>
          <Text style={styles.aiCoachShortcutText}>Envie uma pergunta, foto ou vídeo curto da execução.</Text>
        </View>
        <ChevronRight size={20} color={colors.primaryLight} />
      </Pressable>

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
                    <Text style={styles.progressLabel}>{program.completedLessons} de {program.totalLessons} aulas</Text>
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

function CatalogLessonCard({ lesson, index, navigation, width, fallback }) {
  const completed = Boolean(lesson.progress?.[0]?.completed);
  const locked = lesson.availability?.isLocked;
  return (
    <Pressable
      disabled={locked}
      onPress={() => navigation.navigate("Lesson", { id: lesson.id })}
      style={({ pressed }) => [styles.episodeCard, width ? { width } : styles.episodeCardFull, locked && styles.lessonRowLocked, pressed && !locked && styles.rowPressed]}
    >
      <ImageBackground source={lesson.coverUrl ? { uri: lesson.coverUrl } : fallback || cover} style={styles.episodeCover} imageStyle={styles.episodeImage}>
        <View style={styles.episodeScrim}>
          <View style={styles.chapterIndexBadge}><Text style={styles.chapterIndexText}>{String(index + 1).padStart(2, "0")}</Text></View>
          <View style={[styles.chapterState, completed && styles.chapterStateComplete]}>
            {locked ? <LockKeyhole size={16} color={colors.text} /> : completed ? <CircleCheckBig size={17} color={colors.text} /> : <Play size={15} color={colors.text} fill={colors.text} />}
          </View>
        </View>
      </ImageBackground>
      <View style={styles.episodeBody}>
        <Text style={styles.episodeEyebrow}>AULA {String(index + 1).padStart(2, "0")}</Text>
        <Text numberOfLines={2} style={styles.episodeTitle}>{lesson.title}</Text>
        <View style={styles.metaRow}>
          <Clock3 size={13} color={colors.subtle} />
          <Text style={styles.lessonMeta}>{lesson.durationMinutes || "—"} min</Text>
        </View>
        {locked && <Text numberOfLines={2} style={styles.unlockText}>{lesson.availability?.reason}</Text>}
      </View>
    </Pressable>
  );
}

export function ProgramDetailScreen({ route, navigation }) {
  const [state, setState] = useState({ loading: true, error: "", item: null });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/training-programs/${route.params.id}`);
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
      <ImageBackground source={program.coverUrl ? { uri: program.coverUrl } : cover} style={styles.detailHero} imageStyle={styles.detailHeroImage}>
        <View style={styles.detailHeroScrim}>
          <View style={styles.programPill}><Award size={13} color={colors.accent} /><Text style={styles.programPillText}>PROGRAMA DE TREINO</Text></View>
          <Text style={styles.detailHeroTitle}>{program.title}</Text>
          <Text numberOfLines={3} style={styles.detailHeroText}>{program.description}</Text>
          <View style={styles.progressRow}><Text style={styles.progressLabel}>{program.completedLessons} de {program.totalLessons} aulas concluídas</Text><Text style={styles.progressLabel}>{program.progressPercent}%</Text></View>
          <ProgressBar value={program.progressPercent} color={colors.accent} />
        </View>
      </ImageBackground>
      <View style={styles.directHeading}><Text style={styles.chapterLabel}>AULAS E EXERCÍCIOS</Text><Text style={styles.directCount}>{program.lessons.length} aulas</Text></View>
      {program.lessons.map((lesson, index) => <CatalogLessonCard key={lesson.id} lesson={lesson} index={index} navigation={navigation} fallback={program.coverUrl ? { uri: program.coverUrl } : cover} />)}
      {!program.lessons.length && <Empty title="Aulas em preparação" text="Este programa receberá novas aulas em breve." />}
    </Screen>
  );
}

export function ContentModuleScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const [state, setState] = useState({ loading: true, error: "", item: null });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/content-modules/${route.params.id}`);
      setState({ loading: false, error: "", item: data });
    } catch (error) {
      setState({ loading: false, error: messageFrom(error), item: null });
    }
  }, [route.params.id]);
  useFocusEffect(useCallback(() => void load(), [load]));
  if (state.loading) return <Screen><Loading /></Screen>;
  if (state.error) return <Screen onBack={navigation.goBack}><ErrorBox message={state.error} retry={load} /></Screen>;
  const module = state.item;
  const episodeWidth = Math.min(310, width - 68);
  return (
    <Screen header={module.title} onBack={navigation.goBack}>
      <ImageBackground source={module.coverUrl ? { uri: module.coverUrl } : cover} style={styles.detailHero} imageStyle={styles.detailHeroImage}>
        <View style={styles.detailHeroScrim}>
          <View style={styles.programPill}><Sparkles size={13} color={colors.accent} /><Text style={styles.programPillText}>MÓDULO DE CONTEÚDO</Text></View>
          <Text style={styles.detailHeroTitle}>{module.title}</Text>
          <Text numberOfLines={3} style={styles.detailHeroText}>{module.description}</Text>
          <View style={styles.progressRow}><Text style={styles.progressLabel}>{module.completedLessons} de {module.totalLessons} aulas</Text><Text style={styles.progressLabel}>{module.progressPercent}%</Text></View>
          <ProgressBar value={module.progressPercent} color={module.progressPercent === 100 ? colors.success : colors.accent} />
        </View>
      </ImageBackground>
      <View style={styles.netflixHeading}><View><Text style={styles.chapterLabel}>AULAS DO MÓDULO</Text><Text style={styles.netflixTitle}>Continue assistindo</Text></View><Text style={styles.directCount}>Arraste para o lado</Text></View>
      {module.lessons.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={episodeWidth + 12} decelerationRate="fast" contentContainerStyle={styles.episodeCarousel}>
          {module.lessons.map((lesson, index) => <CatalogLessonCard key={lesson.id} lesson={lesson} index={index} navigation={navigation} width={episodeWidth} fallback={module.coverUrl ? { uri: module.coverUrl } : cover} />)}
        </ScrollView>
      ) : <Empty title="Aulas em preparação" text="Este módulo receberá novas aulas em breve." />}
    </Screen>
  );
}

function LegacyProgramDetailScreen({ route, navigation }) {
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
  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post(`/lessons/${lesson.id}/complete`, { completed: true });
      navigation.goBack();
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

  if (!lesson && !error) return <Screen><Loading label="Preparando sua aula..." /></Screen>;
  if (error && !lesson) return <Screen onBack={navigation.goBack}><ErrorBox message={error} /></Screen>;
  const hasMeditationPractice =
    lesson.kind === "MEDITATION" && lesson.showMeditationButton;
  const alreadyCompleted = lesson.progress?.[0]?.completed;

  return (
    <Screen header="Sua aula" onBack={navigation.goBack}>
      {lesson.videoUrl ? (
        <LessonVideo lesson={lesson} />
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
            {lesson.kind === "MEDITATION" ? <Leaf size={19} color={colors.primaryLight} /> : <Award size={19} color={colors.primaryLight} />}
          </View>
          <Text numberOfLines={1} style={styles.lessonMetricValue}>
            {lesson.kind === "MEDITATION" ? "Presença" : lesson.category || "Treino"}
          </Text>
          <Text style={styles.lessonMetricLabel}>{lesson.kind === "MEDITATION" ? "PRÁTICA" : "CATEGORIA"}</Text>
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
              <Text style={styles.materialsTitle}>Materiais desta aula</Text>
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
            : "Concluir aula"}
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
  pageTitle: { marginTop: 7, color: colors.text, fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 43, letterSpacing: 0.1 },
  lead: { marginTop: 7, maxWidth: 320, color: colors.muted, fontSize: 14, lineHeight: 21 },
  aiCoachShortcut: { minHeight: 96, marginBottom: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(232,136,91,.42)", borderRadius: radii.card, backgroundColor: colors.surface },
  aiCoachShortcutIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primary },
  aiCoachShortcutCopy: { flex: 1, minWidth: 0 },
  aiCoachShortcutEyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.05 },
  aiCoachShortcutTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  aiCoachShortcutText: { marginTop: 2, color: colors.muted, fontSize: 9, lineHeight: 13 },
  programCard: { height: 304, marginBottom: 17, overflow: "hidden", borderRadius: radii.hero, backgroundColor: colors.surface, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
  programCover: { flex: 1 },
  programImage: { borderRadius: radii.hero },
  coverScrim: { flex: 1, justifyContent: "space-between", padding: 19, backgroundColor: "rgba(5,14,26,.61)" },
  programTopline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  programPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: "rgba(16,11,10,.76)" },
  programPillText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  percentBubble: { width: 49, height: 49, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.5)", borderRadius: 18, backgroundColor: "rgba(16,11,10,.78)" },
  percentBubbleText: { color: colors.accent, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20 },
  programTitle: { maxWidth: 275, color: "#FFFFFF", fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: 0.1 },
  programText: { marginTop: 6, color: "#D7E2F1", fontSize: 12, lineHeight: 18 },
  detailHero: { minHeight: 285, marginBottom: 22, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.hero, backgroundColor: colors.surface, ...shadow },
  detailHeroImage: { borderRadius: radii.hero },
  detailHeroScrim: { flex: 1, padding: 20, justifyContent: "flex-end", backgroundColor: "rgba(5,5,7,.66)" },
  detailHeroTitle: { marginTop: 12, color: "#FFFFFF", fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: 0.1 },
  detailHeroText: { marginTop: 7, marginBottom: 15, color: "#E8E2DF", fontSize: 12, lineHeight: 18 },
  directHeading: { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  directCount: { color: colors.subtle, fontSize: 9, fontWeight: "800" },
  netflixHeading: { marginBottom: 13, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  netflixTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 23, lineHeight: 28 },
  episodeCarousel: { paddingRight: 20, gap: 12 },
  episodeCard: { marginBottom: 13, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  episodeCardFull: { width: "100%" },
  episodeCover: { height: 158, backgroundColor: colors.surface3 },
  episodeImage: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  episodeScrim: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(4,8,14,.28)" },
  episodeBody: { padding: 14 },
  episodeEyebrow: { color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  episodeTitle: { marginTop: 5, color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  progressRow: { marginTop: 16, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: "#D7E2F1", fontSize: 10, fontWeight: "700" },
  programSummary: { marginBottom: 18, padding: 17, flexDirection: "row", flexWrap: "wrap", gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface2 },
  summaryIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(245,179,141,.12)" },
  summaryContent: { flex: 1, minWidth: 180 },
  summaryEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  summaryText: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 18 },
  summaryPercent: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34 },
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
  moduleName: { marginTop: 6, color: colors.text, fontFamily: fonts.display, fontSize: 20, lineHeight: 25, letterSpacing: 0.1 },
  moduleStatus: { marginTop: 5, marginBottom: 13, color: colors.muted, fontSize: 11 },
  modulePercent: { minWidth: 53, paddingVertical: 8, alignItems: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  modulePercentText: { color: colors.primaryLight, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 20 },
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
  lessonTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 15, lineHeight: 19 },
  lessonTitleLocked: { color: colors.muted },
  metaRow: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 },
  lessonMeta: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  unlockText: { flex: 1, color: colors.subtle, fontSize: 9, lineHeight: 13, fontWeight: "700" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.subtle },
  videoShell: { width: "100%", height: 218, marginBottom: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.deep },
  video: { width: "100%", height: "100%", backgroundColor: colors.deep },
  videoEmbed: { flex: 1, backgroundColor: colors.deep },
  videoLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(9,6,5,.9)" },
  videoLoadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  videoFallback: { height: 174, marginBottom: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.surface2 },
  videoImage: { borderRadius: 20 },
  videoFallbackScrim: { width: "100%", height: "100%", padding: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(9,6,5,.82)" },
  videoErrorIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.38)", borderRadius: 14, backgroundColor: "rgba(158,63,34,.24)" },
  videoErrorTitle: { marginTop: 9, color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  videoErrorText: { marginTop: 3, maxWidth: 285, color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: "center" },
  videoErrorActions: { marginTop: 10, flexDirection: "row", gap: 8 },
  videoRetry: { minHeight: 36, paddingHorizontal: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.surface2 },
  videoRetryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 9 },
  videoOpen: { minHeight: 36, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 11, backgroundColor: colors.primaryLight },
  videoOpenText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 9 },
  playBig: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.primaryLight },
  lessonTag: { alignSelf: "flex-start", paddingVertical: 7, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: "rgba(217,122,74,.15)" },
  lessonTagText: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  lessonHeading: { marginTop: 11, color: colors.text, fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: 0.1 },
  lessonMetrics: { marginTop: 17, flexDirection: "row", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface, overflow: "hidden" },
  lessonMetric: { flex: 1, minHeight: 116, paddingHorizontal: 7, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: colors.line },
  lessonMetricIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: 14, backgroundColor: "rgba(245,179,141,.08)" },
  lessonMetricValue: { maxWidth: "100%", marginTop: 7, color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18, textAlign: "center" },
  lessonMetricLabel: { marginTop: 3, color: colors.subtle, fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  meditationAction: { marginTop: 21, padding: 16, borderWidth: 1, borderColor: "rgba(245,179,141,.34)", borderRadius: radii.card, backgroundColor: "rgba(245,179,141,.08)" },
  meditationActionCopy: { marginBottom: 14 },
  meditationActionEyebrow: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1.15 },
  meditationActionText: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18 },
  description: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 20 },
  instructions: { marginVertical: 21, padding: 16, flexDirection: "row", gap: 11, borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: radii.input, backgroundColor: "rgba(245,179,141,.08)" },
  instructionIcon: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(245,179,141,.12)" },
  instructionCopy: { flex: 1 },
  instructionsTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 15, lineHeight: 19 },
  materialsBlock: { marginBottom: 21, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  materialsHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  materialsTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  materialsSubtitle: { marginTop: 2, color: colors.subtle, fontSize: 9 },
  materialRow: { minHeight: 61, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.line },
  materialIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(245,179,141,.1)" },
  materialCopy: { flex: 1 },
  materialTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  materialType: { marginTop: 3, color: colors.muted, fontSize: 9 },
  inlineError: { marginBottom: 12, color: colors.danger, fontWeight: "700" },
  lessonNav: { marginTop: 12, flexDirection: "row", gap: 10 },
  navButton: { flex: 1 },
});
