import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dumbbell, Flame, Home, MessageCircle, TrendingUp, User } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext.js";
import { colors, fonts, isDarkAppTheme } from "../theme/index.js";
import {
  ForgotPasswordScreen,
  AccessPendingScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from "../screens/AuthScreens.js";
import HomeScreen from "../screens/HomeScreen.js";
import {
  ContentModuleScreen,
  LessonScreen,
  ProgramDetailScreen,
  ProgramsScreen,
} from "../screens/ProgramScreens.js";
import {
  AddMeasurementScreen,
  AddPhotoScreen,
  EvolutionScreen,
} from "../screens/EvolutionScreens.js";
import NoticeScreen from "../screens/NoticeScreen.js";
import { MeditationSessionScreen } from "../screens/MeditationScreens.js";
import {
  ChangePasswordScreen,
  EditProfileScreen,
  ProfileScreen,
} from "../screens/ProfileScreens.js";
import { CaloriesScreen, TrainingAssistantScreen } from "../screens/AiScreens.js";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const tabIcons = {
  Início: Home,
  Treinos: Dumbbell,
  Calorias: Flame,
  Evolução: TrendingUp,
  Comunidade: MessageCircle,
  Perfil: User,
};
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Treinos" component={ProgramsScreen} />
      <Tab.Screen name="Calorias" component={CaloriesScreen} />
      <Tab.Screen name="Evolução" component={EvolutionScreen} />
      <Tab.Screen name="Comunidade" component={NoticeScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function BottomBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 0) + 10 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = tabIcons[route.name];
        const color = focused ? colors.iconActive : colors.iconInactive;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel || route.name}
            onPress={onPress}
            style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
          >
            <Icon color={color} size={21} strokeWidth={focused ? 2.5 : 2} />
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>{route.name}</Text>
            {focused && <View style={styles.tabIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}
export default function AppNavigator() {
  const { user, booting } = useAuth();
  const navigationTheme = isDarkAppTheme() ? DarkTheme : DefaultTheme;
  if (booting)
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.copperLight} />
      </View>
    );
  return (
    <NavigationContainer
      theme={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: colors.bg,
          card: colors.surface,
          border: colors.line,
          primary: colors.iconActive,
          text: colors.text,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        {user?.role === "STUDENT" && user.studentProfile?.accessStatus !== "ACTIVE" ? (
          <Stack.Screen name="AccessPending" component={AccessPendingScreen} />
        ) : user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Program" component={ProgramDetailScreen} />
            <Stack.Screen name="ContentModule" component={ContentModuleScreen} />
            <Stack.Screen name="Lesson" component={LessonScreen} />
            <Stack.Screen name="TrainingAssistant" component={TrainingAssistantScreen} />
            <Stack.Screen
              name="MeditationSession"
              component={MeditationSessionScreen}
            />
            <Stack.Screen
              name="AddMeasurement"
              component={AddMeasurementScreen}
            />
            <Stack.Screen name="AddPhoto" component={AddPhotoScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    height: 74,
    paddingHorizontal: 5,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderRadius: 24,
    backgroundColor: colors.surface,
    elevation: 18,
  },
  tabItem: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 16 },
  tabItemPressed: { backgroundColor: colors.surface2 },
  tabLabel: { width: "100%", fontFamily: fonts.semibold, fontSize: 7, lineHeight: 11, textAlign: "center" },
  tabIndicator: { position: "absolute", top: 0, width: 17, height: 2, borderRadius: 2, backgroundColor: colors.iconActive },
});
