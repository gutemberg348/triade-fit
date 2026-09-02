import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Bell, Heart, MessageCircle, Reply, Send, Sparkles, X } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { messageFrom } from "../services/api.js";
import { Empty, ErrorBox, Loading, Screen } from "../components/UI.js";
import { colors, fonts, radii } from "../theme/index.js";

export default function NoticeScreen() {
  const [activeTab, setActiveTab] = useState("feed");
  const [likingId, setLikingId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [conversation, setConversation] = useState({
    post: null,
    tab: "comments",
    loading: false,
    error: "",
    comments: [],
    likes: [],
  });
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef(null);
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

  const openConversation = async (post, tab = "comments") => {
    setConversation({ post, tab, loading: true, error: "", comments: [], likes: [] });
    setCommentText("");
    setReplyTo(null);
    try {
      const [comments, likes] = await Promise.all([
        api.get(`/community/posts/${post.id}/comments`),
        api.get(`/community/posts/${post.id}/likes`),
      ]);
      setConversation((current) => current.post?.id === post.id ? {
        ...current,
        loading: false,
        comments: comments.data,
        likes: likes.data,
      } : current);
    } catch (error) {
      setConversation((current) => current.post?.id === post.id ? {
        ...current,
        loading: false,
        error: messageFrom(error),
      } : current);
    }
  };

  const closeConversation = () => {
    setConversation((current) => ({ ...current, post: null }));
    setCommentText("");
    setReplyTo(null);
  };

  const startReply = (comment) => {
    setReplyTo(comment);
    setConversation((current) => ({ ...current, tab: "comments" }));
    setTimeout(() => commentInputRef.current?.focus(), 80);
  };

  const submitComment = async () => {
    const message = commentText.trim();
    const postId = conversation.post?.id;
    if (!message || !postId || sendingComment) return;
    setSendingComment(true);
    try {
      const { data } = await api.post(`/community/posts/${postId}/comments`, {
        message,
        parentId: replyTo?.id || null,
      });
      setConversation((current) => current.post?.id === postId ? {
        ...current,
        comments: [...current.comments, data.comment],
        post: { ...current.post, commentsCount: data.commentsCount },
      } : current);
      setState((current) => ({
        ...current,
        posts: current.posts.map((post) => post.id === postId
          ? { ...post, commentsCount: data.commentsCount }
          : post),
      }));
      setCommentText("");
      setReplyTo(null);
    } catch (error) {
      Alert.alert("Não foi possível comentar", messageFrom(error));
    } finally {
      setSendingComment(false);
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
          onOpenConversation={openConversation}
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
      <Modal
        visible={Boolean(conversation.post)}
        animationType="slide"
        onRequestClose={closeConversation}
      >
        <KeyboardAvoidingView
          style={styles.conversationLayer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={styles.conversationSafe} edges={["top", "bottom"]}>
            <View style={styles.conversationHeader}>
              <View>
                <Text style={styles.conversationEyebrow}>COMUNIDADE TRIADE</Text>
                <Text style={styles.conversationTitle}>Conversa da publicação</Text>
              </View>
              <Pressable style={styles.conversationClose} onPress={closeConversation}>
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.conversationTabs}>
              <Pressable
                style={[styles.conversationTab, conversation.tab === "comments" && styles.conversationTabActive]}
                onPress={() => setConversation((current) => ({ ...current, tab: "comments" }))}
              >
                <MessageCircle size={16} color={conversation.tab === "comments" ? colors.text : colors.subtle} />
                <Text style={[styles.conversationTabText, conversation.tab === "comments" && styles.conversationTabTextActive]}>
                  Comentários {conversation.post?.commentsCount || 0}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.conversationTab, conversation.tab === "likes" && styles.conversationTabActive]}
                onPress={() => setConversation((current) => ({ ...current, tab: "likes" }))}
              >
                <Heart size={16} color={conversation.tab === "likes" ? colors.text : colors.subtle} />
                <Text style={[styles.conversationTabText, conversation.tab === "likes" && styles.conversationTabTextActive]}>
                  Curtidas {conversation.post?.likesCount || 0}
                </Text>
              </Pressable>
            </View>

            {conversation.loading ? (
              <View style={styles.conversationState}>
                <ActivityIndicator size="large" color={colors.primaryLight} />
                <Text style={styles.conversationStateText}>Abrindo a conversa...</Text>
              </View>
            ) : conversation.error ? (
              <View style={styles.conversationState}>
                <Text style={styles.conversationErrorTitle}>Não foi possível carregar</Text>
                <Text style={styles.conversationStateText}>{conversation.error}</Text>
                <Pressable style={styles.retryButton} onPress={() => openConversation(conversation.post, conversation.tab)}>
                  <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                style={styles.conversationScroll}
                contentContainerStyle={styles.conversationContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {conversation.tab === "comments" ? (
                  conversation.comments.length ? conversation.comments.map((comment) => (
                    <CommentItem key={comment.id} item={comment} onReply={startReply} />
                  )) : (
                    <View style={styles.emptyConversation}>
                      <MessageCircle size={28} color={colors.primaryLight} />
                      <Text style={styles.emptyConversationTitle}>Comece a conversa</Text>
                      <Text style={styles.emptyConversationText}>Seja a primeira pessoa a comentar esta publicação.</Text>
                    </View>
                  )
                ) : (
                  conversation.likes.length ? conversation.likes.map((like) => (
                    <View style={styles.likerRow} key={like.id}>
                      <ProfileAvatar name={like.name} uri={like.avatarUrl} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.likerName}>{like.name}</Text>
                        <Text style={styles.likerDate}>Curtiu {formatCommentDate(like.createdAt)}</Text>
                      </View>
                      <Heart size={17} color={colors.primaryLight} fill={colors.primaryLight} />
                    </View>
                  )) : (
                    <View style={styles.emptyConversation}>
                      <Heart size={28} color={colors.primaryLight} />
                      <Text style={styles.emptyConversationTitle}>Nenhuma curtida ainda</Text>
                      <Text style={styles.emptyConversationText}>As pessoas que curtirem aparecerão aqui.</Text>
                    </View>
                  )
                )}
              </ScrollView>
            )}

            {!conversation.loading && !conversation.error && conversation.tab === "comments" ? (
              <View style={styles.commentComposer}>
                {replyTo ? (
                  <View style={styles.replyingTo}>
                    <Reply size={14} color={colors.primaryLight} />
                    <Text numberOfLines={1} style={styles.replyingToText}>Respondendo a {replyTo.author.name}</Text>
                    <Pressable onPress={() => setReplyTo(null)} hitSlop={8}><X size={15} color={colors.subtle} /></Pressable>
                  </View>
                ) : null}
                <View style={styles.commentInputRow}>
                  <TextInput
                    ref={commentInputRef}
                    multiline
                    maxLength={600}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder={replyTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                    placeholderTextColor={colors.subtle}
                    style={styles.commentInput}
                  />
                  <Pressable
                    disabled={!commentText.trim() || sendingComment}
                    onPress={submitComment}
                    style={[styles.commentSend, (!commentText.trim() || sendingComment) && styles.commentSendDisabled]}
                  >
                    {sendingComment
                      ? <ActivityIndicator size="small" color={colors.text} />
                      : <Send size={18} color={colors.text} />}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function ProfileAvatar({ name, uri, small = false }) {
  return uri ? (
    <Image source={{ uri }} style={[styles.avatar, small && styles.commentAvatar]} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback, small && styles.commentAvatar]}>
      <Text style={[styles.avatarText, small && styles.commentAvatarText]}>{name?.charAt(0).toUpperCase() || "?"}</Text>
    </View>
  );
}

function CommentItem({ item, onReply }) {
  return (
    <View style={[styles.commentRow, item.parentId && styles.commentReply]}>
      <ProfileAvatar name={item.author.name} uri={item.author.avatarUrl} small />
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentAuthor}>{item.author.name}{item.isMine ? " · você" : ""}</Text>
          {item.replyTo ? <Text style={styles.replyContext}>Em resposta a {item.replyTo.author.name}</Text> : null}
          <Text style={styles.commentMessage}>{item.message}</Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentDate}>{formatCommentDate(item.createdAt)}</Text>
          <Pressable style={styles.replyButton} onPress={() => onReply(item)}>
            <Reply size={12} color={colors.primaryLight} />
            <Text style={styles.replyButtonText}>Responder</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CommunityFeed({ items, onToggleLike, likingId, onPreview, onOpenConversation }) {
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
        <View style={styles.likeGroup}>
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
          <Pressable onPress={() => onOpenConversation(item, "likes")} hitSlop={7}>
            <Text style={styles.engagementText}>{item.likesCount || 0} curtida{item.likesCount === 1 ? "" : "s"}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.commentButton} onPress={() => onOpenConversation(item, "comments")}>
          <MessageCircle size={18} color={colors.copperLight} />
          <Text style={styles.engagementText}>{item.commentsCount || 0} comentário{item.commentsCount === 1 ? "" : "s"}</Text>
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

const formatCommentDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(value));

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
  engagement: { padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: colors.line },
  likeGroup: { flexDirection: "row", alignItems: "center", gap: 9 },
  likeButton: { alignSelf: "flex-start", width: 42, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface2 },
  likeButtonActive: { borderColor: "rgba(232,136,91,.72)", backgroundColor: "rgba(158,63,34,.28)" },
  likeButtonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  engagementText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 10 },
  commentButton: { minHeight: 38, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  previewLayer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, backgroundColor: "rgba(0,0,0,.94)" },
  previewBackdrop: { position: "absolute", inset: 0 },
  previewImage: { width: "100%", height: "82%" },
  previewClose: { position: "absolute", top: 52, right: 22, width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.24)", borderRadius: 14, backgroundColor: "rgba(20,20,20,.86)" },
  conversationLayer: { flex: 1, backgroundColor: colors.bg },
  conversationSafe: { flex: 1, backgroundColor: colors.bg },
  conversationHeader: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line },
  conversationEyebrow: { color: colors.primaryLight, fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2 },
  conversationTitle: { marginTop: 3, color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  conversationClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface },
  conversationTabs: { margin: 14, padding: 4, flexDirection: "row", gap: 5, borderRadius: 15, backgroundColor: colors.surface },
  conversationTab: { flex: 1, minHeight: 42, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12 },
  conversationTabActive: { backgroundColor: colors.surface3 },
  conversationTabText: { color: colors.subtle, fontFamily: fonts.semibold, fontSize: 10 },
  conversationTabTextActive: { color: colors.text },
  conversationScroll: { flex: 1 },
  conversationContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 18 },
  conversationState: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 12 },
  conversationStateText: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  conversationErrorTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 21 },
  retryButton: { marginTop: 5, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primaryLight },
  retryButtonText: { color: colors.text, fontFamily: fonts.bold, fontSize: 10 },
  emptyConversation: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyConversationTitle: { marginTop: 11, color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  emptyConversationText: { marginTop: 5, maxWidth: 260, color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: "center" },
  commentRow: { marginBottom: 13, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  commentReply: { marginLeft: 30 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentAvatarText: { fontSize: 12 },
  commentBody: { flex: 1 },
  commentBubble: { padding: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 15, borderTopLeftRadius: 5, backgroundColor: colors.surface },
  commentAuthor: { color: colors.text, fontFamily: fonts.bold, fontSize: 10 },
  replyContext: { marginTop: 2, color: colors.primaryLight, fontSize: 8 },
  commentMessage: { marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 17 },
  commentMeta: { marginTop: 5, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 13 },
  commentDate: { color: colors.subtle, fontSize: 8 },
  replyButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyButtonText: { color: colors.primaryLight, fontFamily: fonts.semibold, fontSize: 8 },
  likerRow: { marginBottom: 9, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surface },
  likerName: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
  likerDate: { marginTop: 3, color: colors.subtle, fontSize: 8 },
  commentComposer: { padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  replyingTo: { marginBottom: 8, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  replyingToText: { flex: 1, color: colors.primaryLight, fontFamily: fonts.semibold, fontSize: 9 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 9 },
  commentInput: { flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: 13, paddingVertical: 12, color: colors.text, fontFamily: fonts.body, fontSize: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface2 },
  commentSend: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.primaryLight },
  commentSendDisabled: { opacity: 0.45 },
  noticeCard: { marginBottom: 11, overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, backgroundColor: colors.surface },
  newCard: { borderColor: "rgba(245,179,141,.55)", backgroundColor: colors.surface2 },
  noticeImage: { width: "100%", height: 140 },
  noticeRow: { padding: 16, flexDirection: "row", gap: 12 },
  noticeIcon: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surface3 },
  noticeTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, lineHeight: 20 },
  noticeMessage: { marginTop: 6, color: colors.muted, fontSize: 11, lineHeight: 17 },
});
