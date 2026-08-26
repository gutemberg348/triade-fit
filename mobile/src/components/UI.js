import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeft, Check, Leaf, Play } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii } from "../theme/index.js";

export function Brand({ mini = false }) {
  return (
    <View style={styles.brand}>
      <View style={[styles.mark, mini && styles.markMini]}>
        <Leaf size={mini ? 18 : 22} color={colors.ink} strokeWidth={2.6} />
      </View>
      <View>
        <Text style={[styles.brandName, mini && styles.brandNameMini]}>
          TRIADE FIT
        </Text>
        {!mini && <Text style={styles.brandSmall}>PERSONAL TRAINING</Text>}
      </View>
    </View>
  );
}

export function Screen({ children, scroll = true, style, header, onBack }) {
  const content = (
    <>
      {(header || onBack) && (
        <View style={styles.screenHeader}>
          {onBack && (
            <Pressable style={styles.backButton} onPress={onBack} hitSlop={10}>
              <ArrowLeft color={colors.text} size={21} />
            </Pressable>
          )}
          <Text numberOfLines={1} style={styles.screenTitle}>
            {header}
          </Text>
        </View>
      )}
      {children}
    </>
  );
  return (
    <SafeAreaView style={[styles.safe, style]} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  icon: Icon,
  style,
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        style,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {Icon && <Icon size={18} color={primary ? colors.ink : colors.text} />}
      <Text style={[styles.buttonText, !primary && styles.buttonTextSecondary]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.primary }) {
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.max(0, Math.min(100, value || 0))}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

export function LessonStatus({ completed, size = 42 }) {
  return (
    <View
      style={[
        styles.lessonStatus,
        { width: size, height: size, borderRadius: size / 2 },
        completed ? styles.lessonStatusDone : styles.lessonStatusNext,
      ]}
    >
      {completed ? (
        <Check size={size * 0.46} color={colors.ink} strokeWidth={3} />
      ) : (
        <Play
          size={size * 0.4}
          color={colors.primaryLight}
          fill={colors.primaryLight}
          strokeWidth={2.4}
        />
      )}
    </View>
  );
}

export function Loading({ label = "Carregando..." }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primaryLight} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorBox({ message, retry }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Não foi possível carregar</Text>
      <Text style={styles.muted}>{message}</Text>
      {retry && <Button title="Tentar novamente" variant="secondary" onPress={retry} />}
    </View>
  );
}

export function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 118 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.accent,
  },
  markMini: { width: 38, height: 38, borderRadius: 13 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 2.1 },
  brandNameMini: { fontSize: 14, letterSpacing: 1.7 },
  brandSmall: { marginTop: 1, color: colors.subtle, fontSize: 7, fontWeight: "800", letterSpacing: 1.7 },
  screenHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  screenTitle: { flex: 1, color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  button: {
    minHeight: 54,
    paddingHorizontal: 19,
    borderRadius: radii.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  button_primary: { backgroundColor: colors.primaryLight },
  button_secondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  button_ghost: { backgroundColor: "transparent" },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  buttonTextSecondary: { color: colors.text },
  track: { height: 8, overflow: "hidden", borderRadius: 20, backgroundColor: colors.surface3 },
  fill: { height: "100%", borderRadius: 20 },
  lessonStatus: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  lessonStatusDone: { borderColor: "rgba(169,196,154,.55)", backgroundColor: colors.success },
  lessonStatusNext: { borderColor: "rgba(245,179,141,.38)", backgroundColor: "rgba(217,122,74,.16)" },
  center: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: 14 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  error: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: 14, padding: 25 },
  errorTitle: { color: colors.text, fontSize: 21, fontWeight: "800" },
  empty: { padding: 28, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: radii.card, alignItems: "center", gap: 8, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
});
