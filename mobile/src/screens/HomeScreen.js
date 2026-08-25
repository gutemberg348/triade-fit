import { useCallback, useState } from "react";
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Bell,
  ChevronRight,
  CircleCheckBig,
  Layers3,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { messageFrom } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.js";
import { Brand, ErrorBox, Loading, ProgressBar } from "../components/UI.js";
import { colors, radii, shadow } from "../theme/index.js";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    programs: [],
    announcements: [],
    appConfig: null,
  });

  const load = useCallback(async () => {
    try {
      const [programs, announcements, appConfig] = await Promise.all([
        api.get("/programs"),
        api.get("/announcements"),
        api.get("/app-config"),
      ]);
      setState({
        loading: false,
        error: "",
        programs: programs.data,
        announcements: announcements.data,
        appConfig: appConfig.data,
      });
    } catch (error) {
      setState((old) => ({ ...old, loading: false, error: messageFrom(error) }));
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (state.loading)
    return <SafeAreaView style={styles.safe}><Loading label="Preparando sua jornada..." /></SafeAreaView>;
  if (state.error && !state.programs.length)
    return <SafeAreaView style={styles.safe}><ErrorBox message={state.error} retry={load} /></SafeAreaView>;

  const program = state.programs[0];
  const nextLesson = program?.modules
    .flatMap((module) => module.lessons)
    .find((lesson) => !lesson.progress?.[0]?.completed && !lesson.availability?.isLocked);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primaryLight} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Brand mini />
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate("Comunidade")}>
            <Bell color={colors.text} size={20} />
            {state.announcements.length > 0 && <View style={styles.dot} />}
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>BEM-VINDA DE VOLTA</Text>
          <Text style={styles.greeting}>
            Olá, <Text style={styles.greetingName}>{user?.name?.split(" ")[0] || "atleta"}</Text>
          </Text>
          <Text style={styles.sub}>Corpo, mente e constância em movimento.</Text>
        </View>

        {program && (
          <Pressable
            onPress={() => nextLesson
              ? navigation.navigate("Lesson", { id: nextLesson.id })
              : navigation.navigate("Program", { id: program.id })}
            style={({ pressed }) => pressed && styles.heroPressed}
          >
            <ImageBackground
              source={state.appConfig?.homeBannerUrl
                ? { uri: state.appConfig.homeBannerUrl }
                : require("../../assets/essenza-cover.png")}
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <LinearGradient
                colors={["rgba(5,5,7,.96)", "rgba(5,5,7,.7)", "rgba(5,5,7,.08)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroGradient}
              >
                <View style={styles.pill}>
                  <Sparkles color={colors.primaryLight} size={12} />
                  <Text style={styles.pillText}>{state.appConfig?.homeBannerLabel || "CONTINUE SUA JORNADA"}</Text>
                </View>
                <Text numberOfLines={2} style={styles.heroTitle}>{nextLesson?.title || program.title}</Text>
                <Text style={styles.heroMeta}>
                  {nextLesson
                    ? `${nextLesson.category || "Treino"} · ${nextLesson.durationMinutes || "—"} min${nextLesson.kind === "WORKOUT" && nextLesson.calories ? ` · ${nextLesson.calories} kcal` : ""}`
                    : "Programa concluído"}
                </Text>
                <View style={styles.continue}>
                  <Play color={colors.ink} size={15} fill={colors.ink} />
                  <Text style={styles.continueText}>{nextLesson ? "Continuar capítulo" : "Rever programa"}</Text>
                </View>
                <View style={styles.progressHead}>
                  <Text style={styles.progressHeadText}>Progresso do programa</Text>
                  <Text style={styles.progressHeadValue}>{program.progressPercent}%</Text>
                </View>
                <ProgressBar value={program.progressPercent} color={colors.accent} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        )}

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>CONTINUE AVANÇANDO</Text><Text style={styles.sectionTitle}>Seu programa</Text></View>
          <Pressable onPress={() => navigation.navigate("Treinos")}><Text style={styles.sectionLink}>Ver todos</Text></Pressable>
        </View>

        {program?.modules.slice(0, 3).map((module, index) => {
          const completed = module.progressPercent === 100;
          return (
            <Pressable
              key={module.id}
              style={({ pressed }) => [styles.module, pressed && styles.modulePressed]}
              onPress={() => navigation.navigate("Program", { id: program.id })}
            >
              <View style={styles.moduleIdentity}>
                <Text style={styles.moduleIdentityLabel}>MÓDULO</Text>
                <Text style={styles.moduleNumberText}>{String(index + 1).padStart(2, "0")}</Text>
                <View style={[styles.moduleIcon, completed && styles.moduleIconComplete]}>
                  {completed ? <CircleCheckBig color={colors.text} size={15} /> : <Layers3 color={colors.primaryLight} size={15} />}
                </View>
              </View>
              <View style={styles.moduleCopy}>
                <View style={styles.moduleTitleRow}>
                  <Text numberOfLines={2} style={styles.moduleTitle}>{module.title}</Text>
                  <ChevronRight color={completed ? colors.success : colors.primaryLight} size={18} />
                </View>
                <Text style={styles.moduleMeta}>{module.completedLessons} de {module.totalLessons} capítulos concluídos</Text>
                <View style={styles.moduleProgressRow}>
                  <View style={styles.moduleProgressBar}><ProgressBar value={module.progressPercent} color={completed ? colors.success : colors.primaryLight} /></View>
                  <Text style={[styles.modulePercent, completed && styles.modulePercentComplete]}>{module.progressPercent}%</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>FIQUE POR DENTRO</Text><Text style={styles.sectionTitle}>Avisos recentes</Text></View>
          <Pressable onPress={() => navigation.navigate("Comunidade")}><Text style={styles.sectionLink}>Ver todos</Text></Pressable>
        </View>
        {state.announcements.slice(0, 2).map((item) => (
          <View style={styles.notice} key={item.id}>
            <View style={styles.noticeIcon}><Sparkles color={colors.primaryLight} size={18} /></View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.noticeText}>{item.message}</Text>
            </View>
            <ChevronRight color={colors.subtle} size={18} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 110 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 21, backgroundColor: colors.surface },
  dot: { position: "absolute", right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  welcome: { marginTop: 28, marginBottom: 22 },
  eyebrow: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1.45 },
  greeting: { marginTop: 6, color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.9 },
  greetingName: { color: colors.accent, fontWeight: "900" },
  sub: { marginTop: 5, color: colors.muted, fontSize: 12 },
  heroPressed: { opacity: 0.92, transform: [{ scale: 0.994 }] },
  hero: { height: 264, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,179,141,.25)", borderRadius: radii.hero, backgroundColor: colors.surface, ...shadow },
  heroImage: { resizeMode: "cover", borderRadius: radii.hero },
  heroGradient: { flex: 1, padding: 20, justifyContent: "flex-end" },
  pill: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: 30, backgroundColor: "rgba(10,8,8,.72)" },
  pillText: { color: colors.text, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  heroTitle: { maxWidth: "74%", color: "#FFFFFF", fontSize: 26, lineHeight: 29, fontWeight: "900", letterSpacing: -0.8 },
  heroMeta: { marginTop: 6, color: "#E9E4E1", fontSize: 10, fontWeight: "700" },
  continue: { alignSelf: "flex-start", marginTop: 13, paddingVertical: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, backgroundColor: colors.accent },
  continueText: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  progressHead: { marginTop: 15, marginBottom: 7, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressHeadText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  progressHeadValue: { color: colors.accent, fontSize: 10, fontWeight: "900" },
  sectionHead: { marginTop: 29, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionEyebrow: { marginBottom: 4, color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", letterSpacing: -0.35 },
  sectionLink: { color: colors.primaryLight, fontSize: 10, fontWeight: "900" },
  module: { minHeight: 112, marginBottom: 10, padding: 12, flexDirection: "row", alignItems: "stretch", gap: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  modulePressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  moduleIdentity: { width: 62, paddingVertical: 8, alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "rgba(245,179,141,.25)", borderRadius: 18, backgroundColor: colors.surface3 },
  moduleIdentityLabel: { color: colors.primaryLight, fontSize: 6, fontWeight: "900", letterSpacing: 1 },
  moduleNumberText: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -1 },
  moduleIcon: { width: 27, height: 27, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(245,179,141,.1)" },
  moduleIconComplete: { backgroundColor: "rgba(169,196,154,.16)" },
  moduleCopy: { flex: 1, paddingVertical: 3, justifyContent: "space-between" },
  moduleTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  moduleTitle: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  moduleMeta: { marginTop: 5, marginBottom: 10, color: colors.muted, fontSize: 9 },
  moduleProgressRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  moduleProgressBar: { flex: 1 },
  modulePercent: { minWidth: 31, color: colors.primaryLight, fontSize: 9, fontWeight: "900", textAlign: "right" },
  modulePercentComplete: { color: colors.success },
  notice: { minHeight: 75, marginBottom: 9, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  noticeIcon: { width: 41, height: 41, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.22)", borderRadius: 14, backgroundColor: colors.surface3 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  noticeText: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
});
