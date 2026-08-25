import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bell,
  Camera,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Shield,
  User,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import api, { messageFrom } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.js";
import { Button, Screen } from "../components/UI.js";
import { colors, radii, shadow } from "../theme/index.js";

export function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const items = [
    [User, "Dados pessoais", "EditProfile"],
    [LockKeyhole, "Alterar senha", "ChangePassword"],
    [Bell, "Preferências de notificação", null],
    [Shield, "Privacidade e segurança", null],
  ];
  const leave = () => {
    const title = "Sair da Triade FIT?";
    const message = "Você precisará entrar novamente para acessar sua jornada.";
    // Alert com botões não abre confirmação de forma confiável no React Native Web.
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) logout();
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  };
  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>SUA CONTA</Text>
        <Text style={styles.title}>Meu perfil</Text>
      </View>
      <View style={styles.profileCard}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{user.name.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PLANO TRIADE FIT · ATIVO</Text>
        </View>
      </View>
      <View style={styles.settings}>
        {items.map(([Icon, label, route]) => (
          <Pressable
            style={styles.setting}
            key={label}
            onPress={() =>
              route
                ? navigation.navigate(route)
                : Alert.alert(
                    label,
                    "Esta preferência seguirá a configuração do seu dispositivo.",
                  )
            }
          >
            <View style={styles.settingIcon}>
              <Icon size={18} color={colors.copperLight} strokeWidth={2.3} />
            </View>
            <Text style={styles.settingText}>{label}</Text>
            <View style={styles.settingChevron}>
              <ChevronRight size={16} color={colors.text} />
            </View>
          </Pressable>
        ))}
        <Pressable style={styles.setting} onPress={leave}>
          <View style={[styles.settingIcon, styles.settingIconDanger]}>
            <LogOut size={18} color={colors.danger} strokeWidth={2.3} />
          </View>
          <Text style={styles.settingTextDanger}>Sair</Text>
          <View style={styles.settingChevron}>
            <ChevronRight size={16} color={colors.text} />
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
export function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || "",
    birthDate: user.birthDate?.slice(0, 10) || "",
    avatarUrl: user.avatarUrl || "",
    objective: user.studentProfile?.objective || "",
    initialHeightCm: user.studentProfile?.initialHeightCm
      ? String(user.studentProfile.initialHeightCm)
      : "",
  });
  const [preview, setPreview] = useState(user.avatarUrl);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPreview(asset.uri);
      setSaving(true);
      try {
        const body = new FormData();
        body.append("image", {
          uri: asset.uri,
          name: asset.fileName || `avatar-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
        const { data } = await api.post("/uploads", body, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setForm((old) => ({ ...old, avatarUrl: data.url }));
      } catch (err) {
        setError(messageFrom(err));
      } finally {
        setSaving(false);
      }
    }
  };
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put("/users/me", {
        ...form,
        birthDate: form.birthDate || null,
        initialHeightCm: form.initialHeightCm || null,
      });
      await refreshUser();
      navigation.goBack();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen header="Dados pessoais" onBack={navigation.goBack}>
      <Pressable style={styles.avatarEdit} onPress={choose}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarImage}>
            <User color={colors.copperLight} />
          </View>
        )}
        <View style={styles.camera}>
          <Camera size={15} color={colors.ink} />
        </View>
      </Pressable>
      {[
        ["name", "Nome"],
        ["phone", "Telefone"],
        ["birthDate", "Nascimento (AAAA-MM-DD)"],
        ["initialHeightCm", "Altura (cm)"],
        ["objective", "Objetivo"],
      ].map(([key, label]) => (
        <View key={key}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, key === "objective" && { minHeight: 85 }]}
            multiline={key === "objective"}
            value={form[key]}
            onChangeText={(value) => setForm({ ...form, [key]: value })}
          />
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={saving ? "Salvando..." : "Salvar alterações"}
        onPress={submit}
        disabled={saving}
      />
    </Screen>
  );
}
export function ChangePasswordScreen({ navigation }) {
  const { logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (form.newPassword !== form.confirmation)
      return setError("As novas senhas não coincidem.");
    setSaving(true);
    setError("");
    try {
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      Alert.alert("Senha alterada", "Entre novamente com sua nova senha.", [
        { text: "OK", onPress: logout },
      ]);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen header="Alterar senha" onBack={navigation.goBack}>
      <Text style={styles.formLead}>
        Use ao menos oito caracteres, incluindo letras e números.
      </Text>
      {[
        ["currentPassword", "Senha atual"],
        ["newPassword", "Nova senha"],
        ["confirmation", "Confirmar nova senha"],
      ].map(([key, label]) => (
        <View key={key}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={form[key]}
            onChangeText={(value) => setForm({ ...form, [key]: value })}
          />
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={saving ? "Alterando..." : "Alterar senha"}
        onPress={submit}
        disabled={saving}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { marginBottom: 23 },
  eyebrow: {
    color: colors.copperLight,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 5,
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  profileCard: {
    padding: 23,
    overflow: "hidden",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    backgroundColor: colors.surface2,
    ...shadow,
  },
  avatar: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(245,179,141,.55)",
    borderRadius: 25,
    backgroundColor: colors.copper,
  },
  name: {
    marginTop: 14,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  email: { marginTop: 4, color: colors.text, fontSize: 12, fontWeight: "700" },
  badge: {
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 30,
    backgroundColor: "rgba(245,179,141,.16)",
  },
  badgeText: { color: colors.text, fontSize: 9, fontWeight: "900", letterSpacing: 0.55 },
  settings: {
    marginTop: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  setting: {
    minHeight: 66,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  settingIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(232,136,91,.34)", borderRadius: 13, backgroundColor: "rgba(158,63,34,.24)" },
  settingIconDanger: { borderColor: "rgba(245,142,134,.34)", backgroundColor: "rgba(245,142,134,.1)" },
  settingChevron: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface2 },
  settingText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" },
  settingTextDanger: { flex: 1, color: colors.danger, fontSize: 14, fontWeight: "900" },
  avatarInitial: { color: colors.text, fontSize: 28, fontWeight: "900" },
  avatarEdit: { width: 98, height: 98, alignSelf: "center", marginBottom: 25 },
  avatarImage: {
    width: 98,
    height: 98,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 31,
    backgroundColor: colors.surface3,
  },
  camera: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.copperLight,
  },
  label: { marginBottom: 6, color: colors.muted, fontSize: 11, fontWeight: "800" },
  input: {
    minHeight: 51,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    color: colors.text,
    backgroundColor: colors.surface2,
  },
  error: { marginBottom: 12, color: colors.danger },
  formLead: { marginBottom: 22, color: colors.muted, lineHeight: 20 },
});
