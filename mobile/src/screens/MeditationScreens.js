import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Leaf,
  Pause,
  Play,
  Sparkles,
} from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import api, { messageFrom } from "../services/api.js";
import { Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, fonts, radii, shadow } from "../theme/index.js";

const fallbackCover = require("../../assets/essenza-cover.png");

export function MeditationsScreen({ navigation }) {
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/meditations");
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
          <Text style={styles.eyebrow}>CONEXÃO INTERIOR</Text>
        </View>
        <Text style={styles.title}>Meditação</Text>
        <Text style={styles.lead}>
          Respire, desacelere e reserve alguns minutos para voltar ao seu centro.
        </Text>
      </View>

      <View style={styles.quoteCard}>
        <View style={styles.quoteIcon}><Leaf size={24} color={colors.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quoteTitle}>Seu momento de presença</Text>
          <Text style={styles.quoteText}>Escolha uma prática e acompanhe o tempo sem distrações.</Text>
        </View>
      </View>

      {state.loading ? <Loading label="Preparando suas práticas..." /> : state.error ? (
        <ErrorBox message={state.error} retry={load} />
      ) : state.items.length ? state.items.map((item) => {
        const completed = item.progress?.[0]?.completed;
        return (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.86 }]}
            onPress={() => navigation.navigate("MeditationSession", { id: item.id })}
          >
            <ImageBackground
              source={item.coverUrl ? { uri: item.coverUrl } : fallbackCover}
              style={styles.cover}
              imageStyle={styles.coverImage}
            >
              <View style={styles.scrim}>
                <View style={styles.play}><Play size={19} color={colors.ink} fill={colors.ink} /></View>
              </View>
            </ImageBackground>
            <View style={styles.cardCopy}>
              <View style={styles.cardTop}>
                <Text style={styles.cardCategory}>{item.category || "MEDITAÇÃO GUIADA"}</Text>
                {completed ? <CheckCircle2 size={17} color={colors.success} /> : null}
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.cardText}>{item.description}</Text>
              <View style={styles.cardMeta}>
                <Clock3 size={14} color={colors.primaryLight} />
                <Text style={styles.cardMetaText}>{item.durationMinutes || 10} minutos</Text>
                <ChevronRight size={18} color={colors.primaryLight} style={{ marginLeft: "auto" }} />
              </View>
            </View>
          </Pressable>
        );
      }) : (
        <Empty title="Práticas em preparação" text="Cadastre uma aula do tipo Meditação no painel administrativo." />
      )}
    </Screen>
  );
}

export function MeditationSessionScreen({ route, navigation }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    api.get(`/lessons/${route.params.id}`)
      .then(({ data }) => {
        setLesson(data);
        setSeconds((data.durationMinutes || 10) * 60);
      })
      .catch((err) => setError(messageFrom(err)));
  }, [route.params.id]);

  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (!lesson || seconds !== 0 || completedRef.current) return;
    completedRef.current = true;
    setRunning(false);
    api.post(`/lessons/${lesson.id}/complete`, { completed: true }).catch(() => null);
  }, [lesson, seconds]);

  if (!lesson && !error) return <Screen><Loading label="Criando seu espaço de calma..." /></Screen>;
  if (error && !lesson) return <Screen onBack={navigation.goBack}><ErrorBox message={error} /></Screen>;

  const total = (lesson.durationMinutes || 10) * 60;
  const progress = total ? (total - seconds) / total : 0;
  const circumference = 2 * Math.PI * 116;
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Screen scroll={false} style={styles.sessionScreen}>
      <ImageBackground
        source={lesson.coverUrl ? { uri: lesson.coverUrl } : fallbackCover}
        style={styles.sessionBackground}
        imageStyle={{ opacity: 0.2 }}
      >
        <View style={styles.sessionContent}>
          <Pressable style={styles.back} onPress={navigation.goBack}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.sessionEyebrow}>MEDITAÇÃO</Text>
          <Text style={styles.sessionTitle}>{lesson.title}</Text>
          <Text style={styles.sessionSubtitle}>{lesson.description || "Conexão interior"}</Text>
          <View style={styles.timerWrap}>
            <Svg width={270} height={270} viewBox="0 0 270 270">
              <Circle cx="135" cy="135" r="116" fill="rgba(16,11,10,.52)" stroke={colors.line} strokeWidth="3" />
              <Circle
                cx="135"
                cy="135"
                r="116"
                fill="none"
                stroke={colors.primaryLight}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                rotation="-90"
                origin="135, 135"
              />
            </Svg>
            <View style={styles.timerCenter}>
              <Leaf size={38} color={colors.primaryLight} />
              <Text style={styles.timerText}>{time}</Text>
              <Text style={styles.timerLabel}>{seconds === 0 ? "PRÁTICA CONCLUÍDA" : "TEMPO RESTANTE"}</Text>
            </View>
          </View>
          <Pressable
            style={styles.control}
            onPress={() => seconds > 0 && setRunning((value) => !value)}
          >
            {seconds === 0 ? <CheckCircle2 size={29} color={colors.ink} /> : running ? (
              <Pause size={29} color={colors.ink} fill={colors.ink} />
            ) : (
              <Play size={29} color={colors.ink} fill={colors.ink} />
            )}
          </Pressable>
          <Text style={styles.controlLabel}>
            {seconds === 0 ? "Concluído" : running ? "Pausar" : "Iniciar prática"}
          </Text>
        </View>
      </ImageBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 20 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: "900", letterSpacing: 1.35 },
  title: { marginTop: 7, color: colors.text, fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 43, letterSpacing: 0.1 },
  lead: { marginTop: 7, maxWidth: 330, color: colors.muted, fontSize: 14, lineHeight: 21 },
  quoteCard: { marginBottom: 18, padding: 16, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "rgba(245,179,141,.25)", borderRadius: radii.card, backgroundColor: "rgba(72,42,29,.32)" },
  quoteIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "rgba(245,179,141,.12)" },
  quoteTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  quoteText: { marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 17 },
  card: { marginBottom: 15, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface, ...shadow },
  cover: { height: 170 },
  coverImage: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card },
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,6,5,.32)" },
  play: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: colors.primaryLight },
  cardCopy: { padding: 16 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardCategory: { color: colors.primaryLight, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  cardTitle: { marginTop: 6, color: colors.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 27 },
  cardText: { marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 17 },
  cardMeta: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 6 },
  cardMetaText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  sessionScreen: { backgroundColor: colors.bg },
  sessionBackground: { flex: 1 },
  sessionContent: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30, alignItems: "center", backgroundColor: "rgba(16,11,10,.72)" },
  back: { alignSelf: "flex-start", width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backText: { color: "#FFFFFF", fontSize: 37, lineHeight: 38 },
  sessionEyebrow: { marginTop: 12, color: colors.primaryLight, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  sessionTitle: { marginTop: 8, color: "#FFFFFF", fontFamily: fonts.displayBold, fontSize: 31, lineHeight: 38, textAlign: "center" },
  sessionSubtitle: { marginTop: 6, color: "#E3D2C9", fontSize: 13, textAlign: "center" },
  timerWrap: { width: 270, height: 270, marginTop: 34, alignItems: "center", justifyContent: "center" },
  timerCenter: { position: "absolute", alignItems: "center" },
  timerText: { marginTop: 12, color: "#FFFFFF", fontFamily: fonts.displayMedium, fontSize: 46, lineHeight: 54, letterSpacing: 1 },
  timerLabel: { marginTop: 5, color: "#C9AEA1", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  control: { width: 66, height: 66, marginTop: "auto", alignItems: "center", justifyContent: "center", borderRadius: 25, backgroundColor: colors.primaryLight, ...shadow },
  controlLabel: { marginTop: 9, color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
