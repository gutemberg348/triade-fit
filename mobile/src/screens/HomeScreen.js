import { useCallback, useState } from "react";
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Bell, CalendarClock, ChevronRight, CircleCheckBig, Layers3, LockKeyhole, Play, Sparkles } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import api, { messageFrom } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.js";
import { Brand, Empty, ErrorBox, Loading, ProgressBar } from "../components/UI.js";
import { colors, fonts, radii, shadow } from "../theme/index.js";

const fallbackCover = require("../../assets/essenza-cover.png");

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.max(280, width - 40);
  const [activeIntro, setActiveIntro] = useState(0);
  const [state, setState] = useState({ loading: true, error: "", introLessons: [], modules: [], announcements: [] });

  const load = useCallback(async () => {
    try {
      const [homeContent, announcements] = await Promise.all([
        api.get("/home-content"),
        api.get("/announcements"),
      ]);
      setState({
        loading: false,
        error: "",
        introLessons: homeContent.data.introLessons || [],
        modules: homeContent.data.modules || [],
        announcements: announcements.data,
      });
    } catch (error) {
      setState((old) => ({ ...old, loading: false, error: messageFrom(error) }));
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (state.loading)
    return <SafeAreaView style={styles.safe}><Loading label="Preparando sua jornada..." /></SafeAreaView>;
  if (state.error && !state.modules.length && !state.introLessons.length)
    return <SafeAreaView style={styles.safe}><ErrorBox message={state.error} retry={load} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primaryLight} />}
        contentContainerStyle={[styles.content, { paddingBottom: 118 + insets.bottom }]}
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
          <Text style={styles.greeting}>Olá, <Text style={styles.greetingName}>{user?.name?.split(" ")[0] || "atleta"}</Text></Text>
          <Text style={styles.sub}>Corpo, mente e constância em movimento.</Text>
        </View>

        {state.introLessons.length > 0 && (
          <>
            <View style={styles.introHeader}>
              <View><Text style={styles.sectionEyebrow}>COMECE POR AQUI</Text><Text style={styles.sectionTitle}>Aulas introdutórias</Text></View>
              <Text style={styles.carouselCount}>{activeIntro + 1}/{state.introLessons.length}</Text>
            </View>
            <ScrollView
              horizontal
              decelerationRate="fast"
              snapToInterval={cardWidth + 12}
              disableIntervalMomentum
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              onMomentumScrollEnd={(event) => setActiveIntro(Math.min(
                state.introLessons.length - 1,
                Math.max(0, Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12))),
              ))}
            >
              {state.introLessons.map((lesson, index) => {
                const completed = Boolean(lesson.progress?.[0]?.completed);
                return (
                  <Pressable
                    key={lesson.id}
                    style={({ pressed }) => [styles.heroWrap, { width: cardWidth }, pressed && styles.pressed]}
                    onPress={() => navigation.navigate("Lesson", { id: lesson.id })}
                  >
                    <ImageBackground source={lesson.coverUrl ? { uri: lesson.coverUrl } : fallbackCover} style={styles.hero} imageStyle={styles.heroImage}>
                      <LinearGradient colors={["rgba(5,5,7,.97)", "rgba(5,5,7,.72)", "rgba(5,5,7,.08)"]} start={{ x: 0, y: 0.55 }} end={{ x: 1, y: 0.5 }} style={styles.heroGradient}>
                        <View style={styles.pill}><Sparkles color={colors.primaryLight} size={12} /><Text style={styles.pillText}>AULA INTRODUTÓRIA {String(index + 1).padStart(2, "0")}</Text></View>
                        <Text numberOfLines={2} style={styles.heroTitle}>{lesson.title}</Text>
                        <Text style={styles.heroMeta}>{lesson.category || "Introdução"} · {lesson.durationMinutes || "—"} min</Text>
                        <View style={styles.continue}>
                          {completed ? <CircleCheckBig color={colors.ink} size={16} /> : <Play color={colors.ink} size={15} fill={colors.ink} />}
                          <Text style={styles.continueText}>{completed ? "Rever aula" : "Assistir aula"}</Text>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.dots}>{state.introLessons.map((lesson, index) => <View key={lesson.id} style={[styles.carouselDot, activeIntro === index && styles.carouselDotActive]} />)}</View>
          </>
        )}

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>CONTEÚDO PARA EVOLUIR</Text><Text style={styles.sectionTitle}>Seus módulos</Text></View>
          <View style={styles.moduleCount}><Layers3 size={13} color={colors.primaryLight} /><Text style={styles.moduleCountText}>{state.modules.length}</Text></View>
        </View>

        {state.modules.length ? state.modules.map((module, index) => {
          const completed = module.progressPercent === 100;
          const locked = Boolean(module.availability?.isLocked);
          const unlockLabel = module.availability?.unlocksAt
            ? `Disponível em ${new Date(module.availability.unlocksAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
            : module.availability?.reason;
          return (
            <Pressable disabled={locked} key={module.id} style={({ pressed }) => [styles.moduleCard, locked && styles.moduleCardLocked, pressed && styles.pressed]} onPress={() => navigation.navigate("ContentModule", { id: module.id })}>
              <ImageBackground source={module.coverUrl ? { uri: module.coverUrl } : fallbackCover} style={styles.moduleCover} imageStyle={styles.moduleImage}>
                <LinearGradient colors={["rgba(7,7,9,.96)", "rgba(7,7,9,.7)", "rgba(7,7,9,.2)"]} start={{ x: 0, y: 0.55 }} end={{ x: 1, y: 0.5 }} style={styles.moduleGradient}>
                  <View style={styles.moduleIdentity}>
                    <LinearGradient colors={locked ? ["#3B302C", "#241B18"] : [colors.primaryLight, colors.primary]} style={styles.moduleGlyph}>
                      {locked ? <LockKeyhole color="#FFFFFF" size={22} /> : <Layers3 color="#FFFFFF" size={23} strokeWidth={2.2} />}
                    </LinearGradient>
                    <View style={styles.moduleStep}><Text style={styles.moduleStepLabel}>MÓDULO</Text><Text style={styles.moduleStepNumber}>{String(index + 1).padStart(2, "0")}</Text></View>
                  </View>
                  <View style={styles.moduleCopy}>
                    <View style={styles.moduleTitleRow}><Text numberOfLines={2} style={styles.moduleTitle}>{module.title}</Text>{locked ? <CalendarClock color={colors.subtle} size={19} /> : <ChevronRight color={completed ? colors.success : colors.primaryLight} size={20} />}</View>
                    <Text numberOfLines={2} style={[styles.moduleMeta, locked && styles.moduleMetaLocked]}>{locked ? unlockLabel : `${module.completedLessons} de ${module.totalLessons} aulas concluídas`}</Text>
                    <View style={styles.moduleProgressRow}><View style={styles.moduleProgressBar}><ProgressBar value={module.progressPercent} color={completed ? colors.success : colors.primaryLight} /></View><Text style={[styles.modulePercent, completed && styles.modulePercentComplete]}>{module.progressPercent}%</Text></View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </Pressable>
          );
        }) : <Empty title="Módulos em preparação" text="Novos conteúdos aparecerão aqui assim que forem publicados." />}

        <View style={styles.sectionHead}>
          <View><Text style={styles.sectionEyebrow}>FIQUE POR DENTRO</Text><Text style={styles.sectionTitle}>Avisos recentes</Text></View>
          <Pressable onPress={() => navigation.navigate("Comunidade")}><Text style={styles.sectionLink}>Ver todos</Text></Pressable>
        </View>
        {state.announcements.slice(0, 2).map((item) => (
          <View style={styles.notice} key={item.id}>
            <View style={styles.noticeIcon}><Sparkles color={colors.primaryLight} size={18} /></View>
            <View style={styles.noticeCopy}><Text style={styles.noticeTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.noticeText}>{item.message}</Text></View>
            <ChevronRight color={colors.subtle} size={18} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 21, backgroundColor: colors.surface },
  dot: { position: "absolute", right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  welcome: { marginTop: 28, marginBottom: 22 },
  greeting: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 41, letterSpacing: 0.1 },
  greetingName: { color: colors.accent, fontFamily: fonts.displayBold },
  sub: { marginTop: 5, color: colors.muted, fontSize: 12 },
  introHeader: { marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  carousel: { gap: 12 },
  carouselCount: { color: colors.subtle, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroWrap: { borderRadius: radii.hero, ...shadow },
  pressed: { opacity: 0.86, transform: [{ scale: 0.994 }] },
  hero: { height: 264, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: radii.hero, backgroundColor: colors.surface },
  heroImage: { resizeMode: "cover", borderRadius: radii.hero },
  heroGradient: { flex: 1, padding: 20, justifyContent: "flex-end" },
  pill: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(245,179,141,.28)", borderRadius: 30, backgroundColor: "rgba(10,8,8,.76)" },
  pillText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  heroTitle: { maxWidth: "76%", color: "#FFFFFF", fontFamily: fonts.displayBold, fontSize: 29, lineHeight: 34, letterSpacing: 0.1 },
  heroMeta: { marginTop: 6, color: "#E9E4E1", fontSize: 10, fontWeight: "700" },
  continue: { alignSelf: "flex-start", marginTop: 13, paddingVertical: 10, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, backgroundColor: colors.accent },
  continueText: { color: colors.ink, fontSize: 11, fontWeight: "900" },
  dots: { height: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  carouselDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line },
  carouselDotActive: { width: 19, backgroundColor: colors.primaryLight },
  sectionHead: { marginTop: 25, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionEyebrow: { marginBottom: 4, color: colors.primaryLight, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: 0.15 },
  sectionLink: { color: colors.primaryLight, fontSize: 10, fontWeight: "900" },
  moduleCount: { paddingVertical: 6, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.surface },
  moduleCountText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  moduleCard: { height: 148, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface, ...shadow },
  moduleCardLocked: { opacity: 0.74 },
  moduleCover: { flex: 1 },
  moduleImage: { borderRadius: radii.card },
  moduleGradient: { flex: 1, padding: 15, flexDirection: "row", alignItems: "center", gap: 14 },
  moduleIdentity: { width: 64, alignItems: "center", justifyContent: "center", gap: 9 },
  moduleGlyph: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,.2)", ...shadow },
  moduleStep: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  moduleStepLabel: { color: colors.subtle, fontFamily: fonts.semibold, fontSize: 6, letterSpacing: 0.85 },
  moduleStepNumber: { color: "#FFFFFF", fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 18 },
  moduleCopy: { flex: 1, paddingVertical: 5, justifyContent: "center" },
  moduleTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  moduleTitle: { flex: 1, color: "#FFFFFF", fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: 0.15 },
  moduleMeta: { marginTop: 7, marginBottom: 13, color: "#E5DFDC", fontSize: 10, fontWeight: "600" },
  moduleMetaLocked: { color: colors.subtle, lineHeight: 14 },
  moduleProgressRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  moduleProgressBar: { flex: 1 },
  modulePercent: { minWidth: 31, color: colors.primaryLight, fontSize: 9, fontWeight: "900", textAlign: "right" },
  modulePercentComplete: { color: colors.success },
  notice: { minHeight: 75, marginBottom: 9, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: radii.input, backgroundColor: colors.surface },
  noticeIcon: { width: 41, height: 41, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,179,141,.22)", borderRadius: 14, backgroundColor: colors.surface3 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  noticeText: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
});
