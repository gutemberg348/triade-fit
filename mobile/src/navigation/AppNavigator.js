import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Dumbbell, Home, MessageCircle, TrendingUp, User } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext.js";
import { colors } from "../theme/index.js";
import {
  ForgotPasswordScreen,
  AccessPendingScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from "../screens/AuthScreens.js";
import HomeScreen from "../screens/HomeScreen.js";
import {
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const tabIcons = {
  Início: Home,
  Treinos: Dumbbell,
  Evolução: TrendingUp,
  Comunidade: MessageCircle,
  Perfil: User,
};
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const Icon = tabIcons[route.name];
          return <Icon color={color} size={size} />;
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontSize: 9, fontWeight: "800", marginTop: 2 },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { paddingVertical: 7 },
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Treinos" component={ProgramsScreen} />
      <Tab.Screen name="Evolução" component={EvolutionScreen} />
      <Tab.Screen name="Comunidade" component={NoticeScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
export default function AppNavigator() {
  const { user, booting } = useAuth();
  if (booting)
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.copperLight} />
      </View>
    );
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.bg,
          card: colors.surface,
          border: colors.line,
          primary: colors.copperLight,
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
            <Stack.Screen name="Lesson" component={LessonScreen} />
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
    height: 70,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderRadius: 24,
    backgroundColor: "rgba(28,19,17,.98)",
    elevation: 18,
  },
});
