import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

// O navegador roda na mesma máquina da API e deve usar localhost.
// O app no iPhone/Android precisa do IP atual da máquina na rede Wi-Fi.
const metroHostUri =
  Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || "";
const metroHost = metroHostUri.replace(/^https?:\/\//, "").split(":")[0];
const inferredDevelopmentApi = metroHost
  ? `http://${metroHost}:3333/api`
  : null;
export const API_URL =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_WEB_API_URL || "http://localhost:3333/api"
    : (__DEV__ && inferredDevelopmentApi) ||
      process.env.EXPO_PUBLIC_API_URL ||
      (Platform.OS === "android"
        ? "http://10.0.2.2:3333/api"
        : "http://localhost:3333/api");
if (__DEV__) console.info(`[Triade FIT] API em uso: ${API_URL}`);
const api = axios.create({ baseURL: API_URL, timeout: 15000 });
let refreshPromise;
let sessionExpiredHandler = () => {};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler || (() => {});
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = () => {};
  };
};
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original?._retry ||
      original?.url?.includes("/auth/")
    )
      return Promise.reject(error);
    original._retry = true;
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) return Promise.reject(error);
    refreshPromise ||= axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
    try {
      const { data } = await refreshPromise;
      await AsyncStorage.multiSet([
        ["accessToken", data.accessToken],
        ["refreshToken", data.refreshToken],
        ["user", JSON.stringify(data.user)],
      ]);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
      sessionExpiredHandler();
      return Promise.reject(refreshError);
    }
  },
);
export const messageFrom = (error) =>
  error.response?.data?.error ||
  (error.code === "ECONNABORTED"
    ? `A conexão com ${API_URL} demorou demais.`
    : "Não foi possível conectar à Triade FIT.");
export default api;
