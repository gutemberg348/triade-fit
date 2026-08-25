import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setSessionExpiredHandler } from "../services/api.js";

const Context = createContext(null);
const sessionKeys = ["accessToken", "refreshToken", "user"];
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const clearSession = useCallback(async () => {
    setUser(null);
    await AsyncStorage.multiRemove(sessionKeys).catch(() => null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const values = Object.fromEntries(await AsyncStorage.multiGet(sessionKeys));
        if (!values.accessToken && !values.refreshToken) {
          await clearSession();
          return;
        }
        const { data } = await api.get("/users/me");
        if (data.role !== "STUDENT") throw new Error("Perfil inválido para o app");
        await AsyncStorage.setItem("user", JSON.stringify(data));
        if (mounted) setUser(data);
      } catch {
        await clearSession();
      } finally {
        if (mounted) setBooting(false);
      }
    };
    restore();
    return () => {
      mounted = false;
    };
  }, [clearSession]);

  useEffect(() => setSessionExpiredHandler(() => setUser(null)), []);

  const save = useCallback(async (data) => {
    if (data.user?.role !== "STUDENT")
      throw new Error("Esta conta não pertence a uma aluna.");
    await AsyncStorage.multiSet([
      ["accessToken", data.accessToken],
      ["refreshToken", data.refreshToken],
      ["user", JSON.stringify(data.user)],
    ]);
    setUser(data.user);
  }, []);
  const login = useCallback(
    async (email, password) =>
      save((await api.post("/auth/login", { email, password })).data),
    [save],
  );
  const register = useCallback(
    async (payload) => save((await api.post("/auth/register", payload)).data),
    [save],
  );
  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/users/me");
    await AsyncStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const sync = () => refreshUser().catch(() => null);
    const interval = setInterval(sync, 4000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user?.id, refreshUser]);

  const logout = useCallback(async () => {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    // A interface sai imediatamente, mesmo sem internet. A revogação é best effort.
    setUser(null);
    await AsyncStorage.multiRemove(sessionKeys).catch(() => null);
    if (refreshToken)
      api.post("/auth/logout", { refreshToken }).catch(() => null);
  }, []);
  return (
    <Context.Provider
      value={useMemo(
        () => ({ user, booting, login, register, logout, refreshUser }),
        [user, booting, login, register, logout, refreshUser],
      )}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
