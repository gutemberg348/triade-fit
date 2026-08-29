import { useCallback, useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, Heart, Sparkles, X } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { messageFrom } from "../services/api.js";
import { Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, fonts, radii } from "../theme/index.js";

export default function NoticeScreen() {
  const [activeTab, setActiveTab] = useState("feed");
  const [likingId, setLikingId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, setState] = useState({
    loading: true,
    error: "",
    announcements: [],
    posts: [],
  });

  const load = useCallback(async () => {
    try {
      const [announcements, posts] = await Promise.all([
        api.get("/announcements"),
        api.get("/community/posts"),
      ]);
      setState({
        loading: false,
        error: "",
        announcements: announcements.data,
        posts: posts.data,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: messageFrom(error),
      }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleLike = async (post) => {
    if (likingId) return;
    setLikingId(post.id);
    try {
      const { data } = await api({
        method: post.likedByMe ? "delete" : "post",
        url: `/community/posts/${post.id}/like`,
      });
      setState((current) => ({
        ...current,
        posts: current.posts.map((item) =>
          item.id === post.id ? { ...item, ...data } : item,
        ),
      }));
    } catch (error) {
      Alert.alert("Não foi possível registrar a curtida", messageFrom(error));
    } finally {
      setLikingId("");
    }
  };

  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>TRIADE FIT EM MOVIMENTO</Text>
        <Text style={styles.title}>Comunidade</Text>
        <Text style={styles.lead}>Inspiração, conquistas e recados em um só lugar.</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "feed" && styles.tabActive]}
          onPress={() => setActiveTab("feed")}
        >
          <Text style={[styles.tabText, activeTab === "feed" && styles.tabTextActive]}>
            Comunidade
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "notices" && styles.tabActive]}
          onPress={() => setActiveTab("notices")}
        >
          <Text style={[styles.tabText, activeTab === "notices" && styles.tabTextActive]}>
            Avisos
          </Text>
        </Pressable>
      </View>

      {state.loading ? (
        <Loading />
      ) : state.error ? (
        <ErrorBox message={state.error} retry={load} />
      ) : activeTab === "feed" ? (
        <CommunityFeed
          items={state.posts}
          onToggleLike={toggleLike}
          likingId={likingId}
          onPreview={setPreviewUrl}
        />
      ) : (
        <Notices items={state.announcements} />
      )}
      <Modal
        visible={Boolean(previewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl("")}
      >
        <View style={styles.previewLayer}>
          <Pressable
            style={styles.previewBackdrop}
            onPress={() => setPreviewUrl("")}
          />
          <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" />
          <Pressable style={styles.previewClose} onPress={() => setPreviewUrl("")}> 
            <X size={21} color={colors.text} />
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

function CommunityFeed({ items, onToggleLike, likingId, onPreview }) {
  if (!items.length)
    return (
      <Empty
        title="A comunidade está começando"
        text="As publicações criadas no painel aparecerão aqui."
      />
    );

  return items.map((item) => (
    <View style={styles.postCard} key={item.id}>
      <View style={styles.authorRow}>
        {item.authorAvatarUrl ? (
          <Image source={{ uri: item.authorAvatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{item.authorName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{item.authorName}</Text>
          <Text style={styles.date}>{formatDate(item.publishedAt || item.createdAt)}</Text>
        </View>
        <Sparkles color={colors.copperLight} size={18} />
      </View>
      <Text style={styles.postMessage}>{item.message}</Text>
      {item.imageUrl ? (
        <Pressable onPress={() => onPreview(item.imageUrl)}>
          <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
          <View pointerEvents="none" style={styles.imageHint}>
            <Text style={styles.imageHintText}>Toque para ampliar</Text>
          </View>
        </Pressable>
      ) : null}
      <View style={styles.engagement}>
        <Pressable
          disabled={likingId === item.id}
          onPress={() => onToggleLike(item)}
          accessibilityLabel={item.likedByMe ? "Remover curtida" : "Curtir publicação"}
          style={({ pressed }) => [
            styles.likeButton,
            item.likedByMe && styles.likeButtonActive,
            pressed && styles.likeButtonPressed,
          ]}
        >
          <Heart
            color={item.likedByMe ? colors.text : colors.copperLight}
            fill={item.likedByMe ? colors.copperLight : "transparent"}
            size={18}
          />
        </Pressable>
      </View>
    </View>
  ));
}

function Notices({ items }) {
  if (!items.length)
    return (
      <Empty
        title="Tudo tranquilo por aqui"
        text="Novos recados da sua Personal aparecerão nesta área."
      />
    );

  return items.map((item, index) => (
    <View style={[styles.noticeCard, index === 0 && styles.newCard]} key={item.id}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.noticeImage} /> : null}
      <View style={styles.noticeRow}>
        <View style={styles.noticeIcon}>
          {index === 0 ? (
            <Sparkles color={colors.copperLight} size={19} />
          ) : (
            <Bell color={colors.copperLight} size={19} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.noticeTitle}>{item.title}</Text>
          <Text style={styles.noticeMessage}>{item.message}</Text>
          <Text style={styles.date}>{formatDate(item.publishedAt || item.createdAt)}</Text>
        </View>
      </View>
    </View>
  ));
}

const formatDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" })
    .format(new Date(value))
    .toUpperCase();

const styles = StyleSheet.create({
  heading: { marginBottom: 18 },
  eyebrow: { color: colors.copperLight, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  title: { marginTop: 5, color: colors.text, fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 43, letterSpacing: 0.1 },
  lead: { marginTop: 5, color: colors.muted, lineHeight: 19 },
  tabs: {
    marginBottom: 18,
    padding: 4,
    flexDirection: "row",
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 12 },
  tabActive: { backgroundColor: colors.surface3 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: colors.copperLight },
  postCard: {
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  authorRow: { padding: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface3 },
  avatarText: { color: colors.copperLight, fontSize: 16, fontWeight: "900" },
  author: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  date: { marginTop: 3, color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  postMessage: { paddingHorizontal: 15, paddingBottom: 14, color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  postImage: { width: "100%", aspectRatio: 1.15, backgroundColor: colors.surface2 },
  imageHint: { position: "absolute", right: 10, bottom: 10, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "rgba(9,6,5,.78)" },
  imageHintText: { color: colors.text, fontSize: 9, fontWeight: "800" },
  engagement: { padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  likeButton: { alignSelf: "flex-start", width: 42, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface2 },
  likeButtonActive: { borderColor: "rgba(232,136,91,.72)", backgroundColor: "rgba(158,63,34,.28)" },
  likeButtonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  previewLayer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,.94)" },
  previewBackdrop: { position: "absolute", inset: 0 },
  previewImage: { width: "100%", height: "82%" },
  previewClose: { position: "absolute", top: 52, right: 22, width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.24)", borderRadius: 14, backgroundColor: "rgba(20,20,20,.86)" },
  noticeCard: { marginBottom: 11, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  newCard: { borderColor: "rgba(245,179,141,.55)", backgroundColor: colors.surface2 },
  noticeImage: { width: "100%", height: 140 },
  noticeRow: { padding: 16, flexDirection: "row", gap: 12 },
  noticeIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  noticeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  noticeMessage: { marginTop: 6, color: colors.muted, fontSize: 11, lineHeight: 17 },
});
