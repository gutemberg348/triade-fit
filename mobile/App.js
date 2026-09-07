import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Oswald_500Medium } from "@expo-google-fonts/oswald/500Medium";
import { Oswald_600SemiBold } from "@expo-google-fonts/oswald/600SemiBold";
import { Oswald_700Bold } from "@expo-google-fonts/oswald/700Bold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/contexts/AuthContext.js";
import api from "./src/services/api.js";
import { applyAppTheme, colors, isDarkAppTheme } from "./src/theme/index.js";

const APP_CONFIG_CACHE_KEY = "@triade-fit/app-config";

export default function App() {
  const [runtime, setRuntime] = useState(null);
  const [bootstrapError, setBootstrapError] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  const bootstrap = async () => {
    setBootstrapError(false);
    let appConfig = null;
    try {
      const cached = await AsyncStorage.getItem(APP_CONFIG_CACHE_KEY);
      if (cached) appConfig = JSON.parse(cached);
    } catch {
      appConfig = null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const { data } = await api.get("/app-config", { signal: controller.signal });
      appConfig = data;
      await AsyncStorage.setItem(APP_CONFIG_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Offline: usa a ultima configuracao salva ou o tema padrao.
    } finally {
      clearTimeout(timeout);
    }

    applyAppTheme(appConfig || {});
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [
      Text.defaultProps.style,
      { color: colors.text, fontFamily: "Inter_400Regular" },
    ];

    try {
      const navigationModule = await import("./src/navigation/AppNavigator.js");
      setRuntime({ Navigator: navigationModule.default, dark: isDarkAppTheme() });
    } catch (error) {
      if (__DEV__) console.error("Falha ao iniciar o aplicativo", error);
      setBootstrapError(true);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  if (!fontsLoaded || !runtime) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: colors.bg }}>
        {bootstrapError ? (
          <>
            <Text style={{ color: colors.text, fontWeight: "700" }}>Não foi possível abrir o aplicativo.</Text>
            <Pressable onPress={bootstrap} style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.button }}>
              <Text style={{ color: colors.title, fontWeight: "800" }}>Tentar novamente</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.button} />
        )}
      </View>
    );
  }
  const AppNavigator = runtime.Navigator;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style={runtime.dark ? "light" : "dark"} />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
