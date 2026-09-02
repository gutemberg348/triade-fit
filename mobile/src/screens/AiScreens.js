import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  Bot,
  Camera,
  ChevronRight,
  Flame,
  ImagePlus,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react-native";
import api, { messageFrom } from "../services/api.js";
import { Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, fonts, radii, shadow } from "../theme/index.js";

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const uploadAsset = async (asset) => {
  const video = asset.type === "video" || asset.mimeType?.startsWith("video/");
  const field = video ? "video" : "image";
  const body = new FormData();
  if (Platform.OS === "web" && asset.file) body.append(field, asset.file);
  else body.append(field, {
    uri: asset.uri,
    name: asset.fileName || `${field}-${Date.now()}.${video ? "mp4" : "jpg"}`,
    type: asset.mimeType || (video ? "video/mp4" : "image/jpeg"),
  });
  const { data } = await api.post(video ? "/uploads/video" : "/uploads", body, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: video ? 180000 : 45000,
  });
  return { ...data, video };
};

const chooseFromLibrary = async (mixed = false) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mixed ? ["images", "videos"] : ["images"],
    allowsEditing: !mixed,
    quality: 0.75,
    videoMaxDuration: 60,
  });
  return result.canceled ? null : result.assets[0];
};

const takePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Câmera bloqueada", "Autorize o acesso à câmera para tirar a foto.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.75 });
  return result.canceled ? null : result.assets[0];
};

function TypingIndicator() {
  const dots = useRef([
    new Animated.Value(0.28),
    new Animated.Value(0.28),
    new Animated.Value(0.28),
  ]).current;

  useEffect(() => {
    const pulse = (dot) => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(dot, { toValue: 0.28, duration: 240, useNativeDriver: true }),
    ]);
    const animation = Animated.loop(Animated.stagger(135, dots.map(pulse)));
    animation.start();
    return () => animation.stop();
  }, [dots]);

  return (
    <View style={[styles.chatBubble, styles.chatBubbleAi, styles.typingBubble]} accessibilityLabel="Luna está digitando">
      <Text style={styles.chatRole}>LUNA</Text>
      <View style={styles.typingDots}>
        {dots.map((opacity, index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                opacity,
                transform: [{
                  translateY: opacity.interpolate({ inputRange: [0.28, 1], outputRange: [1, -2] }),
                }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function CaloriesScreen() {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [asset, setAsset] = useState(null);
  const [note, setNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/nutrition/today", {
        params: { date: today(), timezoneOffset: new Date().getTimezoneOffset() },
      });
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState({ loading: false, error: messageFrom(error), data: null });
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  const select = async (camera = false) => {
    setPhotoMenuOpen(false);
    const selected = camera ? await takePhoto() : await chooseFromLibrary(false);
    if (selected) {
      setAsset(selected);
      setActionError("");
      setActionNotice("");
    }
  };

  const analyze = async () => {
    if (!asset) return setActionError("Tire ou escolha uma foto da refeição.");
    if (!note.trim()) return setActionError("Informe quanto você consumiu, por exemplo: 2 fatias, 100 g ou metade.");
    setAnalyzing(true);
    setActionError("");
    setActionNotice("");
    try {
      const uploaded = await uploadAsset(asset);
      const { data: result } = await api.post("/ai/nutrition/analyze", {
        imageUrl: uploaded.url,
        note: note.trim(),
        consumedAt: new Date().toISOString(),
        date: today(),
        timezoneOffset: new Date().getTimezoneOffset(),
      }, { timeout: 90000 });
      setAsset(null);
      setNote("");
      setActionNotice(result.duplicate ? result.message : `${result.foodName} foi adicionado ao seu dia.`);
      await load();
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setAnalyzing(false);
    }
  };

  const removeConfirmed = async (entry) => {
    try {
      await api.delete(`/nutrition/entries/${entry.id}`);
      await load();
    } catch (error) {
      setActionError(messageFrom(error));
    }
  };

  const remove = (entry) => {
    const message = `${entry.foodName} deixará de contar no total de hoje.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Remover alimento?\n\n${message}`)) void removeConfirmed(entry);
      return;
    }
    Alert.alert("Remover alimento?", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removeConfirmed(entry) },
    ]);
  };

  const data = state.data;
  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.eyebrowRow}><Sparkles size={14} color={colors.accent} /><Text style={styles.eyebrow}>LUNA NUTRIÇÃO</Text></View>
        <Text style={styles.title}>Calorias do dia</Text>
        <Text style={styles.lead}>Fotografe o alimento e receba uma estimativa rápida para acompanhar seu dia.</Text>
      </View>

      {state.loading ? <Loading label="Organizando seu dia..." /> : state.error ? <ErrorBox message={state.error} retry={load} /> : (
        <>
          <View style={styles.calorieHero}>
            <View style={styles.calorieIcon}><Flame size={26} color={colors.text} /></View>
            <Text style={styles.calorieLabel}>CONSUMIDO HOJE</Text>
            <View style={styles.calorieValueRow}><Text style={styles.calorieValue}>{data.totalCalories}</Text><Text style={styles.calorieUnit}>kcal</Text></View>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}><Text style={styles.macroValue}>{data.totalProteinGrams}g</Text><Text style={styles.macroLabel}>proteína</Text></View>
              <View style={styles.macroItem}><Text style={styles.macroValue}>{data.totalCarbohydrateGrams}g</Text><Text style={styles.macroLabel}>carboidrato</Text></View>
              <View style={styles.macroItem}><Text style={styles.macroValue}>{data.totalFatGrams}g</Text><Text style={styles.macroLabel}>gordura</Text></View>
            </View>
          </View>

          <View style={styles.captureCard}>
            <View style={styles.captureHeader}><View><Text style={styles.sectionEyebrow}>NOVA REFEIÇÃO</Text><Text style={styles.sectionTitle}>O que você comeu?</Text></View><Bot size={24} color={colors.primaryLight} /></View>
            {asset ? (
              <View style={styles.foodPreviewWrap}>
                <Image source={{ uri: asset.uri }} style={styles.foodPreview} />
                <Pressable style={styles.removeAttachment} onPress={() => setAsset(null)}><X size={17} color={colors.text} /></Pressable>
              </View>
            ) : (
              <Pressable style={styles.captureMainButton} onPress={() => setPhotoMenuOpen(true)}>
                <View style={styles.captureMainIcon}><Camera size={22} color={colors.text} /></View>
                <View style={{ flex: 1 }}><Text style={styles.captureMainTitle}>Aperte aqui para adicionar a foto</Text><Text style={styles.captureMainText}>Depois escolha câmera ou galeria</Text></View>
                <ChevronRight size={20} color={colors.primaryLight} />
              </Pressable>
            )}
            <Text style={styles.quantityLabel}>QUANTO VOCÊ CONSUMIU?</Text>
            <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Ex.: 2 fatias, 100 g, metade ou 1 unidade" placeholderTextColor={colors.subtle} />
            <Text style={styles.quantityHint}>A quantidade evita que a Luna conte um pacote, travessa ou pão inteiro por engano.</Text>
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            {actionNotice ? <Text style={styles.actionNotice}>{actionNotice}</Text> : null}
            <Pressable disabled={analyzing} onPress={analyze} style={({ pressed }) => [styles.aiAction, pressed && styles.pressed, analyzing && styles.disabled]}>
              <Sparkles size={18} color={colors.text} /><Text style={styles.aiActionText}>{analyzing ? "Luna analisando..." : "Analisar e adicionar"}</Text><ChevronRight size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.disclaimer}>Estimativa visual. Porções, preparo e ingredientes podem alterar bastante os valores.</Text>
          </View>

          <View style={styles.listHeading}><View><Text style={styles.sectionEyebrow}>REGISTROS</Text><Text style={styles.sectionTitle}>Refeições de hoje</Text></View><Text style={styles.listCount}>{data.entries.length}</Text></View>
          {data.entries.length ? data.entries.map((entry) => (
            <View style={styles.foodEntry} key={entry.id}>
              <Image source={{ uri: entry.photoUrl }} style={styles.foodEntryImage} />
              <View style={styles.foodEntryBody}>
                <Text numberOfLines={1} style={styles.foodEntryName}>{entry.foodName}</Text>
                <Text numberOfLines={2} style={styles.foodEntryPortion}>{entry.portionDescription}</Text>
              </View>
              <View style={styles.foodEntryCalories}><Text style={styles.foodEntryValue}>{entry.calories}</Text><Text style={styles.foodEntryUnit}>kcal</Text><Pressable hitSlop={10} onPress={() => remove(entry)}><Trash2 size={16} color={colors.danger} /></Pressable></View>
            </View>
          )) : <Empty title="Nenhum alimento hoje" text="Envie a primeira foto para começar o contador." />}
        </>
      )}
      <Modal transparent visible={photoMenuOpen} animationType="fade" onRequestClose={() => setPhotoMenuOpen(false)}>
        <View style={styles.photoMenuLayer}>
          <Pressable style={styles.photoMenuBackdrop} onPress={() => setPhotoMenuOpen(false)} />
          <View style={styles.photoMenuCard}>
            <View style={styles.photoMenuHandle} />
            <Text style={styles.photoMenuEyebrow}>FOTO DO ALIMENTO</Text>
            <Text style={styles.photoMenuTitle}>Como deseja adicionar?</Text>
            <Pressable style={styles.photoMenuOption} onPress={() => select(true)}>
              <View style={styles.photoMenuIcon}><Camera size={21} color={colors.text} /></View>
              <View style={{ flex: 1 }}><Text style={styles.photoMenuOptionTitle}>Tirar foto agora</Text><Text style={styles.photoMenuOptionText}>Abra a câmera e fotografe o alimento</Text></View>
              <ChevronRight size={19} color={colors.subtle} />
            </Pressable>
            <Pressable style={styles.photoMenuOption} onPress={() => select(false)}>
              <View style={styles.photoMenuIcon}><ImagePlus size={21} color={colors.text} /></View>
              <View style={{ flex: 1 }}><Text style={styles.photoMenuOptionTitle}>Escolher da galeria</Text><Text style={styles.photoMenuOptionText}>Use uma foto que já está no celular</Text></View>
              <ChevronRight size={19} color={colors.subtle} />
            </Pressable>
            <Pressable style={styles.photoMenuCancel} onPress={() => setPhotoMenuOpen(false)}><Text style={styles.photoMenuCancelText}>Cancelar</Text></Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export function TrainingAssistantScreen({ navigation }) {
  const [state, setState] = useState({ loading: true, error: "", messages: [] });
  const [message, setMessage] = useState("");
  const [asset, setAsset] = useState(null);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pendingMessage, setPendingMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/training/history");
      setState({ loading: false, error: "", messages: data });
    } catch (error) {
      setState({ loading: false, error: messageFrom(error), messages: [] });
    }
  }, []);
  useFocusEffect(useCallback(() => void load(), [load]));

  const attach = async (camera = false) => {
    const selected = camera ? await takePhoto() : await chooseFromLibrary(true);
    if (selected) {
      setAsset(selected);
      setActionError("");
    }
  };

  const send = async () => {
    if (!message.trim() && !asset) return setActionError("Escreva uma dúvida ou envie uma foto ou vídeo.");
    const pendingVideo = asset?.type === "video" || asset?.mimeType?.startsWith("video/");
    setPendingMessage({
      message: message.trim() || "Analise esta execução e sugira uma adaptação segura.",
      imageUrl: asset && !pendingVideo ? asset.uri : "",
      videoUrl: asset && pendingVideo ? asset.uri : "",
    });
    setSending(true);
    setActionError("");
    try {
      const uploaded = asset ? await uploadAsset(asset) : null;
      const { data } = await api.post("/ai/training/advice", {
        message: message.trim(),
        imageUrl: uploaded && !uploaded.video ? uploaded.url : undefined,
        videoUrl: uploaded?.video ? uploaded.url : undefined,
      }, { timeout: 120000 });
      setState((current) => ({ ...current, messages: [...current.messages, data.userMessage, data.assistantMessage] }));
      setMessage("");
      setAsset(null);
    } catch (error) {
      setActionError(messageFrom(error));
    } finally {
      setPendingMessage(null);
      setSending(false);
    }
  };

  const video = asset?.type === "video" || asset?.mimeType?.startsWith("video/");
  return (
    <Screen header="Ajuda com treino" onBack={navigation.goBack}>
      <View style={styles.coachHero}>
        <View style={styles.coachHeroIcon}><Bot size={27} color={colors.text} /></View>
        <View style={{ flex: 1 }}><Text style={styles.coachHeroEyebrow}>LUNA · ASSISTENTE DE TREINO</Text><Text style={styles.coachHeroTitle}>Adapte seu treino</Text><Text style={styles.coachHeroText}>Conte qual limitação precisa respeitar ou envie uma foto ou vídeo curto do exercício.</Text></View>
      </View>

      <View style={styles.quickQuestions}>
        {["Tenho limitação no joelho", "Adaptar sem impacto", "Trocar por uma opção mais leve"].map((text) => <Pressable key={text} onPress={() => setMessage(text)} style={styles.quickQuestion}><Text style={styles.quickQuestionText}>{text}</Text></Pressable>)}
      </View>

      {state.loading ? <Loading label="Abrindo sua conversa..." /> : state.error ? <ErrorBox message={state.error} retry={load} /> : state.messages.length || pendingMessage ? (
        <View style={styles.chatList}>
          {state.messages.map((item) => (
            <View style={[styles.chatBubble, item.role === "USER" ? styles.chatBubbleUser : styles.chatBubbleAi]} key={item.id}>
              <Text style={styles.chatRole}>{item.role === "USER" ? "VOCÊ" : "LUNA"}</Text>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.chatImage} /> : null}
              {item.videoUrl ? <View style={styles.chatVideo}><Video size={18} color={colors.primaryLight} /><Text style={styles.chatVideoText}>Vídeo enviado para análise</Text></View> : null}
              <Text style={styles.chatText}>{item.message}</Text>
            </View>
          ))}
          {pendingMessage ? (
            <View style={[styles.chatBubble, styles.chatBubbleUser]}>
              <Text style={styles.chatRole}>VOCÊ</Text>
              {pendingMessage.imageUrl ? <Image source={{ uri: pendingMessage.imageUrl }} style={styles.chatImage} /> : null}
              {pendingMessage.videoUrl ? <View style={styles.chatVideo}><Video size={18} color={colors.text} /><Text style={styles.pendingVideoText}>Vídeo enviado para análise</Text></View> : null}
              <Text style={styles.chatText}>{pendingMessage.message}</Text>
            </View>
          ) : null}
          {sending ? <TypingIndicator /> : null}
        </View>
      ) : <View style={styles.chatWelcome}><Sparkles size={22} color={colors.primaryLight} /><Text style={styles.chatWelcomeTitle}>Qual exercício precisa adaptar?</Text><Text style={styles.chatWelcomeText}>Conte a limitação que deve ser respeitada e como o movimento é feito hoje.</Text></View>}

      <View style={styles.composer}>
        {asset ? <View style={styles.attachmentPreview}>{video ? <Video size={23} color={colors.primaryLight} /> : <Image source={{ uri: asset.uri }} style={styles.attachmentImage} />}<View style={{ flex: 1 }}><Text style={styles.attachmentTitle}>{video ? "Vídeo pronto" : "Foto pronta"}</Text><Text style={styles.attachmentText}>{video ? "A Luna analisará até 8 quadros distribuídos por toda a execução." : "A imagem será enviada junto da dúvida."}</Text></View><Pressable onPress={() => setAsset(null)}><X size={18} color={colors.text} /></Pressable></View> : null}
        <TextInput multiline textAlignVertical="top" style={styles.messageInput} value={message} onChangeText={setMessage} placeholder="Ex.: tenho limitação no joelho. Como faço o polichinelo sem saltar?" placeholderTextColor={colors.subtle} />
        <View style={styles.composerActions}>
          <Pressable style={styles.attachButton} onPress={() => attach(true)}><Camera size={18} color={colors.primaryLight} /><Text style={styles.attachText}>Foto</Text></Pressable>
          <Pressable style={styles.attachButton} onPress={() => attach(false)}><Paperclip size={18} color={colors.primaryLight} /><Text style={styles.attachText}>Foto ou vídeo</Text></Pressable>
          <Pressable disabled={sending} style={[styles.sendButton, sending && styles.disabled]} onPress={send}><Send size={19} color={colors.text} /></Pressable>
        </View>
        {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
      </View>
      <Text style={styles.safetyText}>A Luna sugere adaptações para limitações conhecidas, mas não diagnostica lesões. Se houver dor durante o movimento, trauma, inchaço ou perda de força, interrompa e procure avaliação profissional.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: 20 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  eyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.3 },
  title: { marginTop: 7, color: colors.text, fontFamily: fonts.displayBold, fontSize: 35, lineHeight: 42 },
  lead: { marginTop: 7, color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  calorieHero: { padding: 22, borderWidth: 1, borderColor: "rgba(232,136,91,.42)", borderRadius: radii.hero, backgroundColor: colors.surface, ...shadow },
  calorieIcon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.primary },
  calorieLabel: { marginTop: 19, color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.5 },
  calorieValueRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  calorieValue: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 57, lineHeight: 68 },
  calorieUnit: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 15, textTransform: "uppercase" },
  macroRow: { marginTop: 14, paddingTop: 16, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line },
  macroItem: { flex: 1 },
  macroValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  macroLabel: { marginTop: 2, color: colors.subtle, fontSize: 9 },
  captureCard: { marginTop: 16, padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  captureHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionEyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.25 },
  sectionTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  captureMainButton: { minHeight: 82, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.primaryLight, borderRadius: radii.input, backgroundColor: colors.surface2 },
  captureMainIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.primary },
  captureMainTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  captureMainText: { marginTop: 3, color: colors.subtle, fontSize: 9 },
  foodPreviewWrap: { position: "relative" },
  foodPreview: { width: "100%", height: 190, borderRadius: radii.input },
  removeAttachment: { position: "absolute", top: 10, right: 10, width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(10,7,6,.82)" },
  noteInput: { minHeight: 50, marginTop: 11, paddingHorizontal: 14, color: colors.text, fontFamily: fonts.body, fontSize: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface2 },
  quantityLabel: { marginTop: 13, color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.05 },
  quantityHint: { marginTop: 6, color: colors.subtle, fontSize: 8, lineHeight: 12 },
  aiAction: { minHeight: 52, marginTop: 11, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 15, backgroundColor: colors.primaryLight },
  aiActionText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  disclaimer: { marginTop: 9, color: colors.subtle, fontSize: 8, lineHeight: 13, textAlign: "center" },
  photoMenuLayer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.66)" },
  photoMenuBackdrop: { position: "absolute", inset: 0 },
  photoMenuCard: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  photoMenuHandle: { alignSelf: "center", width: 38, height: 4, marginBottom: 18, borderRadius: 3, backgroundColor: colors.line },
  photoMenuEyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2 },
  photoMenuTitle: { marginTop: 4, marginBottom: 14, color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  photoMenuOption: { minHeight: 70, marginBottom: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.surface2 },
  photoMenuIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.primary },
  photoMenuOptionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
  photoMenuOptionText: { marginTop: 3, color: colors.subtle, fontSize: 8 },
  photoMenuCancel: { minHeight: 46, marginTop: 3, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  photoMenuCancelText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11 },
  actionError: { marginTop: 10, color: colors.danger, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 15 },
  actionNotice: { marginTop: 10, color: colors.success, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 15 },
  listHeading: { marginTop: 25, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listCount: { minWidth: 32, paddingVertical: 6, color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 11, textAlign: "center", borderRadius: 12, backgroundColor: colors.surface2 },
  foodEntry: { marginBottom: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  foodEntryImage: { width: 65, height: 65, borderRadius: 14 },
  foodEntryBody: { flex: 1, minWidth: 0 },
  foodEntryName: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  foodEntryPortion: { marginTop: 3, color: colors.muted, fontSize: 9, lineHeight: 13 },
  foodEntryCalories: { alignItems: "flex-end", gap: 1 },
  foodEntryValue: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 18 },
  foodEntryUnit: { marginBottom: 7, color: colors.subtle, fontSize: 8 },
  coachHero: { padding: 18, flexDirection: "row", alignItems: "flex-start", gap: 14, borderWidth: 1, borderColor: "rgba(232,136,91,.38)", borderRadius: radii.card, backgroundColor: colors.surface },
  coachHeroIcon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.primary },
  coachHeroEyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.1 },
  coachHeroTitle: { marginTop: 4, color: colors.text, fontFamily: fonts.display, fontSize: 21, lineHeight: 27 },
  coachHeroText: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 15 },
  quickQuestions: { marginVertical: 13, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  quickQuestion: { paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radii.pill, backgroundColor: colors.surface2 },
  quickQuestionText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 9 },
  chatList: { gap: 9 },
  chatBubble: { maxWidth: "92%", padding: 14, borderRadius: 18 },
  chatBubbleUser: { alignSelf: "flex-end", borderBottomRightRadius: 5, backgroundColor: colors.primary },
  chatBubbleAi: { alignSelf: "flex-start", borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 5, backgroundColor: colors.surface },
  chatRole: { marginBottom: 5, color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1.1 },
  chatText: { color: colors.text, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  chatImage: { width: 210, height: 145, marginBottom: 9, borderRadius: 13 },
  chatVideo: { marginBottom: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, backgroundColor: colors.surface2 },
  chatVideoText: { color: colors.muted, fontSize: 9 },
  pendingVideoText: { color: colors.text, fontSize: 9 },
  typingBubble: { minWidth: 78, paddingVertical: 12 },
  typingDots: { height: 13, flexDirection: "row", alignItems: "center", gap: 6 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryLight },
  chatWelcome: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: radii.card },
  chatWelcomeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  chatWelcomeText: { maxWidth: 260, color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  composer: { marginTop: 14, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.surface },
  messageInput: { minHeight: 92, padding: 12, color: colors.text, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, borderRadius: 14, backgroundColor: colors.surface2 },
  composerActions: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  attachButton: { minHeight: 39, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  attachText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 8 },
  sendButton: { width: 42, height: 42, marginLeft: "auto", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.primaryLight },
  attachmentPreview: { marginBottom: 9, padding: 9, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 14, backgroundColor: colors.surface2 },
  attachmentImage: { width: 48, height: 48, borderRadius: 10 },
  attachmentTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 10 },
  attachmentText: { marginTop: 2, color: colors.subtle, fontSize: 8 },
  safetyText: { marginTop: 12, color: colors.subtle, fontSize: 8, lineHeight: 13, textAlign: "center" },
  pressed: { opacity: .84 },
  disabled: { opacity: .5 },
});
