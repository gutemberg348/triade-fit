import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333/api",
  timeout: 15000,
});
let refreshPromise;
let sessionExpiredHandler = () => {};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler || (() => {});
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = () => {};
  };
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("essenza.accessToken");
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
    const refreshToken = localStorage.getItem("essenza.refreshToken");
    if (!refreshToken) return Promise.reject(error);
    refreshPromise ||= axios
      .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
    try {
      const { data } = await refreshPromise;
      localStorage.setItem("essenza.accessToken", data.accessToken);
      localStorage.setItem("essenza.refreshToken", data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      localStorage.removeItem("essenza.accessToken");
      localStorage.removeItem("essenza.refreshToken");
      localStorage.removeItem("essenza.user");
      sessionExpiredHandler();
      return Promise.reject(refreshError);
    }
  },
);

export const errorMessage = (error) =>
  error.response?.data?.error || "Não foi possível concluir a ação.";
export default api;
