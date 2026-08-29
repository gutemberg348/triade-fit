import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Text } from "react-native";
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
import AppNavigator from "./src/navigation/AppNavigator.js";
import { colors } from "./src/theme/index.js";

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [
  Text.defaultProps.style,
  { color: colors.text, fontFamily: "Inter_400Regular" },
];

export default function App() {
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
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
